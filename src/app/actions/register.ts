"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { BusinessType, UserRole, SubscriptionPlan, SubscriptionInterval } from "@prisma/client";
import { COUNTRIES } from "@/config/countries";
import { sendWelcomeEmail } from "@/lib/mail";

export async function registerBusiness(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const businessName = formData.get("businessName") as string;
  const businessType = formData.get("businessType") as BusinessType;
  const slug = formData.get("slug") as string;
  const country = (formData.get("country") as string) || "US";
  const currency = (formData.get("currency") as string) || "USD";
  
  // New Plan Selection Fields
  const selectedPlan = (formData.get("plan") as SubscriptionPlan) || "FREE";
  const selectedInterval = (formData.get("interval") as SubscriptionInterval) || "MONTH";

  // Combine phone with country code
  const selectedCountryData = COUNTRIES.find(c => c.code === country);
  const rawPhone = formData.get("phone") as string;
  const fullPhone = selectedCountryData && rawPhone ? `+${selectedCountryData.phoneCode}${rawPhone}` : rawPhone;

  if (!name || !email || !password || !businessName || !slug) {
    return { error: "All fields are required" };
  }

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return { error: "User with this email already exists" };
  }

  // Check if slug exists
  const existingTenant = await prisma.tenant.findUnique({
    where: { slug: slug.toLowerCase() },
  });

  if (existingTenant) {
    return { error: "Business URL is already taken" };
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Tenant and User in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14); // Set trial for 14 days

      const tenant = await tx.tenant.create({
        data: {
          name: businessName,
          slug: slug.toLowerCase(),
          businessType,
          country,
          currency,
          plan: selectedPlan,
          planInterval: selectedInterval,
          planStatus: "TRIALING",
          trialEndsAt: trialEndsAt,
        },
      });

      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phone: fullPhone || null,
          role: UserRole.ADMIN,
          tenantId: tenant.id,
        },
      });

      return { tenant, user };
    });

    // Send Welcome Email
    await sendWelcomeEmail({
      adminName: result.user.name || "Business Owner",
      adminEmail: result.user.email,
      businessName: result.tenant.name,
    });

    return { success: true };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "Something went wrong during registration" };
  }
}
