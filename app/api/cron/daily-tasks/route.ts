import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendBackInStockEmail } from '@/lib/email/sendBackInStockEmail';
import { sendAbandonedCartEmail } from '@/lib/email/sendAbandonedCartEmail';

/**
 * Combined daily cron job for:
 * - Back-in-stock notifications
 * - Abandoned cart recovery
 */
export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    backInStock: { sent: 0, errors: 0 },
    abandonedCart: { sent: 0, skipped: 0, errors: 0 },
  };

  // ============================================
  // TASK 1: Back-in-Stock Notifications
  // ============================================
  try {
    const notifications = await prisma.backInStockNotification.findMany({
      where: {
        notified: false,
        product: {
          stock: { gt: 0 },
          active: true,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            images: true,
          },
        },
      },
    });

    for (const notification of notifications) {
      try {
        const productImages = notification.product.images
          ? typeof notification.product.images === 'string'
            ? JSON.parse(notification.product.images)
            : notification.product.images
          : [];
        const firstImage = Array.isArray(productImages) ? productImages[0] : undefined;

        await sendBackInStockEmail({
          email: notification.email,
          productName: notification.product.name,
          productUrl: `https://www.elucid.london/products/${notification.product.id}`,
          productImage: firstImage,
          productPrice: `£${notification.product.price.toFixed(2)}`,
        });

        await prisma.backInStockNotification.update({
          where: { id: notification.id },
          data: { notified: true },
        });

        results.backInStock.sent++;

        // Rate limit: 2 emails/second (Resend free tier)
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (emailError) {
        console.error(`Failed to send back-in-stock email for notification ${notification.id}:`, emailError);
        results.backInStock.errors++;
      }
    }
  } catch (error) {
    console.error('Error in back-in-stock task:', error);
  }

  // ============================================
  // TASK 2: Abandoned Cart Recovery
  // ============================================
  try {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const abandonedCarts = await prisma.cart.findMany({
      where: {
        updatedAt: {
          gte: twentyFourHoursAgo,
          lte: threeHoursAgo,
        },
        items: {
          some: {},
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                images: true,
                price: true,
              },
            },
          },
        },
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    for (const cart of abandonedCarts) {
      try {
        const email = cart.user?.email || cart.email;
        const name = cart.user?.name;

        if (!email) {
          results.abandonedCart.skipped++;
          continue;
        }

        // Check if order already exists
        const existingOrder = await prisma.order.findFirst({
          where: {
            OR: [
              cart.userId ? { userId: cart.userId } : {},
              cart.sessionId ? { stripePaymentId: { contains: cart.sessionId } } : {},
            ].filter(condition => Object.keys(condition).length > 0),
            createdAt: {
              gte: cart.createdAt,
            },
          },
        });

        if (existingOrder) {
          results.abandonedCart.skipped++;
          continue;
        }

        const subtotal = cart.items.reduce((sum, item) => {
          const price = item.product?.price || 0;
          return sum + price * item.quantity;
        }, 0);

        const emailItems = cart.items.map((item) => {
          const productImages = item.product?.images
            ? typeof item.product.images === 'string'
              ? JSON.parse(item.product.images)
              : item.product.images
            : [];
          const firstImage = Array.isArray(productImages) ? productImages[0] : null;

          return {
            productName: item.product?.name || 'Product',
            productImage: firstImage,
            quantity: item.quantity,
            priceAtPurchase: item.product?.price || 0,
            size: item.size,
            color: item.color,
          };
        });

        await sendAbandonedCartEmail({
          email,
          name: name || undefined,
          items: emailItems,
          subtotal,
          cartId: cart.id,
        });

        results.abandonedCart.sent++;

        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (emailError) {
        console.error(`Failed to send abandoned cart email for cart ${cart.id}:`, emailError);
        results.abandonedCart.errors++;
      }
    }
  } catch (error) {
    console.error('Error in abandoned cart task:', error);
  }

  return NextResponse.json({
    success: true,
    results,
    message: `Daily tasks completed: ${results.backInStock.sent} back-in-stock emails, ${results.abandonedCart.sent} abandoned cart emails`,
  });
}
