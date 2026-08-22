"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcrypt";
import { sendStaffWelcomeEmail } from "@/lib/mail";
import { getLabels } from "@/lib/labels";
import { parseInTimezone, formatInTimezone } from "@/lib/timezone-utils";
import { validatePhoneNumber } from "@/lib/utils";

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
  const phone = formData.get("phone") as string;
  const serviceIds = formData.getAll("services") as string[];

  const phoneError = validatePhoneNumber(phone);
  if (phoneError) return { error: phoneError };

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
          phone: phone || null,
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
  const phone = formData.get("phone") as string;

  const phoneError = validatePhoneNumber(phone);
  if (phoneError) return { error: phoneError };

  try {
    // 1. Get current staff and associated user
    const currentStaff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { 
        userId: true, 
        tenantId: true,
        user: {
          select: {
            email: true
          }
        }
      }
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

    // Track if the active user is changing their own email or password
    let isSelfEmailChanged = false;
    let isSelfPasswordChanged = false;
    if (currentStaff.userId === session.user.id) {
      if (email) {
        const emailLower = email.trim().toLowerCase();
        const currentEmailLower = currentStaff.user?.email.trim().toLowerCase();
        if (emailLower !== currentEmailLower) {
          isSelfEmailChanged = true;
        }
      }
      const password = formData.get("password") as string;
      if (password) {
        isSelfPasswordChanged = true;
      }
    }

    // 2. Update user details (email/password if admin, phone number for both admin and owner)
    if (currentStaff.userId) {
      const userUpdateData: any = {};

      if (isAdmin) {
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
      }

      const password = formData.get("password") as string;
      if (password) {
        if (password.length < 6) {
          return { error: "Password must be at least 6 characters" };
        }
        userUpdateData.password = await bcrypt.hash(password, 10);
      }

      userUpdateData.phone = phone || null;

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
    return { success: true, emailChanged: isSelfEmailChanged, passwordChanged: isSelfPasswordChanged };
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

export async function updateTenantWeekStart(weekStart: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return { error: "Unauthorized" };

  const tenantId = session.user.tenantId;

  try {
    await prisma.tenant.update({
      where: { id: tenantId || "" },
      data: { weekStart },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { error: "Failed to update week start" };
  }
}

export async function addService(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return { error: "Unauthorized" };

  const tenantId = session.user.tenantId;
  const name = formData.get("name") as string;
  const durationMinutes = parseInt(formData.get("duration") as string);
  const priceInput = formData.get("price") as string;
  const price = priceInput && !isNaN(parseFloat(priceInput)) ? parseFloat(priceInput) : 0;
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
  const priceInput = formData.get("price") as string;
  const price = priceInput && !isNaN(parseFloat(priceInput)) ? parseFloat(priceInput) : 0;
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

    // Check for overlapping approved/pending leave requests
    const overlappingLeave = await prisma.leaveRequest.findFirst({
      where: {
        staffId,
        status: { in: ["APPROVED", "PENDING"] },
        startTime: { lt: endTime },
        endTime: { gt: startTime }
      }
    });

    if (overlappingLeave) {
      const statusLabel = overlappingLeave.status.toLowerCase();
      return { error: `Cannot block hours. Practitioner has a ${statusLabel} leave during this time.` };
    }

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

async function cleanupOverlappingBlocks(staffId: string, startUTC: Date, endUTC: Date) {
  const overlappingBlocks = await prisma.blockedSlot.findMany({
    where: {
      staffId,
      startTime: { lt: endUTC },
      endTime: { gt: startUTC },
      NOT: {
        reason: { startsWith: "Leave:" }
      }
    }
  });

  for (const block of overlappingBlocks) {
    if (block.startTime >= startUTC && block.endTime <= endUTC) {
      await prisma.blockedSlot.delete({ where: { id: block.id } });
    } else if (block.startTime < startUTC && block.endTime > endUTC) {
      const originalEndTime = block.endTime;
      await prisma.blockedSlot.update({
        where: { id: block.id },
        data: { endTime: startUTC }
      });
      await prisma.blockedSlot.create({
        data: {
          tenantId: block.tenantId,
          staffId: block.staffId,
          reason: block.reason,
          startTime: endUTC,
          endTime: originalEndTime
        }
      });
    } else if (block.startTime < startUTC && block.endTime > startUTC && block.endTime <= endUTC) {
      await prisma.blockedSlot.update({
        where: { id: block.id },
        data: { endTime: startUTC }
      });
    } else if (block.startTime >= startUTC && block.startTime < endUTC && block.endTime > endUTC) {
      await prisma.blockedSlot.update({
        where: { id: block.id },
        data: { startTime: endUTC }
      });
    }
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
        const timePattern = tenant?.timeFormat === "24h" ? "HH:mm" : "h:mm a";
        const formattedStart = formatInTimezone(existingLeave.startTime, businessTimezone, `MMM d, yyyy ${timePattern}`);
        const formattedEnd = isSameDay 
          ? formatInTimezone(existingLeave.endTime, businessTimezone, timePattern)
          : formatInTimezone(existingLeave.endTime, businessTimezone, `MMM d, yyyy ${timePattern}`);
        dateRangeStr = `${formattedStart} - ${formattedEnd}`;
      }
      
      const isApproved = existingLeave.status === "APPROVED";
      const statusLabel = existingLeave.status.toLowerCase();

      return { 
        error: `You already have a ${statusLabel} leave${isApproved ? "" : " request"} for ${dateRangeStr}.` 
      };
    }

    const userRole = session.user.role;
    const initialStatus = userRole === "ADMIN" ? "APPROVED" : "PENDING";

    await prisma.leaveRequest.create({
      data: {
        tenantId: tenantId || "",
        staffId: staff.id,
        type,
        startTime,
        endTime,
        reason,
        status: initialStatus
      }
    });

    if (initialStatus === "APPROVED") {
      // Auto-approved for Admin, clean up overlapping blocks immediately
      await cleanupOverlappingBlocks(staff.id, startTime, endTime);

      await prisma.blockedSlot.create({
        data: {
          tenantId: tenantId || "",
          staffId: staff.id,
          reason: `Leave: ${reason || (type.charAt(0).toUpperCase() + type.slice(1).toLowerCase())}`,
          startTime,
          endTime,
        }
      });
    }

    revalidatePath("/staff");
    revalidatePath("/my-schedule");
    revalidatePath("/schedule");
    revalidatePath("/appointments");
    revalidatePath("/bookings");
    revalidatePath("/booking");
    revalidatePath("/sessions");
    revalidatePath("/b/[slug]", "layout");

    return { success: true };
  } catch (err) {
    console.error("Error submitting leave request:", err);
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
    await cleanupOverlappingBlocks(request.staffId, request.startTime, request.endTime);

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

export async function cancelLeaveRequest(requestId: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const userId = session.user.id;
  const userRole = session.user.role;

  try {
    const request = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: { staff: true }
    });

    if (!request) return { error: "Request not found" };

    // Security: STAFF can only cancel their own leave requests
    if (userRole === "STAFF" && request.staff.userId !== userId) {
      return { error: "Unauthorized" };
    }

    // If request was approved, delete the corresponding BlockedSlot
    if (request.status === "APPROVED") {
      await prisma.blockedSlot.deleteMany({
        where: {
          staffId: request.staffId,
          startTime: request.startTime,
          endTime: request.endTime,
          reason: { startsWith: "Leave:" }
        }
      });
    }

    // Delete the LeaveRequest
    await prisma.leaveRequest.delete({
      where: { id: requestId }
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
  } catch (err) {
    console.error("Error in cancelLeaveRequest:", err);
    return { error: "Failed to cancel leave request" };
  }
}

export async function getPersonalProfile() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const userId = session.user.id;
  const tenantId = (session.user as any).tenantId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        staffProfile: {
          include: {
            services: true
          }
        }
      }
    });

    if (!user) return { error: "User not found" };

    const services = await prisma.service.findMany({
      where: { tenantId },
      orderBy: { name: "asc" }
    });

    const serializedServices = services.map(s => ({
      id: s.id,
      tenantId: s.tenantId,
      name: s.name,
      durationMinutes: s.durationMinutes,
      bufferTime: s.bufferTime,
      price: s.price.toString(),
      color: s.color,
      capacity: s.capacity,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    }));

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      staff: user.staffProfile ? {
        id: user.staffProfile.id,
        name: user.staffProfile.name,
        bio: user.staffProfile.bio,
        color: user.staffProfile.color,
        user: {
          email: user.email,
          phone: user.phone
        },
        services: user.staffProfile.services.map(srv => ({
          id: srv.id,
          tenantId: srv.tenantId,
          name: srv.name,
          durationMinutes: srv.durationMinutes,
          bufferTime: srv.bufferTime,
          price: srv.price.toString(),
          color: srv.color,
          capacity: srv.capacity,
          createdAt: srv.createdAt,
          updatedAt: srv.updatedAt
        }))
      } : null,
      services: serializedServices
    };
  } catch (err) {
    console.error("Error in getPersonalProfile:", err);
    return { error: "Failed to fetch profile info" };
  }
}
