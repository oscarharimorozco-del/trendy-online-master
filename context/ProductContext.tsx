
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, GalleryItem } from '../types';
import { supabase } from '../services/supabase';

interface ProductContextType {
  products: Product[];
  gallery: GalleryItem[];
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  addToGallery: (item: Omit<GalleryItem, 'id'>) => Promise<void>;
  removeFromGallery: (id: string) => Promise<void>;
  isLoading: boolean;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;
      setProducts(productsData || []);

      const { data: galleryData, error: galleryError } = await supabase
        .from('gallery')
        .select('*')
        .order('created_at', { ascending: false });

      if (galleryError) throw galleryError;
      setGallery(galleryData || []);
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
      const { data, error } = await supabase
        .from('products')
        .insert([product])
        .select();

      if (error) throw error;
      if (data) setProducts([data[0], ...products]);
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Error al guardar el producto en la nube.');
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
      const { data, error } = await supabase
        .from('gallery')
        .insert([item])
        .select();

      if (error) throw error;
      if (data) setGallery([data[0], ...gallery]);
    } catch (error) {
      console.error('Error adding to gallery:', error);
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
    }
  };

  return (
    <ProductContext.Provider value={{
      products,
      gallery,
      addProduct,
      removeProduct,
      addToGallery,
      removeFromGallery,
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
