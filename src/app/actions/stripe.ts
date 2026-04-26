"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { PLANS } from "@/config/plans";

export async function createCheckoutSession(planId: string, interval: "MONTH" | "YEAR") {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  if ((session.user as any).role !== "ADMIN") {
    return { error: "Only administrators can manage subscriptions" };
  }

  const tenantId = (session.user as any).tenantId;
  const userEmail = session.user?.email;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) return { error: "Tenant not found" };

  const plan = PLANS.find((p) => p.id === planId);
  if (!plan || plan.id === "FREE") return { error: "Invalid plan selected" };

  const priceId = plan.price.priceIds.test; 

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      customer_email: userEmail || undefined,
      client_reference_id: tenantId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?canceled=true`,
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          tenantId: tenantId,
        },
      },
    });

    return { url: checkoutSession.url };
  } catch (error: any) {
    console.error("Stripe Error:", error);
    return { error: error.message || "Failed to create checkout session" };
  }
}
