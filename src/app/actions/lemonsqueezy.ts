"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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
              custom: {
                tenantId: tenantId,
              }
            },
            product_options: {
              redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=true`,
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
    const response = await fetch(`${LEMON_SQUEEZY_API_BASE}/subscriptions/${subscriptionId}`, {
      method: "DELETE",
      headers: {
        "Accept": "application/vnd.api+json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Lemon Squeezy Cancellation Error:", errorData);
      return { error: errorData.errors?.[0]?.detail || "Failed to cancel subscription" };
    }

    // Immediately update local DB tenant planStatus to CANCELLED
    const tenantId = (session.user as any).tenantId;
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        planStatus: "CANCELLED"
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Cancellation Error:", error);
    return { error: "Failed to cancel subscription" };
  }
}
