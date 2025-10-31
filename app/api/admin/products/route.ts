import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import {
  normalizeProductImageInput,
  serializeProductImages,
} from '@/lib/productImages';
import { ProductAudience } from '@prisma/client';
import { getSupportedCurrencies } from '@/lib/geolocation';
import { getBaseCurrency } from '@/lib/currency';

const SUPPORTED_CURRENCIES = new Set(getSupportedCurrencies());

const normalizePriceOverrides = (input: unknown, baseCurrency: string) => {
  const overrides: Record<string, number> = {};

  if (input && typeof input === 'object') {
    const entries =
      input instanceof Map ? input.entries() : Object.entries(input as Record<string, unknown>);

    for (const [currency, value] of entries) {
      if (typeof currency !== 'string') continue;
      const code = currency.trim().toUpperCase();
      if (!code || code === baseCurrency || !SUPPORTED_CURRENCIES.has(code)) continue;

      const numeric =
        typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : null;

      if (numeric === null || Number.isNaN(numeric) || numeric <= 0) continue;

      overrides[code] = Number(numeric.toFixed(2));
    }
  }

  return overrides;
};

// POST /api/admin/products - Create new product
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      price,
      compareAtPrice,
      costPrice,
      images,
      sizes,
      colors,
      variants,
      collectionId,
      featured,
      active,
      includeShipping,
      colorImages,
      comingSoon,
      releaseDate,
      targetAudience,
      priceOverrides,
      madeIn,
      sizeDimensions,
    } = body;

    const toBoolean = (value: unknown, fallback: boolean) => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
        if (['false', '0', 'no', 'off'].includes(normalized)) return false;
      }
      return fallback;
    };

    const normalizedFeatured = toBoolean(featured, false);
    const normalizedActive = toBoolean(active, true);
    const normalizedIncludeShipping = toBoolean(includeShipping, true);
    const parsedPrice =
      typeof price === 'string' ? parseFloat(price) : Number(price);
    const parsedCompareAtPrice =
      compareAtPrice === undefined || compareAtPrice === null || compareAtPrice === ''
        ? null
        : typeof compareAtPrice === 'string'
          ? parseFloat(compareAtPrice)
          : Number(compareAtPrice);
    const parsedCostPrice =
      costPrice === undefined || costPrice === null || costPrice === ''
        ? null
        : typeof costPrice === 'string'
          ? parseFloat(costPrice)
          : Number(costPrice);

    // Validate required fields
    if (!name || !description || price === undefined || Number.isNaN(parsedPrice)) {
      return NextResponse.json(
        { error: 'Name, description, and price are required' },
        { status: 400 }
      );
    }

    if (parsedCompareAtPrice !== null && Number.isNaN(parsedCompareAtPrice)) {
      return NextResponse.json(
        { error: 'Compare at price must be a valid number' },
        { status: 400 }
      );
    }

    const normalizedComingSoon = toBoolean(comingSoon, false);
    const parsedReleaseDateRaw =
      releaseDate === undefined || releaseDate === null || releaseDate === ''
        ? null
        : new Date(releaseDate);
    const parsedReleaseDate =
      parsedReleaseDateRaw && !Number.isNaN(parsedReleaseDateRaw.getTime())
        ? parsedReleaseDateRaw
        : null;

    const imagePayload = normalizeProductImageInput(images, colorImages);
    const baseCurrency = getBaseCurrency();
    const normalizedOverrides = normalizePriceOverrides(priceOverrides, baseCurrency);
    const allowedAudiences = new Set<ProductAudience>([
      ProductAudience.MALE,
      ProductAudience.FEMALE,
      ProductAudience.UNISEX,
    ]);
    const normalizedTargetAudience =
      typeof targetAudience === 'string' && allowedAudiences.has(targetAudience.toUpperCase() as ProductAudience)
        ? (targetAudience.toUpperCase() as ProductAudience)
        : ProductAudience.UNISEX;

    // Create product with variants
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parsedPrice,
        compareAtPrice: parsedCompareAtPrice,
        costPrice: parsedCostPrice,
        images: serializeProductImages(imagePayload),
        sizes: JSON.stringify(sizes || []),
        colors: JSON.stringify(colors || []),
        stock:
          variants?.reduce(
            (sum: number, v: any) => sum + (Number(v.stock) || 0),
            0,
          ) || 0,
        collectionId: collectionId || null,
        featured: normalizedFeatured,
        active: normalizedActive,
        includeShipping: normalizedIncludeShipping,
        comingSoon: normalizedComingSoon,
        releaseDate: normalizedComingSoon ? parsedReleaseDate : null,
        targetAudience: normalizedTargetAudience,
        madeIn: madeIn && typeof madeIn === 'string' && madeIn.trim() ? madeIn.trim() : null,
        sizeDimensions: sizeDimensions && typeof sizeDimensions === 'object' && Object.keys(sizeDimensions).length > 0 ? JSON.stringify(sizeDimensions) : null,
        priceOverrides:
          Object.keys(normalizedOverrides).length > 0
            ? JSON.stringify(normalizedOverrides)
            : null,
        variants: {
          create: variants?.map((v: any) => ({
            size: v.size,
            color: v.color,
            stock: Number(v.stock) || 0,
            sku: v.sku || null,
          })) || [],
        },
      },
      include: {
        variants: true,
        collection: true,
      },
    });

    const productResponse = {
      ...product,
      priceOverrides: normalizedOverrides,
    };

    return NextResponse.json({
      success: true,
      product: productResponse,
    });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
