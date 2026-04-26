"use server";

import prisma from "@/lib/prisma";
import { 
  addMinutes, 
  format, 
  parse, 
  startOfDay, 
  endOfDay, 
  isBefore, 
  isAfter, 
  isEqual,
  startOfToday,
  addDays
} from "date-fns";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { 
  sendBookingConfirmation, 
  sendBookingRescheduledEmail, 
  sendBookingCancelledEmail 
} from "@/lib/mail";

export async function getAvailableSlots(
  tenantId: string, 
  serviceId: string, 
  dateStr: string,
  staffId?: string,
  excludeBookingId?: string
) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId }
  });

  if (!service) return { error: "Service not found" };

  const targetDate = new Date(dateStr);
  const dayName = format(targetDate, "EEEE").toLowerCase();

  const staffQuery: any = staffId 
    ? { id: staffId, tenantId } 
    : { 
        tenantId,
        services: {
          some: { id: serviceId }
        }
      };

  const [staffMembersAll, tenant] = await Promise.all([
    prisma.staff.findMany({ 
      where: staffQuery,
      orderBy: { createdAt: "asc" }
    }),
    prisma.tenant.findUnique({ where: { id: tenantId } })
  ]);

  const limits = { FREE: 1, TEAM: 5, PRO: 1000000 };
  let currentLimit = limits[tenant?.plan as keyof typeof limits] || 1;
  if (tenant?.planStatus === "TRIALING" && currentLimit < 5) currentLimit = 5;

  const staffMembers = staffMembersAll.slice(0, currentLimit);

  const businessHours = tenant?.businessHoursJson 
    ? (typeof tenant.businessHoursJson === 'string' ? JSON.parse(tenant.businessHoursJson) : tenant.businessHoursJson)
    : null;

  const businessDaySchedule = businessHours?.[dayName];
  const allAvailableSlots: { time: string; staffId: string; staffName: string }[] = [];

  for (const staff of staffMembers) {
    const availability = typeof staff.availabilityJson === 'string' 
      ? JSON.parse(staff.availabilityJson) 
      : staff.availabilityJson;
    const daySchedule = availability[dayName];

    if (!daySchedule || (businessHours && !businessDaySchedule)) continue;

    const bookings = await prisma.booking.findMany({
      where: {
        staffId: staff.id,
        startTime: {
          gte: startOfDay(targetDate),
          lte: endOfDay(targetDate),
        },
        status: { in: ["PENDING", "CONFIRMED"] },
        NOT: excludeBookingId ? { id: excludeBookingId } : undefined
      },
      include: { service: true }
    });

    const blocked = await prisma.blockedSlot.findMany({
      where: {
        staffId: staff.id,
        startTime: { lte: endOfDay(targetDate) },
        endTime: { gte: startOfDay(targetDate) }
      }
    });

    const workStart = parse(daySchedule.start, "HH:mm", targetDate);
    const workEnd = parse(daySchedule.end, "HH:mm", targetDate);
    const bizStart = businessDaySchedule ? parse(businessDaySchedule.start, "HH:mm", targetDate) : null;
    const bizEnd = businessDaySchedule ? parse(businessDaySchedule.end, "HH:mm", targetDate) : null;

    let currentSlot = workStart;
    const duration = service.durationMinutes;
    const buffer = service.bufferTime || 0;
    const totalDuration = duration + buffer;

    while (isBefore(addMinutes(currentSlot, duration), workEnd) || isEqual(addMinutes(currentSlot, duration), workEnd)) {
      const slotEnd = addMinutes(currentSlot, duration);
      const slotEndWithBuffer = addMinutes(currentSlot, totalDuration);
      
      const isWithinBusinessHours = !businessDaySchedule || (
        (isBefore(bizStart!, currentSlot) || isEqual(bizStart!, currentSlot)) &&
        (isAfter(bizEnd!, slotEnd) || isEqual(bizEnd!, slotEnd))
      );

      const hasConflict = bookings.some(booking => {
        const bStart = new Date(booking.startTime);
        const bBuffer = (booking.service as any)?.bufferTime || 0;
        const bEndWithBuffer = addMinutes(new Date(booking.endTime), bBuffer);
        return isBefore(currentSlot, bEndWithBuffer) && isAfter(slotEndWithBuffer, bStart);
      });

      const isBlocked = blocked.some(block => {
        const bStart = new Date(block.startTime);
        const bEnd = new Date(block.endTime);
        return isBefore(currentSlot, bEnd) && isAfter(slotEnd, bStart);
      });

      if (!hasConflict && !isBlocked && isWithinBusinessHours) {
        allAvailableSlots.push({
          time: format(currentSlot, "HH:mm"),
          staffId: staff.id,
          staffName: staff.name
        });
      }
      currentSlot = addMinutes(currentSlot, 30);
    }
  }

  allAvailableSlots.sort((a, b) => a.time.localeCompare(b.time));

  if (!staffId) {
    const uniqueSlots: typeof allAvailableSlots = [];
    const seenTimes = new Set<string>();

    for (const slot of allAvailableSlots) {
      if (!seenTimes.has(slot.time)) {
        const availableStaffAtThisTime = allAvailableSlots.filter(s => s.time === slot.time);
        if (availableStaffAtThisTime.length > 1) {
          const staffBookingCounts = await Promise.all(
            availableStaffAtThisTime.map(async (s) => ({
              slot: s,
              count: await prisma.booking.count({
                where: {
                  staffId: s.staffId,
                  startTime: { gte: startOfDay(targetDate), lte: endOfDay(targetDate) },
                  status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] }
                }
              })
            }))
          );
          staffBookingCounts.sort((a, b) => a.count - b.count);
          uniqueSlots.push(staffBookingCounts[0].slot);
        } else {
          uniqueSlots.push(slot);
        }
        seenTimes.add(slot.time);
      }
    }
    return uniqueSlots;
  }

  return allAvailableSlots;
}

