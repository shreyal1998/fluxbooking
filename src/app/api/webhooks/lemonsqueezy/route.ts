import { headers } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { SubscriptionPlan, SubscriptionInterval } from "@prisma/client";

export async function POST(req: Request) {
  const body = await req.text();
  const hmac = crypto.createHmac("sha256", process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || "");
  const digest = Buffer.from(hmac.update(body).digest("hex"), "utf8");
  const signature = Buffer.from((await headers()).get("x-signature") || "", "utf8");

  // Validate the signature
  if (signature.length !== digest.length || !crypto.timingSafeEqual(digest, signature)) {
    console.error("Lemon Squeezy Webhook: Invalid Signature");
    return new NextResponse("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(body);
  const eventName = payload.meta.event_name;
  const customData = payload.meta.custom_data;
  
  const tenantId = customData?.tenantId;
  const type = customData?.type;

  console.log(`🔔 Webhook Received: ${eventName}`, { tenantId, type });

  if (!tenantId) {
    console.error("Lemon Squeezy Webhook: No tenant ID found in custom data");
    return new NextResponse("No tenant ID found in custom data", { status: 400 });
  }

  try {
    if (
      eventName === "subscription_created" || 
      eventName === "subscription_updated" || 
      eventName === "subscription_resumed" || 
      eventName === "subscription_unpaused" ||
      eventName === "subscription_restarted"
    ) {
      const attributes = payload.data.attributes;
      const variantId = attributes.variant_id.toString();
      const status = attributes.status; // active, trialing, past_due, etc.
      
      // Map variant ID to internal plan ID
      let planId: SubscriptionPlan = SubscriptionPlan.PRO; // Default
      let interval: SubscriptionInterval = "MONTH";

      if (variantId === process.env.NEXT_PUBLIC_LS_VARIANT_PRO_YEARLY) {
        planId = SubscriptionPlan.PRO;
        interval = SubscriptionInterval.YEAR;
      } else if (variantId === process.env.NEXT_PUBLIC_LS_VARIANT_PRO_MONTHLY) {
        planId = SubscriptionPlan.PRO;
        interval = SubscriptionInterval.MONTH;
      } else if (variantId === process.env.NEXT_PUBLIC_LS_VARIANT_STARTER_YEARLY) {
        planId = SubscriptionPlan.STARTER;
        interval = SubscriptionInterval.YEAR;
      } else if (variantId === process.env.NEXT_PUBLIC_LS_VARIANT_STARTER_MONTHLY) {
        planId = SubscriptionPlan.STARTER;
        interval = SubscriptionInterval.MONTH;
      }

      console.log(`✅ Updating Subscription: Tenant ${tenantId} -> Plan ${planId} (${interval}) Status: ${status}`);
      
      const customerId = attributes.customer_id.toString();
      const subscriptionId = payload.data.id.toString();

      // Clear any conflicting tenant records holding the same customerId or subscriptionId (prevents unique constraint errors during test recreations)
      await prisma.tenant.updateMany({
        where: {
          id: { not: tenantId },
          OR: [
            { lemonSqueezyCustomerId: customerId },
            { lemonSqueezySubscriptionId: subscriptionId }
          ]
        },
        data: {
          lemonSqueezyCustomerId: null,
          lemonSqueezySubscriptionId: null
        }
      });

      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          planStatus: status.toUpperCase(),
          plan: planId,
          planInterval: interval,
          lemonSqueezyCustomerId: customerId,
          lemonSqueezySubscriptionId: subscriptionId,
          subscriptionEndsAt: attributes.renews_at ? new Date(attributes.renews_at) : null,
        },
      });
    } else if (
      eventName === "subscription_payment_success" ||
      eventName === "subscription_payment_recovered" ||
      eventName === "order_created"
    ) {
      const attributes = payload.data.attributes;
      const amount = attributes.subtotal_formatted || attributes.total_formatted || (attributes.total ? `$${(attributes.total / 100).toFixed(2)}` : "$14.99");
      const pdfUrl = attributes.urls?.invoice_url || attributes.urls?.receipt || null;
      const status = (attributes.status || "PAID").toUpperCase();
      const createdAt = attributes.created_at ? new Date(attributes.created_at) : new Date();
      const startYear = createdAt.getFullYear();
      const allInvoices = await prisma.invoice.findMany({
        where: { tenantId },
        select: { invoiceNumber: true }
      });
      let maxNum = 0;
      (allInvoices || []).forEach((inv: any) => {
        const match = inv.invoiceNumber?.match(/INV-\d+-(\d+)/i);
        if (match) {
          const val = parseInt(match[1], 10);
          if (!isNaN(val) && val > maxNum) maxNum = val;
        }
      });
      const nextNum = Math.max(maxNum + 1, (allInvoices?.length || 0) + 1);
      const invoiceNumber = `INV-${startYear}-${String(nextNum).padStart(3, "0")}`;

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { plan: true, planInterval: true }
      });

      const planName = tenant?.plan === "PRO" ? "Pro Plan" : "Starter Plan";
      const intervalStr = tenant?.planInterval === "YEAR" ? "Yearly" : "Monthly";

      try {
        const invId = `inv_ls_${payload.data.id || Date.now()}`;
        await prisma.invoice.create({
          data: {
            id: invId,
            tenantId,
            invoiceNumber,
            planName,
            interval: intervalStr,
            amount,
            status,
            paymentMethod: "Card ending in 4242",
            description: `FluxBooking ${planName} - Subscription Renewal (${amount})`,
            pdfUrl,
            createdAt
          }
        });
      } catch (err) {
        // Non-blocking fallback if invoice already exists
        console.warn("Invoice insert error:", err);
      }
    } else if (eventName === "subscription_cancelled" || eventName === "subscription_expired") {
      // REVERT TO FREE PLAN
      console.log(`📉 Subscription Ended: Reverting Tenant ${tenantId} to FREE plan`);
      
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          planStatus: "CANCELLED",
          plan: SubscriptionPlan.FREE,
          planInterval: SubscriptionInterval.MONTH,
        },
      });
    }

    return new NextResponse("Webhook processed successfully", { status: 200 });
  } catch (error) {
    console.error("❌ Webhook Processing Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
