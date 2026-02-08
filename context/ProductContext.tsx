
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, GalleryItem } from '../types';
import { supabase } from '../services/supabase';

interface ProductContextType {
  products: Product[];
  gallery: GalleryItem[];
  settings: Record<string, string>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  addToGallery: (item: Omit<GalleryItem, 'id'>) => Promise<void>;
  removeFromGallery: (id: string) => Promise<void>;
  updateGalleryItem: (id: string, updates: Partial<GalleryItem>) => Promise<void>;
  updateSettings: (key: string, value: string) => Promise<void>;
  isLoading: boolean;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({
    whatsapp_number: localStorage.getItem('wa_number') || '+521'
  });
  const [isLoading, setIsLoading] = useState(true);

  // Helper to map snake_case to camelCase
  const mapProductFromDB = (p: any): Product => ({
    ...p,
    wholesalePrice: p.wholesale_price || p.wholesalePrice,
    promoPrice: p.promo_price || p.promoPrice,
    isPromotion: p.is_promotion || p.isPromotion,
    isSoldOut: p.is_sold_out || p.isSoldOut,
    // Ensure arrays are handled if stored as JSON/text
    sizes: typeof p.sizes === 'string' ? JSON.parse(p.sizes) : (p.sizes || [])
  });

  const mapGalleryFromDB = (g: any): GalleryItem => ({
    ...g,
    isFeatured: g.is_featured || g.isFeatured
  });

  // Fetch initial data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;
      setProducts((productsData || []).map(mapProductFromDB));

      const { data: galleryData, error: galleryError } = await supabase
        .from('gallery')
        .select('*')
        .order('created_at', { ascending: false });

      if (galleryError) throw galleryError;
      setGallery((galleryData || []).map(mapGalleryFromDB));

      // Fetch Global Settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('*');

      if (!settingsError && settingsData) {
        const settingsMap: Record<string, string> = {};
        settingsData.forEach(s => settingsMap[s.key] = s.value);
        setSettings(prev => ({ ...prev, ...settingsMap }));
      }

    } catch (error) {
      console.error('Error fetching Supabase data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addProduct = async (product: Omit<Product, 'id'>) => {
    try {
      const dbProduct: any = {
        ...product,
        wholesale_price: product.wholesalePrice,
        promo_price: product.promoPrice,
        is_promotion: product.isPromotion,
        is_sold_out: product.isSoldOut
      };

      // Remove camelCase properties to avoid "Column not found" errors
      delete dbProduct.wholesalePrice;
      delete dbProduct.promoPrice;
      delete dbProduct.isPromotion;
      delete dbProduct.isSoldOut;

      const { data, error } = await supabase
        .from('products')
        .insert([dbProduct])
        .select();

      if (error) throw error;
      if (data) setProducts([mapProductFromDB(data[0]), ...products]);
    } catch (error: any) {
      console.error('Error adding product:', error);
      throw error;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const dbUpdates: any = { ...updates };
      if (updates.wholesalePrice !== undefined) dbUpdates.wholesale_price = updates.wholesalePrice;
      if (updates.promoPrice !== undefined) dbUpdates.promo_price = updates.promoPrice;
      if (updates.isPromotion !== undefined) dbUpdates.is_promotion = updates.isPromotion;
      if (updates.isSoldOut !== undefined) dbUpdates.is_sold_out = updates.isSoldOut;

      // Cleanup camelCase keys if they shouldn't be sent to DB (Supabase ignores extras usually, but safer to be clean)
      delete dbUpdates.wholesalePrice;
      delete dbUpdates.promoPrice;
      delete dbUpdates.isPromotion;
      delete dbUpdates.isSoldOut;

      const { error } = await supabase.from('products').update(dbUpdates).eq('id', id);
      if (error) throw error;
      setProducts(products.map(p => p.id === id ? { ...p, ...updates } : p));
    } catch (error: any) {
      console.error('Error updating product:', error);
      throw error;
    }
  };

  const removeProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setProducts(products.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error removing product:', error);
    }
  };

  const addToGallery = async (item: Omit<GalleryItem, 'id'>) => {
    try {
      const dbItem: any = {
        ...item,
        is_featured: item.isFeatured
      };

      // Remove camelCase property
      delete dbItem.isFeatured;

      const { data, error } = await supabase
        .from('gallery')
        .insert([dbItem])
        .select();

      if (error) throw error;
      if (data) setGallery([mapGalleryFromDB(data[0]), ...gallery]);
    } catch (error) {
      console.error('Error adding to gallery:', error);
      throw error;
    }
  };

  const removeFromGallery = async (id: string) => {
    try {
      const { error } = await supabase
        .from('gallery')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setGallery(gallery.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error removing from gallery:', error);
      throw error;
    }
  };

  const updateGalleryItem = async (id: string, updates: Partial<GalleryItem>) => {
    try {
      const dbUpdates: any = { ...updates };
      if (updates.isFeatured !== undefined) dbUpdates.is_featured = updates.isFeatured;
      delete dbUpdates.isFeatured;

      const { error } = await supabase.from('gallery').update(dbUpdates).eq('id', id);
      if (error) throw error;
      setGallery(gallery.map(item => item.id === id ? { ...item, ...updates } : item));
    } catch (error: any) {
      console.error('Error updating gallery item:', error);
      throw error;
    }
  };

  const updateSettings = async (key: string, value: string) => {
    try {
      const { error } = await supabase.from('settings').upsert({ key, value });
      if (error) throw error;
      setSettings(prev => ({ ...prev, [key]: value }));
      if (key === 'whatsapp_number') localStorage.setItem('wa_number', value);
    } catch (error: any) {
      console.error('Error updating settings:', error);
      // Fail silently or alert? Alert for the user.
      alert(`Error al guardar configuración: ${error.message}. Asegúrese de haber creado la tabla 'settings' en Supabase.`);
    }
  };

  return (
    <ProductContext.Provider value={{
      products,
      gallery,
      settings,
      addProduct,
      updateProduct,
      removeProduct,
      addToGallery,
      removeFromGallery,
      updateGalleryItem,
      updateSettings,
      isLoading
    }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) throw new Error('useProducts must be used within a ProductProvider');
  return context;
};
