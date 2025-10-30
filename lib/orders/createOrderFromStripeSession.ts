import type Stripe from 'stripe';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sendOrderThankYouEmail } from '@/lib/email/sendOrderThankYouEmail';

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
  const promoCode = metadata.promoCode || null;
  const promoCodeId = metadata.promoCodeId || null;

  let userId: string | null = options.fallbackUserId || null;

  if (!userId && customerEmail) {
    const linkedUser = await prisma.user.findUnique({
      where: { email: customerEmail },
      select: { id: true },
    });
    userId = linkedUser?.id || null;
  }

  let promoRecord: { id: string; code: string } | null = null;

  if (promoCodeId) {
    const existing = await prisma.promoCode.findUnique({
      where: { id: promoCodeId },
      select: { id: true, code: true },
    });
    if (existing) {
      promoRecord = existing;
    }
  } else if (promoCode) {
    const existing = await prisma.promoCode.findUnique({
      where: { code: promoCode },
      select: { id: true, code: true },
    });
    if (existing) {
      promoRecord = existing;
    }
  }

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

  const stripePaymentId = paymentIntentId || session.id;

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
      discount,
      promoCodeId: promoRecord?.id ?? null,
      promoCodeCode: promoRecord?.code || promoCode,
      notes: null,
      stripePaymentId,
      status: 'PROCESSING',
      items: {
        create: orderItemsToCreate,
      },
    },
    include: {
      items: true,
    },
  });

  if (promoRecord) {
    await prisma.promoCode.update({
      where: { id: promoRecord.id },
      data: { redemptions: { increment: 1 } },
    });
  }

  if (orderItemsToCreate.length > 0) {
    for (const item of parsedItems) {
      if (!item?.productId || typeof item.quantity !== 'number') continue;

      try {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      } catch (stockError) {
        console.error(
          `Failed to decrement stock for product ${item.productId}:`,
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
        items: order.items.map(item => ({
          productName: item.productName,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
          priceAtPurchase: item.priceAtPurchase,
        })),
        total: order.total,
      });
    } catch (emailError) {
      console.error('Failed to send thank-you email after Stripe checkout:', emailError);
    }
  }

  return { order, created: true };
}
