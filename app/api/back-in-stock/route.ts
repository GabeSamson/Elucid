import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// POST - Subscribe to back-in-stock notification
export async function POST(request: NextRequest) {
  try {
    const { productId, email } = await request.json();

    if (!productId || !email) {
      return NextResponse.json(
        { error: 'Product ID and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, stock: true },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // If product is in stock, no need to subscribe
    if (product.stock > 0) {
      return NextResponse.json(
        { message: 'Product is currently in stock' },
        { status: 200 }
      );
    }

    // Get user ID if authenticated
    const session = await auth();
    let userId: string | null = null;

    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      userId = user?.id || null;
    }

    // Check if already subscribed
    const existing = await prisma.backInStockNotification.findFirst({
      where: {
        productId,
        email,
        notified: false,
      },
    });

    if (existing) {
      return NextResponse.json(
        { message: 'You are already subscribed to notifications for this product' },
        { status: 200 }
      );
    }

    // Create notification subscription
    const notification = await prisma.backInStockNotification.create({
      data: {
        productId,
        email,
        userId,
      },
    });

    return NextResponse.json(
      { message: 'You will be notified when this product is back in stock', notification },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error subscribing to back-in-stock notification:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe to notifications' },
      { status: 500 }
    );
  }
}

// DELETE - Unsubscribe from back-in-stock notification
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const email = searchParams.get('email');

    if (!productId || !email) {
      return NextResponse.json(
        { error: 'Product ID and email are required' },
        { status: 400 }
      );
    }

    await prisma.backInStockNotification.deleteMany({
      where: {
        productId,
        email,
        notified: false,
      },
    });

    return NextResponse.json({ message: 'Unsubscribed from notifications' });
  } catch (error) {
    console.error('Error unsubscribing from back-in-stock notification:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}
