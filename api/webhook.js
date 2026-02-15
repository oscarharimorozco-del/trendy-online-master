
import { createClient } from '@supabase/supabase-js';

const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

const MASTER_INSTRUCTION = `Eres el Agente de Élite de Gihart & Hersel (TIENDA FÍSICA).
REGLAS DE ORO (INVIOLABLES):
1. ENTREGA: Solo personal en tienda física. NO TENEMOS ENVÍOS.
2. PRECIOS: Público (1 pza), Mayoreo (6+ pzas).
3. FIDELIDAD: Los códigos como 'AX', 'HB', 'PS', 'VS' son los nombres reales de las marcas.
4. EXACTITUD: Si el cliente pregunta por algo, revisa la lista. Si no está, di: "Ese modelo no lo tengo por ahora".
5. NO INVENTES: No inventes precios ni disponibilidad.

TONO: Sofisticado, muy breve y 100% veraz.`;

async function getProducts() {
    const { data } = await supabase.from('products')
        .select('name, price, wholesalePrice, wholesale_price, category, is_sold_out, isSoldOut')
        .order('created_at', { ascending: false });
    return data || [];
}

function formatContext(prods) {
    return prods
        .filter(p => !p.is_sold_out && !p.isSoldOut)
        .map(p => {
            const wholesale = p.wholesalePrice || p.wholesale_price || 0;
            const wholesaleStr = wholesale > 0 ? `$${wholesale}` : "Consultar";
            return `- ${p.name.toUpperCase()}: Público $${p.price} | Mayoreo $${wholesaleStr}`;
        })
        .join('\n');
}

async function askAI(message, context) {
    let keys = process.env.VITE_GEMINI_API_KEY || "";
    try {
        const { data } = await supabase.from('settings').select('value').eq('key', 'gemini_keys').single();
        if (data?.value) keys += "," + data.value;
    } catch (e) { }

    const groqKeys = (keys.match(/gsk_[a-zA-Z0-9\-_]{30,70}/g) || []);
    const geminiKeys = (keys.match(/AIza[a-zA-Z0-9\-_]{30,70}/g) || []);

    const fullPrompt = `${MASTER_INSTRUCTION}\n\nCATÁLOGO REAL:\n${context}\n\nCliente: ${message}`;

    for (const key of groqKeys) {
        try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'system', content: fullPrompt }],
                    model: "llama-3.3-70b-versatile"
                })
            });
            const d = await res.json();
            if (d.choices?.[0]?.message?.content) return d.choices[0].message.content;
        } catch (e) { }
    }

    for (const key of geminiKeys) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
            });
            const d = await res.json();
            if (d.candidates?.[0]?.content?.parts?.[0]?.text) return d.candidates[0].content.parts[0].text;
        } catch (e) { }
    }
    return "Hola! Un asesor humano te contactará pronto.";
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
                    const context = formatContext(prods);
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
