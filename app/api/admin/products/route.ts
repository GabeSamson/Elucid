import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import {
  normalizeProductImageInput,
  serializeProductImages,
} from '@/lib/productImages';

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

    return NextResponse.json({
      success: true,
      product,
    });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
