
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    const key = process.env.VITE_GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`;

    console.log("Probando llave con v1...");
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: "Hola" }] }] })
        });
        const data = await response.json();
        if (data.error) {
            console.error("❌ ERROR API:", data.error.message);
        } else {
            console.log("✅ ÉXITO:");
            console.log(data.candidates[0].content.parts[0].text);
        }
    } catch (e) {
        console.error("❌ ERROR RED:", e.message);
    }
}

test();
