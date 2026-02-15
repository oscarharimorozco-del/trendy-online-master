
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import QRCodeNode from 'qrcode';

dotenv.config();

const app = express();
app.use(bodyParser.json());
const port = process.env.PORT || 8080;
let latestQR = "";

const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// REGLAS MAESTRAS DE PRECISIÓN (NOHallucination)
const MASTER_INSTRUCTION = `Eres el Agente de Élite de Gihart & Hersel (TIENDA FÍSICA).
REGLAS DE ORO (INVIOLABLES):
1. ENTREGA: Solo personal o en tienda. NO TENEMOS ENVÍOS ni paquetería.
2. PRECIOS: Público (1 pza), Mayoreo (6+ pzas).
3. FIDELIDAD: Si el cliente pregunta por una marca o modelo, busca en el CATÁLOGO REAL de abajo. 
4. SI NO ESTÁ: Si no encuentras el producto exacto, di: "No tengo ese modelo por el momento, pero tengo estos similares:" y menciona los que sí tienes. NUNCA inventes que tienes algo que no está en la lista.
5. PRECIO CERO: Si ves un precio en $0, no lo menciones, di "Consultar con asesor".

TONO: Ejecutivo, sofisticado y MUY BREVE (máximo 2-3 líneas).`;

async function getProducts() {
    const { data } = await supabase.from('products').select('name, price, wholesale_price, category, gender').order('created_at', { ascending: false });
    return data || [];
}

function formatContext(prods) {
    return prods.map(p => {
        const wholesale = (p.wholesale_price && p.wholesale_price > 0) ? `$${p.wholesale_price}` : "Consultar";
        return `- ${p.name.toUpperCase()}: Público $${p.price} | Mayoreo $${wholesale} [${p.category || 'General'}]`;
    }).join('\n');
}

async function askAI(message, context, imageBase64 = null) {
    let keys = process.env.VITE_GEMINI_API_KEY || "";
    try {
        const { data } = await supabase.from('settings').select('value').eq('key', 'gemini_keys').single();
        if (data?.value) keys += "," + data.value;
    } catch (e) { }

    const groqKeys = (keys.match(/gsk_[a-zA-Z0-9\-_]{30,70}/g) || []);
    const geminiKeys = (keys.match(/AIza[a-zA-Z0-9\-_]{30,70}/g) || []);

    const fullPrompt = `${MASTER_INSTRUCTION}\n\nCATÁLOGO REAL:\n${context}\n\nCliente dice: ${message || "¿Qué productos tienes?"}`;

    // Preferir Groq para texto por velocidad y precisión lógica
    if (!imageBase64) {
        for (const key of groqKeys) {
            try {
                const groq = new Groq({ apiKey: key });
                const completion = await groq.chat.completions.create({
                    messages: [{ role: 'system', content: fullPrompt }],
                    model: "llama-3.3-70b-versatile"
                });
                return completion.choices[0].message.content;
            } catch (e) { }
        }
    }

    // Fallback/Visión con Gemini
    for (const key of geminiKeys) {
        try {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const parts = [{ text: fullPrompt }];
            if (imageBase64) parts.push({ inlineData: { data: imageBase64, mimeType: "image/jpeg" } });

            const result = await model.generateContent(parts);
            return result.response.text();
        } catch (e) { }
    }

    return "Lo siento, un asesor humano le atenderá a la brevedad para darle información exacta.";
}

// ENDPOINTS
app.get('/', (req, res) => res.status(200).send('<h1>Agente Gihart & Hersel v5.1</h1><p>Online.</p><a href="/qr">Ver QR</a>'));

app.get('/webhook', (req, res) => {
    if (req.query['hub.verify_token'] === VERIFY_TOKEN) return res.send(req.query['hub.challenge']);
    res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
    if (req.body.object === 'page') {
        res.status(200).send('EVENT_RECEIVED');
        for (const entry of req.body.entry) {
            const event = entry.messaging?.[0];
            if (event?.message?.text) {
                const prods = await getProducts();
                const context = formatContext(prods);
                const reply = await askAI(event.message.text, context);
                await fetch(`https://graph.facebook.com/v12.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
                    method: 'POST',
                    body: JSON.stringify({ recipient: { id: event.sender.id }, message: { text: reply } }),
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
    }
});

app.get('/qr', async (req, res) => {
    if (!latestQR) return res.send('<h1>Preparando WhatsApp...</h1><script>setTimeout(()=>location.reload(), 5000)</script>');
    const qrImage = await QRCodeNode.toDataURL(latestQR);
    res.send(`<div style="text-align:center;background:#000;color:#fff;min-height:100vh;padding:50px;font-family:sans-serif;">
        <h1 style="color:#00ff88;">Vincular WhatsApp G&H</h1>
        <img src="${qrImage}" style="width:300px;border:10px solid #fff;border-radius:20px;"/>
        <p>Escanea para activar la IA.</p>
        <script>setTimeout(()=>location.reload(), 20000)</script>
    </div>`);
});

app.listen(port, '0.0.0.0', () => console.log(`📡 Puerto ${port} Activo`));

// WHATSAPP
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "gihart-v5-1" }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--shm-size=1gb']
    }
});

client.on('qr', (qr) => { latestQR = qr; qrcode.generate(qr, { small: true }); });
client.on('ready', () => console.log('✅ WA Connected'));

client.on('message_create', async msg => {
    if (msg.from === 'status@broadcast' || msg.fromMe) return;
    const chat = await msg.getChat();
    if (chat.isGroup) return;

    try {
        await chat.sendStateTyping();
        const prods = await getProducts();
        const context = formatContext(prods);

        let img = null;
        if (msg.hasMedia) {
            const m = await msg.downloadMedia();
            if (m.mimetype.startsWith('image/')) img = m.data;
        }

        const reply = await askAI(msg.body, context, img);
        await msg.reply(reply);
    } catch (e) { console.error(e); }
});

client.initialize().catch(e => console.error(e));
