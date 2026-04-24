"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcrypt";
import { COUNTRIES } from "@/config/countries";

export async function addService(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const tenantId = (session.user as any).tenantId;
  const name = formData.get("name") as string;
  const duration = parseInt(formData.get("duration") as string);
  const bufferTime = parseInt(formData.get("bufferTime") as string) || 0;
  const price = parseFloat(formData.get("price") as string);
  const color = formData.get("color") as string || "#6366f1";

  try {
    await prisma.service.create({
      data: {
        name,
        durationMinutes: duration,
        bufferTime,
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

export async function updateService(serviceId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") return { error: "Unauthorized" };

  const tenantId = (session.user as any).tenantId;
  const name = formData.get("name") as string;
  const duration = parseInt(formData.get("duration") as string);
  const bufferTime = parseInt(formData.get("bufferTime") as string) || 0;
  const price = parseFloat(formData.get("price") as string);
  const color = formData.get("color") as string;

  try {
    await prisma.service.update({
      where: { id: serviceId, tenantId },
      data: {
        name,
        durationMinutes: duration,
        bufferTime,
        price,
        color
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
  if (!session || (session.user as any).role !== "ADMIN") return { error: "Unauthorized" };

  const tenantId = (session.user as any).tenantId;

  try {
    // Check for future bookings
    const bookings = await prisma.booking.count({
      where: {
        serviceId,
        tenantId,
        startTime: { gte: new Date() },
        status: { in: ["PENDING", "CONFIRMED"] }
      }
    });

    if (bookings > 0) {
      return { error: `Cannot delete service with ${bookings} upcoming booking(s).` };
    }

    await prisma.service.delete({
      where: { id: serviceId, tenantId }
    });
    revalidatePath("/dashboard/services");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete service" };
  }
}

export async function addStaff(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const tenantId = (session.user as any).tenantId;
  const name = formData.get("name") as string;
  const bio = formData.get("bio") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const phone = formData.get("phone") as string;
  const countryCode = formData.get("staffCountryCode") as string;
  const existingUserId = formData.get("userId") as string;
  
  // Get selected services from formData (multiple services)
  const serviceIds = formData.getAll("services") as string[];

  // Combine phone with country code
  const selectedCountryData = COUNTRIES.find(c => c.code === countryCode);
  const fullPhone = selectedCountryData && phone ? `+${selectedCountryData.phoneCode}${phone}` : phone;

  try {
    // Check staff limit based on plan
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, planStatus: true }
    });

    const staffCount = await prisma.staff.count({
      where: { tenantId }
    });

    const limits = {
      FREE: 1,
      TEAM: 5,
      PRO: 1000
    };

    let currentLimit = limits[tenant?.plan as keyof typeof limits] || 1;
    if (tenant?.planStatus === "TRIALING" && currentLimit < 5) {
      currentLimit = 5;
    }

    if (staffCount >= currentLimit) {
      const planName = tenant?.planStatus === "TRIALING" ? "Free Trial" : `${tenant?.plan} plan`;
      return { 
        error: `Limit reached. Your ${planName} allows up to ${currentLimit} staff member(s). Please upgrade to add more.` 
      };
    }

    let targetUserId = existingUserId || null;

    // If email and password provided, create a new user account
    if (!targetUserId && email && password) {
      // Check if email already exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return { error: "A user with this email already exists." };
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phone: fullPhone || null,
          role: "STAFF",
          tenantId
        }
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
          connect: serviceIds.map(id => ({ id }))
        }
      },
    });
    revalidatePath("/dashboard/staff");
    return { success: true };
  } catch (error) {
    console.error("Add Staff Error:", error);
    return { error: "Failed to add staff" };
  }
}

export async function updateTenantBranding(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") return { error: "Unauthorized" };

  const tenantId = (session.user as any).tenantId;
  const primaryColor = formData.get("primaryColor") as string;
  const logoUrl = formData.get("logoUrl") as string;

  try {
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: { 
        primaryColor: primaryColor || "#6366f1",
        logoUrl: logoUrl || null
      },
    });
    revalidatePath("/dashboard/settings");
    revalidatePath(`/b/${tenant.slug}`);
    return { success: true };
  } catch (error) {
    return { error: "Failed to update branding" };
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
        tenantId 
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

export async function updateStaffProfile(staffId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const tenantId = (session.user as any).tenantId;
  const userRole = (session.user as any).role;
  const currentUserId = (session.user as any).id;

  const name = formData.get("name") as string;
  const bio = formData.get("bio") as string;
  const phone = formData.get("phone") as string;
  const color = formData.get("color") as string;
  const serviceIds = formData.getAll("services") as string[];

  try {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId, tenantId },
      include: { user: true }
    });

    if (!staff) return { error: "Staff not found" };

    // Authorization: Admin can edit anyone, Staff can only edit themselves
    if (userRole !== "ADMIN" && staff.userId !== currentUserId) {
      return { error: "Unauthorized" };
    }

    await prisma.$transaction(async (tx) => {
      // Update Staff record
      await tx.staff.update({
        where: { id: staffId },
        data: {
          name: userRole === "ADMIN" ? name : staff.name, // Only Admin can change name? Or let staff change name too? Usually name is fine.
          bio,
          color: color || staff.color,
          services: {
            set: serviceIds.map(id => ({ id }))
          }
        }
      });

      // Update linked User record if it exists
      if (staff.userId) {
        await tx.user.update({
          where: { id: staff.userId },
          data: {
            name: userRole === "ADMIN" ? name : staff.name,
            phone: phone || null
          }
        });
      }
    });

    revalidatePath("/dashboard/staff");
    revalidatePath("/dashboard/my-schedule");
    return { success: true };
  } catch (error) {
    console.error("Update Staff Error:", error);
    return { error: "Failed to update staff profile" };
  }
}

