import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const variants = await prisma.productVariant.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            active: true,
            reservedStock: true,
          },
        },
      },
      orderBy: [
        { product: { name: 'asc' } },
        { color: 'asc' },
        { size: 'asc' },
      ],
    });

    const serializedVariants = variants.map((v) => ({
      ...v,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    }));

    return NextResponse.json({ variants: serializedVariants });
  } catch (error) {
    console.error('Inventory fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { variantId, stock } = body;

    if (!variantId || stock === undefined || stock === null) {
      return NextResponse.json(
        { error: 'Variant ID and stock are required' },
        { status: 400 }
      );
    }

    const parsedStock = parseInt(String(stock));
    if (isNaN(parsedStock) || parsedStock < 0) {
      return NextResponse.json(
        { error: 'Stock must be a non-negative number' },
        { status: 400 }
      );
    }

    // Update variant stock
    const updatedVariant = await prisma.productVariant.update({
      where: { id: variantId },
      data: { stock: parsedStock },
    });

    // Recalculate total product stock
    const allVariants = await prisma.productVariant.findMany({
      where: { productId: updatedVariant.productId },
    });

    const totalStock = allVariants.reduce((sum, v) => sum + v.stock, 0);

    await prisma.product.update({
      where: { id: updatedVariant.productId },
      data: { stock: totalStock },
    });

    return NextResponse.json({
      message: 'Stock updated successfully',
      variant: updatedVariant,
    });
  } catch (error) {
    console.error('Stock update error:', error);
    return NextResponse.json(
      { error: 'Failed to update stock' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, action } = body;

    if (!productId || action !== 'release') {
      return NextResponse.json(
        { error: 'Product ID and action are required' },
        { status: 400 }
      );
    }

    // Release all reserved stock for this product
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { reservedStock: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    await prisma.product.update({
      where: { id: productId },
      data: { reservedStock: 0 },
    });

    return NextResponse.json({
      success: true,
      released: product.reservedStock,
    });
  } catch (error) {
    console.error('Error releasing reserved stock:', error);
    return NextResponse.json(
      { error: 'Failed to release reserved stock' },
      { status: 500 }
    );
  }
}
