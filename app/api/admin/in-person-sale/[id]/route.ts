import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const ensureAdmin = async () => {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return null;
  }
  return session.user;
};

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await ensureAdmin();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order || !order.isInPerson) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
          },
        });
      }

      await tx.order.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting in-person sale:', error);
    return NextResponse.json({ error: 'Failed to delete sale' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await ensureAdmin();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { customerName, customerEmail, customerLocation, items } = body || {};

    if (!customerName || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Invalid sale data' }, { status: 400 });
    }

    const existing = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing || !existing.isInPerson) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    const productIds = items.map((item: any) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const priceMap = new Map(products.map((product) => [product.id, product.price]));

    let subtotal = 0;
    const normalizedItems = items.map((item: any) => {
      const fallbackExisting = existing.items.find((existingItem) => existingItem.productId === item.productId);
      const price = priceMap.get(item.productId) ?? fallbackExisting?.priceAtPurchase;
      if (!price) {
        throw new Error('Product not found for sale');
      }
      const quantity = Number(item.quantity) || 0;
      if (quantity <= 0) {
        throw new Error('Quantity must be positive');
      }
      subtotal += price * quantity;
      return {
        productId: item.productId,
        productName:
          item.productName || products.find((p) => p.id === item.productId)?.name || fallbackExisting?.productName || 'Product',
        quantity,
        priceAtPurchase: price,
        size: item.size || null,
        color: item.color || null,
      };
    });

    const addressData: any = { type: 'in-person' };
    if (customerLocation?.trim()) {
      addressData.location = customerLocation.trim();
    }

    const order = await prisma.$transaction(async (tx) => {
      // Restock previous quantities
      for (const item of existing.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
          },
        });
      }

      const updated = await (tx as any).order.update({
        where: { id },
        data: {
          email: customerEmail?.trim() || null,
          name: customerName,
          address: JSON.stringify(addressData),
          subtotal,
          total: subtotal,
          discount: 0,
          items: {
            deleteMany: {},
            create: normalizedItems,
          },
        },
        include: { items: true },
      });

      // Apply new stock deductions
      for (const item of normalizedItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
          },
        });
      }

      return updated;
    });

    return NextResponse.json({
      order: {
        ...order,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error updating in-person sale:', error);
    return NextResponse.json({ error: 'Failed to update sale' }, { status: 500 });
  }
}
