
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

let latestQR = "";

// Tiny server for Health Checks & QR Display
const app = express();
const port = process.env.PORT || 8000;

console.log(`🌍 Intentando iniciar servidor en puerto ${port}...`);

app.get('/', (req, res) => {
    console.log('👀 Petición recibida en / (root)');
    res.send('WhatsApp Bot is Alive! 🚀 <br><a href="/qr">Ver QR de WhatsApp</a>');
});

app.get('/qr', async (req, res) => {
    console.log('👀 Petición recibida en /qr');
    if (!latestQR) {
        return res.send('<h1>Aún no se ha generado el código QR</h1><p>Espera unos segundos y recarga...</p><script>setTimeout(() => location.reload(), 3000)</script>');
    }
    try {
        const qrImage = await QRCodeNode.toDataURL(latestQR);
        res.send(`
            <div style="text-align:center; padding: 50px; font-family: sans-serif;">
                <h1>Escanea con WhatsApp</h1>
                <img src="${qrImage}" style="width: 300px; border: 10px solid white; box-shadow: 0 0 20px rgba(0,0,0,0.1);" />
                <p>Si ya escaneaste, el bot se conectará pronto.</p>
                <script>setTimeout(() => location.reload(), 10000)</script>
            </div>
        `);
    } catch (e) {
        console.error('❌ Error generando QR:', e);
        res.status(500).send('Error generando QR');
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`📡 Server listening on port ${port} (0.0.0.0)`);
});

// ==========================================
// 1. CONFIGURACIÓN DE SERVICIOS
// ==========================================

// Supabase - Para leer tus productos reales
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

// Gemini - La inteligencia del bot
// Implementamos el sistema de múltiples llaves aquí también
// Función para obtener llaves frescas (del .env y de la DB)
async function getAIKeys() {
    let keysString = process.env.VITE_GEMINI_API_KEY || "";

    try {
        const { data, error } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'gemini_keys')
            .single();

        if (!error && data?.value) {
            keysString += "," + data.value;
        }
    } catch (e) { /* Silencioso */ }

    // EXTRACCIÓN POR PATRÓN (Regex):
    // Buscamos Gemini (AIza...) y Groq (gsk_...)
    const geminiMatches = keysString.match(/AIza[a-zA-Z0-9\-_]{30,70}/g) || [];
    const groqMatches = keysString.match(/gsk_[a-zA-Z0-9\-_]{30,70}/g) || [];

    return {
        gemini: [...new Set(geminiMatches)],
        groq: [...new Set(groqMatches)]
    };
}

let geminiKeys = (process.env.VITE_GEMINI_API_KEY || "")
    .split(',')
    .map(k => k.trim())
    .filter(Boolean);

const storeInstruction = `Eres el Curador Maestro de Gihart & Hersel. 
Tono sofisticado, elegante pero cercano. 
REGLAS DE PRECIOS:
1. NUNCA inventes precios. Usa solo los que aparecen en el CATALOGO.
2. PRECIO PÚBLICO: Es el precio base.
3. PRECIO MAYOREO: Aplica únicamente a partir de 6 piezas (a menos que el catálogo diga otra cosa).
4. NUNCA ofrezcas paquetes locos como "12 por $250". Los precios son POR UNIDAD.
Si el catálogo dice que una Polo cuesta $450 y mayoreo $350, entonces 12 piezas costarían 12 x 350 = $4200.
Si no estás seguro de un precio o descuento por volumen, dile al cliente que un asesor humano le enviará una cotización formal.
Manten las respuestas breves, con negritas y emojis sutiles.`;

// ==========================================
// 2. FUNCIONES DE APOYO
// ==========================================

async function getProducts() {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error cargando productos:', error);
        return [];
    }
    return data || [];
}

async function askAI(message, context) {
    const allKeys = await getAIKeys();
    let lastError = null;

    // 1. INTENTAR CON GROQ PRIMERO (Si hay llaves)
    if (allKeys.groq.length > 0) {
        for (const key of allKeys.groq) {
            try {
                process.stdout.write(`⚡ Probando Groq... `);
                const groq = new Groq({ apiKey: key });
                const completion = await groq.chat.completions.create({
                    messages: [
                        { role: 'system', content: storeInstruction + "\nCONTEXTO:\n" + context },
                        { role: 'user', content: message }
                    ],
                    model: "llama-3.3-70b-versatile",
                });
                process.stdout.write("✅ ¡ÉXITO (Groq)!\n");
                return completion.choices[0].message.content;
            } catch (error) {
                console.log(`❌ Groq falló: ${error.message}`);
                lastError = error;
            }
        }
    }

    // 2. SI FALLÓ GROQ O NO HAY, INTENTAR CON GEMINI
    if (allKeys.gemini.length > 0) {
        const modelsToTry = ["gemini-2.0-flash-lite", "gemini-flash-latest", "gemini-pro-latest", "gemini-2.0-flash"];

        for (let i = 0; i < allKeys.gemini.length; i++) {
            const key = allKeys.gemini[i];
            for (const modelName of modelsToTry) {
                try {
                    process.stdout.write(`📡 [Gemini ${i + 1}/${allKeys.gemini.length}] Probando ${modelName}... `);
                    const genAI = new GoogleGenerativeAI(key);
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const prompt = `INSTRUCCIONES: ${storeInstruction}\nCONTEXTO:\n${context}\nMENSAJE:\n${message}\nResponde de forma profesional y breve.`;
                    const result = await model.generateContent(prompt);
                    process.stdout.write("✅ ¡ÉXITO!\n");
                    return result.response.text();
                } catch (error) {
                    lastError = error;
                    if (error.message?.includes('429')) break;
                    continue;
                }
            }
        }
    }

    // 3. RESPUESTA DE RESPALDO (MANUAL)
    console.log("⚠️ Todos los motores de IA fallaron. Enviando respuesta manual...");
    return "¡Hola! Gracias por escribir a Gihart & Hersel. Un asesor humano te atenderá en un momento para ayudarte de forma personalizada.";
}

