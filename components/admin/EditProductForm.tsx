'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProductForm from './ProductForm';

interface CollectionOption {
  id: string;
  name: string;
}

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  images: string[];
  colorImages: Record<string, string[]>;
  sizes: string[];
  colors: Array<{ name: string; hexCode: string }>;
  variants: Array<{
    size: string;
    color: string;
    stock: number;
    sku?: string;
  }>;
  collectionId?: string;
  featured: boolean;
  active: boolean;
  includeShipping: boolean;
  comingSoon: boolean;
  targetAudience: 'MALE' | 'FEMALE' | 'UNISEX';
  releaseDate?: string | null;
  priceOverrides?: Record<string, number>;
}

interface EditProductFormProps {
  productId: string;
  initialData: Partial<ProductFormData>;
  collections: CollectionOption[];
}

export default function EditProductForm({
  productId,
  initialData,
  collections,
}: EditProductFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: ProductFormData) => {
    try {
      setError(null);
      setIsSubmitting(true);

      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error || 'Failed to update product');
        return;
      }

      router.push('/admin/products');
      router.refresh();
    } catch (err) {
      console.error('Update product error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-charcoal bg-cream-dark px-4 py-2 text-sm text-charcoal-dark">
          {error}
        </div>
      )}
      <ProductForm
        initialData={initialData}
        collections={collections}
        isEditing
        onSubmit={handleSubmit}
      />
      {isSubmitting && (
        <p className="text-sm text-charcoal/60">
          Saving changes&hellip;
        </p>
      )}
    </div>
  );
}
