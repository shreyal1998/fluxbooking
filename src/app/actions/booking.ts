"use server";

import { Prisma, BookingStatus } from "@prisma/client";
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
import { getInTimezone, parseInTimezone } from "@/lib/timezone-utils";

export async function getAvailableSlots(
  tenantId: string, 
  serviceId: string, 
  dateStr: string,
  staffId?: string,
  excludeBookingId?: string,
  allowPast: boolean = false
) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId }
  });

  if (!service) return { error: "Service not found" };

  const tenant = await prisma.tenant.findUnique({ 
    where: { id: tenantId },
    select: {
      id: true,
      plan: true,
      planStatus: true,
      businessHoursJson: true,
      timezone: true,
      timeFormat: true
    }
  });

  const businessTimezone = tenant?.timezone || "UTC";
  const nowAtVenue = getInTimezone(new Date(), businessTimezone);

  const targetDate = new Date(dateStr);
  const dayName = format(targetDate, "EEEE").toLowerCase();


  const staffQuery: Prisma.StaffWhereInput = staffId 
    ? { id: staffId, tenantId } 
    : { 
        tenantId,
        services: {
          some: { id: serviceId }
        }
      };

  const staffMembersAll = await prisma.staff.findMany({ 
    where: staffQuery,
    orderBy: { createdAt: "asc" }
  });

  const limits = { FREE: 1, TEAM: 5, PRO: 1000000 };
  let currentLimit = limits[tenant?.plan as keyof typeof limits] || 1;
  if (tenant?.planStatus === "TRIALING" && currentLimit < 5) currentLimit = 5;

  const staffMembers = staffMembersAll.slice(0, currentLimit);

  const businessHours = tenant?.businessHoursJson 
    ? (typeof tenant.businessHoursJson === 'string' ? JSON.parse(tenant.businessHoursJson) : tenant.businessHoursJson as any)
    : null;

  const businessDaySchedule = businessHours?.[dayName];
  const allAvailableSlots: { time: string; staffId: string; staffName: string }[] = [];

  for (const staff of staffMembers) {
    const staffAvailability = typeof staff.availabilityJson === 'string' 
      ? JSON.parse(staff.availabilityJson) 
      : staff.availabilityJson as any;
    
    const staffDayVal = staffAvailability?.[dayName] || staffAvailability?.[dayName.charAt(0).toUpperCase() + dayName.slice(1)];
    const staffShifts = Array.isArray(staffDayVal) ? staffDayVal : (staffDayVal ? [staffDayVal] : []);

    if (staffShifts.length === 0 || (businessHours && !businessDaySchedule)) continue;

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

    const overrides = await prisma.availabilityOverride.findMany({
      where: {
        staffId: staff.id,
        startTime: { lte: endOfDay(targetDate) },
        endTime: { gte: startOfDay(targetDate) }
      }
    });

    const bizDayVal = businessDaySchedule;
    const bizShifts = Array.isArray(bizDayVal) ? bizDayVal : (bizDayVal ? [bizDayVal] : []);

    const potentialStartTimes = new Set<number>();
    const duration = service.durationMinutes;
    const buffer = service.bufferTime || 0;
    const totalDuration = duration + buffer;

    // Generate potential slots from all staff shifts
    for (const shift of staffShifts) {
      if (!shift.start || !shift.end) continue;
      let tempSlot = parseInTimezone(dateStr, shift.start, businessTimezone);
      const shiftEnd = parseInTimezone(dateStr, shift.end, businessTimezone);

      while (isBefore(addMinutes(tempSlot, duration), shiftEnd) || isEqual(addMinutes(tempSlot, duration), shiftEnd)) {
        potentialStartTimes.add(tempSlot.getTime());
        tempSlot = addMinutes(tempSlot, 30); // Step by 30 mins
      }
    }

    // Add override slots (one-off shifts)
    for (const override of overrides) {
      let overrideSlot = new Date(override.startTime);
      const overrideEnd = new Date(override.endTime);
      while (isBefore(addMinutes(overrideSlot, duration), overrideEnd) || isEqual(addMinutes(overrideSlot, duration), overrideEnd)) {
        potentialStartTimes.add(overrideSlot.getTime());
        overrideSlot = addMinutes(overrideSlot, 30);
      }
    }

    const sortedStartTimes = Array.from(potentialStartTimes).sort();

    for (const startTimeMs of sortedStartTimes) {
      const currentSlot = new Date(startTimeMs);
      const slotEnd = addMinutes(currentSlot, duration);
      const slotEndWithBuffer = addMinutes(currentSlot, totalDuration);
      
      const isBlocked = blocked.some(block => {
        const bStart = new Date(block.startTime);
        const bEnd = new Date(block.endTime);
        return isBefore(currentSlot, bEnd) && isAfter(slotEnd, bStart);
      });

      const isExplicitlyAvailable = overrides.some(override => {
        const oStart = new Date(override.startTime);
        const oEnd = new Date(override.endTime);
        return (isBefore(oStart, currentSlot) || isEqual(oStart, currentSlot)) && 
               (isAfter(oEnd, slotEnd) || isEqual(oEnd, slotEnd));
      });

      const isWithinStaffHours = staffShifts.some(shift => {
        const sStart = parse(shift.start, "HH:mm", targetDate);
        const sEnd = parse(shift.end, "HH:mm", targetDate);
        return (isBefore(sStart, currentSlot) || isEqual(sStart, currentSlot)) &&
               (isAfter(sEnd, slotEnd) || isEqual(sEnd, slotEnd));
      });

      const isWithinBusinessHours = isExplicitlyAvailable || bizShifts.length === 0 || bizShifts.some(shift => {
        const bStart = parse(shift.start, "HH:mm", targetDate);
        const bEnd = parse(shift.end, "HH:mm", targetDate);
        return (isBefore(bStart, currentSlot) || isEqual(bStart, currentSlot)) &&
               (isAfter(bEnd, slotEnd) || isEqual(bEnd, slotEnd));
      });

      const hasConflict = bookings.some(booking => {
        const bStart = new Date(booking.startTime);
        const bBuffer = booking.service.bufferTime || 0;
        const bEndWithBuffer = addMinutes(new Date(booking.endTime), bBuffer);
        return isBefore(currentSlot, bEndWithBuffer) && isAfter(slotEndWithBuffer, bStart);
      });

      if (!hasConflict && !isBlocked && isWithinBusinessHours && (isWithinStaffHours || isExplicitlyAvailable)) {
        // Only show slots that are in the future relative to the venue's current time
        const slotDateTimeStr = `${dateStr} ${format(currentSlot, "HH:mm")}`;
        const slotDateTime = parse(slotDateTimeStr, "yyyy-MM-dd HH:mm", targetDate);
        
        if (allowPast || slotDateTime > nowAtVenue) {
          allAvailableSlots.push({
            time: format(currentSlot, "HH:mm"),
            staffId: staff.id,
            staffName: staff.name
          });
        }
      }
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

  if (session && session.user.role === "STAFF") {
    const userId = session.user.id;
    const staffProfile = await prisma.staff.findUnique({ where: { userId } });
    if (!staffProfile || staffId !== staffProfile.id) {
      return { error: "Unauthorized: Staff can only create bookings for themselves." };
    }
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return { error: "Service not found" };

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const businessTimezone = tenant?.timezone || "UTC";

  // Parse requested time specifically in the business timezone
  const startTime = parseInTimezone(dateStr, timeStr, businessTimezone);
  const endTime = addMinutes(startTime, service.durationMinutes);
  const buffer = service.bufferTime || 0;
  const endTimeWithBuffer = addMinutes(endTime, buffer);

  // Check if booking is in the past relative to the venue
  const nowAtVenue = getInTimezone(new Date(), businessTimezone);
  if (startTime < nowAtVenue) {
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
      return { error: "Cannot book appointments in the past." };
    }
  }

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
        tenant: { select: { name: true, slug: true, emailNotificationsEnabled: true, timeFormat: true } },
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
        timezone: businessTimezone
      });
    }
    
    revalidatePath("/appointments");
    return { success: true };
  } catch {
    return { error: "Failed to create booking" };
  }
}

