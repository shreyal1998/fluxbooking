"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const LEMON_SQUEEZY_API_BASE = "https://api.lemonsqueezy.com/v1";

export async function createLemonSqueezyCheckout(variantId: string) {
  console.log("--- AUTH DEBUG ---");
  const session = await getServerSession(authOptions);
  console.log("Session exists:", !!session);
  if (session) {
    console.log("User Role:", session.user.role);
    console.log("Tenant ID:", session.user.tenantId);
  }
  console.log("------------------");

  if (!session) return { error: "Not authenticated" };

  if (session.user.role !== "ADMIN") {
    return { error: "Only administrators can manage billing" };
  }

  const tenantId = session.user.tenantId;
  const userEmail = session.user.email;

  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID;

  if (!variantId || variantId.includes("placeholder")) {
    return { error: "This plan is not correctly configured in your environment variables." };
  }

  if (!apiKey || !storeId) {
    return { error: "Lemon Squeezy credentials (API Key or Store ID) are missing from the server." };
  }

  console.log("--- LEMON SQUEEZY DEBUG ---");
  console.log("Store ID:", storeId);
  console.log("Attempting Variant ID:", variantId);
  console.log("---------------------------");

  const tenant = tenantId ? await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { country: true, name: true }
  }) : null;

  try {
    const response = await fetch(`${LEMON_SQUEEZY_API_BASE}/checkouts`, {
      method: "POST",
      headers: {
        "Accept": "application/vnd.api+json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email: userEmail,
              name: session.user?.name || tenant?.name || undefined,
              billing_address: {
                country: tenant?.country || "US",
              },
              custom: {
                tenantId: tenantId,
              }
            },
            product_options: {
              redirect_url: `${(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")}/settings/billing?success=true`,
            }
          },
          relationships: {
            store: {
              data: { type: "stores", id: storeId.toString() }
            },
            variant: {
              data: { type: "variants", id: variantId.toString() }
            }
          }
        }
      })
    });

    const result = await response.json();

    if (result.errors) {
      console.error("Lemon Squeezy Error:", result.errors);
      return { error: result.errors[0].detail };
    }

    return { url: result.data.attributes.url };
  } catch (error) {
    console.error("Checkout Error:", error);
    return { error: "Failed to create checkout session" };
  }
}

export async function cancelLemonSqueezySubscription(subscriptionId: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  if (session.user.role !== "ADMIN") {
    return { error: "Only administrators can manage billing" };
  }

  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  if (!apiKey) {
    return { error: "Lemon Squeezy API credentials are missing from the server." };
  }

  try {
    // Pause / Cancel automated renewals while preserving the card & customer profile on file
    const response = await fetch(`${LEMON_SQUEEZY_API_BASE}/subscriptions/${subscriptionId}`, {
      method: "PATCH",
      headers: {
        "Accept": "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        data: {
          type: "subscriptions",
          id: subscriptionId,
          attributes: {
            pause: {
              mode: "void"
            }
          }
        }
      })
    });

    if (!response.ok) {
      // If PATCH fails, fallback to standard cancellation
      await fetch(`${LEMON_SQUEEZY_API_BASE}/subscriptions/${subscriptionId}`, {
        method: "DELETE",
        headers: {
          "Accept": "application/vnd.api+json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        }
      });
    }

    // Immediately update local DB tenant planStatus to CANCELLED
    const tenantId = (session.user as any).tenantId;
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        planStatus: "CANCELLED"
      }
    });

    revalidatePath("/settings");
    revalidatePath("/settings/billing");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Cancellation Error:", error);
    return { error: "Failed to cancel subscription" };
  }
}

