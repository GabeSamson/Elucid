import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ admins });
  } catch (error) {
    console.error('List admin users error:', error);
    return NextResponse.json(
      { error: 'Failed to load admin users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const email: string | undefined = body?.email;
    const customPassword: string | undefined = body?.password;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Validate custom password if provided
    if (customPassword && customPassword.trim().length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      if (existingUser.role === 'admin') {
        return NextResponse.json({
          message: 'User is already an admin',
          temporaryPassword: null,
        });
      }

      const updatedUser = await prisma.user.update({
        where: { email: normalizedEmail },
        data: { role: 'admin' },
      });

      return NextResponse.json({
        message: `${updatedUser.email} is now an admin.`,
        temporaryPassword: null,
      });
    }

    const generateTemporaryPassword = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
      const bytes = randomBytes(12);
      return Array.from(bytes)
        .map((byte) => chars[byte % chars.length])
        .join('');
    };

    // Use custom password if provided, otherwise generate one
    const temporaryPassword = customPassword?.trim() || generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const newAdmin = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: body?.name?.trim() || null,
        role: 'admin',
      },
      select: {
        email: true,
      },
    });

    return NextResponse.json({
      message: `${newAdmin.email} was created as an admin.`,
      // Only return password if it was auto-generated (not custom)
      temporaryPassword: customPassword ? null : temporaryPassword,
    });
  } catch (error) {
    console.error('Create admin user error:', error);
    return NextResponse.json(
      { error: 'Failed to add admin user' },
      { status: 500 }
    );
  }
}
