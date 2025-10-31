'use client';

import { useState, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import ImageUploader from './ImageUploader';
import { getBaseCurrency, getCurrencySymbol } from '@/lib/currency';
import { getSupportedCurrencies } from '@/lib/geolocation';

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
  includeShipping: boolean;
  comingSoon: boolean;
  targetAudience: 'MALE' | 'FEMALE' | 'UNISEX';
  releaseDate?: string | null;
  priceOverrides?: Record<string, number>;
  madeIn?: string | null;
  sizeDimensions?: Record<string, string> | null;
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
  const baseCurrency = getBaseCurrency();
  const overrideCurrencies = getSupportedCurrencies().filter(
    (code) => code !== baseCurrency,
  );

  const initialOverrides = initialData?.priceOverrides || {};
  const [customPricingEnabled, setCustomPricingEnabled] = useState(
    Object.keys(initialOverrides).length > 0,
  );
  const [overrideInputs, setOverrideInputs] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    overrideCurrencies.forEach((currency) => {
      const value = initialOverrides?.[currency];
      if (value !== undefined && value !== null) {
        initial[currency] = String(value);
      }
    });
    return initial;
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
    watch,
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
      includeShipping: initialData?.includeShipping ?? true,
      comingSoon: initialData?.comingSoon ?? false,
      releaseDate: initialData?.releaseDate ?? null,
      colorImages: initialData?.colorImages || {},
      targetAudience: initialData?.targetAudience || 'UNISEX',
    },
  });

  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [sizes, setSizes] = useState<string[]>(initialData?.sizes || []);
  const [colors, setColors] = useState<ColorOption[]>(initialData?.colors || []);
  const [variants, setVariants] = useState<ProductVariant[]>(initialData?.variants || []);
  const [colorImages, setColorImages] = useState<Record<string, string[]>>(
    initialData?.colorImages || {}
  );
  const [comingSoonDate, setComingSoonDate] = useState<string>(
    initialData?.releaseDate ? initialData.releaseDate.slice(0, 10) : ''
  );
  const watchedComingSoon = watch('comingSoon', initialData?.comingSoon ?? false);

  // Made in state
  const [madeInEnabled, setMadeInEnabled] = useState<boolean>(
    !!initialData?.madeIn
  );
  const [madeInText, setMadeInText] = useState<string>(
    initialData?.madeIn || 'London'
  );

  // Size dimensions state
  const [sizeDimensions, setSizeDimensions] = useState<Record<string, string>>(
    initialData?.sizeDimensions || {}
  );

  const handleOverrideChange = (currency: string, value: string) => {
    setOverrideInputs((prev) => {
      if (!value.trim()) {
        const { [currency]: _removed, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [currency]: value,
      };
    });
  };

  const toggleCustomPricing = (enabled: boolean) => {
    setCustomPricingEnabled(enabled);
    if (!enabled) {
      setOverrideInputs({});
    }
  };

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

  useEffect(() => {
    if (!watchedComingSoon) {
      setComingSoonDate('');
    }
  }, [watchedComingSoon]);

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
    const normalizedReleaseDate =
      data.comingSoon && comingSoonDate
        ? new Date(comingSoonDate).toISOString()
        : null;

    const overrides = customPricingEnabled
      ? Object.entries(overrideInputs).reduce<Record<string, number>>((acc, [currency, value]) => {
          const trimmed = value.trim();
          if (!trimmed) {
            return acc;
          }

          const numeric = parseFloat(trimmed);
          if (!Number.isNaN(numeric) && numeric > 0) {
            acc[currency] = Number(numeric.toFixed(2));
          }

          return acc;
        }, {})
      : {};

    await onSubmit({
      ...data,
      images,
      colorImages,
      sizes,
      colors,
      variants,
      releaseDate: normalizedReleaseDate,
      priceOverrides: Object.keys(overrides).length > 0 ? overrides : undefined,
      madeIn: madeInEnabled ? madeInText.trim() : null,
      sizeDimensions: Object.keys(sizeDimensions).length > 0 ? sizeDimensions : null,
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

          {/* Currency Overrides */}
          <div className="border border-charcoal/10 bg-cream-light p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-medium text-charcoal uppercase tracking-wider">
                  Custom currency pricing
                </h3>
                <p className="text-xs text-charcoal/60">
                  Base currency: {baseCurrency}. Override automatic conversion for selected currencies.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-charcoal cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={customPricingEnabled}
                  onChange={(event) => toggleCustomPricing(event.target.checked)}
                  className="w-4 h-4 rounded border-charcoal/30 text-charcoal focus:ring-charcoal"
                />
                Enable overrides
              </label>
            </div>

            {customPricingEnabled ? (
              <>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {overrideCurrencies.map((currency) => {
                    const symbol = getCurrencySymbol(currency);
                    const value = overrideInputs[currency] || '';

                    return (
                      <div key={currency}>
                        <label className="block text-xs font-medium text-charcoal mb-1 uppercase tracking-wider">
                          {currency}
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/60 z-10">
                            {symbol}
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={value}
                            onChange={(event) => handleOverrideChange(currency, event.target.value)}
                            placeholder="Leave blank"
                            className="input-modern pl-8 pr-16"
                          />
                          {value && (
                            <button
                              type="button"
                              onClick={() => handleOverrideChange(currency, '')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-charcoal/60 hover:text-charcoal transition-colors"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-charcoal/60 mt-3">
                  Values are stored in their native currency. Leave a field empty to use live conversion instead.
                </p>
              </>
            ) : (
              <p className="mt-3 text-xs text-charcoal/60">
                Enable overrides to set fixed prices for currencies other than {baseCurrency}.
              </p>
            )}
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

          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">
              Intended audience
            </label>
            <select
              {...register('targetAudience')}
              className="select-modern"
            >
              <option value="UNISEX">Unisex</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
            <p className="text-xs text-charcoal/60 mt-1">
              Controls where the product is highlighted in gender-specific views.
            </p>
          </div>

          {/* Made in location */}
          <div className="border border-charcoal/10 bg-cream-light p-4">
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={madeInEnabled}
                onChange={(e) => {
                  setMadeInEnabled(e.target.checked);
                  if (!e.target.checked) {
                    setMadeInText('London');
                  }
                }}
                className="w-4 h-4 rounded border-charcoal/30 text-charcoal focus:ring-charcoal"
              />
              <span className="text-sm font-medium text-charcoal">
                Made in...
              </span>
            </label>
            {madeInEnabled && (
              <div>
                <input
                  type="text"
                  value={madeInText}
                  onChange={(e) => setMadeInText(e.target.value)}
                  className="input-modern"
                  placeholder="e.g., London"
                />
                <p className="text-xs text-charcoal/60 mt-2">
                  Display a &ldquo;Made in...&rdquo; badge on the product page.
                </p>
              </div>
            )}
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

            <Controller
              control={control}
              name="includeShipping"
              defaultValue={initialData?.includeShipping ?? true}
              render={({ field }) => (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                    className="w-4 h-4 rounded border-charcoal/30 text-charcoal focus:ring-charcoal"
                  />
                  <span className="text-sm text-charcoal">
                    Include shipping cost
                  </span>
                </label>
              )}
            />

            <Controller
              control={control}
              name="comingSoon"
              defaultValue={initialData?.comingSoon ?? false}
              render={({ field }) => (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                    className="w-4 h-4 rounded border-charcoal/30 text-charcoal focus:ring-charcoal"
                  />
                  <span className="text-sm text-charcoal">
                    Coming soon / pre-order
                  </span>
                </label>
              )}
            />
          </div>

          {watchedComingSoon && (
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">
                  Release date (optional)
                </label>
                <input
                  type="date"
                  value={comingSoonDate}
                  onChange={(event) => setComingSoonDate(event.target.value)}
                  className="input-modern"
                />
                <p className="text-xs text-charcoal/60 mt-1">
                  Shown on the product page and used to label the drop.
                </p>
              </div>
              <div className="rounded-lg border border-charcoal/15 bg-white p-4 text-sm text-charcoal/70">
                Customers will see a <strong>Pre-order</strong> button and a &ldquo;Coming Soon&rdquo; tag.
              </div>
            </div>
          )}
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

      {/* Size Dimensions */}
      {sizes.length > 0 && (
        <div className="bg-cream p-6 rounded-lg border border-charcoal/20">
          <h2 className="font-serif text-2xl text-charcoal mb-2">
            Size Dimensions
          </h2>
          <p className="text-sm text-charcoal/70 mb-6">
            Add measurements for each size (e.g., "Length: 28in, Width: 20in, Chest: 38in")
          </p>

          <div className="space-y-4">
            {sizes.map((size) => (
              <div key={size}>
                <label className="block text-sm font-medium text-charcoal mb-2">
                  {size} Dimensions
                </label>
                <input
                  type="text"
                  value={sizeDimensions[size] || ''}
                  onChange={(e) =>
                    setSizeDimensions((prev) => ({
                      ...prev,
                      [size]: e.target.value,
                    }))
                  }
                  className="input-modern"
                  placeholder="e.g., Length: 28in, Width: 20in, Chest: 38in"
                />
              </div>
            ))}
          </div>
        </div>
      )}

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
