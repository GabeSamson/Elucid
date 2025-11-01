'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ReviewForm from './ReviewForm';

export default function ReviewFormWithParams() {
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId');
  const [productName, setProductName] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(!!productId);

  useEffect(() => {
    if (productId) {
      // Fetch product name
      fetch(`/api/products/${productId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.product) {
            setProductName(data.product.name);
          }
        })
        .catch((error) => console.error('Error fetching product:', error))
        .finally(() => setLoading(false));
    }
  }, [productId]);

  if (loading) {
    return (
      <div className="pt-32 pb-20 px-6 flex items-center justify-center">
        <div className="text-charcoal/60">Loading...</div>
      </div>
    );
  }

  return <ReviewForm productId={productId || undefined} productName={productName} />;
}
