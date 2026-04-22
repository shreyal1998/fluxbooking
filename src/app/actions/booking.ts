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

  const staffQuery = staffId 
    ? { id: staffId, tenantId } 
    : { tenantId };

  const [staffMembers, tenant] = await Promise.all([
    prisma.staff.findMany({ where: staffQuery }),
    prisma.tenant.findUnique({ where: { id: tenantId } })
  ]);

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

    while (isBefore(addMinutes(currentSlot, duration), workEnd) || isEqual(addMinutes(currentSlot, duration), workEnd)) {
      const slotEnd = addMinutes(currentSlot, duration);
      
      // Intersection Logic: Slot must be within Business Hours IF they are set
      const isWithinBusinessHours = !businessDaySchedule || (
        (isBefore(bizStart!, currentSlot) || isEqual(bizStart!, currentSlot)) &&
        (isAfter(bizEnd!, slotEnd) || isEqual(bizEnd!, slotEnd))
      );

      // Check for conflicts with other bookings
      const hasConflict = bookings.some(booking => {
        const bStart = new Date(booking.startTime);
        const bEnd = new Date(booking.endTime);
        return isBefore(currentSlot, bEnd) && isAfter(slotEnd, bStart);
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

  return allAvailableSlots.sort((a, b) => a.time.localeCompare(b.time));
}

export async function createBooking(formData: FormData) {
  const tenantId = formData.get("tenantId") as string;
  const serviceId = formData.get("serviceId") as string;
  const staffId = formData.get("staffId") as string;
  const dateStr = formData.get("date") as string;
  const timeStr = formData.get("time") as string;
  const customerName = formData.get("customerName") as string;
  const customerEmail = formData.get("customerEmail") as string;

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return { error: "Service not found" };

  const startTime = parse(`${dateStr} ${timeStr}`, "yyyy-MM-dd HH:mm", new Date());
  const endTime = addMinutes(startTime, service.durationMinutes);

  try {
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
