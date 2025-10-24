import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePromoCode, validatePromo } from '@/lib/promocodes';
import { z } from 'zod';

const validateSchema = z.object({
  code: z.string().trim().min(1, 'Promo code is required'),
  subtotal: z.number().nonnegative('Subtotal must be positive'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = validateSchema.safeParse({
      ...body,
      subtotal: Number(body.subtotal),
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid payload' }, { status: 400 });
    }

    const { code, subtotal } = parsed.data;
    const normalizedCode = normalizePromoCode(code);

    const promo = await (prisma as any).promoCode.findUnique({
      where: { code: normalizedCode },
    });

    const promoRecord = promo
      ? {
          id: promo.id,
          code: promo.code,
          description: promo.description,
          discountType: promo.discountType,
          amount: promo.amount,
          active: promo.active,
          minimumOrderValue: promo.minimumOrderValue,
          maxRedemptions: promo.maxRedemptions,
          redemptions: promo.redemptions,
          startsAt: promo.startsAt ? new Date(promo.startsAt) : null,
          endsAt: promo.endsAt ? new Date(promo.endsAt) : null,
        }
      : null;

    const result = validatePromo(promoRecord, subtotal);

    if (!result.valid || !promo) {
      return NextResponse.json({ error: result.reason || 'Invalid promo code' }, { status: 400 });
    }

    return NextResponse.json({
      promo: {
        id: promo.id,
        code: promo.code,
        description: promo.description,
        discountType: promo.discountType,
        amount: promo.amount,
        discountAmount: result.discountAmount,
        minimumOrderValue: promo.minimumOrderValue,
        maxRedemptions: promo.maxRedemptions,
        redemptions: promo.redemptions,
        active: promo.active,
        startsAt: promo.startsAt,
        endsAt: promo.endsAt,
      },
    });
  } catch (error) {
    console.error('Validate promo error:', error);
    return NextResponse.json({ error: 'Failed to validate promo code' }, { status: 500 });
  }
}
