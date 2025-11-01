import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pinnedOnly = searchParams.get('pinned') === 'true';

    const reviews = await prisma.review.findMany({
      where: {
        isApproved: true,
        ...(pinnedOnly && { isPinned: true }),
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
