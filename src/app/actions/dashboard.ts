"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcrypt";
import { sendStaffWelcomeEmail } from "@/lib/mail";
import { getLabels } from "@/lib/labels";
import { parseInTimezone, formatInTimezone } from "@/lib/timezone-utils";

export async function addStaff(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return { error: "Only administrators can add staff members." };
  }

  const tenantId = session.user.tenantId;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const bio = formData.get("bio") as string;
  const password = formData.get("password") as string;
  const serviceIds = formData.getAll("services") as string[];

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId || "" },
      include: { staff: true }
    });

    const limits = { FREE: 1, STARTER: 5, PRO: 1000000 };
    const baseLimit = limits[tenant?.plan as keyof typeof limits] || 1;

    // Check if trial is active
    const now = new Date();
    const isTrialActive = tenant?.planStatus === "TRIALING" && tenant?.trialEndsAt && new Date(tenant.trialEndsAt) > now;
    const currentLimit = isTrialActive ? Math.max(baseLimit, 5) : baseLimit;

    if (tenant && tenant.staff.length >= currentLimit) {
      const planLabel = isTrialActive && tenant.plan === "FREE" ? "Free Trial" : tenant.plan;
      return { error: `Your ${planLabel} plan is limited to ${currentLimit} staff member(s). Please upgrade to add more.` };
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
          tenantId: tenantId || "",
        },
      });
      targetUserId = newUser.id;
    }

    await prisma.staff.create({
      data: {
        name,
        bio,
        tenantId: tenantId || "",
        userId: targetUserId || null,
        availabilityJson: JSON.stringify({}),
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

    revalidatePath("/staff");
    return { success: true };
  } catch (error) {
    console.error("Add Staff Error:", error);
    return { error: "Failed to add staff" };
  }
}

export async function deleteStaff(staffId: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return { error: "Unauthorized" };

  const tenantId = session.user.tenantId;

  try {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId, tenantId: tenantId || "" },
      include: { user: true }
    });

    if (!staff) return { error: "Staff not found" };

    if (staff.userId) {
      await prisma.user.delete({ where: { id: staff.userId } });
    }

    await prisma.staff.delete({ where: { id: staffId } });

    revalidatePath("/staff");
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
  const serviceIds = formData.getAll("services") as string[];
  const email = formData.get("email") as string;

  try {
    // 1. Get current staff and associated user
    const currentStaff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { userId: true, tenantId: true }
    });

    if (!currentStaff) {
      return { error: "Practitioner not found" };
    }

    // Check authorization: must be ADMIN or the staff member themselves
    const isAdmin = (session.user as any).role === "ADMIN";
    const isOwner = currentStaff.userId === session.user.id;
    if (!isAdmin && !isOwner) {
      return { error: "Unauthorized" };
    }

    // 2. If the user is an ADMIN and wants to change the email or password, validate and update them
    if (isAdmin && currentStaff.userId) {
      const userUpdateData: any = {};

      if (email) {
        // Check if email is already in use by another user
        const emailConflict = await prisma.user.findFirst({
          where: {
            email: { equals: email, mode: 'insensitive' },
            id: { not: currentStaff.userId }
          }
        });

        if (emailConflict) {
          return { error: "Email address is already in use by another user" };
        }

        userUpdateData.email = email;
      }

      const password = formData.get("password") as string;
      if (password) {
        if (password.length < 6) {
          return { error: "Password must be at least 6 characters" };
        }
        userUpdateData.password = await bcrypt.hash(password, 10);
      }

      if (Object.keys(userUpdateData).length > 0) {
        // Update associated user's details
        await prisma.user.update({
          where: { id: currentStaff.userId },
          data: userUpdateData
        });
      }
    }

    // 3. Update staff profile details
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

    revalidatePath("/staff");
    revalidatePath("/practitioners");
    revalidatePath("/team");
    revalidatePath("/trainers");
    return { success: true };
  } catch (error: any) {
    console.error("updateStaffProfile error:", error);
    return { error: "Failed to update staff profile" };
  }
}

