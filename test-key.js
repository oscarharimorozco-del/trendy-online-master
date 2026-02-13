
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    console.log("Probando llave:", process.env.VITE_GEMINI_API_KEY.substring(0, 10) + "...");
    try {
        const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hola");
        console.log("Respuesta:");
        console.log(result.response.text());
        console.log("✅ LLAVE VÁLIDA");
    } catch (e) {
        console.error("❌ ERROR CON LA LLAVE:");
        console.error(e.message);
    }
}

test();
