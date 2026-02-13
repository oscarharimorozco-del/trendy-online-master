
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

dotenv.config();
puppeteer.use(StealthPlugin());

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// --- GESTIÓN DE LLAVES API ---
function getApiKeys() {
    const keysString = process.env.VITE_GEMINI_API_KEY || "";
    // Separar por comas y limpiar espacios
    const allKeys = keysString.split(',').map(k => k.trim()).filter(Boolean);

    return {
        groq: allKeys.filter(k => k.startsWith('gsk_')),
        gemini: allKeys.filter(k => k.startsWith('AIza'))
    };
}

// --- CONFIGURACIÓN DE PRUEBA ---
// AQUÍ VAN TU LINKS DE GRUPOS
let GROUP_URLS = [
    'https://www.facebook.com/groups/3920856131323582',
    'https://www.facebook.com/groups/4133359000077836',
    'https://www.facebook.com/groups/832163715708485'
];

async function generatePostContent(product) {
    const keys = getApiKeys();
    const prompt = `Actúa como un experto en ventas de moda premium para la marca "Gihart & Hersel". 
    Crea un post para Facebook súper atractivo.
    Producto: ${product.name}
    Precio Público: $${product.price} MXN
    Mayoreo (6+ piezas): $${product.wholesalePrice} MXN
    Tallas: ${product.sizes?.join(', ') || 'S a XL'}
    
    Instrucciones:
    - Usa emojis de lujo/moda.
    - Sé breve y directo.
    - Menciona que hacemos envíos.
    - Termina con un "Manda mensaje para apartar".`;

    // 1. Intentar con GROQ primero (Suele ser más rápido/estable)
    for (const key of keys.groq) {
        try {
            console.log("🤖 Probando con Groq...");
            const groq = new Groq({ apiKey: key });
            const completion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: "Eres un experto en marketing digital de moda." },
                    { role: "user", content: prompt }
                ],
                model: "llama-3.3-70b-versatile",
            });
            return completion.choices[0].message.content;
        } catch (e) {
            console.warn(`⚠️ Groq falló: ${e.message}. Probando siguiente...`);
        }
    }

    // 2. Intentar con GEMINI (Rotación de claves)
    for (const key of keys.gemini) {
        try {
            console.log("🤖 Probando con Gemini...");
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (e) {
            console.warn(`⚠️ Gemini falló con una clave: ${e.message}. Probando siguiente...`);
        }
    }

    // 3. Fallback manual si todo falla
    console.error("❌ Todas las IAs fallaron. Usando fallback manual.");
    return `🔥 ¡Nueva llegada! ${product.name}\n\n💰 Precio: $${product.price}\n📦 Tallas: ${product.sizes?.join(', ')}\n\nCalidad premium garantizada. ¡Manda mensaje y aparta el tuyo! 🚀`;
}

