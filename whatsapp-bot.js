
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

// --- 1. SERVIDOR EXPRESS (INICIO RÁPIDO PARA EVITAR 404 EN KOYEB) ---
const app = express();
const port = process.env.PORT || 8080;

app.listen(port, '0.0.0.0', () => {
    console.log(`📡 Servidor de Salud iniciado en puerto ${port}`);
});

app.get('/', (req, res) => {
    res.status(200).send('<h1>Status: Online 🚀</h1><p>Gihart & Hersel: WhatsApp Bot activo.</p><a href="/qr">Ver Código QR</a>');
});

let latestQR = "";
app.get('/qr', async (req, res) => {
    if (!latestQR) return res.send('<h1>Iniciando motor de WhatsApp...</h1><p>Recarga en 10 segundos.</p><script>setTimeout(()=>location.reload(), 5000)</script>');
    try {
        const qrImage = await QRCodeNode.toDataURL(latestQR);
        res.send(`
            <div style="text-align:center; padding:50px; font-family:sans-serif; background:#000; color:#fff; min-height:100vh;">
                <h1 style="color:#ff0080;">Vincular WhatsApp</h1>
                <img src="${qrImage}" style="width:300px; border:10px solid #fff; border-radius:20px;" />
                <p>Escanea este código para activar el bot.</p>
                <script>setTimeout(()=>location.reload(), 15000)</script>
            </div>
        `);
    } catch (e) { res.status(500).send('Error QR'); }
});

// --- 2. IA Y DATOS (REGLAS ESTRICTAS: SIN ENVÍOS) ---
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const storeInstruction = `Eres el Curador Maestro de Gihart & Hersel (TIENDA FÍSICA).
TONO: Sofisticado, elegante.

REGLAS DE ORO:
1. NO HACEMOS ENVÍOS: Siempre di que la entrega es personal o en punto físico (Tienda). NO manejamos paquetería.
2. PRECIOS: Público (1 pza), Mayoreo (6+ piezas). Respeta los precios reales del catálogo.
3. NO INVENTES MODELOS: Si no está abajo, no lo tienes.

ESTILO: Breve y negritas.`;

async function getProducts() {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
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
                messages: [{ role: 'system', content: storeInstruction + "\nContexto:\n" + context }, { role: 'user', content: message }],
                model: "llama-3.3-70b-versatile"
            });
            return completion.choices[0].message.content;
        } catch (e) { }
    }

    for (const key of geminiKeys) {
        try {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
            const result = await model.generateContent(`${storeInstruction}\nContexto: ${context}\nMensaje: ${message}`);
            return result.response.text();
        } catch (e) { }
    }
    return "Hola! Un asesor humano te contactará pronto para ayudarte.";
}

// --- 3. WHATSAPP CLIENT (ID FIJO PARA ESTABILIDAD) ---
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "bot-gihart-final-v1" }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--shm-size=1gb']
    }
});

client.on('qr', (qr) => {
    latestQR = qr;
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => console.log('✅ WhatsApp Conectado!'));

client.on('message_create', async msg => {
    if (msg.from === 'status@broadcast' || msg.fromMe) return;
    const chat = await msg.getChat();
    if (chat.isGroup) return;

    try {
        await chat.sendStateTyping();
        const prods = await getProducts();
        const context = prods.map(p => `- ${p.name.toUpperCase()} ($${p.price} | Mayoreo: $${p.wholesale_price || 'N/A'})`).join('\n');
        const response = await askAI(msg.body, context);
        await msg.reply(response);
    } catch (e) { console.error('Error en WA:', e); }
});

client.initialize().catch(err => console.log('Error al iniciar WhatsApp:', err));