export async function updateBooking(bookingId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const tenantId = session.user.tenantId;
  const userRole = session.user.role;
  const userId = session.user.id;

  const serviceId = formData.get("serviceId") as string;
  const staffId = formData.get("staffId") as string;
  const dateStr = formData.get("date") as string;
  const timeStr = formData.get("time") as string;
  const customerName = formData.get("customerName") as string;
  const customerEmail = formData.get("customerEmail") as string;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId, tenantId: tenantId || "" }
    });

    if (!booking) return { error: "Booking not found" };

    if (userRole === "STAFF") {
      const staffProfile = await prisma.staff.findUnique({ where: { userId } });
      if (!staffProfile || booking.staffId !== staffProfile.id) return { error: "Unauthorized" };
      if (staffId && staffId !== staffProfile.id) return { error: "Staff members can only reschedule their own appointments." };
    }

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return { error: "Service not found" };

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId || "" } });
    const businessTimezone = tenant?.timezone || "UTC";

    const startTime = parseInTimezone(dateStr, timeStr, businessTimezone);
    const endTime = addMinutes(startTime, service.durationMinutes);

    await prisma.booking.update({
      where: { id: bookingId },
      data: { serviceId, staffId, customerName, customerEmail, startTime, endTime }
    });

    revalidatePath("/appointments");
    return { success: true };
  } catch {
    return { error: "Failed to update booking" };
  }
}

