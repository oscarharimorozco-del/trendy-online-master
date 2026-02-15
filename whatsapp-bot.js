
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import express from 'express';
import QRCodeNode from 'qrcode';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;
let latestQR = "";

// CUALQUIER ERROR QUE PARE EL PROCESO DEBE SER CAPTURADO
process.on('uncaughtException', (err) => console.error('CRITICAL ERROR:', err));

app.get('/', (req, res) => res.status(200).send('<h1>Agente Gihart & Hersel v5.0</h1><p>Online y esperando.</p><a href="/qr">Ver QR</a>'));
app.get('/qr', async (req, res) => {
    if (!latestQR) return res.send('<h1>Iniciando WhatsApp...</h1><p>Recarga en 5 seg.</p><script>setTimeout(()=>location.reload(), 5000)</script>');
    const qrImage = await QRCodeNode.toDataURL(latestQR);
    res.send(`<div style="text-align:center;background:#000;color:#fff;min-height:100vh;padding:50px;font-family:sans-serif;">
        <h1 style="color:#ff0080;">Vincular WhatsApp</h1>
        <img src="${qrImage}" style="width:300px;border:10px solid #fff;border-radius:20px;"/>
        <p>Escanea este código.</p>
        <script>setTimeout(()=>location.reload(), 15000)</script>
    </div>`);
});

app.listen(port, '0.0.0.0', () => console.log(`📡 Servidor en puerto ${port}`));

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const MASTER_INSTRUCTION = `Eres el Agente Autónomo de Gihart & Hersel (TIENDA FÍSICA).
REGLAS:
1. NO HACEMOS ENVÍOS. Todo es personal o en tienda.
2. PRECIOS: Público (1 pza), Mayoreo (6+ pzas).
3. NO INVENTES MODELOS.
USO DE IMAGEN: Si te mandan foto, busca parecido en el catálogo.
TONO: Elegante y breve (Máx 3 líneas).`;

async function askAI(message, context, imageBase64 = null) {
    let keys = process.env.VITE_GEMINI_API_KEY || "";
    try {
        const { data } = await supabase.from('settings').select('value').eq('key', 'gemini_keys').single();
        if (data?.value) keys += "," + data.value;
    } catch (e) { }

    const groqKeys = (keys.match(/gsk_[a-zA-Z0-9\-_]{30,70}/g) || []);
    const geminiKeys = (keys.match(/AIza[a-zA-Z0-9\-_]{30,70}/g) || []);

    if (imageBase64) {
        for (const key of geminiKeys) {
            try {
                const genAI = new GoogleGenerativeAI(key);
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const result = await model.generateContent([
                    { text: MASTER_INSTRUCTION + "\nCONTEXTO:\n" + context + "\nPregunta: " + (message || "¿Qué es esto?") },
                    { inlineData: { data: imageBase64, mimeType: "image/jpeg" } }
                ]);
                return result.response.text();
            } catch (e) { }
        }
    }

    for (const key of groqKeys) {
        try {
            const groq = new Groq({ apiKey: key });
            const completion = await groq.chat.completions.create({
                messages: [{ role: 'system', content: MASTER_INSTRUCTION + "\nCONTEXTO:\n" + context }, { role: 'user', content: message }],
                model: "llama-3.3-70b-versatile"
            });
            return completion.choices[0].message.content;
        } catch (e) { }
    }

    for (const key of geminiKeys) {
        try {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(`${MASTER_INSTRUCTION}\nContexto: ${context}\nMensaje: ${message}`);
            return result.response.text();
        } catch (e) { }
    }
    return "Lo siento, estoy teniendo un problema técnico. Un asesor humano te contactará pronto.";
}

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "gihart-v5-final" }), // ID NUEVO PARA FORZAR QR
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--shm-size=1gb', '--disable-gpu']
    }
});

client.on('qr', (qr) => { latestQR = qr; qrcode.generate(qr, { small: true }); });
client.on('ready', () => console.log('✅ WhatsApp listo!'));

client.on('message_create', async msg => {
    if (msg.from === 'status@broadcast' || msg.fromMe) return;
    const chat = await msg.getChat();
    if (chat.isGroup) return;

    try {
        await chat.sendStateTyping();
        const { data: prods } = await supabase.from('products').select('name, price, wholesale_price');
        const context = prods.map(p => `- ${p.name.toUpperCase()} ($${p.price} | Mayoreo: $${p.wholesale_price || 'N/A'})`).join('\n');

        let imgB64 = null;
        if (msg.hasMedia) {
            const m = await msg.downloadMedia();
            if (m.mimetype.startsWith('image/')) imgB64 = m.data;
        }

        const reply = await askAI(msg.body, context, imgB64);
        await msg.reply(reply);
    } catch (e) {
        console.error('Error WA:', e);
    }
});

client.initialize().catch(err => console.error('Fail WA:', err));
