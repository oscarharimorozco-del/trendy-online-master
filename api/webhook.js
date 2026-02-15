
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

// INSTRUCCIÓN DE AGENTE DE VENTAS AUTÓNOMO GIHART & HERSEL
const salesInstruction = `Eres el Agente de Ventas Autónomo de Gihart & Hersel.
Tu misión es CERRAR VENTAS en punto físico.
TONO: Sofisticado, elegante, ejecutivo.

REGLAS DE ORO:
1. NO ENVÍOS: Bajo ninguna circunstancia menciones paquetería o envíos a domicilio. Todo es personal.
2. PRECIOS: 1 pza es precio público. 6+ pzas es mayoreo.
3. CATÁLOGO: Solo ofreces lo que está en el contexto. No inventes modelos.
4. Si no sabes algo, di que un director te contactará.

ESTILO: Máximo 3 líneas. Usa negritas para nombres y precios.`;

async function getProducts() {
    const { data } = await supabase.from('products').select('*').limit(20);
    return data || [];
}

async function getAIKeys() {
    let keys = process.env.VITE_GEMINI_API_KEY || "";
    try {
        const { data } = await supabase.from('settings').select('value').eq('key', 'gemini_keys').single();
        if (data?.value) keys += "," + data.value;
    } catch (e) { }

    return {
        groq: (keys.match(/gsk_[a-zA-Z0-9\-_]{30,70}/g) || []),
        gemini: (keys.match(/AIza[a-zA-Z0-9\-_]{30,70}/g) || [])
    };
}

async function askAutonomousAI(message, context) {
    const keys = await getAIKeys();

    // 1. Intentar con Llama 3 70B (Groq) por su velocidad
    for (const key of keys.groq) {
        try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: salesInstruction + "\nCONOCIMIENTO:\n" + context },
                        { role: 'user', content: message }
                    ],
                    model: "llama-3.3-70b-versatile"
                })
            });
            const d = await res.json();
            if (d.choices?.[0]?.message?.content) return d.choices[0].message.content;
        } catch (e) { }
    }

    // 2. Fallback a Gemini 2.0 (Google)
    for (const key of keys.gemini) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `Instrucciones: ${salesInstruction}\nConocimiento: ${context}\nCliente: ${message}` }] }]
                })
            });
            const d = await res.json();
            if (d.candidates?.[0]?.content?.parts?.[0]?.text) return d.candidates[0].content.parts[0].text;
        } catch (e) { }
    }

    return "Gracias por tu interés. Un director de ventas te contactará personalmente en breve.";
}

export default async function handler(req, res) {
    if (req.method === 'GET') {
        if (req.query['hub.verify_token'] === VERIFY_TOKEN) return res.send(req.query['hub.challenge']);
        return res.sendStatus(403);
    }

    if (req.method === 'POST') {
        const body = req.body;
        if (body.object === 'page') {
            for (const entry of body.entry) {
                const event = entry.messaging?.[0];
                if (event?.message?.text) {
                    const products = await getProducts();
                    const context = products.map(p => `- ${p.name.toUpperCase()} ($${p.price} | Mayoreo: $${p.wholesale_price || 'N/A'})`).join('\n');
                    const reply = await askAutonomousAI(event.message.text, context);

                    await fetch(`https://graph.facebook.com/v12.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
                        method: 'POST',
                        body: JSON.stringify({ recipient: { id: event.sender.id }, message: { text: reply } }),
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            }
            return res.status(200).send('EVENT_RECEIVED');
        }
    }
    return res.status(404).send('Not Found');
}
