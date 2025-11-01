import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const reviewSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Valid email is required').optional().or(z.literal('')),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional().or(z.literal('')),
  content: z.string().min(10, 'Review must be at least 10 characters').max(2000),
  productId: z.string().optional().or(z.literal('')), // Optional product ID for product reviews
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = reviewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { name, email, rating, title, content, productId } = validation.data;

    const review = await prisma.review.create({
      data: {
        name,
        email: email || null,
        rating,
        title: title || null,
        content,
        productId: productId || null,
        isApproved: false, // Requires admin approval
        isPinned: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Thank you for your review! It will be published after approval.',
      review: {
        id: review.id,
        name: review.name,
        rating: review.rating,
        title: review.title,
        content: review.content,
        createdAt: review.createdAt,
      },
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    return NextResponse.json(
      { error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}