// ==========================================
// 3. INICIALIZACIÓN DEL BOT DE WHATSAPP
// ==========================================

// ==========================================
// 3. INICIALIZACIÓN Y PERSISTENCIA
// ==========================================

let mutedChats = new Set();

async function loadMutedChats() {
    try {
        const { data, error } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'muted_chats')
            .single();

        if (!error && data?.value) {
            mutedChats = new Set(JSON.parse(data.value));
            console.log(`📋 Silencios cargados: ${mutedChats.size} chats silenciados.`);
        }
    } catch (e) {
        console.log("⚠️ No se pudieron cargar los chats silenciados.");
    }
}

async function saveMutedChats() {
    try {
        await supabase
            .from('settings')
            .upsert({ key: 'muted_chats', value: JSON.stringify([...mutedChats]) });
    } catch (e) {
        console.error("❌ Error persistiendo silenciados:", e.message);
    }
}


console.log(`🚀 [${new Date().toISOString()}] Iniciando Curador Maestro v2...`);

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "bot-trendy-v2"
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--shm-size=1gb',      // Aumentar memoria compartida
            '--disable-gpu',
            '--no-zygote',
            '--no-first-run'
        ]
    }
});

client.on('auth_failure', msg => {
    console.error('❌ ERROR DE AUTENTICACIÓN:', msg);
});

client.on('disconnected', (reason) => {
    console.log('⚠️ El cliente se desconectó:', reason);
    // Intentar reinicializar si es necesario
});

client.on('qr', (qr) => {
    latestQR = qr; // Guardamos el código para mostrarlo en la web
    console.log('---------------------------------------------------------');
    console.log('📢 ESCANEA ESTE QR PARA ACTIVAR EL BOT:');
    qrcode.generate(qr, { small: true });
    console.log('💡 TIP DE ESCANEO:');
    console.log('1. Baja el zoom de tu navegador (Ctrl y -) hasta que el QR sea pequeño.');
    console.log('2. O mejor aún, abre este link en tu navegador:');
    console.log(`🔗 https://TU-APP-KOYEB.koyeb.app/qr (usa tu URL de Koyeb)`);
    console.log('---------------------------------------------------------');
});

client.on('ready', async () => {
    console.log('✅ ¡Bot de WhatsApp ACTIVO y listo para vender!');
    await loadMutedChats();
});


client.on('message_create', async (msg) => {
    // Solo procesar si tiene texto
    if (!msg.body) return;

    const chat = await msg.getChat();
    const chatId = chat.id._serialized;

    // Commandos de control manual
    // Funcionan incluso si el mensaje es enviado por nosotros (desde el celular)
    const normalizedMsg = msg.body.trim().toLowerCase();

    if (normalizedMsg === '!silencio') {
        mutedChats.add(chatId);
        await saveMutedChats();
        await msg.reply('🔇 Bot silenciado en este chat. Escribe "!bot" para reactivarlo.');
        console.log(`🔇 Chat silenciado: ${chat.name || msg.from}`);
        return;
    }

    if (normalizedMsg === '!bot') {
        mutedChats.delete(chatId);
        await saveMutedChats();
        await msg.reply('🔊 ¡Bot reactivado! Estoy listo para ayudar.');
        console.log(`🔊 Chat reactivado: ${chat.name || msg.from}`);
        return;
    }

    // --- REGLAS DE IGNORADO ---
    // 1. No responder si el mensaje es de un grupo (opcional, ajusta según necesites)
    if (chat.isGroup) return;

    // 2. No responder si el chat está silenciado
    if (mutedChats.has(chatId)) return;

    // 3. No responder si el mensaje es enviado por nosotros (para evitar bucles)
    // EXCEPTO para los comandos anteriores, por eso esta regla va después.
    if (msg.fromMe) return;


    console.log(`📩 Mensaje de ${msg.from}: ${msg.body}`);

    try {
        // Marcamos como leído y escribiendo...
        await chat.sendSeen();
        await chat.sendStateTyping();

        // Obtenemos solo los productos frescos
        const products = await getProducts();

        const productsContext = products.map(p =>
            `- ${p.name}: $${p.price} MXN (Categoría: ${p.category}, Tallas: ${p.sizes?.join(', ') || 'N/A'})`
        ).join('\n');

        // Consultamos a la IA (Groq o Gemini)
        const response = await askAI(msg.body, productsContext);

        // Enviamos la respuesta
        await msg.reply(response);

    } catch (error) {
        console.error('Error procesando mensaje:', error);
    }
});

client.initialize();