export async function updateTenantCountry(countryCode: string, currency: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return { error: "Unauthorized" };

  const tenantId = session.user.tenantId;

  try {
    await prisma.tenant.update({
      where: { id: tenantId || "" },
      data: { 
        country: countryCode,
        currency
      },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { error: "Failed to update country settings" };
  }
}

export async function updateTenantTimezone(timezone: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return { error: "Unauthorized" };

  const tenantId = session.user.tenantId;

  try {
    await prisma.tenant.update({
      where: { id: tenantId || "" },
      data: { timezone },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { error: "Failed to update timezone" };
  }
}

export async function updateTenantTimeFormat(timeFormat: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return { error: "Unauthorized" };

  const tenantId = session.user.tenantId;

  try {
    await prisma.tenant.update({
      where: { id: tenantId || "" },
      data: { timeFormat },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { error: "Failed to update time format" };
  }
}

export async function addService(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return { error: "Unauthorized" };

  const tenantId = session.user.tenantId;
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
        tenantId: tenantId || "",
      },
    });

    revalidatePath("/services");
    return { success: true };
  } catch {
    return { error: "Failed to create service" };
  }
}

export async function updateService(serviceId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  const durationMinutes = parseInt(formData.get("duration") as string);
  const bufferTime = parseInt(formData.get("bufferTime") as string) || 0;
  const price = parseFloat(formData.get("price") as string);
  const color = formData.get("color") as string;

  if (isNaN(durationMinutes) || isNaN(price)) {
    return { error: "Invalid duration or price format" };
  }

  try {
    await prisma.service.update({
      where: { id: serviceId },
      data: {
        name,
        durationMinutes,
        bufferTime,
        price,
        color,
      },
    });

    revalidatePath("/services");
    return { success: true };
  } catch {
    return { error: "Failed to update service" };
  }
}

export async function deleteService(serviceId: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return { error: "Unauthorized" };

  try {
    await prisma.service.delete({
      where: { id: serviceId }
    });

    revalidatePath("/services");
    return { success: true };
  } catch {
    return { error: "Failed to delete service" };
  }
}

export async function updateTenantBranding(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return { error: "Unauthorized" };

  const tenantId = session.user.tenantId;
  const primaryColor = formData.get("primaryColor") as string;
  const logoUrl = formData.get("logoUrl") as string;

  try {
    await prisma.tenant.update({
      where: { id: tenantId || "" },
      data: {
        primaryColor,
        logoUrl,
      },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { error: "Failed to update branding" };
  }
}

export async function updateStaffAvailability(staffId: string, availability: any) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  try {
    await prisma.$transaction([
      prisma.availabilityOverride.deleteMany({
        where: { staffId: staffId }
      }),
      prisma.staff.update({
        where: { id: staffId },
        data: {
          availabilityJson: JSON.stringify(availability)
        }
      })
    ]);

    revalidatePath("/staff");
    revalidatePath("/my-schedule");
    revalidatePath("/schedule");
    revalidatePath("/appointments");
    revalidatePath("/bookings");
    revalidatePath("/booking");
    revalidatePath("/sessions");
    revalidatePath("/b/[slug]", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to update availability:", error);
    return { error: "Failed to update availability" };
  }
}

export async function blockTimeSlot(formData: FormData) {
  return addBlockedSlot(formData);
}

export async function addBlockedSlot(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const tenantId = session.user.tenantId;
  const staffId = formData.get("staffId") as string;
  const reason = formData.get("reason") as string;
  const startTimeStr = formData.get("startTime") as string;
  const endTimeStr = formData.get("endTime") as string;

  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId || "" } });
    const businessTimezone = tenant?.timezone || "UTC";

    // datetime-local input returns "YYYY-MM-DDTHH:mm"
    const [startDateStr, startTimeVal] = startTimeStr.split('T');
    const [endDateStr, endTimeVal] = endTimeStr.split('T');

    const startTime = parseInTimezone(startDateStr, startTimeVal, businessTimezone);
    const endTime = parseInTimezone(endDateStr, endTimeVal, businessTimezone);

    await prisma.blockedSlot.create({
      data: {
        tenantId: tenantId || "",
        staffId,
        reason,
        startTime,
        endTime,
      }
    });

    revalidatePath("/my-schedule");
    revalidatePath("/schedule");
    revalidatePath("/appointments");
    revalidatePath("/bookings");
    revalidatePath("/booking");
    revalidatePath("/sessions");
    revalidatePath("/b/[slug]", "layout");
    return { success: true };
  } catch {
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

    revalidatePath("/my-schedule");
    revalidatePath("/schedule");
    revalidatePath("/appointments");
    revalidatePath("/bookings");
    revalidatePath("/booking");
    revalidatePath("/sessions");
    revalidatePath("/b/[slug]", "layout");
    return { success: true };
  } catch {
    return { error: "Failed to remove block" };
  }
}

