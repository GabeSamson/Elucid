import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

const ensureAdmin = async () => {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return null;
  }
  return session.user;
};

export async function GET() {
  try {
    const user = await ensureAdmin();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orders = await (prisma as any).order.findMany({
      where: { isInPerson: true },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });

    return NextResponse.json({
      orders: orders.map((order: any) => ({
        ...order,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching in-person sales:', error);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await ensureAdmin();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { customerName, customerEmail, customerLocation, items } = body || {};

    if (!customerName || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Invalid sale data' }, { status: 400 });
    }

    const productIds = items.map((item: any) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const priceMap = new Map(products.map((product) => [product.id, product.price]));

    let subtotal = 0;
    const normalizedItems = items.map((item: any) => {
      const price = priceMap.get(item.productId);
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
        productName: item.productName || products.find((p) => p.id === item.productId)?.name || 'Product',
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
      const created = await (tx as any).order.create({
        data: {
          email: customerEmail?.trim() || null,
          name: customerName,
          address: JSON.stringify(addressData),
          subtotal,
          shipping: 0,
          tax: 0,
          discount: 0,
          total: subtotal,
          isInPerson: true,
          status: 'DELIVERED',
          items: {
            create: normalizedItems,
          },
        },
        include: { items: true },
      });

      // Check if reserve stock toggle is enabled
      const homepageConfig = await tx.homepageConfig.findUnique({
        where: { id: "main" },
        select: { autoDeductStock: true },
      });

      const shouldReserveStock = homepageConfig?.autoDeductStock ?? false;

      for (const item of normalizedItems) {
        if (shouldReserveStock) {
          // Reserve stock when toggle is ON
          await tx.product.update({
            where: { id: item.productId },
            data: {
              reservedStock: { increment: item.quantity },
            },
          });
        } else {
          // Auto-deduct stock when toggle is OFF
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { decrement: item.quantity },
            },
          });
        }
      }

      return created;
    });

    return NextResponse.json(
      {
        order: {
          ...order,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating in-person sale:', error);
    return NextResponse.json({ error: 'Failed to create sale' }, { status: 500 });
  }
}
