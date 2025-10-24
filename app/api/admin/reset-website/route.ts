import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * NUCLEAR OPTION: Reset the entire website
 *
 * This endpoint deletes ALL data except the executing admin user:
 * - All orders and order items
 * - All products, variants, and collections
 * - All promo codes
 * - All users (except the executing admin)
 * - All pending users
 * - All password reset tokens
 * - All calendar events
 * - All team tasks
 * - All personal tasks
 *
 * Requires:
 * - Admin authentication
 * - Secure token from RESET_WEBSITE_TOKEN environment variable
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify admin authentication
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify token
    const body = await request.json();
    const { token } = body;

    const expectedToken = process.env.RESET_WEBSITE_TOKEN;

    if (!expectedToken) {
      return NextResponse.json(
        { error: 'Reset functionality not configured' },
        { status: 500 }
      );
    }

    if (token !== expectedToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 403 }
      );
    }

    const executingAdminId = session.user.id;

    // 3. Delete ALL data in the correct order (respecting foreign key constraints)

    // Delete order items first (foreign key to orders and products)
    await prisma.orderItem.deleteMany({});

    // Delete orders
    await prisma.order.deleteMany({});

    // Delete product variants (foreign key to products)
    await prisma.productVariant.deleteMany({});

    // Delete products
    await prisma.product.deleteMany({});

    // Delete collections
    await prisma.collection.deleteMany({});

    // Delete promo codes
    await (prisma as any).promoCode.deleteMany({});

    // Delete password reset tokens
    await (prisma as any).passwordResetToken.deleteMany({});

    // Delete pending users
    await prisma.pendingUser.deleteMany({});

    // Delete personal tasks
    await prisma.personalTask.deleteMany({});

    // Delete team tasks
    await prisma.teamTask.deleteMany({});

    // Delete calendar events
    await prisma.calendarEvent.deleteMany({});

    // Delete newsletter subscribers (if exists)
    try {
      await (prisma as any).newsletterSubscriber.deleteMany({});
    } catch (error) {
      // Ignore if table doesn't exist
      console.log('Newsletter subscribers table may not exist');
    }

    // Delete all users EXCEPT the executing admin
    await prisma.user.deleteMany({
      where: {
        id: {
          not: executingAdminId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Website reset successfully. All data has been deleted except your admin account.',
      deletedBy: executingAdminId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Reset website error:', error);
    return NextResponse.json(
      { error: 'Failed to reset website. Check server logs for details.' },
      { status: 500 }
    );
  }
}