export async function updateBusinessHours(hours: any) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return { error: "Unauthorized" };

  const tenantId = session.user.tenantId;

  try {
    await prisma.tenant.update({
      where: { id: tenantId || "" },
      data: {
        businessHoursJson: hours
      }
    });

    revalidatePath("/", "layout");
    revalidatePath("/appointments");
    return { success: true };
  } catch {
    return { error: "Failed to update business hours" };
  }
}

export async function submitLeaveRequest(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const tenantId = session.user.tenantId;
  const userId = session.user.id;

  const startTimeStr = formData.get("startTime") as string;
  const endTimeStr = formData.get("endTime") as string;
  const reason = formData.get("reason") as string;
  const type = formData.get("type") as string || "PERSONAL";

  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId || "" } });
    const businessTimezone = tenant?.timezone || "UTC";

    const [startDateStr, startTimeVal] = startTimeStr.split('T');
    const [endDateStr, endTimeVal] = endTimeStr.split('T');

    const startTime = parseInTimezone(startDateStr, startTimeVal, businessTimezone);
    const endTime = parseInTimezone(endDateStr, endTimeVal, businessTimezone);

    const staff = await prisma.staff.findUnique({
      where: { userId }
    });

    if (!staff) return { error: "Staff profile not found" };

    const existingLeave = await prisma.leaveRequest.findFirst({
      where: {
        staffId: staff.id,
        status: { in: ["PENDING", "APPROVED"] },
        startTime: { lt: endTime },
        endTime: { gt: startTime }
      }
    });

    if (existingLeave) {
      const endAdjusted = new Date(existingLeave.endTime.getTime() - 60000);
      const isSameDay = formatInTimezone(existingLeave.startTime, businessTimezone, "yyyy-MM-dd") === 
                        formatInTimezone(endAdjusted, businessTimezone, "yyyy-MM-dd");
      
      const startMin = formatInTimezone(existingLeave.startTime, businessTimezone, "HH:mm");
      const endMin = formatInTimezone(endAdjusted, businessTimezone, "HH:mm");
      const isAllDay = startMin === "00:00" && endMin === "23:59";
      
      let dateRangeStr = "";
      if (isAllDay) {
        dateRangeStr = isSameDay 
          ? formatInTimezone(existingLeave.startTime, businessTimezone, "MMM d, yyyy")
          : `${formatInTimezone(existingLeave.startTime, businessTimezone, "MMM d")} - ${formatInTimezone(endAdjusted, businessTimezone, "MMM d, yyyy")}`;
      } else {
        const formattedStart = formatInTimezone(existingLeave.startTime, businessTimezone, "MMM d, yyyy h:mm a");
        const formattedEnd = isSameDay 
          ? formatInTimezone(endAdjusted, businessTimezone, "h:mm a")
          : formatInTimezone(endAdjusted, businessTimezone, "MMM d, yyyy h:mm a");
        dateRangeStr = `${formattedStart} - ${formattedEnd}`;
      }
      
      const statusLabel = existingLeave.status.toLowerCase();

      return { 
        error: `You already have a ${statusLabel} leave request for ${dateRangeStr}.` 
      };
    }

    await prisma.leaveRequest.create({
      data: {
        tenantId: tenantId || "",
        staffId: staff.id,
        type,
        startTime,
        endTime,
        reason,
        status: "PENDING"
      }
    });

    revalidatePath("/staff");
    revalidatePath("/my-schedule");
    return { success: true };
  } catch {
    return { error: "Failed to submit leave request" };
  }
}

