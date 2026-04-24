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
  isEqual
} from "date-fns";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getAvailableSlots(
  tenantId: string, 
  serviceId: string, 
  dateStr: string,
  staffId?: string,
  excludeBookingId?: string // Important for editing/rescheduling
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
      orderBy: { createdAt: "asc" } // Get in order of creation
    }),
    prisma.tenant.findUnique({ where: { id: tenantId } })
  ]);

  // ENFORCE PLAN LIMITS
  const limits = { FREE: 1, TEAM: 5, PRO: 1000 };
  let currentLimit = limits[tenant?.plan as keyof typeof limits] || 1;
  if (tenant?.planStatus === "TRIALING" && currentLimit < 5) currentLimit = 5;

  // Only use staff within the allowed limit
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

    // If staff is not working OR business is explicitly closed that day, skip
    if (!daySchedule || (businessHours && !businessDaySchedule)) continue;

    // Get existing bookings for this staff on this day
    const bookings = await prisma.booking.findMany({
      where: {
        staffId: staff.id,
        startTime: {
          gte: startOfDay(targetDate),
          lte: endOfDay(targetDate),
        },
        status: {
          in: ["PENDING", "CONFIRMED"]
        },
        NOT: excludeBookingId ? { id: excludeBookingId } : undefined
      },
      include: {
        service: true
      }
    });

    // Get blocked slots (approved leaves, vacations, etc.)
    const blocked = await prisma.blockedSlot.findMany({
      where: {
        staffId: staff.id,
        startTime: { lte: endOfDay(targetDate) },
        endTime: { gte: startOfDay(targetDate) }
      }
    });

    const workStart = parse(daySchedule.start, "HH:mm", targetDate);
    const workEnd = parse(daySchedule.end, "HH:mm", targetDate);

    // Business constraints
    const bizStart = businessDaySchedule ? parse(businessDaySchedule.start, "HH:mm", targetDate) : null;
    const bizEnd = businessDaySchedule ? parse(businessDaySchedule.end, "HH:mm", targetDate) : null;

    let currentSlot = workStart;
    const duration = service.durationMinutes;
    const buffer = service.bufferTime || 0;
    const totalDuration = duration + buffer;

    while (isBefore(addMinutes(currentSlot, duration), workEnd) || isEqual(addMinutes(currentSlot, duration), workEnd)) {
      const slotEnd = addMinutes(currentSlot, duration);
      const slotEndWithBuffer = addMinutes(currentSlot, totalDuration);
      
      // Intersection Logic: Slot must be within Business Hours IF they are set
      const isWithinBusinessHours = !businessDaySchedule || (
        (isBefore(bizStart!, currentSlot) || isEqual(bizStart!, currentSlot)) &&
        (isAfter(bizEnd!, slotEnd) || isEqual(bizEnd!, slotEnd))
      );

      // Check for conflicts with other bookings
      // A booking conflict exists if the new slot (including buffer) overlaps with an existing booking
      // OR if an existing booking's buffer overlaps with the new slot
      const hasConflict = bookings.some(booking => {
        const bStart = new Date(booking.startTime);
        // Important: We need to consider the buffer of the existing booking too
        const bService = booking.service;
        const bBuffer = (bService as any)?.bufferTime || 0;
        const bEndWithBuffer = addMinutes(new Date(booking.endTime), bBuffer);
        
        return isBefore(currentSlot, bEndWithBuffer) && isAfter(slotEndWithBuffer, bStart);
      });

      // Check for conflicts with blocked slots
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

      // Move to next potential slot
      currentSlot = addMinutes(currentSlot, 30);
    }
  }

  // Sort all slots by time
  allAvailableSlots.sort((a, b) => a.time.localeCompare(b.time));

  // If no specific staffId was requested, deduplicate the times for a cleaner UI
  if (!staffId) {
    const uniqueSlots: typeof allAvailableSlots = [];
    const seenTimes = new Set<string>();

    for (const slot of allAvailableSlots) {
      if (!seenTimes.has(slot.time)) {
        // Workload Balancing: Find all staff members available at this exact time
        const availableStaffAtThisTime = allAvailableSlots.filter(s => s.time === slot.time);
        
        if (availableStaffAtThisTime.length > 1) {
          // Find the staff member from this sub-list who has the fewest total bookings for the target day
          // This is a simple but effective way to balance the team's load
          const staffBookingCounts = await Promise.all(
            availableStaffAtThisTime.map(async (s) => ({
              slot: s,
              count: await prisma.booking.count({
                where: {
                  staffId: s.staffId,
                  startTime: {
                    gte: startOfDay(targetDate),
                    lte: endOfDay(targetDate),
                  },
                  status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] }
                }
              })
            }))
          );

          // Sort by count and pick the "laziest" (least busy) staff member
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

  // Security check for authenticated Staff users
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
    // FINAL AVAILABILITY CHECK (Pre-creation)
    // Check for any conflicting bookings for this staff member
    const conflict = await prisma.booking.findFirst({
      where: {
        staffId,
        status: { in: ["PENDING", "CONFIRMED"] },
        // Logic: New booking (including its buffer) overlaps with existing booking (including its buffer)
        OR: [
          {
            // Existing booking starts during our new slot
            startTime: {
              lt: endTimeWithBuffer,
              gte: startTime
            }
          },
          {
            // Existing booking ends during our new slot
            endTime: {
              gt: startTime,
              lte: endTimeWithBuffer
            }
          },
          {
            // New slot is entirely inside an existing booking
            startTime: { lte: startTime },
            endTime: { gte: endTimeWithBuffer }
          }
        ]
      },
      include: { service: true }
    });

    if (conflict) {
      // Re-verify with existing booking's buffer
      const conflictBuffer = conflict.service.bufferTime || 0;
      const conflictEndWithBuffer = addMinutes(new Date(conflict.endTime), conflictBuffer);
      
      if (isBefore(startTime, conflictEndWithBuffer) && isAfter(endTimeWithBuffer, conflict.startTime)) {
        return { error: "This slot was just taken. Please pick another time." };
      }
    }

    // Check for blocked slots (leaves/personal blocks)
    const isBlocked = await prisma.blockedSlot.findFirst({
      where: {
        staffId,
        startTime: { lt: endTime },
        endTime: { gt: startTime }
      }
    });

    if (isBlocked) {
      return { error: "Staff member is unavailable during this time." };
    }

    await prisma.booking.create({
      data: {
        tenantId,
        serviceId,
        staffId,
        customerName,
        customerEmail,
        startTime,
        endTime,
        status: "PENDING",
      }
    });
    
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

    // Security check for Staff
    if (userRole === "STAFF") {
      const staffProfile = await prisma.staff.findUnique({ where: { userId } });
      if (!staffProfile || booking.staffId !== staffProfile.id) {
        return { error: "Unauthorized" };
      }
    }

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return { error: "Service not found" };

    const startTime = parse(`${dateStr} ${timeStr}`, "yyyy-MM-dd HH:mm", new Date());
    const endTime = addMinutes(startTime, service.durationMinutes);

    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        serviceId,
        staffId,
        customerName,
        customerEmail,
        startTime,
        endTime,
      }
    });

    revalidatePath("/dashboard/appointments");
    return { success: true };
  } catch (error) {
    return { error: "Failed to update booking" };
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
      include: { staff: true }
    });

    if (!booking) return { error: "Booking not found" };

    // Security: Staff can only update their own bookings
    if (userRole === "STAFF") {
      const staffProfile = await prisma.staff.findUnique({ where: { userId } });
      if (!staffProfile || booking.staffId !== staffProfile.id) {
        return { error: "Unauthorized to update this booking" };
      }
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: status as any }
    });

    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { error: "Failed to update booking status" };
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
    });

    if (!booking) return { error: "Booking not found" };

    // Security check for Staff
    if (userRole === "STAFF") {
      const staffProfile = await prisma.staff.findUnique({ where: { userId } });
      if (!staffProfile || booking.staffId !== staffProfile.id) {
        return { error: "Unauthorized to delete this booking" };
      }
    }

    await prisma.booking.delete({
      where: { id: bookingId }
    });

    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete booking" };
  }
}
