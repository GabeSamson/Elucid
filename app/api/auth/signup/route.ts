import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(5, 'Password must be at least 5 characters'),
  name: z.string().min(1, 'Name is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = signupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { email, password, name } = validation.data;
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Check if there's a pending verification for this email
    const existingPending = await prisma.pendingUser.findUnique({
      where: { email: normalizedEmail },
    });

    // Delete existing pending verification if exists
    if (existingPending) {
      await prisma.pendingUser.delete({
        where: { email: normalizedEmail },
      });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create pending user (expires in 15 minutes)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.pendingUser.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name,
        code: verificationCode,
        expiresAt,
      },
    });

    // Send verification email
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const result = await resend.emails.send({
        from: 'Elucid LDN <hello@elucid.london>',
        to: normalizedEmail,
        subject: 'Verify Your Email - Elucid LDN',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2B2826; font-size: 24px; margin-bottom: 20px;">Welcome to Elucid LDN</h1>
            <p style="color: #6B6560; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
              Thanks for signing up! To complete your registration, please enter the verification code below:
            </p>
            <div style="background-color: #F5F3EE; padding: 20px; text-align: center; margin-bottom: 20px; border-radius: 4px;">
              <div style="font-size: 32px; font-weight: bold; color: #2B2826; letter-spacing: 8px;">
                ${verificationCode}
              </div>
            </div>
            <p style="color: #6B6560; font-size: 14px; line-height: 1.5;">
              This code will expire in 15 minutes. If you didn't create an account, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #D4C9BA; margin: 30px 0;" />
            <p style="color: #6B6560; font-size: 12px; text-align: center;">
              Elucid LDN - London Streetwear
            </p>
          </div>
        `,
      });
      console.log('Verification email sent successfully:', result);
    } catch (emailError) {
      console.error('FAILED TO SEND VERIFICATION EMAIL:', emailError);
      console.error('Error details:', JSON.stringify(emailError, null, 2));
      // Clean up pending user if email fails
      await prisma.pendingUser.delete({
        where: { email: normalizedEmail },
      });
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Verification code sent to your email',
      email: normalizedEmail,
      requiresVerification: true,
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
