import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { z } from 'zod';
import { isSupportedCurrency } from '@/lib/geolocation';

const currencySchema = z.object({
  currency: z.string().min(3).max(3),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = currencySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid currency code' },
        { status: 400 }
      );
    }

    const { currency } = validation.data;
    const upperCurrency = currency.toUpperCase();

    if (!isSupportedCurrency(upperCurrency)) {
      return NextResponse.json(
        { error: 'Unsupported currency' },
        { status: 400 }
      );
    }

    // Update user's preferred currency
    await prisma.user.update({
      where: { id: session.user.id },
      data: { preferredCurrency: upperCurrency },
    });

    return NextResponse.json({
      message: 'Currency preference updated',
      currency: upperCurrency,
    });
  } catch (error) {
    console.error('Currency update error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
