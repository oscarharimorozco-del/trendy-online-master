
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pjtlypmeiwaisketufos.supabase.co';
const supabaseAnonKey = 'sb_publishable_Fx2k7dH4gCbb4FsS8l0t3Q_L5qA77o4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUpload() {
    console.log('--- DIAGNÓSTICO DE STORAGE ---');

    try {
        // 1. Listar Buckets
        const { data: buckets, error: bError } = await supabase.storage.listBuckets();
        if (bError) {
            console.error('❌ Error al listar buckets:', bError.message);
        } else {
            console.log('✅ Buckets:', buckets.map(b => b.name).join(', '));
            if (!buckets.find(b => b.name === 'images')) {
                console.error('❌ NO EXISTE EL BUCKET "images". Créalo en Supabase -> Storage.');
            }
        }

        // 2. Intentar subida
        const dummy = new Blob(['test'], { type: 'text/plain' });
        const { data, error } = await supabase.storage.from('images').upload(`test-${Date.now()}.txt`, dummy);

        if (error) {
            console.error('❌ ERROR DE SUBIDA:', error.message);
            console.error('Detalles:', JSON.stringify(error));
        } else {
            console.log('✅ SUBIDA ÉXITO:', data.path);
        }
    } catch (err) {
        console.error('❌ ERROR FATAL:', err.message);
    }
}

testUpload();