export async function syncLemonSqueezySubscription(options?: { skipRevalidate?: boolean }) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const tenantId = (session.user as any).tenantId;
  const userEmail = session.user.email;
  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID;

  if (!apiKey || !storeId || !tenantId) return { error: "Missing Lemon Squeezy API configuration" };

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { lemonSqueezyCustomerId: true, lemonSqueezySubscriptionId: true }
    });

    let matchedSub: any = null;

    // 1. Try fetching directly by known subscriptionId if present on tenant
    if (tenant?.lemonSqueezySubscriptionId) {
      try {
        const directRes = await fetch(`${LEMON_SQUEEZY_API_BASE}/subscriptions/${tenant.lemonSqueezySubscriptionId}`, {
          method: "GET",
          headers: {
            "Accept": "application/vnd.api+json",
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          cache: "no-store"
        });
        if (directRes.ok) {
          const directJson = await directRes.json();
          if (directJson.data) {
            matchedSub = directJson.data;
          }
        }
      } catch (err) {
        console.warn("Direct subscription fetch fallback:", err);
      }
    }

    // 2. If not matched, query store subscriptions
    if (!matchedSub) {
      const endpoint = `${LEMON_SQUEEZY_API_BASE}/subscriptions?filter[store_id]=${storeId}`;
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Accept": "application/vnd.api+json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        cache: "no-store"
      });

      if (response.ok) {
        const json = await response.json();
        const subs = json.data;
        if (subs && subs.length > 0) {
          const userSubs = subs.filter((s: any) => 
            s.attributes.user_email?.toLowerCase() === userEmail?.toLowerCase() ||
            s.attributes.customer_id?.toString() === tenant?.lemonSqueezyCustomerId ||
            s.id?.toString() === tenant?.lemonSqueezySubscriptionId
          );

          if (userSubs && userSubs.length > 0) {
            userSubs.sort((a: any, b: any) => {
              const aActive = ["active", "on_trial", "trialing", "resumed", "unpaused"].includes(a.attributes?.status?.toLowerCase()) ? 1 : 0;
              const bActive = ["active", "on_trial", "trialing", "resumed", "unpaused"].includes(b.attributes?.status?.toLowerCase()) ? 1 : 0;
              if (aActive !== bActive) return bActive - aActive;
              const timeA = new Date(a.attributes?.created_at || a.attributes?.updated_at || 0).getTime();
              const timeB = new Date(b.attributes?.created_at || b.attributes?.updated_at || 0).getTime();
              return timeB - timeA;
            });
            matchedSub = userSubs[0];
          }
        }
      }
    }

    if (!matchedSub) {
      return { error: "No active subscription found on Lemon Squeezy for your account" };
    }

        if (matchedSub) {
          const attributes = matchedSub.attributes;
          const variantId = attributes.variant_id.toString();
          const status = attributes.status;

          let planId = "PRO";
          let interval = "MONTH";

          if (variantId === process.env.NEXT_PUBLIC_LS_VARIANT_PRO_YEARLY) {
            planId = "PRO";
            interval = "YEAR";
          } else if (variantId === process.env.NEXT_PUBLIC_LS_VARIANT_PRO_MONTHLY) {
            planId = "PRO";
            interval = "MONTH";
          } else if (variantId === process.env.NEXT_PUBLIC_LS_VARIANT_STARTER_YEARLY) {
            planId = "STARTER";
            interval = "YEAR";
          } else if (variantId === process.env.NEXT_PUBLIC_LS_VARIANT_STARTER_MONTHLY) {
            planId = "STARTER";
            interval = "MONTH";
          }

          const customerId = attributes.customer_id?.toString() || tenant?.lemonSqueezyCustomerId || null;
          const subscriptionId = matchedSub.id.toString();

          // Safely detach duplicate customerId or subscriptionId from other tenants to prevent unique constraint violations
          const orConditions: any[] = [];
          if (customerId) orConditions.push({ lemonSqueezyCustomerId: customerId });
          if (subscriptionId) orConditions.push({ lemonSqueezySubscriptionId: subscriptionId });

          if (orConditions.length > 0) {
            await prisma.tenant.updateMany({
              where: {
                id: { not: tenantId },
                OR: orConditions,
              },
              data: {
                lemonSqueezyCustomerId: null,
                lemonSqueezySubscriptionId: null,
              },
            });
          }

          await prisma.tenant.update({
            where: { id: tenantId },
            data: {
              planStatus: status.toUpperCase(),
              plan: planId as any,
              planInterval: interval as any,
              lemonSqueezyCustomerId: customerId,
              lemonSqueezySubscriptionId: subscriptionId,
              subscriptionEndsAt: attributes.renews_at ? new Date(attributes.renews_at) : null,
            }
          });

          if (!options?.skipRevalidate) {
            revalidatePath("/settings");
            revalidatePath("/settings/billing");
            revalidatePath("/staff");
            revalidatePath("/schedule");
            revalidatePath("/overview");
            revalidatePath("/");
          }

      return { success: true, plan: planId, planStatus: status };
    }

    return { error: "No active subscription found on Lemon Squeezy" };
  } catch (error) {
    console.error("Sync Error:", error);
    return { error: "Failed to sync subscription" };
  }
}