export async function rescheduleBooking(bookingId: string, newStartTime: Date, newStaffId?: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const tenantId = session.user.tenantId;
  const userRole = session.user.role;
  const userId = session.user.id;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId, tenantId: tenantId || "" },
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
         tenant: { select: { name: true, slug: true, emailNotificationsEnabled: true, timeFormat: true, timezone: true } }, 
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
        timezone: updatedBooking.tenant.timezone || "UTC"
      });
    }

    revalidatePath("/appointments");
    return { success: true };
  } catch {
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

    const businessTimezone = booking.tenant.timezone || "UTC";
    const newStartTime = parseInTimezone(newDateStr, newTimeStr, businessTimezone);
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
        timezone: businessTimezone
      });
    }

    revalidatePath("/appointments");
    return { success: true };
  } catch {
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
            const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { timezone: true } });
            const businessTimezone = tenant?.timezone || "UTC";
            const slotTime = parseInTimezone(dateStr, slot.time, businessTimezone);
            const nowAtVenue = getInTimezone(new Date(), businessTimezone);
            if (slotTime > nowAtVenue) {
              suggestions.push({ date: dateStr, time: slot.time, staffName: slot.staffName });
            }
          }
          if (suggestions.length === 3) break;
        }
      }
      if (suggestions.length === 3) break;
    }
    return suggestions;
  } catch {
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
        timezone: booking.tenant.timezone || "UTC"
      });
    }

    await prisma.booking.delete({ where: { id: bookingId } });
    return { success: true };
  } catch {
    return { error: "Failed to cancel appointment" };
  }
}

export async function deleteBooking(bookingId: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const tenantId = session.user.tenantId;
  const userRole = session.user.role;
  const userId = session.user.id;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId, tenantId: tenantId || "" },
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
        timezone: booking.tenant.timezone || "UTC"
      });
    }

    revalidatePath("/appointments");
    return { success: true };
  } catch {
    return { error: "Failed to delete booking" };
  }
}

export async function updateBookingStatus(bookingId: string, status: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };
  const tenantId = session.user.tenantId;
  const userRole = session.user.role;
  const userId = session.user.id;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId, tenantId: tenantId || "" },
    });
    if (!booking) return { error: "Booking not found" };
    if (userRole === "STAFF") {
      const staffProfile = await prisma.staff.findUnique({ where: { userId } });
      if (!staffProfile || booking.staffId !== staffProfile.id) return { error: "Unauthorized" };
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: status as BookingStatus }
    });

    revalidatePath("/appointments");
    return { success: true };
  } catch {
    return { error: "Failed to update booking status" };
  }
}
