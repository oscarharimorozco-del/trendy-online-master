import { createClient } from '@supabase/supabase-js';

const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN || 'trendy_secret_token_123';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

const storeInstruction = `Eres el Asesor Virtual de Gihart & Hersel.
Tu objetivo es vender y dar información EXACTA del catálogo.

REGLAS DE ORO:
1. Solo usa los productos listados en el CONTEXTO.
2. TALLAS: Si ves "S, M, L", responde "Chica, Mediana, Grande". Si ves "3XL", di "Talla 3XL". NO uses códigos raros.
3. PRECIOS: Precio Público es el precio por defecto. Mayoreo solo aplica a partir de 6 piezas.
4. NO ALUCINES: Si no encuentras lo que piden, di: "No tengo eso en este momento, pero mira estas opciones:" y lista lo que SÍ hay.
5. Sé amable, breve y sofisticado.`;

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
                const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: [
                            { role: 'system', content: storeInstruction + "\nCONTEXTO:\n" + context },
                            { role: 'user', content: message }
                        ],
                        model: "llama-3.3-70b-versatile",
                    })
                });
                const data = await res.json();
                if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
            } catch (e) { console.error("Error Groq:", e.message); }
        }
    }

    // Probar Gemini
    if (allKeys.gemini.length > 0) {
        for (const key of allKeys.gemini) {
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${key}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: `INSTRUCCIONES: ${storeInstruction}\nCONTEXTO:\n${context}\nMENSAJE:\n${message}` }] }]
                    })
                });
                const data = await res.json();
                if (data.candidates?.[0]?.content?.parts?.[0]?.text) return data.candidates[0].content.parts[0].text;
            } catch (e) { console.error("Error Gemini:", e.message); }
        }
    }

    return "¡Hola! Gracias por escribir a Gihart & Hersel. Un asesor te atenderá pronto.";
}

async function sendToMessenger(sender_psid, text) {
    try {
        await fetch(`https://graph.facebook.com/v12.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
            method: 'POST',
            body: JSON.stringify({ recipient: { id: sender_psid }, message: { text } }),
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('✅ Respuesta enviada a Messenger.');
    } catch (e) {
        console.error('❌ Error enviando a Messenger:', e.message);
    }
}

export default async function handler(req, res) {
    // GET = Verificación del webhook
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ Webhook verificado.');
            return res.status(200).send(challenge);
        }
        return res.sendStatus(403);
    }

    // POST = Mensaje entrante
    if (req.method === 'POST') {
        const body = req.body;

        if (body.object === 'page') {
            for (const entry of body.entry) {
                const webhook_event = entry.messaging?.[0];
                if (!webhook_event) continue;

                const sender_psid = webhook_event.sender.id;

                if (webhook_event.message?.text) {
                    const userMessage = webhook_event.message.text;
                    console.log(`📩 Messenger (${sender_psid}): ${userMessage}`);

                    const products = await getProducts();
                    const context = products.map(p => {
                        const sizes = p.sizes && Array.isArray(p.sizes) ? p.sizes.join(', ') : 'Preguntar';
                        return `- ${p.name} | Tallas: ${sizes} | Precio: $${p.price} | Mayoreo (6+): $${p.wholesale_price || 'N/A'}`;
                    }).join('\n');

                    const aiResponse = await askAI(userMessage, context);
                    await sendToMessenger(sender_psid, aiResponse);
                }
            }
            return res.status(200).send('EVENT_RECEIVED');
        }
        return res.sendStatus(404);
    }

    return res.sendStatus(405);
}
