
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const key = process.env.VITE_GEMINI_API_KEY.split(',')[0].trim();
const genAI = new GoogleGenerativeAI(key);

async function checkModels() {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();
        console.log("Modelos disponibles para esta llave:");
        if (data.models) {
            data.models.forEach(m => {
                if (m.supportedGenerationMethods.includes('generateContent')) {
                    console.log(`- ${m.name} (${m.displayName})`);
                }
            });
        } else {
            console.log("No se devolvió lista de modelos o error:", data);
        }
    } catch (e) {
        console.error("Error consultando modelos:", e);
    }
}

checkModels();
