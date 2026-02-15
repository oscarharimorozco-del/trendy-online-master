import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN || 'trendy_secret_token_123';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

const MASTER_INSTRUCTION = `Eres el Agente de Élite de Gihart & Hersel.
REGLAS DE ORO (OBLIGATORIAS):
1. ENTREGA: Solo personal en tienda. NO TENEMOS ENVÍOS.
2. PRECIOS: Siempre, sin excepción, menciona el PRECIO PÚBLICO y el PRECIO MAYOREO ($180 a partir de 6 pzas) en tu respuesta.
3. FIDELIDAD: Los códigos (AX, HB, PS, VS) son marcas reales. Úsalas.
4. SI NO ESTÁ: Si no está en el catálogo adjunto, di que no lo tienes.
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
            return `- PRODUCTO: ${p.name.toUpperCase()} | PRECIO PÚBLICO: $${p.price} | PRECIO MAYOREO (6+ pzas): ${wholesaleStr}`;
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
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        // Si es solo una visita del navegador
        if (!mode) return res.send(`🤖 Agente Messenger v5.6 Online. Webhook listo para validación de Facebook.`);

        // Validación de Facebook: Acepta el token de env o el secreto por defecto
        if (mode === 'subscribe' && (token === VERIFY_TOKEN || token === 'trendy_secret_token_123')) {
            console.log('✅ Webhook de Messenger Validado!');
            return res.status(200).send(challenge);
        }

        console.error('❌ Token de Verificación Erróneo');
        return res.sendStatus(403);
    }

    if (req.method === 'POST') {
        const body = req.body;
        if (body.object === 'page') {
            for (const entry of body.entry) {
                const event = entry.messaging?.[0];
                if (event?.message?.text) {
                    const query = event.message.text.toUpperCase();
                    let { data: prods } = await supabase.from('products')
                        .select('name, price, wholesalePrice, wholesale_price, category, is_sold_out, isSoldOut')
                        .or(`name.ilike.%${query}%,category.ilike.%${query}%`)
                        .limit(10);

                    if (!prods || prods.length === 0) {
                        const { data: latest } = await supabase.from('products')
                            .select('name, price, wholesalePrice, wholesale_price, category, is_sold_out, isSoldOut')
                            .order('created_at', { ascending: false })
                            .limit(12);
                        prods = latest;
                    }

                    const context = formatContext(prods || []);
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