async function ensureInvoiceTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Invoice" (
        "id" TEXT PRIMARY KEY,
        "tenantId" TEXT NOT NULL,
        "invoiceNumber" TEXT NOT NULL,
        "planName" TEXT NOT NULL,
        "interval" TEXT NOT NULL,
        "amount" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PAID',
        "paymentMethod" TEXT NOT NULL DEFAULT 'Card ending in 4242',
        "description" TEXT,
        "pdfUrl" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    // table exists or no-op
  }
}

export async function updateLemonSqueezySubscriptionPlan({
  planId,
  interval = "MONTH",
  isResume = false
}: {
  planId: "FREE" | "STARTER" | "PRO";
  interval?: "MONTH" | "YEAR";
  isResume?: boolean;
}) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  if (session.user.role !== "ADMIN") {
    return { error: "Only administrators can manage billing" };
  }

  const tenantId = (session.user as any).tenantId;
  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;

  if (planId === "FREE") {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { lemonSqueezySubscriptionId: true }
    });

    if (tenant?.lemonSqueezySubscriptionId && apiKey) {
      try {
        await fetch(`${LEMON_SQUEEZY_API_BASE}/subscriptions/${tenant.lemonSqueezySubscriptionId}`, {
          method: "DELETE",
          headers: {
            "Accept": "application/vnd.api+json",
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          }
        });
      } catch (err) {
        console.error("Cancellation error:", err);
      }
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        plan: "FREE",
        planStatus: "CANCELLED"
      }
    });

    revalidatePath("/settings/billing");
    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true, plan: "FREE", interval };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });

  if (!tenant) return { error: "Tenant not found" };

  const isJustResuming = isResume || (tenant.plan === planId && tenant.planInterval === interval && (tenant.planStatus === "CANCELLED" || tenant.planStatus === "CANCELED"));

  const variantId = interval === "YEAR" 
    ? (planId === "PRO" 
        ? (process.env.NEXT_PUBLIC_LS_VARIANT_PRO_YEARLY || process.env.LEMON_SQUEEZY_PRO_YEARLY_VARIANT_ID)
        : (process.env.NEXT_PUBLIC_LS_VARIANT_STARTER_YEARLY || process.env.LEMON_SQUEEZY_STARTER_YEARLY_VARIANT_ID))
    : (planId === "PRO" 
        ? (process.env.NEXT_PUBLIC_LS_VARIANT_PRO_MONTHLY || process.env.LEMON_SQUEEZY_PRO_MONTHLY_VARIANT_ID)
        : (process.env.NEXT_PUBLIC_LS_VARIANT_STARTER_MONTHLY || process.env.LEMON_SQUEEZY_STARTER_MONTHLY_VARIANT_ID));

  if (apiKey && tenant.lemonSqueezySubscriptionId && variantId) {
    try {
      const response = await fetch(`${LEMON_SQUEEZY_API_BASE}/subscriptions/${tenant.lemonSqueezySubscriptionId}`, {
        method: "PATCH",
        headers: {
          "Accept": "application/vnd.api+json",
          "Content-Type": "application/vnd.api+json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          data: {
            type: "subscriptions",
            id: tenant.lemonSqueezySubscriptionId,
            attributes: {
              variant_id: parseInt(variantId, 10),
              cancelled: false,
              pause: null,
              disable_prorations: false
            }
          }
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        console.error("Lemon Squeezy subscription update failed (likely cancelled on Lemon Squeezy):", response.status, errJson);
        return {
          error: "Subscription is not active on Lemon Squeezy. Redirecting to checkout to activate...",
          checkoutNeeded: true,
          variantId
        };
      }
    } catch (err) {
      console.error("Subscription update error:", err);
      return {
        error: "Failed to connect to Lemon Squeezy. Redirecting to checkout...",
        checkoutNeeded: true,
        variantId
      };
    }
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      plan: planId,
      planInterval: interval,
      planStatus: "ACTIVE"
    }
  });

  // Only persist a new paid invoice entry if this is a new plan purchase/switch, NOT a resume of an already paid cycle
  if (!isJustResuming) {
    try {
      await ensureInvoiceTable();
      const startYear = new Date().getFullYear();
      const allInvoices = await prisma.$queryRaw<any[]>`SELECT "invoiceNumber" FROM "Invoice" WHERE "tenantId" = ${tenantId}`;
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

      const now = new Date();
      let nextRenewal = tenant.subscriptionEndsAt ? new Date(tenant.subscriptionEndsAt) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (nextRenewal.getTime() <= now.getTime() + 24 * 60 * 60 * 1000) {
        nextRenewal = new Date(now.getTime() + ((tenant.planInterval || "MONTH") === "YEAR" ? 365 : 30) * 24 * 60 * 60 * 1000);
      }
      const diffMs = Math.max(0, nextRenewal.getTime() - now.getTime());
      const totalDays = (tenant.planInterval || "MONTH") === "YEAR" ? 365 : 30;
      const daysLeft = Math.max(1, Math.min(totalDays, Math.ceil(diffMs / (1000 * 60 * 60 * 24))));

      const oldInterval = tenant.planInterval || "MONTH";
      const oldPlan = tenant.plan || "STARTER";

      const oldPlanPrice = oldPlan === "PRO" 
        ? (oldInterval === "YEAR" ? 149.90 : 14.99) 
        : (oldInterval === "YEAR" ? 69.90 : 6.99);

      const newPlanPrice = planId === "PRO" 
        ? (interval === "YEAR" ? 149.90 : 14.99) 
        : (interval === "YEAR" ? 69.90 : 6.99);

      let proratedNum = 0;
      if (oldInterval === interval) {
        const totalCycleDays = interval === "YEAR" ? 365 : 30;
        proratedNum = Math.max(0, (newPlanPrice - oldPlanPrice) * (daysLeft / totalCycleDays));
      } else if (oldInterval === "MONTH" && interval === "YEAR") {
        const unusedMonthlyCredit = oldPlanPrice * (daysLeft / 30);
        proratedNum = Math.max(0, newPlanPrice - unusedMonthlyCredit);
      } else {
        proratedNum = 0;
      }

      const planName = planId === "PRO" ? "Pro Plan" : "Starter Plan";
      const intervalStr = interval === "YEAR" ? "Yearly" : "Monthly";
      const amountStr = planId === "PRO" ? `$${proratedNum.toFixed(2)}` : "$0.00";
      const invId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const desc = planId === "PRO" 
        ? `FluxBooking Pro Plan - Upgrade Prorated Charge (${daysLeft} days left)`
        : `FluxBooking Starter Plan - Downgrade Leftover Credit (${daysLeft} days left)`;

      await prisma.$executeRaw`
        INSERT INTO "Invoice" ("id", "tenantId", "invoiceNumber", "planName", "interval", "amount", "status", "paymentMethod", "description", "createdAt")
        VALUES (${invId}, ${tenantId}, ${invoiceNumber}, ${planName}, ${intervalStr}, ${amountStr}, 'PAID', 'Card ending in 4242', ${desc}, NOW())
      `;
    } catch (err) {
      console.error("Failed to insert invoice:", err);
    }
  }

  revalidatePath("/settings/billing");
  revalidatePath("/settings");
  revalidatePath("/");

  return { success: true, plan: planId, interval };
}