export async function createBooking(formData: FormData) {
  const session = await getServerSession(authOptions);
  const tenantId = formData.get("tenantId") as string;
  const serviceId = formData.get("serviceId") as string;
  const staffId = formData.get("staffId") as string;
  const dateStr = formData.get("date") as string;
  const timeStr = formData.get("time") as string;
  const customerName = formData.get("customerName") as string;
  const customerEmail = formData.get("customerEmail") as string;

  if (session && (session.user as any).role === "STAFF") {
    const userId = (session.user as any).id;
    const staffProfile = await prisma.staff.findUnique({ where: { userId } });
    if (!staffProfile || staffId !== staffProfile.id) {
      return { error: "Unauthorized: Staff can only create bookings for themselves." };
    }
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return { error: "Service not found" };

  const startTime = parse(`${dateStr} ${timeStr}`, "yyyy-MM-dd HH:mm", new Date());
  const endTime = addMinutes(startTime, service.durationMinutes);
  const buffer = service.bufferTime || 0;
  const endTimeWithBuffer = addMinutes(endTime, buffer);

  try {
    const conflict = await prisma.booking.findFirst({
      where: {
        staffId,
        status: { in: ["PENDING", "CONFIRMED"] },
        OR: [
          { startTime: { lt: endTimeWithBuffer, gte: startTime } },
          { endTime: { gt: startTime, lte: endTimeWithBuffer } },
          { startTime: { lte: startTime }, endTime: { gte: endTimeWithBuffer } }
        ]
      },
      include: { service: true }
    });

    if (conflict) {
      const conflictBuffer = conflict.service.bufferTime || 0;
      const conflictEndWithBuffer = addMinutes(new Date(conflict.endTime), conflictBuffer);
      if (isBefore(startTime, conflictEndWithBuffer) && isAfter(endTimeWithBuffer, conflict.startTime)) {
        return { error: "This slot was just taken. Please pick another time." };
      }
    }

    const isBlocked = await prisma.blockedSlot.findFirst({
      where: { staffId, startTime: { lt: endTime }, endTime: { gt: startTime } }
    });

    if (isBlocked) return { error: "Staff member is unavailable during this time." };

    const booking = await prisma.booking.create({
      data: {
        tenantId,
        serviceId,
        staffId,
        customerName,
        customerEmail,
        startTime,
        endTime,
        status: "PENDING",
      },
      include: {
        tenant: { select: { name: true, slug: true, emailNotificationsEnabled: true } },
        service: { select: { name: true } },
      }
    });

    if (booking.tenant.emailNotificationsEnabled) {
      await sendBookingConfirmation({
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        serviceName: booking.service.name,
        startTime: booking.startTime,
        businessName: booking.tenant.name,
        businessSlug: booking.tenant.slug,
        bookingId: booking.id,
      });
    }
    
    revalidatePath("/dashboard/appointments");
    return { success: true };
  } catch (error) {
    console.error("Booking error:", error);
    return { error: "Failed to create booking" };
  }
}

export async function updateBooking(bookingId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const tenantId = (session.user as any).tenantId;
  const userRole = (session.user as any).role;
  const userId = (session.user as any).id;

  const serviceId = formData.get("serviceId") as string;
  const staffId = formData.get("staffId") as string;
  const dateStr = formData.get("date") as string;
  const timeStr = formData.get("time") as string;
  const customerName = formData.get("customerName") as string;
  const customerEmail = formData.get("customerEmail") as string;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId, tenantId }
    });

    if (!booking) return { error: "Booking not found" };

    if (userRole === "STAFF") {
      const staffProfile = await prisma.staff.findUnique({ where: { userId } });
      if (!staffProfile || booking.staffId !== staffProfile.id) return { error: "Unauthorized" };
      if (staffId && staffId !== staffProfile.id) return { error: "Staff members can only reschedule their own appointments." };
    }

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return { error: "Service not found" };

    const startTime = parse(`${dateStr} ${timeStr}`, "yyyy-MM-dd HH:mm", new Date());
    const endTime = addMinutes(startTime, service.durationMinutes);

    await prisma.booking.update({
      where: { id: bookingId },
      data: { serviceId, staffId, customerName, customerEmail, startTime, endTime }
    });

    revalidatePath("/dashboard/appointments");
    return { success: true };
  } catch (error) {
    return { error: "Failed to update booking" };
  }
}

