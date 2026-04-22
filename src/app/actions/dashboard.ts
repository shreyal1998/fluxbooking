"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function addService(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const tenantId = (session.user as any).tenantId;
  const name = formData.get("name") as string;
  const duration = parseInt(formData.get("duration") as string);
  const price = parseFloat(formData.get("price") as string);
  const color = formData.get("color") as string || "#6366f1";

  try {
    await prisma.service.create({
      data: {
        name,
        durationMinutes: duration,
        price,
        color,
        tenantId,
      },
    });
    revalidatePath("/dashboard/services");
    return { success: true };
  } catch (error) {
    return { error: "Failed to add service" };
  }
}

export async function addStaff(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const tenantId = (session.user as any).tenantId;
  const name = formData.get("name") as string;
  const bio = formData.get("bio") as string;
  const userId = formData.get("userId") as string;

  try {
    await prisma.staff.create({
      data: {
        name,
        bio,
        tenantId,
        userId: userId || null,
        availabilityJson: JSON.stringify({
          monday: { start: "09:00", end: "17:00" },
          tuesday: { start: "09:00", end: "17:00" },
          wednesday: { start: "09:00", end: "17:00" },
          thursday: { start: "09:00", end: "17:00" },
          friday: { start: "09:00", end: "17:00" },
        }),
      },
    });
    revalidatePath("/dashboard/staff");
    return { success: true };
  } catch (error) {
    return { error: "Failed to add staff" };
  }
}

export async function updateBusinessHours(hours: any) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const tenantId = (session.user as any).tenantId;

  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { businessHoursJson: JSON.stringify(hours) },
    });
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    return { error: "Failed to update business hours" };
  }
}

export async function updateStaffAvailability(staffId: string, availability: any, color?: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const tenantId = (session.user as any).tenantId;

  try {
    await prisma.staff.update({
      where: { 
        id: staffId,
        tenantId // Security: Ensure staff belongs to this tenant
      },
      data: { 
        availabilityJson: JSON.stringify(availability),
        ...(color ? { color } : {})
      },
    });
    revalidatePath("/dashboard/staff");
    revalidatePath("/dashboard/my-schedule");
    return { success: true };
  } catch (error) {
    return { error: "Failed to update staff availability" };
  }
}

export async function submitLeaveRequest(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const tenantId = (session.user as any).tenantId;
  const userId = (session.user as any).id;
  
  const staffProfile = await prisma.staff.findUnique({ where: { userId } });
  if (!staffProfile) return { error: "Staff profile not found" };

  const type = formData.get("type") as string;
  const reason = formData.get("reason") as string;
  const startTime = new Date(formData.get("startTime") as string);
  const endTime = new Date(formData.get("endTime") as string);

  const isUrgent = type === "SICK" || type === "EMERGENCY";

  // Validation: Notice Period (48 hours for Vacation/Personal)
  if (!isUrgent) {
    const minNotice = new Date();
    minNotice.setHours(minNotice.getHours() + 48);
    
    if (startTime < minNotice) {
      return { error: "Planned leave (Vacation/Personal) requires at least 48 hours notice. For urgent matters, please use 'Emergency'." };
    }
  }

  try {
    // Check for existing bookings to warn the admin later
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.leaveRequest.create({
        data: {
          tenantId,
          staffId: staffProfile.id,
          type,
          reason,
          startTime,
          endTime,
          status: isUrgent ? "APPROVED" : "PENDING"
        }
      });

      // If it's Urgent (Sick or Emergency), block the calendar immediately
      if (isUrgent) {
        await tx.blockedSlot.create({
          data: {
            tenantId,
            staffId: staffProfile.id,
            reason: `${type}: ${reason || "Urgent request"}`,
            startTime,
            endTime
          }
        });
      }

      return request;
    });

    revalidatePath("/dashboard/my-schedule");
    revalidatePath("/dashboard/appointments");
    return { success: true };
  } catch (error) {
    return { error: "Failed to submit request" };
  }
}

export async function approveLeaveRequest(requestId: string) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") return { error: "Unauthorized" };

  const tenantId = (session.user as any).tenantId;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.leaveRequest.update({
        where: { id: requestId, tenantId },
        data: { status: "APPROVED" }
      });

      // Automatically create a BlockedSlot upon approval
      await tx.blockedSlot.create({
        data: {
          tenantId,
          staffId: request.staffId,
          reason: `${request.type}: ${request.reason || "Approved Leave"}`,
          startTime: request.startTime,
          endTime: request.endTime
        }
      });

      return request;
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
  if ((session?.user as any)?.role !== "ADMIN") return { error: "Unauthorized" };

  const tenantId = (session.user as any).tenantId;

  try {
    await prisma.leaveRequest.update({
      where: { id: requestId, tenantId },
      data: { status: "REJECTED" }
    });
    revalidatePath("/dashboard/staff");
    return { success: true };
  } catch (error) {
    return { error: "Failed to reject request" };
  }
}
