import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import Stripe from "stripe";
import { SubscriptionPlan } from "@prisma/client";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // Handle successful session
  if (event.type === "checkout.session.completed") {
    const tenantId = session.client_reference_id;

    if (tenantId) {
      // HANDLE SUBSCRIPTION
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      );

      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          lemonSqueezyCustomerId: session.customer as string,
          lemonSqueezySubscriptionId: subscription.id,
          planStatus: "ACTIVE",
          plan: SubscriptionPlan.PRO, // Default for stripe legacy
          subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
        },
      });
    }
  }

  // Handle payment failures or cancellations
  if (event.type === "invoice.payment_failed") {
    const subscriptionId = session.subscription as string;
    await prisma.tenant.update({
      where: { lemonSqueezySubscriptionId: subscriptionId },
      data: { planStatus: "PAST_DUE" },
    });
  }

  return new NextResponse(null, { status: 200 });
}
