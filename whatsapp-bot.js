
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

// --- 1. CONFIGURACIÓN DEL SERVIDOR (INICIO EXPRESS INMEDIATO) ---
const app = express();
app.use(bodyParser.json());
const port = process.env.PORT || 8000;

app.listen(port, '0.0.0.0', () => {
    console.log(`📡 Servidor Multicanal listo en puerto ${port} (IP: 0.0.0.0)`);
});

app.get('/', (req, res) => {
    res.status(200).send('<h1>Servidor Multi-Bot Activo 🚀</h1><p>Gihart & Hersel: WhatsApp y Messenger operando.</p><a href="/qr">Ver Código QR</a>');
});

let latestQR = "";
app.get('/qr', async (req, res) => {
    if (!latestQR) return res.send('<h1>Generando QR...</h1><p>Actualiza en 5 segundos.</p><script>setTimeout(()=>location.reload(), 5000)</script>');
    try {
        const qrImage = await QRCodeNode.toDataURL(latestQR);
        res.send(`
            <div style="text-align:center; padding:50px; font-family:sans-serif; background:#000; color:#fff; min-height:100vh;">
                <h1 style="color:#ff0080;">Vincular WhatsApp</h1>
                <img src="${qrImage}" style="width:300px; border:10px solid #fff; border-radius:20px; box-shadow: 0 0 50px rgba(255,0,128,0.5);" />
                <p>Escanea con WhatsApp para activar el bot.</p>
                <script>setTimeout(()=>location.reload(), 10000)</script>
            </div>
        `);
    } catch (e) { res.status(500).send('Error de QR'); }
});

// WEBHOOK DE MESSENGER (Ruta única)
const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;

app.get('/webhook', (req, res) => {
    if (req.query['hub.verify_token'] === VERIFY_TOKEN) return res.send(req.query['hub.challenge']);
    res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
    if (req.body.object === 'page') {
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
        res.status(200).send('EVENT_RECEIVED');
    }
});

async function sendMessenger(psid, text) {
    try {
        await fetch(`https://graph.facebook.com/v12.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
            method: 'POST',
            body: JSON.stringify({ recipient: { id: psid }, message: { text } }),
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) { console.error('Error Messenger:', e); }
}

// --- 2. CONFIGURACIÓN DE IA Y SUPABASE ---
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const MASTER_INSTRUCTION = `Eres el Curador Maestro de Gihart & Hersel (TIENDA FÍSICA).
TONO: Sofisticado, elegante, breve.

REGLAS DE ORO:
1. NO HACEMOS ENVÍOS: Bajo ningún motivo menciones envíos, paquetería o entregas a domicilio. Todo es personal o en tienda.
2. PRECIOS: Respeta el catálogo. Mayoreo solo desde 6 piezas (di precio unitario de mayoreo). 
3. NO INVENTES: Si no está en la lista de abajo, no lo manejas.

ESTILO:
- Máximo 3 líneas. Usa negritas para precios y nombres.`;

function formatContext(products) {
    return products.map(p => {
        const pub = p.price > 0 ? `$${p.price} MXN` : 'Consultar';
        const whole = p.wholesale_price > 0 ? `$${p.wholesale_price} MXN` : 'Consultar';
        const status = p.is_sold_out ? 'AGOTADO' : 'Disponible';
        return `- ${p.name.toUpperCase()} | Público: ${pub} | Mayoreo (6+): ${whole} | Tallas: ${p.sizes?.join('/') || 'S-XL'} | Estado: ${status}`;
    }).join('\n');
}

async function getProducts() {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    return data || [];
}

async function getAIKeys() {
    let keys = process.env.VITE_GEMINI_API_KEY || "";
    try {
        const { data } = await supabase.from('settings').select('value').eq('key', 'gemini_keys').single();
        if (data?.value) keys += "," + data.value;
    } catch (e) { }
    return {
        gemini: (keys.match(/AIza[a-zA-Z0-9\-_]{30,70}/g) || []),
        groq: (keys.match(/gsk_[a-zA-Z0-9\-_]{30,70}/g) || [])
    };
}

async function askAI(message, context) {
    const keys = await getAIKeys();
    // Probar Groq primero
    for (const key of keys.groq) {
        try {
            const groq = new Groq({ apiKey: key });
            const completion = await groq.chat.completions.create({
                messages: [{ role: 'system', content: MASTER_INSTRUCTION + "\nCONTEXTO:\n" + context }, { role: 'user', content: message }],
                model: "llama-3.3-70b-versatile"
            });
            return completion.choices[0].message.content;
        } catch (e) { }
    }
    // Gemini Fallback
    for (const key of keys.gemini) {
        try {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
            const result = await model.generateContent(`Instrucción: ${MASTER_INSTRUCTION}\nContexto: ${context}\nMensaje: ${message}`);
            return result.response.text();
        } catch (e) { }
    }
    return "Hola! Un asesor humano te atenderá pronto para darte una atención personalizada.";
}

// --- 3. CLIENTE WHATSAPP ---
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "bot-gihart-v2" }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--shm-size=1gb']
    }
});

client.on('qr', qr => {
    latestQR = qr;
    qrcode.generate(qr, { small: true });
    if (process.env.WHATSAPP_NUMBER_LINK) {
        client.requestPairingCode(process.env.WHATSAPP_NUMBER_LINK).then(c => console.log(`👉 CÓDIGO PAIRING: ${c}`)).catch(e => { });
    }
});

client.on('ready', () => console.log('✅ WhatsApp listo y conectado.'));

client.on('message_create', async msg => {
    if (msg.from === 'status@broadcast' || msg.fromMe) return;
    const chat = await msg.getChat();
    if (chat.isGroup) return;

    try {
        await chat.sendStateTyping();
        const products = await getProducts();
        const response = await askAI(msg.body, formatContext(products));
        await msg.reply(response);
    } catch (e) { console.error('Error WA:', e); }
});

client.initialize().catch(err => console.error('Error inicializando cliente WA:', err));
