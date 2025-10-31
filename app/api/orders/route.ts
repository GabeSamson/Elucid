import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sendOrderThankYouEmail } from '@/lib/email/sendOrderThankYouEmail';
import { auth } from '@/auth';
import { normalizePromoCode } from '@/lib/promocodes';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const rawEmail = session.user.email || null;
    const normalizedEmail = rawEmail?.trim().toLowerCase() || null;

    const orConditions = [
      { userId: session.user.id },
      normalizedEmail ? { email: normalizedEmail } : null,
      rawEmail && rawEmail !== normalizedEmail ? { email: rawEmail } : null,
    ].filter(Boolean) as any[];

    const orders = await prisma.order.findMany({
      where: {
        OR: orConditions,
      },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Parse JSON addresses
    const ordersWithParsedAddresses = orders.map(order => {
      let parsedAddress = {};
      try {
        parsedAddress = order.address ? JSON.parse(order.address) : {};
      } catch (parseError) {
        parsedAddress = {};
      }
      return {
        ...order,
        address: parsedAddress,
      };
    });

    return NextResponse.json({ orders: ordersWithParsedAddresses }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json();

    const {
      email,
      name,
      address,
      items,
      subtotal,
      shipping,
      tax,
      total,
      discount = 0,
      promoCodeId = null,
      promoCodeCode = null,
      promoCodes = [],
      stripePaymentId,
    } = body;

    if (!address || typeof address !== 'object') {
      return NextResponse.json(
        { error: 'Shipping address is required.' },
        { status: 400 }
      );
    }

    const sanitizedAddress = {
      line1: typeof address.line1 === 'string' ? address.line1.trim() : '',
      line2: typeof address.line2 === 'string' ? address.line2.trim() : '',
      city: typeof address.city === 'string' ? address.city.trim() : '',
      state: typeof address.state === 'string' ? address.state.trim() : '',
      postalCode: typeof address.postalCode === 'string' ? address.postalCode.trim().toUpperCase() : '',
      country: typeof address.country === 'string' ? address.country.trim().toUpperCase() : '',
    };

    const missingAddressKeys = ['line1', 'city', 'state', 'postalCode', 'country'].filter(
      (key) => !sanitizedAddress[key as keyof typeof sanitizedAddress]
    );

    if (missingAddressKeys.length > 0) {
      return NextResponse.json(
        { error: 'Please provide a complete shipping address before continuing.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email?.trim().toLowerCase() || null;

    let linkedUserId: string | null = session?.user?.id || null;

    if (!linkedUserId && normalizedEmail) {
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      });
      linkedUserId = existingUser?.id || null;
    }

    // Create order
    interface IncomingPromoPayload {
      id: string | null;
      code: string;
      discountType: 'PERCENTAGE' | 'FIXED' | null;
      amount: number | null;
      discountAmount: number | null;
    }

    const incomingPromoCodes: IncomingPromoPayload[] = Array.isArray(promoCodes)
      ? promoCodes
          .map((promo: any) => {
            const code = typeof promo.code === 'string' ? promo.code.trim().toUpperCase() : null;
            const id = typeof promo.id === 'string' && promo.id.length > 0 ? promo.id : null;
            const discountType =
              promo.discountType === 'PERCENTAGE' || promo.discountType === 'FIXED'
                ? promo.discountType
                : null;
            const amount = typeof promo.amount === 'number' ? promo.amount : null;
            const discountAmount = typeof promo.discountAmount === 'number' ? promo.discountAmount : null;

            if (!code) {
              return null;
            }

            return {
              id,
              code,
              discountType,
              amount,
              discountAmount,
            };
          })
          .filter((promo): promo is IncomingPromoPayload => promo !== null)
      : [];

    const promoIds = Array.from(
      new Set(incomingPromoCodes.map((promo) => promo.id).filter((value): value is string => Boolean(value)))
    );
    const promoCodesNormalized = Array.from(
      new Set(incomingPromoCodes.map((promo) => promo.code).filter((value): value is string => Boolean(value)))
    );

    const promoRecords = promoIds.length > 0 || promoCodesNormalized.length > 0
      ? await prisma.promoCode.findMany({
          where: {
            OR: [
              promoIds.length > 0 ? { id: { in: promoIds } } : null,
              promoCodesNormalized.length > 0 ? { code: { in: promoCodesNormalized } } : null,
            ].filter(Boolean) as any,
          },
        })
      : [];

    const promoRecordById = promoRecords.reduce<Record<string, (typeof promoRecords)[number]>>((acc, record) => {
      acc[record.id] = record;
      return acc;
    }, {});
    const promoRecordByCode = promoRecords.reduce<Record<string, (typeof promoRecords)[number]>>((acc, record) => {
      acc[record.code] = record;
      return acc;
    }, {});

    const appliedPromosData: Prisma.OrderAppliedPromoCodeUncheckedCreateWithoutOrderInput[] = [];
    const promoIdsToIncrement = new Set<string>();

    for (const promo of incomingPromoCodes) {
      const normalizedCode = normalizePromoCode(promo.code);
      const promoRecord = (promo.id && promoRecordById[promo.id]) || promoRecordByCode[normalizedCode];

      const resolvedCode = promoRecord?.code || normalizedCode;
      if (!resolvedCode) {
        continue;
      }

      const discountType =
        promoRecord?.discountType ??
        (promo.discountType === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED');
      const amount = promoRecord?.amount ?? (typeof promo.amount === 'number' ? promo.amount : 0);
      const discountApplied = typeof promo.discountAmount === 'number' ? promo.discountAmount : 0;

      if (promoRecord?.id) {
        promoIdsToIncrement.add(promoRecord.id);
      }

      appliedPromosData.push({
        promoCodeId: promoRecord?.id ?? null,
        code: resolvedCode,
        discountType,
        amount,
        discountApplied,
      });
    }

    const discountFromPromos = appliedPromosData.reduce(
      (sum, promo) => sum + (promo.discountApplied ?? 0),
      0
    );
    const normalizedDiscount = discountFromPromos > 0 ? discountFromPromos : Number(discount) || 0;
    const cappedDiscount = Math.min(Math.max(normalizedDiscount, 0), subtotal);
    const primaryPromo = appliedPromosData[0] ?? null;

    const order = await (prisma as any).order.create({
      data: {
        userId: linkedUserId,
        email: normalizedEmail,
        name,
        address: JSON.stringify(sanitizedAddress),
        subtotal,
        shipping,
        tax,
        total,
        discount: cappedDiscount,
        promoCodeId: primaryPromo?.promoCodeId ?? promoCodeId,
        promoCodeCode: primaryPromo?.code ?? (typeof promoCodeCode === 'string' ? promoCodeCode : null),
        stripePaymentId,
        status: 'PROCESSING',
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            productImage: item.productImage,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
            priceAtPurchase: item.priceAtPurchase,
          })),
        },
        appliedPromos: appliedPromosData.length > 0
          ? {
              create: appliedPromosData.map((promo) => ({
                promoCodeId: promo.promoCodeId,
                code: promo.code,
                discountType: promo.discountType,
                amount: promo.amount,
                discountApplied: promo.discountApplied ?? 0,
              })),
            }
          : undefined,
      },
      include: {
        items: true,
        appliedPromos: true,
      },
    });

    // Update product stock
    for (const item of items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }

    if (promoIdsToIncrement.size > 0) {
      for (const promoId of promoIdsToIncrement) {
        try {
          await prisma.promoCode.update({
            where: { id: promoId },
            data: {
              redemptions: {
                increment: 1,
              },
            },
          });
        } catch (incrementError) {
          console.error(`Failed to increment redemptions for promo ${promoId}:`, incrementError);
        }
      }
    }

    if (normalizedEmail) {
      sendOrderThankYouEmail({
        to: normalizedEmail,
        name,
        orderId: order.id,
        items: order.items.map((item: any) => ({
          productName: item.productName,
          productImage: item.productImage,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
          priceAtPurchase: item.priceAtPurchase,
        })),
        subtotal: order.subtotal,
        shipping: order.shipping,
        tax: order.tax,
        discount: order.discount,
        total: order.total,
      }).catch((emailError) => {
        console.error('Failed to queue thank-you email:', emailError);
      });
    }

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
