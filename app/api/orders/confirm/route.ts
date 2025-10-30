import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/auth';
import { createOrderFromStripeSession } from '@/lib/orders/createOrderFromStripeSession';

export async function POST(request: NextRequest) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-10-29.clover',
    });
    const body = await request.json();
    const sessionId: string | undefined = body?.sessionId;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const authSession = await auth();

    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items'],
    });

    const result = await createOrderFromStripeSession(checkoutSession, {
      fallbackUserId: authSession?.user?.id,
    });

    return NextResponse.json(
      {
        success: true,
        created: result.created,
        orderId: result.order.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Order confirmation error:', error);
    return NextResponse.json(
      { error: 'Failed to confirm order' },
      { status: 500 }
    );
  }
}
