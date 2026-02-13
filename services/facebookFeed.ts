
import { Product } from '../types';
import { supabase } from './supabase';

const BUCKET_NAME = 'imagenes'; // Using the known public bucket
const FILE_PATH = 'facebook_catalog.csv';
const STORE_URL = 'https://trendyonline.vercel.app'; // Update this if your domain is different

export const facebookFeedService = {
    generateAndUpload: async (products: Product[]) => {
        try {
            console.log('Generando feed de Facebook...');

            // 1. Crear cabecera CSV
            const headers = [
                'id',
                'title',
                'description',
                'availability',
                'condition',
                'price',
                'link',
                'image_link',
                'brand',
                'google_product_category'
            ].join(',');

            // 2. Crear filas
            const rows = products.map(product => {
                // Limpiar campos de comas y saltos de línea para CSV
                const clean = (text: string) => `"${(text || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;

                const availability = product.isSoldOut ? 'out of stock' : 'in stock';
                const price = `${product.price} MXN`;
                const link = `${STORE_URL}/#/shop?id=${product.id}`;

                // Mapeo inteligente de categorías para Facebook
                let googleCategory = 'Apparel & Accessories > Clothing';
                if (product.category === 'Accesorios') googleCategory = 'Apparel & Accessories > Clothing Accessories';
                if (product.category === 'Cuadros' || product.category === 'Pinturas') googleCategory = 'Arts & Entertainment > Hobbies & Creative Arts > Artwork';

                return [
                    clean(product.id),
                    clean(product.name),
                    clean(`${product.description || product.name} | Tallas: ${product.sizes.join(', ')}`),
                    availability,
                    'new',
                    price,
                    link,
                    product.image,
                    'Gihart & Hersel',
                    googleCategory
                ].join(',');
            });

            // 3. Unir todo
            const csvContent = [headers, ...rows].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

            // 4. Subir a Supabase
            const { data, error } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(FILE_PATH, blob, {
                    contentType: 'text/csv',
                    upsert: true
                });

            if (error) throw error;

            // 5. Obtener URL pública
            const { data: publicData } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(FILE_PATH);

            console.log('Feed de Facebook actualizado:', publicData.publicUrl);
            return publicData.publicUrl;

        } catch (error) {
            console.error('Error generando feed de Facebook:', error);
            throw error;
        }
    }
};