export async function approveLeaveRequest(requestId: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return { error: "Unauthorized" };

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
        reason: `Leave: ${request.reason || (request.type.charAt(0).toUpperCase() + request.type.slice(1).toLowerCase())}`,
        startTime: request.startTime,
        endTime: request.endTime,
      }
    });

    revalidatePath("/staff");
    revalidatePath("/my-schedule");
    revalidatePath("/schedule");
    revalidatePath("/appointments");
    revalidatePath("/bookings");
    revalidatePath("/booking");
    revalidatePath("/sessions");
    revalidatePath("/b/[slug]", "layout");
    return { success: true };
  } catch {
    return { error: "Failed to approve request" };
  }
}

export async function rejectLeaveRequest(requestId: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return { error: "Unauthorized" };

  try {
    await prisma.leaveRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" }
    });

    revalidatePath("/staff");
    revalidatePath("/my-schedule");
    revalidatePath("/schedule");
    revalidatePath("/appointments");
    revalidatePath("/bookings");
    revalidatePath("/booking");
    revalidatePath("/sessions");
    revalidatePath("/b/[slug]", "layout");
    return { success: true };
  } catch {
    return { error: "Failed to reject request" };
  }
}

export async function searchGlobal(query: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const tenantId = session.user.tenantId;

  if (!query || query.length < 2) return { results: [] };

  try {
    const [customers, bookings, staff, services] = await Promise.all([
      prisma.customer.findMany({
        where: {
          tenantId: tenantId || "",
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
          ]
        },
        take: 3
      }),
      prisma.booking.findMany({
        where: {
          tenantId: tenantId || "",
          OR: [
            { customerName: { contains: query, mode: 'insensitive' } },
            { service: { name: { contains: query, mode: 'insensitive' } } },
          ]
        },
        include: { service: true, staff: true },
        take: 3,
        orderBy: { startTime: 'desc' }
      }),
      prisma.staff.findMany({
        where: {
          tenantId: tenantId || "",
          name: { contains: query, mode: 'insensitive' }
        },
        take: 3
      }),
      prisma.service.findMany({
        where: {
          tenantId: tenantId || "",
          name: { contains: query, mode: 'insensitive' }
        },
        take: 3
      })
    ]);

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId || "" },
      select: { businessType: true, timeFormat: true }
    });
    const labels = getLabels(tenant?.businessType);

    const results = [
      ...customers.map(c => ({ id: c.id, type: 'customer', title: c.name, subtitle: c.email || c.phone, href: `/${labels.customerSlug}` })),
      ...bookings.map(b => ({ id: b.id, type: 'appointment', title: b.customerName, subtitle: b.service.name + " with " + b.staff.name, href: `/${labels.appointmentSlug}` })),
      ...staff.map(s => ({ id: s.id, type: 'staff', title: s.name, subtitle: 'Team Member', href: `/${labels.staffSlug}` })),
      ...services.map(s => ({ id: s.id, type: 'service', title: s.name, subtitle: 'Service', href: `/${labels.serviceSlug}` })),
    ];

    return { results };
  } catch (error) {
    console.error("Global Search Error:", error);
    return { error: "Failed to perform search" };
  }
}
