"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcrypt";
import { sendStaffWelcomeEmail } from "@/lib/mail";

export async function addStaff(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return { error: "Only administrators can add staff members." };
  }

  const tenantId = (session.user as any).tenantId;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const bio = formData.get("bio") as string;
  const password = formData.get("password") as string;
  const serviceIds = JSON.parse(formData.get("services") as string || "[]");

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { staff: true }
    });

    const limits = { FREE: 1, TEAM: 5, PRO: 1000000 };
    const currentLimit = limits[tenant?.plan as keyof typeof limits] || 1;
    if (tenant && tenant.staff.length >= currentLimit && tenant.planStatus !== "TRIALING") {
      return { error: `Your ${tenant.plan} plan is limited to ${currentLimit} staff member(s). Please upgrade to add more.` };
    }

    let targetUserId: string | null = null;

    if (email && password) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) return { error: "A user with this email already exists." };

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "STAFF",
          tenantId,
        },
      });
      targetUserId = newUser.id;
    }

    await prisma.staff.create({
      data: {
        name,
        bio,
        tenantId,
        userId: targetUserId || null,
        availabilityJson: JSON.stringify({
          monday: { start: "09:00", end: "17:00" },
          tuesday: { start: "09:00", end: "17:00" },
          wednesday: { start: "09:00", end: "17:00" },
          thursday: { start: "09:00", end: "17:00" },
          friday: { start: "09:00", end: "17:00" },
        }),
        services: {
          connect: serviceIds.map((id: string) => ({ id }))
        }
      },
    });

    if (email) {
      await sendStaffWelcomeEmail({
        staffName: name,
        staffEmail: email,
        businessName: tenant?.name || "the business",
      });
    }

    revalidatePath("/dashboard/staff");
    return { success: true };
  } catch (error) {
    console.error("Add Staff Error:", error);
    return { error: "Failed to add staff" };
  }
}

export async function deleteStaff(staffId: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") return { error: "Unauthorized" };

  const tenantId = (session.user as any).tenantId;

  try {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId, tenantId },
      include: { user: true }
    });

    if (!staff) return { error: "Staff not found" };

    if (staff.userId) {
      await prisma.user.delete({ where: { id: staff.userId } });
    }

    await prisma.staff.delete({ where: { id: staffId } });

    revalidatePath("/dashboard/staff");
    return { success: true };
  } catch (error) {
    console.error("Delete Staff Error:", error);
    return { error: "Failed to delete staff" };
  }
}

export async function updateStaffProfile(staffId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const name = formData.get("name") as string;
  const bio = formData.get("bio") as string;
  const color = formData.get("color") as string;
  const serviceIds = JSON.parse(formData.get("services") as string || "[]");

  try {
    await prisma.staff.update({
      where: { id: staffId },
      data: {
        name,
        bio,
        color,
        services: {
          set: serviceIds.map((id: string) => ({ id }))
        }
      }
    });

    revalidatePath("/dashboard/staff");
    return { success: true };
  } catch (error) {
    return { error: "Failed to update staff profile" };
  }
}

export async function addService(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") return { error: "Unauthorized" };

  const tenantId = (session.user as any).tenantId;
  const name = formData.get("name") as string;
  const durationMinutes = parseInt(formData.get("duration") as string);
  const price = parseFloat(formData.get("price") as string);
  const color = formData.get("color") as string;

  try {
    await prisma.service.create({
      data: {
        name,
        durationMinutes,
        price,
        color,
        tenantId,
      },
    });

    revalidatePath("/dashboard/services");
    return { success: true };
  } catch (error) {
    return { error: "Failed to create service" };
  }
}

export async function updateService(serviceId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  const durationMinutes = parseInt(formData.get("duration") as string);
  const price = parseFloat(formData.get("price") as string);
  const color = formData.get("color") as string;

  try {
    await prisma.service.update({
      where: { id: serviceId },
      data: {
        name,
        durationMinutes,
        price,
        color,
      },
    });

    revalidatePath("/dashboard/services");
    return { success: true };
  } catch (error) {
    return { error: "Failed to update service" };
  }
}

