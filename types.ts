
export enum AspectRatio {
  SQUARE = '1:1',
  LANDSCAPE = '16:9',
  PORTRAIT = '9:16',
  THREE_FOUR = '3:4',
  FOUR_THREE = '4:3'
}

export enum ImageSize {
  K1 = '1K',
  K2 = '2K',
  K4 = '4K'
}

export type CategoryType = 'Polos' | 'Playeras' | 'Accesorios' | 'Cuadros' | 'Pinturas' | 'Videos';
export type GenderType = 'Hombre' | 'Mujer' | 'Unisex';
export type SubcategoryType = 'Cintos' | 'Bandoleras' | 'Calcetines' | 'Gorras' | 'Varios';

export interface Product {
  id: string;
  name: string;
  price: number;
  wholesalePrice: number;
  category: CategoryType;
  gender: GenderType;
  image: string;
  description: string;
  sizes: string[];
  isPromotion?: boolean;
  isSoldOut?: boolean;
  promoPrice?: number;
  subcategory?: string;
  subcategory_id?: string;
}

export interface GalleryItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  name: string;
  category: CategoryType;
  isFeatured?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface SocialConfig {
  facebookStoreUrl: string;
  whatsappNumber: string;
}
