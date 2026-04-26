export const PLANS = [
  {
    id: "FREE",
    name: "Free",
    description: "Perfect for solopreneurs starting out.",
    price: {
      amount: 0,
      monthlyVariantId: "",
      yearlyVariantId: "",
      priceIds: {
        test: "",
        production: "",
      },
    },
    features: [
      "1 Staff Member",
      "Unlimited Bookings",
      "Email Notifications",
      "Basic Calendar",
    ],
  },
  {
    id: "STARTER",
    name: "Starter",
    description: "Ideal for growing stylists and small teams.",
    price: {
      amount: 6.99,
      monthlyVariantId: process.env.NEXT_PUBLIC_LS_VARIANT_STARTER_MONTHLY || "price_placeholder_starter_monthly",
      yearlyVariantId: process.env.NEXT_PUBLIC_LS_VARIANT_STARTER_YEARLY || "price_placeholder_starter_yearly",
      priceIds: {
        test: process.env.NEXT_PUBLIC_LS_VARIANT_STARTER_MONTHLY || "price_placeholder_starter_monthly",
        production: "",
      },
    },
    features: [
      "Up to 5 Staff Members",
      "Unlimited Bookings",
      "Email Notifications",
      "No Flux Branding",
      "Advanced Analytics",
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    description: "The complete toolkit for full salons and gyms.",
    price: {
      amount: 14.99,
      monthlyVariantId: process.env.NEXT_PUBLIC_LS_VARIANT_PRO_MONTHLY || "price_placeholder_pro_monthly",
      yearlyVariantId: process.env.NEXT_PUBLIC_LS_VARIANT_PRO_YEARLY || "price_placeholder_pro_yearly",
      priceIds: {
        test: process.env.NEXT_PUBLIC_LS_VARIANT_PRO_MONTHLY || "price_placeholder_pro_monthly",
        production: "",
      },
    },
    features: [
      "Unlimited Staff Members",
      "Unlimited Bookings",
      "Email Notifications",
      "Multiple Location Support",
      "Priority 24/7 Support",
    ],
  },
];
