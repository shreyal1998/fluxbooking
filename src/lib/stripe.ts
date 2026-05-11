import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummyKeyForBuilds123", {
  apiVersion: "2025-01-27.acacia" as Stripe.LatestApiVersion, // Using latest stable version
  typescript: true,
});
