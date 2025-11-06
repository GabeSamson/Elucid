import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendBackInStockEmail } from '@/lib/email/sendBackInStockEmail';

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find products that came back in stock
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

    let sentCount = 0;

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

        sentCount++;

        // Rate limit: 2 emails/second (Resend free tier)
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (emailError) {
        console.error(`Failed to send back-in-stock email for notification ${notification.id}:`, emailError);
        // Continue with other notifications even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      sentCount,
      message: `Sent ${sentCount} back-in-stock notifications`
    });
  } catch (error) {
    console.error('Error in back-in-stock cron:', error);
    return NextResponse.json({ error: 'Failed to process notifications' }, { status: 500 });
  }
}
