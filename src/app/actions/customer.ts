"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function addCustomer(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const tenantId = (session.user as any).tenantId;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const notes = formData.get("notes") as string;

  try {
    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        phone,
        notes,
        tenantId,
        status: "ACTIVE"
      },
    });
    revalidatePath("/dashboard/customers");
    return { success: true, customer };
  } catch (error: any) {
    if (error.code === 'P2002') {
        return { error: "A customer with this email already exists." };
    }
    return { error: "Failed to add customer" };
  }
}

export async function updateCustomer(customerId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const tenantId = (session.user as any).tenantId;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const notes = formData.get("notes") as string;
  const status = formData.get("status") as string;

  try {
    await prisma.customer.update({
      where: { id: customerId, tenantId },
      data: {
        name,
        email,
        phone,
        notes,
        status: status as any
      },
    });
    revalidatePath("/dashboard/customers");
    return { success: true };
  } catch (error) {
    return { error: "Failed to update customer" };
  }
}

export async function toggleCustomerStatus(customerId: string, newStatus: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const userRole = (session.user as any).role;
  const tenantId = (session.user as any).tenantId;

  // Security: Only Admin can Restore (set to ACTIVE)
  if (newStatus === "ACTIVE" && userRole !== "ADMIN") {
      return { error: "Only administrators can restore archived clients." };
  }

  try {
    await prisma.customer.update({
      where: { id: customerId, tenantId },
      data: { status: newStatus as any },
    });
    revalidatePath("/dashboard/customers");
    return { success: true };
  } catch (error) {
    return { error: "Failed to update status" };
  }
}

export async function deleteCustomer(customerId: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };
  
  if ((session.user as any).role !== "ADMIN") {
      return { error: "Only administrators can permanently delete customers." };
  }

  const tenantId = (session.user as any).tenantId;

  try {
    await prisma.customer.delete({
      where: { id: customerId, tenantId },
    });
    revalidatePath("/dashboard/customers");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete customer" };
  }
}

export async function searchCustomers(query: string, includeInactive = false) {
    const session = await getServerSession(authOptions);
    if (!session) return [];

    const tenantId = (session.user as any).tenantId;

    try {
        const customers = await prisma.customer.findMany({
            where: {
                tenantId,
                status: includeInactive ? undefined : "ACTIVE",
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                    { phone: { contains: query, mode: 'insensitive' } },
                ]
            },
            take: 5
        });
        return customers;
    } catch (error) {
        return [];
    }
}
