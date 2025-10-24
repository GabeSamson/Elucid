import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const rawEmail = session.user.email || null;
    const normalizedEmail = rawEmail?.trim().toLowerCase() || null;

    const orConditions = [
      { userId: session.user.id },
      normalizedEmail ? { email: normalizedEmail } : null,
      rawEmail && rawEmail !== normalizedEmail ? { email: rawEmail } : null,
    ].filter(Boolean) as any[];

    const orders = await prisma.order.findMany({
      where: {
        OR: orConditions,
      },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Parse JSON addresses
    const ordersWithParsedAddresses = orders.map(order => {
      let parsedAddress = {};
      try {
        parsedAddress = order.address ? JSON.parse(order.address) : {};
      } catch (parseError) {
        parsedAddress = {};
      }
      return {
        ...order,
        address: parsedAddress,
      };
    });

    return NextResponse.json({ orders: ordersWithParsedAddresses }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json();

    const {
      email,
      name,
      address,
      items,
      subtotal,
      shipping,
      tax,
      total,
      discount = 0,
      promoCodeId = null,
      promoCodeCode = null,
      stripePaymentId,
    } = body;

    const normalizedEmail = email?.trim().toLowerCase() || null;

    let linkedUserId: string | null = session?.user?.id || null;

    if (!linkedUserId && normalizedEmail) {
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      });
      linkedUserId = existingUser?.id || null;
    }

    // Create order
    const order = await (prisma as any).order.create({
      data: {
        userId: linkedUserId,
        email: normalizedEmail,
        name,
        address: JSON.stringify(address),
        subtotal,
        shipping,
        tax,
        total,
        discount,
        promoCodeId,
        promoCodeCode,
        stripePaymentId,
        status: 'PROCESSING',
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            productImage: item.productImage,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
            priceAtPurchase: item.priceAtPurchase,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Update product stock
    for (const item of items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