export async function deleteStaff(staffId: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }

  const tenantId = (session.user as any).tenantId;

  try {
    // 1. Check for upcoming bookings
    const upcomingBookings = await prisma.booking.count({
      where: {
        staffId,
        tenantId,
        startTime: { gt: new Date() },
        status: { in: ["PENDING", "CONFIRMED"] }
      }
    });

    if (upcomingBookings > 0) {
      return { error: `Cannot delete staff with ${upcomingBookings} upcoming appointment(s). Please reassign or cancel them first.` };
    }

    // 2. Perform deletion
    await prisma.staff.delete({
      where: { id: staffId, tenantId }
    });

    revalidatePath("/dashboard/staff");
    return { success: true };
  } catch (error) {
    console.error("Delete Staff Error:", error);
    return { error: "Failed to delete staff member" };
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

  if (!isUrgent) {
    const minNotice = new Date();
    minNotice.setHours(minNotice.getHours() + 48);
    
    if (startTime < minNotice) {
      return { error: "Planned leave (Vacation/Personal) requires at least 48 hours notice. For urgent matters, please use 'Emergency'." };
    }
  }

  try {
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
  if (!session || (session.user as any)?.role !== "ADMIN") return { error: "Unauthorized" };

  const tenantId = (session.user as any).tenantId;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.leaveRequest.update({
        where: { id: requestId, tenantId },
        data: { status: "APPROVED" }
      });

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
  if (!session || (session.user as any)?.role !== "ADMIN") return { error: "Unauthorized" };

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

export async function blockTimeSlot(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const tenantId = (session.user as any).tenantId;
  const userRole = (session.user as any).role;
  const userId = (session.user as any).id;

  const staffId = formData.get("staffId") as string;
  const reason = formData.get("reason") as string;
  const startTime = new Date(formData.get("startTime") as string);
  const endTime = new Date(formData.get("endTime") as string);

  try {
    // Security: If staff, verify they are blocking themselves
    if (userRole === "STAFF") {
      const staffProfile = await prisma.staff.findUnique({ where: { userId } });
      if (!staffProfile || staffId !== staffProfile.id) {
        return { error: "Unauthorized" };
      }
    }

    // Validation: End must be after start
    if (startTime >= endTime) {
      return { error: "End time must be after start time" };
    }

    // Conflict Check: Are there any bookings in this range?
    const conflict = await prisma.booking.findFirst({
      where: {
        staffId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startTime: { lt: endTime },
        endTime: { gt: startTime }
      }
    });

    if (conflict) {
      return { error: "Cannot block time: An appointment already exists during this period." };
    }

    await prisma.blockedSlot.create({
      data: {
        tenantId,
        staffId,
        reason: reason || "Personal Block",
        startTime,
        endTime
      }
    });

    revalidatePath("/dashboard/my-schedule");
    revalidatePath("/dashboard/appointments");
    return { success: true };
  } catch (error) {
    console.error("Block Error:", error);
    return { error: "Failed to block time slot" };
  }
}

export async function deleteBlockedSlot(slotId: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const tenantId = (session.user as any).tenantId;
  const userRole = (session.user as any).role;
  const userId = (session.user as any).id;

  try {
    const slot = await prisma.blockedSlot.findUnique({
      where: { id: slotId, tenantId }
    });

    if (!slot) return { error: "Slot not found" };

    // Security check
    if (userRole === "STAFF") {
      const staffProfile = await prisma.staff.findUnique({ where: { userId } });
      if (!staffProfile || slot.staffId !== staffProfile.id) {
        return { error: "Unauthorized" };
      }
    }

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
