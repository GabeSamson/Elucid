import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pinnedOnly = searchParams.get('pinned') === 'true';
    const productId = searchParams.get('productId');
    const feedbackOnly = searchParams.get('feedbackOnly') === 'true'; // General feedback (not product reviews)
    const pinLocationParam = searchParams.get('pinLocation');

    const normalizedPinLocation = pinLocationParam
      ? pinLocationParam.toUpperCase()
      : null;

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
        pinLocation: true,
        isAnonymous: true,
        hideAuthor: true,
      },
    });
    const filteredReviews = normalizedPinLocation
      ? reviews.filter((review) => {
          const effectiveLocation = review.pinLocation && review.pinLocation !== 'AUTO'
            ? review.pinLocation
            : review.productId
              ? 'PRODUCT'
              : 'HOME';
          return effectiveLocation === normalizedPinLocation;
        })
      : reviews;

    return NextResponse.json({ reviews: filteredReviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}
