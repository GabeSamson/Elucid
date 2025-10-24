import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

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
    const { status, trackingNumber } = body;

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

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
    });

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
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        if (!item.productId || item.quantity <= 0) continue;

        try {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        } catch (stockError) {
          console.error(`Failed to restore stock for product ${item.productId}:`, stockError);
        }
      }

      if (order.promoCodeId) {
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
