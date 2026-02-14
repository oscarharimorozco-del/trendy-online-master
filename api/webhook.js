
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

// REGLAS MAESTRAS (SIN ENVÍOS, PRECIOS REALES)
const storeInstruction = `Eres el Curador Maestro de Gihart & Hersel.
TONO: Sofisticado, elegante.

REGLAS DE ORO:
1. NO HACEMOS ENVÍOS: Siempre di que la entrega es personal o en tienda física.
2. PRECIOS: Público (1 pza), Mayoreo (6+ pzas). Usa estrictamente los precios del catálogo.
3. NO INVENTES MODELOS.
ESTILO: Breve y negritas.`;

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

    // Extraer llaves
    const groqKeys = (keys.match(/gsk_[a-zA-Z0-9\-_]{30,70}/g) || []);
    const geminiKeys = (keys.match(/AIza[a-zA-Z0-9\-_]{30,70}/g) || []);

    // Probar Groq
    for (const key of groqKeys) {
        try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'system', content: storeInstruction + "\nContexto:\n" + context }, { role: 'user', content: message }],
                    model: "llama-3.3-70b-versatile"
                })
            });
            const d = await res.json();
            if (d.choices?.[0]?.message?.content) return d.choices[0].message.content;
        } catch (e) { }
    }

    // Probar Gemini
    for (const key of geminiKeys) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `Instrucción: ${storeInstruction}\nContexto: ${context}\nMensaje: ${message}` }] }]
                })
            });
            const d = await res.json();
            if (d.candidates?.[0]?.content?.parts?.[0]?.text) return d.candidates[0].content.parts[0].text;
        } catch (e) { }
    }
    return "Hola! Un asesor le atenderá pronto.";
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
                    const prods = await getProducts();
                    const context = prods.map(p => `- ${p.name.toUpperCase()} ($${p.price} | Mayoreo: $${p.wholesale_price || 'N/A'})`).join('\n');
                    const reply = await askAI(event.message.text, context);
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
    res.sendStatus(404);
}
