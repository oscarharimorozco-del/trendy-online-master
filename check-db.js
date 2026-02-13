
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDatabase() {
    console.log('--- REVISIÓN DE BASE DE DATOS ---');

    // 1. Check Tables
    const tables = ['products', 'gallery', 'settings', 'subcategories'];
    for (const table of tables) {
        const { data, error, count } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            console.error(`❌ Error en tabla "${table}":`, error.message);
        } else {
            console.log(`✅ Tabla "${table}" existe. Registros: ${count}`);
        }
    }

    // 2. Check Subcategories content
    console.log('\n--- CONTENIDO DE SUBCATEGORÍAS ---');
    const { data: subcats, error: scError } = await supabase.from('subcategories').select('*');
    if (scError) {
        console.error('❌ Error al leer subcategorías:', scError.message);
    } else {
        console.log(`✅ Subcategorías encontradas: ${subcats.length}`);
        subcats.forEach(sc => console.log(`  - ${sc.name} (${sc.category})`));
    }

    // 3. Check Settings content
    console.log('\n--- CONFIGURACIONES (SETTINGS) ---');
    const { data: settings, error: sError } = await supabase.from('settings').select('*');
    if (sError) {
        console.error('❌ Error al leer settings:', sError.message);
    } else {
        settings.forEach(s => {
            const val = s.key.includes('key') ? '****' + s.value.slice(-4) : s.value;
            console.log(`  - ${s.key}: ${val}`);
        });
    }
}

checkDatabase();
