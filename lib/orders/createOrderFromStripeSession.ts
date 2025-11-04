import type Stripe from 'stripe';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sendOrderThankYouEmail } from '@/lib/email/sendOrderThankYouEmail';
import { normalizePromoCode } from '@/lib/promocodes';

interface CreateOrderOptions {
  fallbackUserId?: string | null;
}

interface ParsedCartItem {
  productId?: string;
  productName?: string;
  productImage?: string | null;
  quantity: number;
  size?: string | null;
  color?: string | null;
  priceAtPurchase?: number;
}

export async function createOrderFromStripeSession(
  session: Stripe.Checkout.Session,
  options: CreateOrderOptions = {}
) {
  const metadata = session.metadata || {};
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id || null;

  const existingOrder = paymentIntentId
    ? await prisma.order.findFirst({
        where: { stripePaymentId: paymentIntentId },
        include: { items: true },
      })
    : await prisma.order.findFirst({
        where: { stripePaymentId: session.id },
        include: { items: true },
      });

  if (existingOrder) {
    return { order: existingOrder, created: false };
  }

  const customerEmail =
    session.customer_email?.trim().toLowerCase() ||
    metadata.email?.trim().toLowerCase() ||
    null;

  const customerName =
    metadata.customerName ||
    session.customer_details?.name ||
    'Guest';

  const addressString =
    typeof metadata.address === 'string' && metadata.address.length > 0
      ? metadata.address
      : JSON.stringify(session.customer_details?.address || {});

  let parsedItems: ParsedCartItem[] = [];
  if (metadata.items) {
    try {
      const result = JSON.parse(metadata.items);
      if (Array.isArray(result)) {
        parsedItems = result;
      }
    } catch (parseError) {
      console.error('Failed to parse items metadata:', parseError);
    }
  }

  const uniqueProductIds = Array.from(
    new Set(
      parsedItems
        .map((item) => item.productId)
        .filter((id): id is string => Boolean(id))
    )
  );

  const products =
    uniqueProductIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: uniqueProductIds } },
        })
      : [];

  const productMap = products.reduce<Record<string, (typeof products)[number]>>(
    (acc, product) => {
      acc[product.id] = product;
      return acc;
    },
    {}
  );

  const subtotal =
    parseFloat(metadata.subtotal || '0') || 0;
  const discount =
    parseFloat(metadata.discount || '0') || 0;
  const subtotalAfterDiscount =
    parseFloat(metadata.subtotalAfterDiscount || '0') ||
    Math.max(subtotal - discount, 0);
  const shipping =
    parseFloat(metadata.shipping || '0') || 0;
  const tax =
    parseFloat(metadata.tax || '0') || 0;
  const total =
    parseFloat(metadata.total || '0') ||
    subtotalAfterDiscount + shipping + tax;
  type SessionPromoMetadata = {
    id?: string | null;
    code?: string | null;
    discountType?: 'PERCENTAGE' | 'FIXED' | null;
    amount?: number | null;
    discountAmount?: number | null;
  };

  const promoCode = metadata.promoCode || null;
  const promoCodeId = metadata.promoCodeId || null;

  const parsedPromoMetadata: SessionPromoMetadata[] = [];

  if (metadata.promoCodes) {
    try {
      const parsed = JSON.parse(metadata.promoCodes);
      if (Array.isArray(parsed)) {
        parsed
          .filter((entry): entry is SessionPromoMetadata => typeof entry === 'object' && entry !== null)
          .forEach((entry) => {
            parsedPromoMetadata.push({
              id: typeof entry.id === 'string' ? entry.id : null,
              code: typeof entry.code === 'string' ? entry.code : null,
              discountType: entry.discountType === 'PERCENTAGE' || entry.discountType === 'FIXED'
                ? entry.discountType
                : null,
              amount: typeof entry.amount === 'number' ? entry.amount : null,
              discountAmount: typeof entry.discountAmount === 'number' ? entry.discountAmount : null,
            });
          });
      }
    } catch (parseError) {
      console.error('Failed to parse promo codes metadata:', parseError);
    }
  }

  if (parsedPromoMetadata.length === 0 && (promoCode || promoCodeId)) {
    parsedPromoMetadata.push({
      id: promoCodeId,
      code: promoCode,
      discountAmount: typeof metadata.discount === 'string' ? Number(metadata.discount) || 0 : null,
    });
  }

  let userId: string | null = options.fallbackUserId || null;

  if (!userId && customerEmail) {
    const linkedUser = await prisma.user.findUnique({
      where: { email: customerEmail },
      select: { id: true },
    });
    userId = linkedUser?.id || null;
  }

  const promoIds = Array.from(
    new Set(
      parsedPromoMetadata
        .map((entry) => entry.id)
        .filter((value): value is string => Boolean(value))
    )
  );

  const promoCodes = Array.from(
    new Set(
      parsedPromoMetadata
        .map((entry) => (entry.code ? normalizePromoCode(entry.code) : null))
        .filter((value): value is string => Boolean(value))
    )
  );

  const promoRecords = promoIds.length > 0 || promoCodes.length > 0
    ? await prisma.promoCode.findMany({
        where: {
          OR: [
            promoIds.length > 0 ? { id: { in: promoIds } } : null,
            promoCodes.length > 0 ? { code: { in: promoCodes } } : null,
          ].filter(Boolean) as any,
        },
      })
    : [];

  const promoRecordById = promoRecords.reduce<Record<string, typeof promoRecords[number]>>((acc, record) => {
    acc[record.id] = record;
    return acc;
  }, {});

  const promoRecordByCode = promoRecords.reduce<Record<string, typeof promoRecords[number]>>((acc, record) => {
    acc[record.code] = record;
    return acc;
  }, {});

  const orderItemsData = parsedItems.map((item) => {
    const product = item.productId ? productMap[item.productId] : null;
    let fallbackImage: string | null = null;

    if (product?.images) {
      try {
        const parsedImages = JSON.parse(product.images);
        if (Array.isArray(parsedImages) && parsedImages.length > 0) {
          fallbackImage = parsedImages[0];
        }
      } catch {
        fallbackImage = null;
      }
    }

    return {
      productId: item.productId || (product ? product.id : undefined),
      productName:
        item.productName ||
        product?.name ||
        'Product',
      productImage:
        item.productImage || fallbackImage,
      quantity: item.quantity || 1,
      size: item.size,
      color: item.color,
      priceAtPurchase:
        item.priceAtPurchase ??
        product?.price ??
        0,
    };
  });

  const orderItemsToCreate: Prisma.OrderItemUncheckedCreateWithoutOrderInput[] = orderItemsData
    .filter(
      (item) =>
        typeof item.productId === 'string' && item.productId.length > 0
    )
    .map(item => ({
      productId: item.productId as string,
      productName: item.productName,
      productImage: item.productImage,
      quantity: item.quantity,
      size: item.size ?? null,
      color: item.color ?? null,
      priceAtPurchase: item.priceAtPurchase,
    }));

  const orderAppliedPromosToCreate: Prisma.OrderAppliedPromoCodeUncheckedCreateWithoutOrderInput[] = [];
  const promoIdsToIncrement: Set<string> = new Set();

  for (const entry of parsedPromoMetadata) {
    const normalizedCode = entry.code ? normalizePromoCode(entry.code) : null;
    const promoRecord =
      (entry.id && promoRecordById[entry.id]) ||
      (normalizedCode ? promoRecordByCode[normalizedCode] : undefined);

    const resolvedCode = promoRecord?.code || normalizedCode;
    if (!resolvedCode) {
      continue;
    }

    const discountType =
      promoRecord?.discountType ??
      (entry.discountType === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED');
    const amount =
      promoRecord?.amount ?? (typeof entry.amount === 'number' ? entry.amount : 0);
    const discountApplied =
      typeof entry.discountAmount === 'number' ? entry.discountAmount : 0;

    if (promoRecord?.id) {
      promoIdsToIncrement.add(promoRecord.id);
    }

    orderAppliedPromosToCreate.push({
      promoCodeId: promoRecord?.id ?? null,
      code: resolvedCode,
      discountType,
      amount,
      discountApplied,
    });
  }

  const aggregatedDiscountFromPromos = orderAppliedPromosToCreate.reduce(
    (sum, promo) => sum + (promo.discountApplied ?? 0),
    0
  );

  const stripePaymentId = paymentIntentId || session.id;

  const normalizedDiscount = aggregatedDiscountFromPromos > 0 ? aggregatedDiscountFromPromos : discount;
  const cappedDiscount = Math.min(Math.max(normalizedDiscount, 0), subtotal);
  const primaryAppliedPromo = orderAppliedPromosToCreate[0] ?? null;

  const order = await prisma.order.create({
    data: {
      userId,
      email: customerEmail,
      name: customerName,
      address: addressString,
      subtotal,
      shipping,
      tax,
      total,
      discount: cappedDiscount,
      promoCodeId: primaryAppliedPromo?.promoCodeId ?? null,
      promoCodeCode: primaryAppliedPromo?.code ?? (promoCode ? normalizePromoCode(promoCode) : null),
      notes: null,
      stripePaymentId,
      status: 'PENDING',
      items: {
        create: orderItemsToCreate,
      },
      appliedPromos: orderAppliedPromosToCreate.length > 0
        ? {
            create: orderAppliedPromosToCreate.map((promo) => ({
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

  if (promoIdsToIncrement.size > 0) {
    for (const promoId of promoIdsToIncrement) {
      try {
        await prisma.promoCode.update({
          where: { id: promoId },
          data: { redemptions: { increment: 1 } },
        });
      } catch (incrementError) {
        console.error(`Failed to increment redemptions for promo ${promoId}:`, incrementError);
      }
    }
  }

  // Check if reserve stock toggle is enabled
  const homepageConfig = await prisma.homepageConfig.findUnique({
    where: { id: "main" },
    select: { autoDeductStock: true },
  });

  const shouldReserveStock = homepageConfig?.autoDeductStock ?? false;

  if (orderItemsToCreate.length > 0) {
    for (const item of parsedItems) {
      if (!item?.productId || typeof item.quantity !== 'number') continue;

      try {
        if (shouldReserveStock) {
          // Reserve stock when toggle is ON
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              reservedStock: {
                increment: item.quantity,
              },
            },
          });
        } else {
          // Auto-deduct stock when toggle is OFF
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }
      } catch (stockError) {
        console.error(
          `Failed to ${shouldReserveStock ? 'reserve' : 'decrement'} stock for product ${item.productId}:`,
          stockError
        );
      }
    }
  }

  if (order.email) {
    try {
      await sendOrderThankYouEmail({
        to: order.email,
        name: order.name,
        orderId: order.id,
        items: order.items.map(item => ({
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
      });
    } catch (emailError) {
      console.error('Failed to send thank-you email after Stripe checkout:', emailError);
    }
  }

  return { order, created: true };
}
