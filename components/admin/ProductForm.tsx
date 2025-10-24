'use client';

import { useState, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import ImageUploader from './ImageUploader';
import { getCurrencySymbol } from '@/lib/currency';

interface ColorOption {
  name: string;
  hexCode: string;
}

interface ProductVariant {
  size: string;
  color: string;
  stock: number;
  sku?: string;
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
  colors: ColorOption[];
  variants: ProductVariant[];
  collectionId?: string;
  featured: boolean;
  active: boolean;
}

interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  onSubmit: (data: ProductFormData) => Promise<void>;
  collections: Array<{ id: string; name: string }>;
  isEditing?: boolean;
}

export default function ProductForm({
  initialData,
  onSubmit,
  collections,
  isEditing = false,
}: ProductFormProps) {
  const currencySymbol = getCurrencySymbol();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
  } = useForm<ProductFormData>({
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      price: initialData?.price || 0,
      compareAtPrice: initialData?.compareAtPrice,
      costPrice: initialData?.costPrice,
      images: initialData?.images || [],
      sizes: initialData?.sizes || [],
    colors: initialData?.colors || [],
    variants: initialData?.variants || [],
    collectionId: initialData?.collectionId,
    featured: initialData?.featured ?? false,
    active: initialData?.active ?? true,
    colorImages: initialData?.colorImages || {},
  },
});

const [images, setImages] = useState<string[]>(initialData?.images || []);
const [sizes, setSizes] = useState<string[]>(initialData?.sizes || []);
const [colors, setColors] = useState<ColorOption[]>(initialData?.colors || []);
const [variants, setVariants] = useState<ProductVariant[]>(initialData?.variants || []);
const [colorImages, setColorImages] = useState<Record<string, string[]>>(
  initialData?.colorImages || {}
);

  // Size management
  const [newSize, setNewSize] = useState('');

  const addSize = () => {
    const trimmed = newSize.trim();
    if (trimmed && !sizes.includes(trimmed)) {
      setSizes([...sizes, trimmed]);
      setNewSize('');
    }
  };

  const removeSize = (size: string) => {
    setSizes(sizes.filter((s) => s !== size));
  };

  // Color management
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#000000');

  const addColor = () => {
    const trimmed = newColorName.trim();
    if (trimmed && !colors.some((c) => c.name === trimmed)) {
      setColors([...colors, { name: trimmed, hexCode: newColorHex }]);
      setNewColorName('');
      setNewColorHex('#000000');
    }
  };

const removeColor = (colorName: string) => {
  setColors(colors.filter((c) => c.name !== colorName));
  setColorImages((prev) => {
    if (!(colorName in prev)) return prev;
    const { [colorName]: _removed, ...rest } = prev;
    return rest;
  });
};

  // Generate variants when sizes or colors change
useEffect(() => {
  if (sizes.length > 0 && colors.length > 0) {
      const newVariants: ProductVariant[] = [];

      sizes.forEach((size) => {
        colors.forEach((color) => {
          // Find existing variant to preserve stock
          const existing = variants.find(
            (v) => v.size === size && v.color === color.name
          );

          newVariants.push({
            size,
            color: color.name,
            stock: existing?.stock || 0,
            sku: existing?.sku || '',
          });
        });
      });

      setVariants(newVariants);
    } else {
      setVariants([]);
    }
  }, [sizes, colors]);

