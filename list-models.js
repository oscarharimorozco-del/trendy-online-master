
import dotenv from 'dotenv';
dotenv.config();

async function list() {
    const key = process.env.VITE_GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

    console.log("Listando modelos...");
    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log("Respuesta completa:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("❌ ERROR RED:", e.message);
    }
}

list();
