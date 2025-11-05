// Google Analytics 4 E-commerce Event Tracking
// https://developers.google.com/analytics/devguides/collection/ga4/ecommerce

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

// Track product views
export const trackProductView = (product: {
  id: string;
  name: string;
  price: number;
  currency?: string;
}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'view_item', {
      currency: product.currency || 'GBP',
      value: product.price,
      items: [
        {
          item_id: product.id,
          item_name: product.name,
          price: product.price,
        },
      ],
    });
  }
};

// Track add to cart
export const trackAddToCart = (product: {
  id: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
  currency?: string;
}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'add_to_cart', {
      currency: product.currency || 'GBP',
      value: product.price * product.quantity,
      items: [
        {
          item_id: product.id,
          item_name: product.name,
          price: product.price,
          quantity: product.quantity,
          item_variant: product.size || product.color || undefined,
        },
      ],
    });
  }
};

// Track begin checkout
export const trackBeginCheckout = (items: Array<{
  id: string;
  name: string;
  price: number;
  quantity: number;
}>, totalValue: number, currency: string = 'GBP') => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'begin_checkout', {
      currency,
      value: totalValue,
      items: items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
    });
  }
};

// Track purchase
export const trackPurchase = (
  orderId: string,
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>,
  totalValue: number,
  currency: string = 'GBP',
  shipping?: number,
  tax?: number
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'purchase', {
      transaction_id: orderId,
      currency,
      value: totalValue,
      shipping: shipping || 0,
      tax: tax || 0,
      items: items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
    });
  }
};

// Track search
export const trackSearch = (searchTerm: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'search', {
      search_term: searchTerm,
    });
  }
};

// Track page view (for SPA navigation)
export const trackPageView = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
};
