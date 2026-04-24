import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummyKeyForBuilds123", {
  apiVersion: "2026-03-25.dahlia" as any, // Using latest stable version
  typescript: true,
});
