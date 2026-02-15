
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

dotenv.config();

// --- 1. CONFIGURACIÓN DEL SERVIDOR DE SALUD (INMEDIATO) ---
const app = express();
app.use(bodyParser.json());
const port = process.env.PORT || 8080;

app.listen(port, '0.0.0.0', () => {
    console.log(`📡 SERVIDOR ESTABLE EN PUERTO ${port}`);
});

app.get('/', (req, res) => {
    res.status(200).send('<h1>Agente Gihart & Hersel v4.0 Online 🚀</h1><p>Estado: Escaneado pendiente o activo.</p><a href="/qr">Ver QR</a>');
});

let latestQR = "";
app.get('/qr', async (req, res) => {
    if (!latestQR) return res.send('<h1>Iniciando cerebro...</h1><p>Espera 10 segundos.</p><script>setTimeout(()=>location.reload(), 5000)</script>');
    try {
        const qrImage = await QRCodeNode.toDataURL(latestQR);
        res.send(`
            <div style="text-align:center; padding:50px; font-family:sans-serif; background:#000; color:#fff; min-height:100vh;">
                <h1>Vincular Agente WhatsApp</h1>
                <img src="${qrImage}" style="width:300px; border:10px solid #fff; border-radius:20px;" />
                <p>Escanea este código para activar la IA.</p>
                <script>setTimeout(()=>location.reload(), 20000)</script>
            </div>
        `);
    } catch (e) { res.status(500).send('Error QR Error'); }
});

// --- 2. IA AUTÓNOMA Y SUPABASE ---
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const autonomousAgentPrompt = `Eres el Agente de Ventas Autónomo de Gihart & Hersel.
Tu objetivo es dar información EXACTA y sofisticada. 

REGLAS CRÍTICAS:
1. NO ENVÍOS: Bajo ningún motivo ofrezcas envíos a domicilio o paquetería.
2. PRECIOS: Público (1 pza), Mayoreo (6+ pzas). 
3. VISIÓN: Si te mandan una foto, identifícala comparándola con el catálogo de abajo.

TONO: Elegante, experto, breve.`;

async function getProducts() {
    const { data } = await supabase.from('products').select('*');
    return data || [];
}

async function askAI(message, context, imageBase64 = null) {
    let keys = process.env.VITE_GEMINI_API_KEY || "";
    try {
        const { data } = await supabase.from('settings').select('value').eq('key', 'gemini_keys').single();
        if (data?.value) keys += "," + data.value;
    } catch (e) { }

    const groqKeys = (keys.match(/gsk_[a-zA-Z0-9\-_]{30,70}/g) || []);
    const geminiKeys = (keys.match(/AIza[a-zA-Z0-9\-_]{30,70}/g) || []);

    // SI HAY IMAGEN: USAR AI DE GOOGLE (VISIÓN)
    if (imageBase64) {
        for (const key of geminiKeys) {
            try {
                const genAI = new GoogleGenerativeAI(key);
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const result = await model.generateContent([
                    { text: `${autonomousAgentPrompt}\nCatálogo:\n${context}` },
                    { inlineData: { data: imageBase64, mimeType: "image/jpeg" } },
                    { text: message || "¿Qué producto es este?" }
                ]);
                return result.response.text();
            } catch (e) { console.error("Error visión:", e.message); }
        }
    }

    // SI ES TEXTO: USAR GROQ (VELOCIDAD)
    for (const key of groqKeys) {
        try {
            const groq = new Groq({ apiKey: key });
            const completion = await groq.chat.completions.create({
                messages: [{ role: 'system', content: autonomousAgentPrompt + "\nCONOCIMIENTO:\n" + context }, { role: 'user', content: message }],
                model: "llama-3.3-70b-versatile"
            });
            return completion.choices[0].message.content;
        } catch (e) { }
    }

    // FALLBACK TEXTO: GEMINI
    for (const key of geminiKeys) {
        try {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(`${autonomousAgentPrompt}\nContexto: ${context}\nMensaje: ${message}`);
            return result.response.text();
        } catch (e) { }
    }

    return "Gracias. Un director humano te atenderá personalmente.";
}

// --- 3. WHATSAPP CLIENT (CONFIGURACIÓN KOYEB) ---
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "gihart-agent-koyeb-definitive" }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

client.on('qr', (qr) => {
    latestQR = qr;
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => console.log('✅ AGENTE AUTÓNOMO CONECTADO A WHATSAPP'));

client.on('message_create', async msg => {
    if (msg.from === 'status@broadcast' || msg.fromMe) return;
    const chat = await msg.getChat();
    if (chat.isGroup) return;

    try {
        await chat.sendStateTyping();
        const prods = await getProducts();
        const context = prods.map(p => `- ${p.name.toUpperCase()} ($${p.price})`).join('\n');

        let imageB64 = null;
        if (msg.hasMedia) {
            const media = await msg.downloadMedia();
            if (media.mimetype.startsWith('image/')) imageB64 = media.data;
        }

        const response = await askAI(msg.body, context, imageB64);
        await msg.reply(response);
    } catch (e) { console.error('Error Agente WA:', e); }
});

client.initialize().catch(err => console.log('Error Initializing Agent:', err));
