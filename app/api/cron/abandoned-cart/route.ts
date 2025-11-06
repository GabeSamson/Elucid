import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendAbandonedCartEmail } from '@/lib/email/sendAbandonedCartEmail';

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find carts that are:
    // - More than 3 hours old
    // - Less than 24 hours old (to avoid sending multiple emails)
    // - Have items
    // - Have an email address (either from user or guest)
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const abandonedCarts = await prisma.cart.findMany({
      where: {
        updatedAt: {
          gte: twentyFourHoursAgo,
          lte: threeHoursAgo,
        },
        items: {
          some: {}, // Has at least one item
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

    let sentCount = 0;
    let skippedCount = 0;

    for (const cart of abandonedCarts) {
      try {
        // Get email and name (from user or cart email field for guests)
        const email = cart.user?.email || cart.email;
        const name = cart.user?.name;

        if (!email) {
          skippedCount++;
          continue;
        }

        // Check if there's already an order for this cart session
        const existingOrder = await prisma.order.findFirst({
          where: {
            OR: [
              cart.userId ? { userId: cart.userId } : {},
              cart.sessionId ? { stripePaymentId: { contains: cart.sessionId } } : {},
            ].filter(condition => Object.keys(condition).length > 0),
            createdAt: {
              gte: cart.createdAt, // Order created after cart
            },
          },
        });

        if (existingOrder) {
          // User already completed checkout
          skippedCount++;
          continue;
        }

        // Calculate cart subtotal
        const subtotal = cart.items.reduce((sum, item) => {
          const price = item.product?.price || 0;
          return sum + price * item.quantity;
        }, 0);

        // Prepare cart items for email
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

        // Send abandoned cart email
        await sendAbandonedCartEmail({
          email,
          name: name || undefined,
          items: emailItems,
          subtotal,
          cartId: cart.id,
        });

        sentCount++;

        // Rate limit: 2 emails/second (Resend free tier)
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (emailError) {
        console.error(`Failed to send abandoned cart email for cart ${cart.id}:`, emailError);
        skippedCount++;
        // Continue with other carts even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      sentCount,
      skippedCount,
      message: `Sent ${sentCount} abandoned cart emails, skipped ${skippedCount}`,
    });
  } catch (error) {
    console.error('Error in abandoned cart cron:', error);
    return NextResponse.json({ error: 'Failed to process abandoned carts' }, { status: 500 });
  }
}