export async function rescheduleBooking(bookingId: string, newStartTime: Date, newStaffId?: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const tenantId = (session.user as any).tenantId;
  const userRole = (session.user as any).role;
  const userId = (session.user as any).id;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId, tenantId },
      include: { service: true }
    });

    if (!booking) return { error: "Booking not found" };

    if (userRole === "STAFF") {
      const staffProfile = await prisma.staff.findUnique({ where: { userId } });
      if (!staffProfile || booking.staffId !== staffProfile.id) return { error: "Unauthorized" };
      if (typeof newStaffId !== 'undefined' && newStaffId !== staffProfile.id) return { error: "Staff members can only reschedule their own appointments." };
    }

    const duration = booking.service.durationMinutes;
    const endTime = addMinutes(newStartTime, duration);

    const conflict = await prisma.booking.findFirst({
      where: {
        id: { not: bookingId },
        staffId: newStaffId || booking.staffId,
        status: { in: ["PENDING", "CONFIRMED"] },
        OR: [
          { startTime: { lt: endTime, gte: newStartTime } },
          { endTime: { gt: newStartTime, lte: endTime } }
        ]
      }
    });

    if (conflict) return { error: "This slot overlaps with an existing appointment." };

    await prisma.booking.update({
      where: { id: bookingId },
      data: { startTime: newStartTime, endTime, staffId: newStaffId || booking.staffId }
    });

    const updatedBooking = await prisma.booking.findUnique({
       where: { id: bookingId },
       include: { 
         tenant: { select: { name: true, slug: true, emailNotificationsEnabled: true } }, 
         service: { select: { name: true } } 
       }
    });

    if (updatedBooking?.tenant.emailNotificationsEnabled) {
      await sendBookingRescheduledEmail({
        customerName: updatedBooking.customerName,
        customerEmail: updatedBooking.customerEmail,
        serviceName: updatedBooking.service.name,
        newStartTime: updatedBooking.startTime,
        businessName: updatedBooking.tenant.name,
        businessSlug: updatedBooking.tenant.slug,
        bookingId: updatedBooking.id,
      });
    }

    revalidatePath("/dashboard/appointments");
    return { success: true };
  } catch (error) {
    return { error: "Failed to reschedule" };
  }
}