export async function deleteService(serviceId: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") return { error: "Unauthorized" };

  try {
    await prisma.service.delete({
      where: { id: serviceId }
    });

    revalidatePath("/dashboard/services");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete service" };
  }
}

export async function updateTenantBranding(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") return { error: "Unauthorized" };

  const tenantId = (session.user as any).tenantId;
  const primaryColor = formData.get("primaryColor") as string;
  const logoUrl = formData.get("logoUrl") as string;

  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        primaryColor,
        logoUrl,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    return { error: "Failed to update branding" };
  }
}

export async function updateStaffAvailability(staffId: string, availability: any) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  try {
    await prisma.staff.update({
      where: { id: staffId },
      data: {
        availabilityJson: JSON.stringify(availability)
      }
    });

    revalidatePath("/dashboard/staff");
    revalidatePath("/dashboard/my-schedule");
    return { success: true };
  } catch (error) {
    return { error: "Failed to update availability" };
  }
}

export async function blockTimeSlot(formData: FormData) {
  return addBlockedSlot(formData);
}

export async function addBlockedSlot(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const tenantId = (session.user as any).tenantId;
  const staffId = formData.get("staffId") as string;
  const reason = formData.get("reason") as string;
  const startTime = new Date(formData.get("startTime") as string);
  const endTime = new Date(formData.get("endTime") as string);

  try {
    await prisma.blockedSlot.create({
      data: {
        tenantId,
        staffId,
        reason,
        startTime,
        endTime,
      }
    });

    revalidatePath("/dashboard/my-schedule");
    revalidatePath("/dashboard/appointments");
    return { success: true };
  } catch (error) {
    return { error: "Failed to add block" };
  }
}

export async function deleteBlockedSlot(slotId: string) {
  return removeBlockedSlot(slotId);
}

export async function removeBlockedSlot(slotId: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  try {
    await prisma.blockedSlot.delete({
      where: { id: slotId }
    });

    revalidatePath("/dashboard/my-schedule");
    revalidatePath("/dashboard/appointments");
    return { success: true };
  } catch (error) {
    return { error: "Failed to remove block" };
  }
}

export async function updateBusinessHours(hours: any) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") return { error: "Unauthorized" };

  const tenantId = (session.user as any).tenantId;

  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        businessHoursJson: JSON.stringify(hours)
      }
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/appointments");
    return { success: true };
  } catch (error) {
    return { error: "Failed to update business hours" };
  }
}

export async function submitLeaveRequest(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const tenantId = (session.user as any).tenantId;
  const userId = (session.user as any).id;

  const startTime = new Date(formData.get("startTime") as string);
  const endTime = new Date(formData.get("endTime") as string);
  const reason = formData.get("reason") as string;
  const type = formData.get("type") as string || "PERSONAL";

  try {
    const staff = await prisma.staff.findUnique({
      where: { userId }
    });

    if (!staff) return { error: "Staff profile not found" };

    await prisma.leaveRequest.create({
      data: {
        tenantId,
        staffId: staff.id,
        type,
        startTime,
        endTime,
        reason,
        status: "PENDING"
      }
    });

    revalidatePath("/dashboard/staff");
    revalidatePath("/dashboard/my-schedule");
    return { success: true };
  } catch (error) {
    return { error: "Failed to submit leave request" };
  }
}

export async function approveLeaveRequest(requestId: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") return { error: "Unauthorized" };

  try {
    const request = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) return { error: "Request not found" };

    // 1. Approve the request
    await prisma.leaveRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED" }
    });

    // 2. Create a BlockedSlot so the staff is actually unavailable
    await prisma.blockedSlot.create({
      data: {
        tenantId: request.tenantId,
        staffId: request.staffId,
        reason: `Leave: ${request.reason || 'Personal'}`,
        startTime: request.startTime,
        endTime: request.endTime,
      }
    });

    revalidatePath("/dashboard/staff");
    revalidatePath("/dashboard/appointments");
    return { success: true };
  } catch (error) {
    return { error: "Failed to approve request" };
  }
}

export async function rejectLeaveRequest(requestId: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") return { error: "Unauthorized" };

  try {
    await prisma.leaveRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" }
    });

    revalidatePath("/dashboard/staff");
    return { success: true };
  } catch (error) {
    return { error: "Failed to reject request" };
  }
}
