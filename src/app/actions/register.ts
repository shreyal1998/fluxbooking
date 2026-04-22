"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { BusinessType, UserRole } from "@prisma/client";

export async function registerBusiness(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const businessName = formData.get("businessName") as string;
  const businessType = formData.get("businessType") as BusinessType;
  const slug = formData.get("slug") as string;

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
      const tenant = await tx.tenant.create({
        data: {
          name: businessName,
          slug: slug.toLowerCase(),
          businessType,
        },
      });

      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: UserRole.ADMIN,
          tenantId: tenant.id,
        },
      });

      return { tenant, user };
    });

    return { success: true };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "Something went wrong during registration" };
  }
}