export async function rescheduleBookingByCustomer(bookingId: string, newDateStr: string, newTimeStr: string) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tenant: true, service: true }
    });

    if (!booking) return { error: "Booking not found" };

    const newStartTime = parse(`${newDateStr} ${newTimeStr}`, "yyyy-MM-dd HH:mm", new Date());
    const duration = booking.service.durationMinutes;
    const newEndTime = addMinutes(newStartTime, duration);
    const buffer = booking.service.bufferTime || 0;
    const endTimeWithBuffer = addMinutes(newEndTime, buffer);

    const conflict = await prisma.booking.findFirst({
      where: {
        id: { not: bookingId },
        staffId: booking.staffId,
        status: { in: ["PENDING", "CONFIRMED"] },
        OR: [
          { startTime: { lt: endTimeWithBuffer, gte: newStartTime } },
          { endTime: { gt: newStartTime, lte: endTimeWithBuffer } }
        ]
      }
    });

    if (conflict) return { error: "This slot is no longer available. Please pick another time." };

    await prisma.booking.update({
      where: { id: bookingId },
      data: { startTime: newStartTime, endTime: newEndTime }
    });

    if (booking.tenant.emailNotificationsEnabled) {
      await sendBookingRescheduledEmail({
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        serviceName: booking.service.name,
        newStartTime: newStartTime,
        businessName: booking.tenant.name,
        businessSlug: booking.tenant.slug,
        bookingId: booking.id,
      });
    }

    revalidatePath("/dashboard/appointments");
    return { success: true };
  } catch (error) {
    return { error: "Failed to update appointment time" };
  }
}

export async function getSuggestedSlots(tenantId: string, serviceId: string, staffId: string) {
  try {
    const suggestions: { date: string; time: string; staffName: string }[] = [];
    const today = startOfToday();

    for (let i = 0; i < 7; i++) {
      const targetDate = addDays(today, i);
      const dateStr = format(targetDate, "yyyy-MM-dd");
      const slots = await getAvailableSlots(tenantId, serviceId, dateStr, staffId);
      
      if (Array.isArray(slots)) {
        for (const slot of slots) {
          if (suggestions.length < 3) {
            const slotTime = parse(`${dateStr} ${slot.time}`, "yyyy-MM-dd HH:mm", new Date());
            if (slotTime > new Date()) {
              suggestions.push({ date: dateStr, time: slot.time, staffName: slot.staffName });
            }
          }
          if (suggestions.length === 3) break;
        }
      }
      if (suggestions.length === 3) break;
    }
    return suggestions;
  } catch (error) {
    return [];
  }
}

export async function cancelBookingByCustomer(bookingId: string) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tenant: true, service: true }
    });

    if (!booking) return { error: "Booking not found" };

    if (booking.tenant.emailNotificationsEnabled) {
      await sendBookingCancelledEmail({
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        serviceName: booking.service.name,
        startTime: booking.startTime,
        businessName: booking.tenant.name,
      });
    }

    await prisma.booking.delete({ where: { id: bookingId } });
    return { success: true };
  } catch (error) {
    return { error: "Failed to cancel appointment" };
  }
}

export async function deleteBooking(bookingId: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const tenantId = (session.user as any).tenantId;
  const userRole = (session.user as any).role;
  const userId = (session.user as any).id;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId, tenantId },
      include: { tenant: true, service: true }
    });

    if (!booking) return { error: "Booking not found" };

    if (userRole === "STAFF") {
      const staffProfile = await prisma.staff.findUnique({ where: { userId } });
      if (!staffProfile || booking.staffId !== staffProfile.id) return { error: "Unauthorized" };
    }

    await prisma.booking.delete({ where: { id: bookingId } });

    if (booking.tenant.emailNotificationsEnabled) {
      await sendBookingCancelledEmail({
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        serviceName: booking.service.name,
        startTime: booking.startTime,
        businessName: booking.tenant.name,
      });
    }

    revalidatePath("/dashboard/appointments");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete booking" };
  }
}

export async function updateBookingStatus(bookingId: string, status: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };
  const tenantId = (session.user as any).tenantId;
  const userRole = (session.user as any).role;
  const userId = (session.user as any).id;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId, tenantId },
    });
    if (!booking) return { error: "Booking not found" };
    if (userRole === "STAFF") {
      const staffProfile = await prisma.staff.findUnique({ where: { userId } });
      if (!staffProfile || booking.staffId !== staffProfile.id) return { error: "Unauthorized" };
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: status as any }
    });

    revalidatePath("/dashboard/appointments");
    return { success: true };
  } catch (error) {
    return { error: "Failed to update booking status" };
  }
}