async function runAutoPoster() {
    console.log('🚀 Iniciando Navegador...');

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            userDataDir: './facebook_session',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-notifications',
                '--start-maximized',
                '--disable-features=IsolateOrigins,site-per-process' // Ayuda con cargas pesadas
            ],
            defaultViewport: null,
            timeout: 60000 // 60 segundos para lanzar
        });
    } catch (e) {
        console.error('❌ Error fatal iniciando el navegador:', e.message);
        console.log('💡 Intenta borrar la carpeta "facebook_session" y ejecutar de nuevo.');
        return;
    }

    const [page] = await browser.pages();

    console.log('📍 Yendo a Facebook...');
    try {
        await page.goto('https://www.facebook.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
    } catch (e) {
        console.error('❌ Error cargando Facebook:', e.message);
        await browser.close();
        return;
    }

    // VERIFICAR LOGIN
    const isLoggedIn = await page.evaluate(() => {
        return document.querySelector('div[aria-label="Cuenta"]') !== null ||
            document.querySelector('div[role="banner"]') !== null;
    });

    if (!isLoggedIn) {
        console.log('\n---------------------------------------------------------');
        console.log('⚠️  NO HAS INICIADO SESIÓN.');
        console.log('POR FAVOR, INICIA SESIÓN EN LA VENTANA QUE SE ABRIÓ.');
        console.log('El script esperará a que estés adentro...');
        console.log('---------------------------------------------------------');

        // Esperar a que el buscador de Facebook aparezca
        await page.waitForSelector('input[aria-label*="Facebook"]', { timeout: 0 });
        console.log('✅ ¡Sesión detectada!');
    } else {
        console.log('✅ Ya tienes una sesión activa.');
    }

    // OBTENER PRODUCTO
    const { data: products, error } = await supabase.from('products').select('*');
    if (error || !products.length) {
        console.error('❌ Error cargando productos');
        return;
    }

    const product = products[Math.floor(Math.random() * products.length)]; // Producto aleatorio
    const postText = await generatePostContent(product);

    console.log('\n--- CONTENIDO DEL POST ---');
    console.log(postText);
    console.log('--------------------------\n');

    for (const groupUrl of GROUP_URLS) {
        if (groupUrl.includes('/feed/')) continue;

        try {
            console.log(`📡 Entrando al grupo: ${groupUrl}`);
            await page.goto(groupUrl, { waitUntil: 'networkidle2' });

            // Esperar un poco a que cargue
            await new Promise(r => setTimeout(r, 5000));

            // Intentar encontrar el botón de crear post
            let postTrigger = null;

            try {
                // 1. Buscar por aria-label (lo más fiable)
                const ariaLabels = [
                    'Crear una publicación pública',
                    'Crear publicación',
                    'Escribe algo...',
                    '¿Qué estás pensando?',
                    'Vendes algo'
                ];

                for (const label of ariaLabels) {
                    const selector = `div[aria-label*="${label}"]`;
                    if (await page.$(selector)) {
                        postTrigger = await page.$(selector);
                        console.log(`✅ Encontré botón por etiqueta: ${label}`);
                        break;
                    }
                }

                // 2. Buscar por texto visible (si no funciona lo anterior)
                if (!postTrigger) {
                    const buttons = await page.$$('div[role="button"], span');
                    for (const button of buttons) {
                        const text = await page.evaluate(el => el.textContent, button);
                        if (text && (text.includes('Escribe algo') || text.includes('Foto/video'))) {
                            postTrigger = button;
                            console.log(`✅ Encontré botón por texto: ${text}`);
                            break;
                        }
                    }
                }

            } catch (e) { console.log("Error buscando botón:", e.message); }

            if (postTrigger) {
                await postTrigger.click();
                await new Promise(r => setTimeout(r, 5000)); // Esperar a que se abra el modal

                // Buscar el área de texto activa (el modal)
                console.log('✍️ Buscando dónde escribir...');

                // Enfocar el área de texto
                const textBox = await page.waitForSelector('div[role="textbox"][contenteditable="true"]', { timeout: 8000 }).catch(() => null);

                if (textBox) {
                    await textBox.click();
                    await new Promise(r => setTimeout(r, 1000));

                    console.log('📋 Texto generado (Cópialo de aquí si lo necesitas):');
                    console.log('---------------------------------------------------');
                    console.log(postText);
                    console.log('---------------------------------------------------');

                    // Solo enfocar el cuadro de texto si se encuentra, pero NO escribir.
                    await textBox.click();
                    console.log('✅ He hecho clic en la caja de texto para que tú escribas o pegues.');


                    console.log('✅ ¡Listo! Texto e imagen preparados.');
                    console.log('Esperando 2 minutos para que verifiques y publiques...');
                    await new Promise(r => setTimeout(r, 120000));
                } else {
                    console.log('❌ Abrí el modal pero no encontré dónde escribir.');
                }
            } else {
                console.log('❌ No encontré el botón para iniciar publicación en este grupo.');
            }
        } catch (e) {
            console.error(`❌ Error: ${e.message}`);
        }
    }

    console.log('🏁 Proceso finalizado.');
}

runAutoPoster();
