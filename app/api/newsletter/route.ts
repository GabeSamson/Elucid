import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { auth } from '@/auth';

const newsletterSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = newsletterSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid email address' },
        { status: 400 }
      );
    }

    const { email } = validation.data;
    const normalizedEmail = email.trim().toLowerCase();

    const session = await auth();
    const sessionEmail = session?.user?.email?.trim().toLowerCase();

    if (!sessionEmail) {
      return NextResponse.json(
        { error: 'Please sign in to subscribe to the newsletter.' },
        { status: 401 }
      );
    }

    if (sessionEmail !== normalizedEmail) {
      return NextResponse.json(
        { error: 'You can only subscribe using your own account email.' },
        { status: 403 }
      );
    }

    // Check if email already exists
    const existing = await prisma.newsletter.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      if (existing.verified) {
        return NextResponse.json(
        { message: 'You are already subscribed to the newsletter.', alreadySubscribed: true },
        { status: 200 }
      );
    } else {
      await prisma.newsletter.update({
        where: { email: normalizedEmail },
          data: {
            verified: true,
            active: true,
            verificationToken: null,
          },
        });
        return NextResponse.json(
          { message: 'Your newsletter subscription is now confirmed.', alreadySubscribed: true },
          { status: 200 }
        );
      }
    }

    await prisma.newsletter.create({
      data: {
        email: normalizedEmail,
        active: true,
        verified: true,
        verificationToken: null,
      },
    });

    return NextResponse.json(
      { message: 'Thanks for subscribing!', alreadySubscribed: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