useEffect(() => {
  setColorImages((prev) => {
    const next: Record<string, string[]> = {};
    let changed = false;

    colors.forEach((color) => {
      const existing = prev[color.name] || [];
      next[color.name] = existing;
      if (prev[color.name] !== existing) {
        changed = true;
      }
    });

    if (Object.keys(prev).length !== Object.keys(next).length) {
      changed = true;
    }

    return changed ? next : prev;
  });
}, [colors]);

  const updateVariantStock = (size: string, color: string, stock: number) => {
    setVariants(
      variants.map((v) =>
        v.size === size && v.color === color ? { ...v, stock } : v
      )
    );
  };

  const updateVariantSku = (size: string, color: string, sku: string) => {
    setVariants(
      variants.map((v) =>
        v.size === size && v.color === color ? { ...v, sku } : v
      )
    );
  };

  const handleFormSubmit = async (data: ProductFormData) => {
    await onSubmit({
      ...data,
      images,
      colorImages,
      sizes,
      colors,
      variants,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {/* Basic Information */}
      <div className="bg-cream p-6 rounded-lg border border-charcoal/20">
        <h2 className="font-serif text-2xl text-charcoal mb-6">
          Basic Information
        </h2>

        <div className="space-y-4">
          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">
              Product Name *
            </label>
            <input
              {...register('name', { required: 'Product name is required' })}
              className="input-modern"
              placeholder="e.g., Classic Navy Clove Shirt"
            />
            {errors.name && (
              <p className="text-charcoal-dark text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">
              Description *
            </label>
            <textarea
              {...register('description', { required: 'Description is required' })}
              rows={4}
              className="input-modern"
              placeholder="Detailed product description..."
            />
            {errors.description && (
              <p className="text-charcoal-dark text-sm mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Price Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
                Sell Price *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/60 z-10">
                  {currencySymbol}
                </span>
                <input
                  {...register('price', {
                    required: 'Price is required',
                    min: { value: 0, message: 'Price must be positive' },
                  })}
                  type="number"
                  step="0.01"
                  className="input-modern pl-8"
                  placeholder="0.00"
                />
              </div>
              {errors.price && (
                <p className="text-charcoal-dark text-sm mt-1">{errors.price.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
                Compare at Price (optional)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/60 z-10">
                  {currencySymbol}
                </span>
                <input
                  {...register('compareAtPrice')}
                  type="number"
                  step="0.01"
                  className="input-modern pl-8"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
                Cost Price (optional)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/60 z-10">
                  {currencySymbol}
                </span>
                <input
                  {...register('costPrice')}
                  type="number"
                  step="0.01"
                  className="input-modern pl-8"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-charcoal/60 mt-1">
                Your cost to manufacture/buy
              </p>
            </div>
          </div>

          {/* Collection */}
          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">
              Collection (optional)
            </label>
            <select
              {...register('collectionId')}
              className="select-modern"
            >
              <option value="">No Collection</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
          </div>

          {/* Toggles */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <Controller
              control={control}
              name="featured"
              defaultValue={initialData?.featured ?? false}
              render={({ field }) => (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                    className="w-4 h-4 rounded border-charcoal/30 text-charcoal focus:ring-charcoal"
                  />
                  <span className="text-sm text-charcoal">
                    Show on homepage
                  </span>
                </label>
              )}
            />

            <Controller
              control={control}
              name="active"
              defaultValue={initialData?.active ?? true}
              render={({ field }) => (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                    className="w-4 h-4 rounded border-charcoal/30 text-charcoal focus:ring-charcoal"
                  />
                  <span className="text-sm text-charcoal">
                    Visible in shop
                  </span>
                </label>
              )}
            />
          </div>
        </div>
      </div>

      {/* Default Images */}
      <div className="bg-cream p-6 rounded-lg border border-charcoal/20">
        <h2 className="font-serif text-2xl text-charcoal mb-6">
          Default Images
        </h2>
        <p className="text-sm text-charcoal/70 mb-4">
          These images are used when no specific colour is selected. They also act as a fallback
          across the storefront.
        </p>
        <ImageUploader images={images} onChange={setImages} maxImages={10} />
      </div>

      {/* Sizes */}
      <div className="bg-cream p-6 rounded-lg border border-charcoal/20">
        <h2 className="font-serif text-2xl text-charcoal mb-6">Sizes</h2>

        <div className="space-y-4">
          {/* Add Size */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={newSize}
              onChange={(e) => setNewSize(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSize())}
              className="input-modern flex-1"
              placeholder="e.g., S, M, L, XL"
            />
            <button
              type="button"
              onClick={addSize}
              className="px-6 py-3 bg-charcoal text-cream rounded-lg hover:bg-charcoal/90 transition-colors"
            >
              Add Size
            </button>
          </div>

          {/* Size List */}
          {sizes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => (
                <div
                  key={size}
                  className="flex items-center gap-2 px-3 py-1.5 bg-beige rounded-full"
                >
                  <span className="text-sm text-charcoal">{size}</span>
                  <button
                    type="button"
                    onClick={() => removeSize(size)}
                    className="text-charcoal/60 hover:text-charcoal"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Colors */}
      <div className="bg-cream p-6 rounded-lg border border-charcoal/20">
        <h2 className="font-serif text-2xl text-charcoal mb-6">Colors</h2>

        <div className="space-y-4">
          {/* Add Color */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={newColorName}
              onChange={(e) => setNewColorName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())}
              className="input-modern flex-1"
              placeholder="Color name (e.g., Navy Blue)"
            />
            <label className="w-20 h-12 rounded-xl cursor-pointer border border-charcoal/20 overflow-hidden flex items-center justify-center" style={{ backgroundColor: newColorHex }}>
              <input
                type="color"
                value={newColorHex}
                onChange={(e) => setNewColorHex(e.target.value)}
                className="opacity-0 absolute cursor-pointer"
              />
            </label>
            <button
              type="button"
              onClick={addColor}
              className="px-6 py-3 bg-charcoal text-cream rounded-lg hover:bg-charcoal/90 transition-colors"
            >
              Add Color
            </button>
          </div>

          {/* Color List */}
          {colors.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => (
                <div
                  key={color.name}
                  className="flex items-center gap-2 px-3 py-1.5 bg-beige rounded-full"
                >
                  <div
                    className="w-4 h-4 rounded-full border border-charcoal/20"
                    style={{ backgroundColor: color.hexCode }}
                  />
                  <span className="text-sm text-charcoal">{color.name}</span>
                  <button
                    type="button"
                    onClick={() => removeColor(color.name)}
                    className="text-charcoal/60 hover:text-charcoal"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>

    {/* Colour specific images */}
    {colors.length > 0 && (
      <div className="bg-cream p-6 rounded-lg border border-charcoal/20">
        <h2 className="font-serif text-2xl text-charcoal mb-4">
          Images by Colour / Finish
        </h2>
        <p className="text-sm text-charcoal/70 mb-6">
          Upload images that match each colour option. These replace the default gallery when a
          shopper selects the colour.
        </p>

        <div className="space-y-8">
          {colors.map((color) => {
            const currentImages = colorImages[color.name] || [];
            return (
              <div key={color.name} className="space-y-4">
                <div className="flex items-center gap-3">
                  <span
                    className="h-8 w-8 rounded-full border border-charcoal/10"
                    style={{ backgroundColor: color.hexCode }}
                  />
                  <div>
                    <p className="font-medium text-charcoal">{color.name}</p>
                    <p className="text-xs uppercase tracking-wider text-charcoal/60">
                      {color.hexCode}
                    </p>
                  </div>
                </div>
                <ImageUploader
                  images={currentImages}
                  onChange={(updated) =>
                    setColorImages((prev) => ({
                      ...prev,
                      [color.name]: updated,
                    }))
                  }
                  maxImages={10}
                />
              </div>
            );
          })}
        </div>
      </div>
    )}

    {/* Variant Stock Table */}
    {variants.length > 0 && (
      <div className="bg-cream p-6 rounded-lg border border-charcoal/20">
          <h2 className="font-serif text-2xl text-charcoal mb-6">
            Inventory by Variant
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-charcoal/20">
                  <th className="text-left py-3 px-4 text-sm font-medium text-charcoal">
                    Size
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-charcoal">
                    Color
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-charcoal">
                    Stock
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-charcoal">
                    SKU (optional)
                  </th>
                </tr>
              </thead>
              <tbody>
                {variants.map((variant, index) => (
                  <tr key={`${variant.size}-${variant.color}`} className="border-b border-charcoal/10">
                    <td className="py-3 px-4 text-sm text-charcoal">
                      {variant.size}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full border border-charcoal/20"
                          style={{
                            backgroundColor: colors.find((c) => c.name === variant.color)?.hexCode || '#000',
                          }}
                        />
                        <span className="text-sm text-charcoal">{variant.color}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        value={variant.stock}
                        onChange={(e) =>
                          updateVariantStock(
                            variant.size,
                            variant.color,
                            parseInt(e.target.value) || 0
                          )
                        }
                        min="0"
                        className="w-24 px-3 py-2 border border-charcoal/20 rounded-lg bg-white shadow-sm text-charcoal focus:outline-none focus:ring-4 focus:ring-charcoal/10 focus:border-charcoal transition-all"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={variant.sku || ''}
                        onChange={(e) =>
                          updateVariantSku(variant.size, variant.color, e.target.value)
                        }
                        className="w-32 px-3 py-2 border border-charcoal/20 rounded-lg bg-white shadow-sm text-charcoal focus:outline-none focus:ring-4 focus:ring-charcoal/10 focus:border-charcoal transition-all placeholder:text-charcoal/40"
                        placeholder="SKU"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-sm text-charcoal/60">
            Total variants: {variants.length} | Total stock: {variants.reduce((sum, v) => sum + v.stock, 0)}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-6 py-3 border border-charcoal/30 text-charcoal rounded-lg hover:bg-charcoal/5 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-3 bg-charcoal text-cream rounded-lg hover:bg-charcoal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
        </button>
      </div>
    </form>
  );
}
