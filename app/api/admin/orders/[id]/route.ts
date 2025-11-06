import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { sendShippingConfirmationEmail } from '@/lib/email/sendShippingConfirmationEmail';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, trackingNumber, notes } = body;

    const updateData: any = {
      status: status?.toUpperCase(),
    };

    if (trackingNumber !== undefined) {
      updateData.trackingNumber = trackingNumber || null;
    }

    // Set shippedAt when order is marked as shipped
    if (status?.toUpperCase() === 'SHIPPED' && !trackingNumber) {
      updateData.shippedAt = new Date();
    } else if (status?.toUpperCase() === 'SHIPPED' && trackingNumber) {
      updateData.shippedAt = new Date();
    }

    if (notes !== undefined) {
      const trimmed = typeof notes === 'string' ? notes.trim() : '';
      updateData.notes = trimmed.length > 0 ? trimmed : null;
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
      },
    });

    // Send shipping confirmation email if order was marked as SHIPPED
    if (status?.toUpperCase() === 'SHIPPED' && order.email && order.trackingNumber) {
      try {
        // Check if shipping emails are enabled
        const config = await prisma.homepageConfig.findUnique({
          where: { id: 'main' },
          select: { shippingEmailsEnabled: true },
        });

        if (config?.shippingEmailsEnabled) {
          const trackingUrl = `https://track.aftership.com/${order.trackingNumber}`;

          await sendShippingConfirmationEmail({
            email: order.email,
            orderNumber: order.id.slice(0, 8).toUpperCase(),
            trackingNumber: order.trackingNumber,
            trackingUrl,
            items: order.items.map(item => ({
              name: item.productName,
              quantity: item.quantity,
              size: item.size || undefined,
              color: item.color || undefined,
            })),
          });
        }
      } catch (emailError) {
        console.error('Failed to send shipping confirmation email:', emailError);
        // Don't fail the order update if email fails
      }
    }

    return NextResponse.json({ order }, { status: 200 });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        promoCode: true,
        appliedPromos: {
          include: {
            promoCode: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Check if reserve stock toggle is enabled (to know what to restore)
      const homepageConfig = await tx.homepageConfig.findUnique({
        where: { id: "main" },
        select: { autoDeductStock: true },
      });

      const wasReserved = homepageConfig?.autoDeductStock ?? false;

      for (const item of order.items) {
        if (!item.productId || item.quantity <= 0) continue;

        try {
          if (wasReserved) {
            // Release from reserved stock (toggle was ON)
            await tx.product.update({
              where: { id: item.productId },
              data: {
                reservedStock: {
                  decrement: item.quantity,
                },
              },
            });
          } else {
            // Restore to available stock (toggle was OFF)
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  increment: item.quantity,
                },
              },
            });
          }
        } catch (stockError) {
          console.error(`Failed to restore stock for product ${item.productId}:`, stockError);
        }
      }

      if (order.appliedPromos && order.appliedPromos.length > 0) {
        for (const applied of order.appliedPromos) {
          if (!applied.promoCodeId || !applied.promoCode) continue;
          const currentRedemptions = applied.promoCode.redemptions ?? 0;
          const nextRedemptions = Math.max(currentRedemptions - 1, 0);
          await tx.promoCode.update({
            where: { id: applied.promoCodeId },
            data: {
              redemptions: nextRedemptions,
            },
          });
        }
      } else if (order.promoCodeId) {
        const currentRedemptions = order.promoCode?.redemptions ?? 0;
        const nextRedemptions = Math.max(currentRedemptions - 1, 0);
        await tx.promoCode.update({
          where: { id: order.promoCodeId },
          data: {
            redemptions: nextRedemptions,
          },
        });
      }

      await tx.order.delete({
        where: { id },
      });
    });

    revalidatePath('/admin');
    revalidatePath('/admin/orders');
    revalidatePath('/admin/analytics');

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}
