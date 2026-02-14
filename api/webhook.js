import { createClient } from '@supabase/supabase-js';

const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN || 'trendy_secret_token_123';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

const storeInstruction = `Eres el Asesor Virtual de Gihart & Hersel (TIENDA FÍSICA).
Tu objetivo es vender y dar información EXACTA.

REGLAS DE ORO:
1. NO HACEMOS ENVÍOS: Bajo ninguna circunstancia menciones envíos a domicilio, paquetería o envíos nacionales. La entrega es personal o en tienda física.
2. PRECIOS: Precio Público es por 1 pieza. Mayoreo solo aplica en 6 piezas o más (di precio unitario).
3. NO INVENTES: Si no encuentras el modelo en el contexto de abajo, di que no lo manejas.
4. TALLAS: Usa nombres claros (Chica, Mediana, Grande).

ESTILO:
- Sofisticado, breve (máximo 3 líneas).
- Usa negritas para precios y modelos.`;

async function getAIKeys() {
    let keysString = process.env.VITE_GEMINI_API_KEY || "";
    try {
        const { data, error } = await supabase.from('settings').select('value').eq('key', 'gemini_keys').single();
        if (!error && data?.value) keysString += "," + data.value;
    } catch (e) { }
    const geminiMatches = keysString.match(/AIza[a-zA-Z0-9\-_]{30,70}/g) || [];
    const groqMatches = keysString.match(/gsk_[a-zA-Z0-9\-_]{30,70}/g) || [];
    return { gemini: [...new Set(geminiMatches)], groq: [...new Set(groqMatches)] };
}

async function getProducts() {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    return error ? [] : (data || []);
}

async function askAI(message, context) {
    const allKeys = await getAIKeys();

    // Probar Groq
    if (allKeys.groq.length > 0) {
        for (const key of allKeys.groq) {
            try {
                const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: [
                            { role: 'system', content: storeInstruction + "\nCONTEXTO:\n" + context },
                            { role: 'user', content: message }
                        ],
                        model: "llama-3.3-70b-versatile",
                    })
                });
                const data = await res.json();
                if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
            } catch (e) { }
        }
    }

    // Probar Gemini
    if (allKeys.gemini.length > 0) {
        const models = ["gemini-2.0-flash-lite", "gemini-flash-latest"];
        for (const modelName of models) {
            for (const key of allKeys.gemini) {
                try {
                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: `INSTRUCCIONES: ${storeInstruction}\nCONTEXTO:\n${context}\nMENSAJE:\n${message}` }] }]
                        })
                    });
                    const data = await res.json();
                    if (data.candidates?.[0]?.content?.parts?.[0]?.text) return data.candidates[0].content.parts[0].text;
                } catch (e) { }
            }
        }
    }

    return "¡Hola! Gracias por escribir a Gihart & Hersel. Un asesor personal le atenderá pronto.";
}

async function sendToMessenger(sender_psid, text) {
    try {
        await fetch(`https://graph.facebook.com/v12.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
            method: 'POST',
            body: JSON.stringify({ recipient: { id: sender_psid }, message: { text } }),
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) { console.error('Error Messenger:', e); }
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
                    const context = products.map(p => {
                        const hasPromo = p.is_promotion && p.promo_price > 0;
                        const pub = p.price > 0 ? `$${p.price} MXN` : 'Consultar';
                        const promo = hasPromo ? ` | 🔥 PROMO: $${p.promo_price} MXN` : '';
                        const whole = p.wholesale_price > 0 ? `$${p.wholesale_price} MXN` : 'Consultar';
                        return `- ${p.name.toUpperCase()} (Cat: ${p.category}) | Precio: ${pub} ${promo} | Mayoreo (6+): ${whole} | Tallas: ${p.sizes?.join(', ') || 'Consultar'} | ${p.is_sold_out ? 'AGOTADO' : 'Disponible'}`;
                    }).join('\n');

                    const aiResponse = await askAI(event.message.text, context);
                    await sendToMessenger(event.sender.id, aiResponse);
                }
            }
            return res.status(200).send('EVENT_RECEIVED');
        }
        return res.sendStatus(404);
    }
    return res.sendStatus(405);
}
