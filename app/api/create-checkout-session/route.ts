import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { convertFromBase, getCurrencySettings } from '@/lib/currency';
import { isSupportedCurrency } from '@/lib/geolocation';

export async function POST(request: NextRequest) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-10-29.clover',
    });
    const body = await request.json();
    const {
      items,
      email,
      name,
      address,
      subtotal,
      subtotalAfterDiscount,
      shipping,
      tax,
      total,
      discount,
      promoCode,
      promoCodeId,
      promoCodes,
      currency: userCurrency,
    } = body;

    if (!address || typeof address !== 'object') {
      return NextResponse.json({ error: 'Shipping address is required.' }, { status: 400 });
    }

    const trimmedAddress = {
      line1: typeof address.line1 === 'string' ? address.line1.trim() : '',
      line2: typeof address.line2 === 'string' ? address.line2.trim() : '',
      city: typeof address.city === 'string' ? address.city.trim() : '',
      state: typeof address.state === 'string' ? address.state.trim() : '',
      postalCode: typeof address.postalCode === 'string' ? address.postalCode.trim().toUpperCase() : '',
      country: typeof address.country === 'string' ? address.country.trim().toUpperCase() : '',
    };

    const missingAddressFields = ['line1', 'city', 'state', 'postalCode', 'country'].filter(
      (key) => !trimmedAddress[key as keyof typeof trimmedAddress]
    );

    if (missingAddressFields.length > 0) {
      return NextResponse.json(
        { error: 'Please provide a complete shipping address before continuing.' },
        { status: 400 }
      );
    }

    const normalizedPromoCodes = Array.isArray(promoCodes)
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
          .filter(Boolean)
      : [];

    // Use user's currency if provided and supported, otherwise fall back to environment setting
    const { active: defaultCurrency } = getCurrencySettings();
    const activeCurrency = userCurrency && isSupportedCurrency(userCurrency)
      ? userCurrency.toUpperCase()
      : defaultCurrency;

    // Zero-decimal currencies (no minor units, e.g., 1 JPY = 1, not 100)
    // These currencies don't have fractional units in Stripe
    const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'TWD', 'UGX', 'RWF', 'XAF', 'XOF'];
    const isZeroDecimal = zeroDecimalCurrencies.includes(activeCurrency);

    const toMinorUnits = (amount: number) => {
      const converted = convertFromBase(amount, activeCurrency);
      // For zero-decimal currencies, don't multiply by 100
      return Math.round(isZeroDecimal ? converted : converted * 100);
    };

    const discountValue = Math.max(0, Number(discount) || 0);
    const primaryPromo = normalizedPromoCodes[0] ?? null;
    let couponId: string | null = null;

    if (discountValue > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: toMinorUnits(discountValue),
        currency: activeCurrency.toLowerCase(),
        duration: 'once',
        name: promoCode || 'Checkout Discount',
      });
      couponId = coupon.id;
    }

    // Helper function to convert image path to full URL
    const getFullImageUrl = (imagePath: string | null | undefined): string[] => {
      if (!imagePath) return [];

      // If already a full URL, use it
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return [imagePath];
      }

      // If it's a relative path, convert to full URL
      if (imagePath.startsWith('/')) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
        return [`${baseUrl}${imagePath}`];
      }

      // Invalid or unsupported format, return empty
      return [];
    };

    // Build line items, including shipping if applicable
    const normalizedShipping = Number(shipping) || 0;
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item: any) => ({
      price_data: {
        currency: activeCurrency.toLowerCase(),
        product_data: {
          name: item.productName,
          images: getFullImageUrl(item.productImage),
          description: item.size || item.color ? `${item.size || ''} ${item.color || ''}`.trim() : undefined,
        },
        unit_amount: toMinorUnits(item.priceAtPurchase),
      },
      quantity: item.quantity,
    }));

    if (normalizedShipping > 0) {
      lineItems.push({
        price_data: {
          currency: activeCurrency.toLowerCase(),
          product_data: {
            name: 'Shipping',
          },
          unit_amount: toMinorUnits(normalizedShipping),
        },
        quantity: 1,
      });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout`,
      customer_email: email,
      discounts: couponId ? [{ coupon: couponId }] : undefined,
      metadata: {
        customerName: name,
        address: JSON.stringify(trimmedAddress),
        items: JSON.stringify(items),
        subtotal: subtotal.toString(),
        subtotalAfterDiscount: subtotalAfterDiscount !== undefined
          ? subtotalAfterDiscount.toString()
          : Math.max(Number(subtotal) - discountValue, 0).toString(),
        shipping: normalizedShipping.toString(),
        tax: tax.toString(),
        total: total.toString(),
        discount: discountValue.toString(),
        promoCode: (promoCode || primaryPromo?.code || '').toString(),
        promoCodeId: (promoCodeId || primaryPromo?.id || '').toString(),
        promoCodes: JSON.stringify(normalizedPromoCodes),
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url }, { status: 200 });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
