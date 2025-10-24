import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { normalizePromoCode } from '@/lib/promocodes';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const createPromoSchema = z.object({
  code: z.string().trim().min(2, 'Code must be at least 2 characters'),
  description: z.string().max(200).optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  amount: z.number().positive('Amount must be greater than 0'),
  active: z.boolean().optional(),
  minimumOrderValue: z.number().nonnegative().optional(),
  maxRedemptions: z.number().int().positive().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
});

const updatePromoSchema = z.object({
  id: z.string().uuid('Invalid promo code ID'),
  code: z.string().trim().min(2, 'Code must be at least 2 characters').optional(),
  description: z.string().max(200).optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
  amount: z.number().positive('Amount must be greater than 0').optional(),
  active: z.boolean().optional(),
  minimumOrderValue: z.number().nonnegative().optional().nullable(),
  maxRedemptions: z.number().int().positive().optional().nullable(),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
});

const ensureAdmin = async () => {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return null;
  }
  return session.user;
};

export async function GET() {
  const user = await ensureAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const promos = await (prisma as any).promoCode.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ promos });
}

export async function POST(request: NextRequest) {
  const user = await ensureAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const parsed = createPromoSchema.safeParse({
      ...payload,
      amount: Number(payload.amount),
      minimumOrderValue:
        payload.minimumOrderValue !== undefined ? Number(payload.minimumOrderValue) : undefined,
      maxRedemptions:
        payload.maxRedemptions !== undefined ? Number(payload.maxRedemptions) : undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
    }

    const data = parsed.data;
    const code = normalizePromoCode(data.code);

    if (data.discountType === 'PERCENTAGE' && data.amount > 100) {
      return NextResponse.json({ error: 'Percentage discounts cannot exceed 100%' }, { status: 400 });
    }

    const startsAt = data.startsAt ? new Date(data.startsAt) : undefined;
    const endsAt = data.endsAt ? new Date(data.endsAt) : undefined;

    if (startsAt && endsAt && startsAt > endsAt) {
      return NextResponse.json({ error: 'Start date must be before end date' }, { status: 400 });
    }

    const promo = await (prisma as any).promoCode.create({
      data: {
        code,
        description: data.description,
        discountType: data.discountType,
        amount: data.amount,
        active: data.active ?? true,
        minimumOrderValue: data.minimumOrderValue,
        maxRedemptions: data.maxRedemptions,
        startsAt,
        endsAt,
      },
    });

    return NextResponse.json({ promo }, { status: 201 });
  } catch (error) {
    console.error('Create promo code error:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'This promo code already exists.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create promo code' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await ensureAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const parsed = updatePromoSchema.safeParse({
      ...payload,
      amount: payload.amount !== undefined ? Number(payload.amount) : undefined,
      minimumOrderValue:
        payload.minimumOrderValue !== undefined && payload.minimumOrderValue !== null
          ? Number(payload.minimumOrderValue)
          : payload.minimumOrderValue === null
          ? null
          : undefined,
      maxRedemptions:
        payload.maxRedemptions !== undefined && payload.maxRedemptions !== null
          ? Number(payload.maxRedemptions)
          : payload.maxRedemptions === null
          ? null
          : undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
    }

    const { id, code, description, discountType, amount, active, minimumOrderValue, maxRedemptions, startsAt, endsAt } = parsed.data;

    // Validate percentage
    if (discountType === 'PERCENTAGE' && amount && amount > 100) {
      return NextResponse.json({ error: 'Percentage discounts cannot exceed 100%' }, { status: 400 });
    }

    // Validate dates
    const startsAtDate = startsAt ? new Date(startsAt) : undefined;
    const endsAtDate = endsAt ? new Date(endsAt) : undefined;

    if (startsAtDate && endsAtDate && startsAtDate > endsAtDate) {
      return NextResponse.json({ error: 'Start date must be before end date' }, { status: 400 });
    }

    const updateData: any = {};
    if (code !== undefined) updateData.code = normalizePromoCode(code);
    if (description !== undefined) updateData.description = description;
    if (discountType !== undefined) updateData.discountType = discountType;
    if (amount !== undefined) updateData.amount = amount;
    if (active !== undefined) updateData.active = active;
    if (minimumOrderValue !== undefined) updateData.minimumOrderValue = minimumOrderValue;
    if (maxRedemptions !== undefined) updateData.maxRedemptions = maxRedemptions;
    if (startsAt !== undefined) updateData.startsAt = startsAt ? new Date(startsAt) : null;
    if (endsAt !== undefined) updateData.endsAt = endsAt ? new Date(endsAt) : null;

    const promo = await (prisma as any).promoCode.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ promo });
  } catch (error) {
    console.error('Update promo code error:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'This promo code already exists.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update promo code' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await ensureAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Promo code ID is required' }, { status: 400 });
    }

    await (prisma as any).promoCode.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete promo code error:', error);
    return NextResponse.json({ error: 'Failed to delete promo code' }, { status: 500 });
  }
}
