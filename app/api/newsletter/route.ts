import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { sendNewsletterVerificationEmail } from '@/lib/email/sendNewsletterVerificationEmail';

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

    // Check if email already exists
    const existing = await prisma.newsletter.findUnique({
      where: { email },
    });

    if (existing) {
      if (existing.verified) {
        return NextResponse.json(
          { error: 'This email is already subscribed and verified' },
          { status: 400 }
        );
      } else {
        // Resend verification email
        const newToken = randomBytes(32).toString('hex');
        await prisma.newsletter.update({
          where: { email },
          data: { verificationToken: newToken },
        });
        await sendNewsletterVerificationEmail({
          to: email,
          verificationToken: newToken,
        });
        return NextResponse.json(
          { message: 'A verification email has been sent to your email address' },
          { status: 200 }
        );
      }
    }

    // Generate verification token
    const verificationToken = randomBytes(32).toString('hex');

    // Insert new subscriber (unverified)
    await prisma.newsletter.create({
      data: {
        email,
        active: true,
        verified: false,
        verificationToken,
      },
    });

    // Send verification email
    await sendNewsletterVerificationEmail({
      to: email,
      verificationToken,
    });

    return NextResponse.json(
      { message: 'Please check your email to verify your subscription' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
