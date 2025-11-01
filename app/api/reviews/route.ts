import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pinnedOnly = searchParams.get('pinned') === 'true';
    const productId = searchParams.get('productId');
    const feedbackOnly = searchParams.get('feedbackOnly') === 'true'; // General feedback (not product reviews)

    const reviews = await prisma.review.findMany({
      where: {
        isApproved: true,
        ...(pinnedOnly && { isPinned: true }),
        ...(productId && { productId }), // Product reviews for specific product
        ...(feedbackOnly && { productId: null }), // General feedback only (no product)
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        name: true,
        rating: true,
        title: true,
        content: true,
        isPinned: true,
        productId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}
