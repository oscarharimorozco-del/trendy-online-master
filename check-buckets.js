
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Faltan las variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkBuckets() {
    console.log('--- REVISIÓN DE BUCKETS ---');
    try {
        const { data: buckets, error } = await supabase.storage.listBuckets();
        if (error) {
            console.error('❌ Error al listar buckets:', error.message);
        } else {
            console.log('✅ Buckets encontrados:', buckets.map(b => b.name).join(', '));
            const expected = ['imagenes', 'images'];
            expected.forEach(name => {
                const found = buckets.find(b => b.name === name);
                if (found) {
                    console.log(`✅ Bucket "${name}" EXISTE y es ${found.public ? 'PÚBLICO' : 'PRIVADO'}`);
                } else {
                    console.error(`❌ Bucket "${name}" NO EXISTE.`);
                }
            });
        }
    } catch (err) {
        console.error('❌ Error fatal:', err.message);
    }
}

checkBuckets();
