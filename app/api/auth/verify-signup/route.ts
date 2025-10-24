import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and verification code are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find pending user
    const pendingUser = await prisma.pendingUser.findUnique({
      where: { email: normalizedEmail },
    });

    if (!pendingUser) {
      return NextResponse.json(
        { error: 'No pending verification found. Please sign up again.' },
        { status: 400 }
      );
    }

    // Check if expired
    if (new Date() > pendingUser.expiresAt) {
      await prisma.pendingUser.delete({
        where: { email: normalizedEmail },
      });
      return NextResponse.json(
        { error: 'Verification code expired. Please sign up again.' },
        { status: 400 }
      );
    }

    // Verify code
    if (pendingUser.code !== code.trim()) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Check if user was created in the meantime
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      // Clean up pending user
      await prisma.pendingUser.delete({
        where: { email: normalizedEmail },
      });
      return NextResponse.json(
        { error: 'User already exists. Please sign in.' },
        { status: 400 }
      );
    }

    // Create the actual user account
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: pendingUser.password,
        name: pendingUser.name,
        role: 'user',
        emailVerified: true,
      },
    });

    // Delete pending user
    await prisma.pendingUser.delete({
      where: { email: normalizedEmail },
    });

    return NextResponse.json({
      message: 'Account verified successfully',
      userId: user.id,
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify account' },
      { status: 500 }
    );
  }
}
