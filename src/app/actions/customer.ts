"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

import { Prisma, CustomerStatus } from "@prisma/client";

export async function addCustomer(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const tenantId = session.user.tenantId;
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
        tenantId: tenantId || "",
        status: CustomerStatus.ACTIVE
      },
    });
    revalidatePath("/customers");
    return { success: true, customer };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { error: "A customer with this email already exists." };
    }
    return { error: "Failed to add customer" };
  }
}

export async function updateCustomer(customerId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const tenantId = session.user.tenantId;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const notes = formData.get("notes") as string;
  const status = formData.get("status") as string;

  try {
    await prisma.customer.update({
      where: { id: customerId, tenantId: tenantId || "" },
      data: {
        name,
        email,
        phone,
        notes,
        status: status as CustomerStatus
      },
    });
    revalidatePath("/customers");
    return { success: true };
  } catch {
    return { error: "Failed to update customer" };
  }
}

export async function toggleCustomerStatus(customerId: string, newStatus: string, reason?: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const userRole = session.user.role;
  const userName = session.user.name || "Staff";
  const tenantId = session.user.tenantId;

  // Security: Only Admin can Restore (set to ACTIVE)
  if (newStatus === CustomerStatus.ACTIVE && userRole !== "ADMIN") {
      return { error: "Only administrators can restore archived clients." };
  }

  try {
    const updateData: Prisma.CustomerUpdateInput = { status: newStatus as CustomerStatus };
    
    if (newStatus === CustomerStatus.INACTIVE && reason) {
        const customer = await prisma.customer.findUnique({ 
            where: { id: customerId, tenantId: tenantId || "" },
            select: { notes: true }
        });
        const date = new Date().toLocaleDateString();
        const auditNote = `\n[Archived on ${date} by ${userName}: ${reason}]`;
        updateData.notes = customer?.notes ? `${customer.notes}${auditNote}` : auditNote;
    }

    await prisma.customer.update({
      where: { id: customerId, tenantId: tenantId || "" },
      data: updateData,
    });
    revalidatePath("/customers");
    return { success: true };
  } catch {
    return { error: "Failed to update status" };
  }
}

export async function deleteCustomer(customerId: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };
  
  if (session.user.role !== "ADMIN") {
      return { error: "Only administrators can permanently delete customers." };
  }

  const tenantId = session.user.tenantId;

  try {
    await prisma.customer.delete({
      where: { id: customerId, tenantId: tenantId || "" },
    });
    revalidatePath("/customers");
    return { success: true };
  } catch {
    return { error: "Failed to delete customer" };
  }
}

export async function searchCustomers(query: string, includeInactive = false) {
    const session = await getServerSession(authOptions);
    if (!session) return [];

    const tenantId = session.user.tenantId;

    try {
        const customers = await prisma.customer.findMany({
            where: {
                tenantId: tenantId || "",
                status: includeInactive ? undefined : CustomerStatus.ACTIVE,
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                    { phone: { contains: query, mode: 'insensitive' } },
                ]
            },
            take: 5
        });
        return customers;
    } catch {
        return [];
    }
}

export async function getActiveCustomers() {
    const session = await getServerSession(authOptions);
    if (!session) return [];

    const tenantId = session.user.tenantId;

    try {
        const customers = await prisma.customer.findMany({
            where: {
                tenantId: tenantId || "",
                status: CustomerStatus.ACTIVE
            },
            orderBy: {
                name: "asc"
            }
        });
        return customers;
    } catch {
        return [];
    }
}

export async function getPaginatedActiveCustomers(search: string = "", skip: number = 0, take: number = 10) {
    const session = await getServerSession(authOptions);
    if (!session) return [];

    const tenantId = session.user.tenantId;

    try {
        const customers = await prisma.customer.findMany({
            where: {
                tenantId: tenantId || "",
                status: CustomerStatus.ACTIVE,
                OR: search ? [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
                ] : undefined
            },
            orderBy: {
                name: "asc"
            },
            skip,
            take
        });
        return customers;
    } catch {
        return [];
    }
}
