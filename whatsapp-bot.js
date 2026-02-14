
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import express from 'express';
import QRCodeNode from 'qrcode';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';

dotenv.config();

// --- 1. SERVIDOR EXPRESS (INICIO RÁPIDO) ---
const app = express();
app.use(bodyParser.json());
const port = process.env.PORT || 8080;

app.listen(port, '0.0.0.0', () => {
    console.log(`📡 Servidor Multi-Bot activo en puerto ${port}`);
});

app.get('/', (req, res) => {
    res.status(200).send('<h1>Multi-Bot Activo 🚀</h1><p>WhatsApp & Messenger listos.</p><a href="/qr">Ver QR WhatsApp</a>');
});

let latestQR = "";
app.get('/qr', async (req, res) => {
    if (!latestQR) return res.send('<h1>Generando QR...</h1><p>Espera 30 segundos y recarga. El bot está iniciando el motor de WhatsApp.</p><script>setTimeout(()=>location.reload(), 5000)</script>');
    try {
        const qrImage = await QRCodeNode.toDataURL(latestQR);
        res.send(`
            <div style="text-align:center; padding:50px; font-family:sans-serif; background:#000; color:#fff; min-height:100vh;">
                <h1 style="color:#ff0080;">Vincular WhatsApp</h1>
                <img src="${qrImage}" style="width:300px; border:10px solid #fff; border-radius:20px;" />
                <p>Escanea este código con tu celular.</p>
                <div style="margin-top:20px; color:#666;">Si el QR no cambia, espera a que la página se recargue sola.</div>
                <script>setTimeout(()=>location.reload(), 15000)</script>
            </div>
        `);
    } catch (e) { res.status(500).send('Error QR'); }
});

// --- 2. LOGICA MESSENGER (MODO ULTRA-RÁPIDO) ---
const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

app.get('/webhook', (req, res) => {
    if (req.query['hub.verify_token'] === VERIFY_TOKEN) return res.send(req.query['hub.challenge']);
    res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
    if (req.body.object === 'page') {
        res.status(200).send('EVENT_RECEIVED'); // Responder rápido a Facebook
        for (const entry of req.body.entry) {
            const event = entry.messaging?.[0];
            if (event?.message?.text) {
                console.log(`📩 Messenger: ${event.message.text}`);
                const products = await getProducts();
                const context = formatContext(products);
                const reply = await askAI(event.message.text, context);
                await sendMessenger(event.sender.id, reply);
            }
        }
    }
});

async function sendMessenger(psid, text) {
    try {
        await fetch(`https://graph.facebook.com/v12.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
            method: 'POST',
            body: JSON.stringify({ recipient: { id: psid }, message: { text } }),
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('✅ Mensaje de Messenger enviado.');
    } catch (e) { console.error('Error Messenger:', e); }
}

// --- 3. IA Y SUPABASE ---
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const MASTER_INSTRUCTION = `Eres el Curador Maestro de Gihart & Hersel (TIENDA FÍSICA).
REGLAS:
1. NO HACEMOS ENVÍOS. Todo es personal o en punto físico.
2. PRECIOS: Público (1 pza), Mayoreo (6+ pzas).
3. NO INVENTES MODELOS.
TONO: Elegante, breve. Usa negritas.`;

function formatContext(products) {
    return products.map(p => `- ${p.name.toUpperCase()} ($${p.price} | Mayoreo: $${p.wholesale_price || 'Consultar'})`).join('\n');
}

async function getProducts() {
    const { data } = await supabase.from('products').select('*');
    return data || [];
}

async function askAI(message, context) {
    let keys = process.env.VITE_GEMINI_API_KEY || "";
    try {
        const { data } = await supabase.from('settings').select('value').eq('key', 'gemini_keys').single();
        if (data?.value) keys += "," + data.value;
    } catch (e) { }

    const groqKeys = (keys.match(/gsk_[a-zA-Z0-9\-_]{30,70}/g) || []);
    const geminiKeys = (keys.match(/AIza[a-zA-Z0-9\-_]{30,70}/g) || []);

    for (const key of groqKeys) {
        try {
            const groq = new Groq({ apiKey: key });
            const completion = await groq.chat.completions.create({
                messages: [{ role: 'system', content: MASTER_INSTRUCTION + "\nContexto:\n" + context }, { role: 'user', content: message }],
                model: "llama-3.3-70b-versatile"
            });
            return completion.choices[0].message.content;
        } catch (e) { }
    }
    for (const key of geminiKeys) {
        try {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
            const result = await model.generateContent(`${MASTER_INSTRUCTION}\nContexto: ${context}\nMensaje: ${message}`);
            return result.response.text();
        } catch (e) { }
    }
    return "Hola! Un asesor le contactará pronto.";
}

// --- 4. WHATSAPP ---
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "bot-gihart-v4" }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--shm-size=1gb']
    }
});

client.on('qr', q => {
    latestQR = q;
    qrcode.generate(q, { small: true });
});

client.on('ready', () => console.log('✅ WhatsApp Online!'));

client.on('message_create', async msg => {
    if (msg.from === 'status@broadcast' || msg.fromMe) return;
    const chat = await msg.getChat();
    if (chat.isGroup) return;
    try {
        await chat.sendStateTyping();
        const prods = await getProducts();
        const response = await askAI(msg.body, formatContext(prods));
        await msg.reply(response);
    } catch (e) { console.error('Error WA:', e); }
});

client.initialize().catch(err => console.log('Error Initializing:', err));
