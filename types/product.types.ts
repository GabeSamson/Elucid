export interface ColorOption {
  name: string;
  hexCode: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  size: string;
  color: string;
  stock: number;
  sku?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number | null;
  images: string[];
  colorImages: Record<string, string[]>;
  stock: number;
  collectionId?: string | null;
  collection?: Collection | null;
  sizes: string[];
  colors: ColorOption[];
  variants?: ProductVariant[];
  featured: boolean;
  active: boolean;
  includeShipping: boolean;
  comingSoon: boolean;
  releaseDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  size?: string;
  color?: string;
}

export interface Order {
  id: string;
  userId?: string | null;
  email?: string | null;
  name: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  subtotal: number;
  shipping: number;
  tax: number;
  discount?: number;
  total: number;
  promoCodeCode?: string | null;
  promoCodeId?: string | null;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  trackingNumber?: string | null;
  stripePaymentId?: string | null;
  isInPerson: boolean;
  notes?: string | null;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productImage?: string | null;
  quantity: number;
  size?: string | null;
  color?: string | null;
  priceAtPurchase: number;
  createdAt: string;
}