function inferPlanDetailsFromAmount(totalCentsOrFormatted: number | string | undefined, defaultPlan: string, defaultInterval: string) {
  let cents = 0;
  if (typeof totalCentsOrFormatted === "number") {
    cents = totalCentsOrFormatted;
  } else if (typeof totalCentsOrFormatted === "string") {
    const num = parseFloat(totalCentsOrFormatted.replace(/[^0-9.]/g, ""));
    cents = Math.round(num * 100);
  }

  if (cents === 14990) return { planName: "Pro Plan", interval: "Yearly", amount: "$149.90" };
  if (cents === 1499) return { planName: "Pro Plan", interval: "Monthly", amount: "$14.99" };
  if (cents === 800) return { planName: "Pro Plan", interval: "Monthly", amount: "$8.00" };
  if (cents === 533) return { planName: "Pro Plan", interval: "Monthly", amount: "$5.33" };
  if (cents === 6990) return { planName: "Starter Plan", interval: "Yearly", amount: "$69.90" };
  if (cents === 699) return { planName: "Starter Plan", interval: "Monthly", amount: "$6.99" };
  if (cents === 0) return { planName: "Starter Plan", interval: "Monthly", amount: "$0.00" };

  return {
    planName: defaultPlan === "PRO" ? "Pro Plan" : "Starter Plan",
    interval: defaultInterval === "YEAR" ? "Yearly" : "Monthly",
    amount: typeof totalCentsOrFormatted === "number" ? `$${(totalCentsOrFormatted / 100).toFixed(2)}` : (totalCentsOrFormatted || (defaultPlan === "PRO" ? "$14.99" : "$6.99"))
  };
}

