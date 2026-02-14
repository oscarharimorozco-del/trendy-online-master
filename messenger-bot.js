
import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
app.use(bodyParser.json());

// CONFIGURACIÓN
const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN || 'trendy_secret_token_123';
const PORT = process.env.PORT || 3000;

// Supabase
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

const storeInstruction = `Eres el Curador Maestro de Gihart & Hersel (TIENDA FÍSICA). 
Tono sofisticado, elegante pero cercano. 

REGLAS DE ORO:
1. **NO HACEMOS ENVÍOS**: No menciones envíos a domicilio ni paquetería. Solo entregas personales o en tienda.
2. **PRECIO PÚBLICO**: Es el precio unitario exacto del catálogo.
3. **PRECIO MAYOREO**: Solo a partir de 6 piezas. Di siempre el precio POR PIEZA.
4. **NO INVENTES**: Si no está en el catálogo, solicita información a un asesor.

ESTILO:
- Usa negritas para precios y nombres.
- Sé breve y sofisticado.`;

// FUNCIONES DE APOYO (Misma lógica que el bot de WhatsApp)
async function getAIKeys() {
    let keysString = process.env.VITE_GEMINI_API_KEY || "";
    try {
        const { data, error } = await supabase.from('settings').select('value').eq('key', 'gemini_keys').single();
        if (!error && data?.value) keysString += "," + data.value;
    } catch (e) { }
    const geminiMatches = keysString.match(/AIza[a-zA-Z0-9\-_]{30,70}/g) || [];
    const groqMatches = keysString.match(/gsk_[a-zA-Z0-9\-_]{30,70}/g) || [];
    return { gemini: [...new Set(geminiMatches)], groq: [...new Set(groqMatches)] };
}

async function getProducts() {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    return error ? [] : (data || []);
}

async function askAI(message, context) {
    const allKeys = await getAIKeys();

    // Probar Groq
    if (allKeys.groq.length > 0) {
        for (const key of allKeys.groq) {
            try {
                const groq = new Groq({ apiKey: key });
                const completion = await groq.chat.completions.create({
                    messages: [
                        { role: 'system', content: storeInstruction + "\nCONTEXTO:\n" + context },
                        { role: 'user', content: message }
                    ],
                    model: "llama-3.3-70b-versatile",
                });
                return completion.choices[0].message.content;
            } catch (e) { console.error("Error Groq:", e.message); }
        }
    }

    // Probar Gemini
    if (allKeys.gemini.length > 0) {
        const models = ["gemini-2.0-flash-lite", "gemini-flash-latest"];
        for (const key of allKeys.gemini) {
            for (const modelName of models) {
                try {
                    const genAI = new GoogleGenerativeAI(key);
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const prompt = `INSTRUCCIONES: ${storeInstruction}\nCONTEXTO:\n${context}\nMENSAJE:\n${message}`;
                    const result = await model.generateContent(prompt);
                    return result.response.text();
                } catch (e) { console.error("Error Gemini:", e.message); }
            }
        }
    }

    return "¡Hola! Gracias por escribir a Gihart & Hersel. Un asesor te atenderá pronto.";
}

// WEBHOOK DE FACEBOOK
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ Webhook verificado correctamente.');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'page') {
        body.entry.forEach(async (entry) => {
            const webhook_event = entry.messaging[0];
            const sender_psid = webhook_event.sender.id;

            if (webhook_event.message && webhook_event.message.text) {
                const userMessage = webhook_event.message.text;
                console.log(`📩 Mensaje de Messenger (${sender_psid}): ${userMessage}`);

                // Obtener contexto de productos
                const products = await getProducts();
                const context = products.map(p => {
                    const hasPromo = p.is_promotion && p.promo_price > 0;
                    const publicPrice = p.price > 0 ? `$${p.price} MXN` : 'Consultar';
                    const wholesalePrice = p.wholesale_price > 0 ? `$${p.wholesale_price} MXN` : 'Consultar';
                    const promoPrice = hasPromo ? `$${p.promo_price} MXN` : null;
                    const status = p.is_sold_out ? 'AGOTADO' : 'Disponible';
                    const sizes = p.sizes && Array.isArray(p.sizes) ? p.sizes.join(', ') : 'Consultar';

                    let line = `- ${p.name.toUpperCase()} | Cat: ${p.category} | Precio: ${publicPrice}`;
                    if (hasPromo) line += ` | 🔥 PROMO: ${promoPrice}`;
                    line += ` | Mayoreo (6+): ${wholesalePrice}`;
                    line += ` | Tallas: ${sizes} | ${status}`;
                    return line;
                }).join('\n');

                // IA
                const aiResponse = await askAI(userMessage, context);

                // Enviar respuesta a Facebook
                await sendToMessenger(sender_psid, aiResponse);
            }
        });
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

async function sendToMessenger(sender_psid, text) {
    const response = {
        recipient: { id: sender_psid },
        message: { text: text }
    };

    try {
        await fetch(`https://graph.facebook.com/v12.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
            method: 'POST',
            body: JSON.stringify(response),
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('✅ Respuesta enviada a Messenger.');
    } catch (e) {
        console.error('❌ Error enviando a Messenger:', e.message);
    }
}

app.listen(PORT, () => console.log(`🚀 Servidor de Messenger bot en puerto ${PORT}`));
