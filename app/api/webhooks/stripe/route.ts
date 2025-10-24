import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createOrderFromStripeSession } from '@/lib/orders/createOrderFromStripeSession';

export async function POST(request: NextRequest) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-09-30.clover',
    });
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    const body = await request.text();
    const signature = request.headers.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed:`, err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const result = await createOrderFromStripeSession(session);
      console.log(
        `Order ${result.created ? 'created' : 'already recorded'} for ${
          result.order.email || 'guest checkout'
        }`
      );
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
