import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { Prisma } from '@prisma/client';
import {
  normalizeProductImageInput,
  parseProductImages,
  serializeProductImages,
} from '@/lib/productImages';

// GET /api/admin/products/[id] - Get single product for editing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        collection: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields
    const imagePayload = parseProductImages(product.images);
    const productData = {
      ...product,
      images: imagePayload.defaultImages,
      colorImages: imagePayload.colorImages,
      sizes: JSON.parse(product.sizes),
      colors: JSON.parse(product.colors),
    };

    return NextResponse.json({ product: productData });
  } catch (error) {
    console.error('Get product error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/products/[id] - Update product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
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

    if (!name || !description || price === undefined || Number.isNaN(parsedPrice)) {
      return NextResponse.json(
        { error: 'Name, description, and price are required' },
        { status: 400 },
      );
    }

    if (parsedCompareAtPrice !== null && Number.isNaN(parsedCompareAtPrice)) {
      return NextResponse.json(
        { error: 'Compare at price must be a valid number' },
        { status: 400 },
      );
    }

    const imagePayload = normalizeProductImageInput(images, colorImages);

    // Delete existing variants and create new ones
    await prisma.productVariant.deleteMany({
      where: { productId: id },
    });

    // Update product
    const product = await prisma.product.update({
      where: { id },
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
    console.error('Update product error:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/products/[id] - Delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Authentication check
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const searchParams = request.nextUrl.searchParams;
    const deleteAnalytics = searchParams.get('deleteAnalytics') === 'true';
    if (deleteAnalytics) {
      // Delete all order items referencing this product first
      await prisma.orderItem.deleteMany({
        where: { productId: id },
      });
    }

    // Now delete the product (this will cascade delete variants)
    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: deleteAnalytics
        ? 'Product and all analytics data deleted successfully'
        : 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Delete product error:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      try {
        // If deletion failed due to constraints, just mark as inactive
        await prisma.product.update({
          where: { id },
          data: {
            active: false,
            featured: false,
          },
        });

        return NextResponse.json({
          success: true,
          archived: true,
          message: 'Product archived because it is associated with existing orders.',
        });
      } catch (archiveError) {
        console.error('Archive product error:', archiveError);
      }
    }

    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