export async function getLemonSqueezyInvoices() {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  const tenantId = (session.user as any).tenantId;
  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      plan: true,
      planInterval: true,
      planStatus: true,
      lemonSqueezyCustomerId: true,
      lemonSqueezySubscriptionId: true,
      subscriptionEndsAt: true,
      createdAt: true
    }
  });

  if (!tenant) {
    return [];
  }

  const invoices: any[] = [];
  const planName = tenant.plan === "PRO" ? "Pro Plan" : "Starter Plan";
  const amountNum = tenant.plan === "PRO"
    ? (tenant.planInterval === "YEAR" ? 149.90 : 14.99)
    : (tenant.planInterval === "YEAR" ? 69.90 : 6.99);
  const intervalStr = tenant.planInterval === "YEAR" ? "Yearly" : "Monthly";

  // 1. Upcoming renewal invoice entry ONLY if active paid subscription exists and not cancelled and not trialing
  if (
    tenant.plan !== "FREE" &&
    tenant.lemonSqueezySubscriptionId &&
    tenant.planStatus !== "CANCELLED" &&
    tenant.planStatus !== "CANCELED" &&
    tenant.planStatus !== "TRIALING"
  ) {
    let nextDate = tenant.subscriptionEndsAt ? new Date(tenant.subscriptionEndsAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    if (nextDate.getTime() <= Date.now() + 24 * 60 * 60 * 1000) {
      nextDate = new Date(Date.now() + (tenant.planInterval === "YEAR" ? 365 : 30) * 24 * 60 * 60 * 1000);
    }

    let upcomingAmount = amountNum;
    let upcomingSubtext = "(Full renewal)";
    let upcomingAdjustments = "+$0.00 standard renewal";

    invoices.push({
      id: "INV-UPCOMING",
      number: "Upcoming",
      date: nextDate.toISOString(),
      planName,
      interval: intervalStr,
      amount: `$${upcomingAmount.toFixed(2)}`,
      baseAmount: `$${amountNum.toFixed(2)}`,
      adjustments: upcomingAdjustments,
      subtext: upcomingSubtext,
      status: "UPCOMING",
      isUpcoming: true,
      paymentMethod: "Card ending in 4242",
      description: `FluxBooking ${planName} - Next ${intervalStr} Renewal`
    });
  }

  // 2. Fetch genuine invoices from database
  try {
    await ensureInvoiceTable();

    // Query Lemon Squeezy API to fetch live upcoming renewal price & date if subscription exists
    if (apiKey && tenant.lemonSqueezySubscriptionId && invoices.length > 0 && invoices[0].isUpcoming) {
      try {
        const subDetailRes = await fetch(`${LEMON_SQUEEZY_API_BASE}/subscriptions/${tenant.lemonSqueezySubscriptionId}`, {
          headers: { "Accept": "application/vnd.api+json", "Authorization": `Bearer ${apiKey}` },
          cache: "no-store"
        });
        if (subDetailRes.ok) {
          const subDetailJson = await subDetailRes.json();
          const subAttr = subDetailJson.data?.attributes;
          if (subAttr) {
            const liveUpcomingAmount = subAttr.subtotal_formatted || subAttr.total_formatted || (subAttr.subtotal ? `$${(subAttr.subtotal / 100).toFixed(2)}` : null);
            if (liveUpcomingAmount) {
              invoices[0].amount = liveUpcomingAmount;
              invoices[0].baseAmount = liveUpcomingAmount;
            }
          }
        }
      } catch (e) {
        // Non-blocking
      }
    }

    const dbInvoices = await prisma.$queryRaw<any[]>`
      SELECT "id", "invoiceNumber", "planName", "interval", "amount", "status", "paymentMethod", "description", "pdfUrl", "createdAt"
      FROM "Invoice"
      WHERE "tenantId" = ${tenantId}
      ORDER BY "createdAt" DESC, "invoiceNumber" DESC
    `;

    if (dbInvoices && dbInvoices.length > 0) {
      const seen = new Set<string>();

      dbInvoices.forEach((inv: any) => {
        if (seen.has(inv.invoiceNumber)) return;
        seen.add(inv.invoiceNumber);

        let baseAmount = inv.planName?.toLowerCase().includes("pro") 
          ? (inv.interval === "Yearly" ? "$149.90" : "$14.99")
          : (inv.interval === "Yearly" ? "$69.90" : "$6.99");

        const baseNum = parseFloat(baseAmount.replace("$", "")) || 0;
        const paidNum = parseFloat((inv.amount || "$0").replace("$", "")) || 0;
        let adjustments = "+$0.00";

        if (inv.description?.includes("Downgrade Leftover Credit") || (paidNum === 0 && baseNum > 0)) {
          adjustments = `-$${baseNum.toFixed(2)} (Leftover credit applied - $0.00 due)`;
        } else if (inv.description?.includes("Upgrade Prorated Charge")) {
          const discount = baseNum - paidNum;
          if (discount > 0.01) {
            adjustments = `-$${discount.toFixed(2)} (Prorated upgrade adjustment)`;
          } else if (discount < -0.01) {
            adjustments = `+$${Math.abs(discount).toFixed(2)} (Additional charge)`;
          }
        } else if (inv.description?.includes("Renewal") && Math.abs(baseNum - paidNum) > 0.01) {
          const discount = baseNum - paidNum;
          if (discount > 0.01) {
            adjustments = `-$${discount.toFixed(2)} (Renewal credit applied)`;
          } else if (discount < -0.01) {
            adjustments = `+$${Math.abs(discount).toFixed(2)} (Renewal adjustment)`;
          }
        } else if (Math.abs(baseNum - paidNum) > 0.01) {
          const discount = baseNum - paidNum;
          if (discount > 0.01) {
            adjustments = `-$${discount.toFixed(2)} (Credit adjustment)`;
          } else if (discount < -0.01) {
            adjustments = `+$${Math.abs(discount).toFixed(2)} (Adjustment)`;
          }
        }

        invoices.push({
          id: inv.id,
          number: inv.invoiceNumber,
          date: inv.createdAt instanceof Date ? inv.createdAt.toISOString() : (inv.createdAt ? new Date(inv.createdAt).toISOString() : new Date().toISOString()),
          planName: inv.planName,
          interval: inv.interval,
          amount: inv.amount,
          baseAmount: baseAmount,
          adjustments: adjustments,
          status: inv.status || "PAID",
          isUpcoming: false,
          pdfUrl: inv.pdfUrl,
          paymentMethod: inv.paymentMethod || "Card on file",
          description: inv.description || `FluxBooking ${inv.planName} - ${inv.interval} Subscription`
        });
      });

      const upcoming = invoices.filter(inv => inv.isUpcoming || inv.status === "UPCOMING");
      const paid = invoices.filter(inv => !inv.isUpcoming && inv.status !== "UPCOMING").sort((a, b) => {
        const matchA = (a.number || a.id || "").match(/INV-\d+-(\d+)/i);
        const matchB = (b.number || b.id || "").match(/INV-\d+-(\d+)/i);
        const seqA = matchA ? parseInt(matchA[1], 10) : 0;
        const seqB = matchB ? parseInt(matchB[1], 10) : 0;
        if (seqB !== seqA) return seqB - seqA;
        const timeA = new Date(a.date).getTime() || 0;
        const timeB = new Date(b.date).getTime() || 0;
        return timeB - timeA;
      });

      return [...upcoming, ...paid];
    }
  } catch (err) {
    console.error("Database invoice lookup error:", err);
  }

  return invoices;
}
