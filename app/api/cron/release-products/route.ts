import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Find all products that:
    // 1. Are marked as "coming soon"
    // 2. Have a release date in the past
    const productsToRelease = await prisma.product.findMany({
      where: {
        comingSoon: true,
        releaseDate: {
          lte: now,
        },
      },
      select: {
        id: true,
        name: true,
        releaseDate: true,
      },
    });

    if (productsToRelease.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No products to release',
        released: [],
      });
    }

    // Update all products to remove "coming soon" status
    const productIds = productsToRelease.map((p) => p.id);
    await prisma.product.updateMany({
      where: {
        id: {
          in: productIds,
        },
      },
      data: {
        comingSoon: false,
      },
    });

    console.log(`Released ${productsToRelease.length} products:`, productsToRelease.map(p => p.name));

    return NextResponse.json({
      success: true,
      message: `Released ${productsToRelease.length} product(s)`,
      released: productsToRelease.map((p) => ({
        id: p.id,
        name: p.name,
        releaseDate: p.releaseDate,
      })),
    });
  } catch (error) {
    console.error('Error releasing products:', error);
    return NextResponse.json(
      { error: 'Failed to release products' },
      { status: 500 }
    );
  }
}
