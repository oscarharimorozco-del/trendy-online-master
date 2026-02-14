
import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

dotenv.config();

const app = express();
app.use(bodyParser.json());
const port = process.env.PORT || 5000;

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;

const storeInstruction = `Eres el Asesor Virtual de Gihart & Hersel (TIENDA FÍSICA).
REGLAS:
1. NO HACEMOS ENVÍOS.
2. PRECIOS: Público (1 pza), Mayoreo (6+ pzas).
3. NO INVENTES.
TONO: Elegante.`;

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
    for (const key of keys.groq) {
        try {
            const groq = new Groq({ apiKey: key });
            const completion = await groq.chat.completions.create({
                messages: [{ role: 'system', content: storeInstruction + "\nContexto:\n" + context }, { role: 'user', content: message }],
                model: "llama-3.3-70b-versatile"
            });
            return completion.choices[0].message.content;
        } catch (e) { }
    }
    return "Gracias por escribir. Un asesor le atenderá pronto.";
}

app.get('/webhook', (req, res) => {
    if (req.query['hub.verify_token'] === VERIFY_TOKEN) return res.send(req.query['hub.challenge']);
    res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
    if (req.body.object === 'page') {
        for (const entry of req.body.entry) {
            const event = entry.messaging?.[0];
            if (event?.message?.text) {
                const { data: prods } = await supabase.from('products').select('*');
                const context = prods.map(p => `- ${p.name} ($${p.price})`).join('\n');
                const response = await askAI(event.message.text, context);
                await fetch(`https://graph.facebook.com/v12.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
                    method: 'POST',
                    body: JSON.stringify({ recipient: { id: event.sender.id }, message: { text: response } }),
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
        res.status(200).send('EVENT_RECEIVED');
    }
});

app.listen(port, () => console.log(`Messenger Bot listo en puerto ${port}`));
