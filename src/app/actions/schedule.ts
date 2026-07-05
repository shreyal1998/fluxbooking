"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { parseInTimezone } from "@/lib/timezone-utils";

export async function toggleSlotStatus({
  staffId,
  startTime,
  endTime,
  type, // 'available' (to become blocked) or 'unavailable' (to become override) or 'delete-block' or 'delete-override'
  reason
}: {
  staffId: string;
  startTime: Date | string;
  endTime: Date | string;
  type: 'block' | 'override' | 'remove-block' | 'remove-override';
  reason?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const tenantId = session.user.tenantId;
  const userRole = session.user.role;
  const userId = session.user.id;

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId || "" }
    });
    const tz = tenant?.timezone || "UTC";

    let startUTC: Date;
    let endUTC: Date;

    if (typeof startTime === 'string') {
      const parts = startTime.split('T');
      startUTC = parseInTimezone(parts[0], parts[1].substring(0, 5), tz);
    } else {
      startUTC = new Date(startTime);
    }

    if (typeof endTime === 'string') {
      const parts = endTime.split('T');
      endUTC = parseInTimezone(parts[0], parts[1].substring(0, 5), tz);
    } else {
      endUTC = new Date(endTime);
    }

    // Security: STAFF can only toggle their own slots
    if (userRole === "STAFF") {
      const staffProfile = await prisma.staff.findUnique({
        where: { userId }
      });
      if (!staffProfile || staffProfile.id !== staffId) {
        return { error: "Unauthorized: Staff can only manage their own schedule." };
      }
    }

    if (type === 'block') {
      const leave = await prisma.leaveRequest.findFirst({
        where: {
          staffId,
          status: "APPROVED",
          startTime: { lte: startUTC },
          endTime: { gt: startUTC }
        }
      });
      const blockReason = leave 
        ? `Leave: ${leave.reason || (leave.type.charAt(0).toUpperCase() + leave.type.slice(1).toLowerCase())}` 
        : (reason || "Scheduled Off");

      await prisma.blockedSlot.create({
        data: {
          tenantId: tenantId || "",
          staffId,
          startTime: startUTC,
          endTime: endUTC,
          reason: blockReason
        }
      });
    } else if (type === 'override') {
      await prisma.availabilityOverride.create({
        data: {
          tenantId: tenantId || "",
          staffId,
          startTime: startUTC,
          endTime: endUTC,
          reason: reason || "One-off Shift"
        }
      });
    } else if (type === 'remove-block') {
      const overlappingBlocks = await prisma.blockedSlot.findMany({
        where: {
          staffId,
          startTime: { lt: endUTC },
          endTime: { gt: startUTC }
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
    } else if (type === 'remove-override') {
      await prisma.availabilityOverride.deleteMany({
        where: {
          staffId,
          startTime: { lte: startUTC },
          endTime: { gt: startUTC }
        }
      });
    }

    revalidatePath("/schedule");
    revalidatePath("/my-schedule");
    revalidatePath("/appointments");
    revalidatePath("/bookings");
    revalidatePath("/sessions");
    revalidatePath("/b/[slug]", "layout");
    
    return { success: true };
  } catch (error) {
    console.error("Toggle slot error:", error);
    return { error: "Failed to update schedule" };
  }
}

export async function getScheduleData(staffId: string, date: Date) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  try {
    const [blockedSlots, availabilityOverrides, staff] = await Promise.all([
      prisma.blockedSlot.findMany({
        where: {
          staffId,
          startTime: { gte: start },
          endTime: { lte: end }
        }
      }),
      prisma.availabilityOverride.findMany({
        where: {
          staffId,
          startTime: { gte: start },
          endTime: { lte: end }
        }
      }),
      prisma.staff.findUnique({
        where: { id: staffId }
      })
    ]);

    return { blockedSlots, availabilityOverrides, staff };
  } catch (error) {
    console.error("Get schedule data error:", error);
    return null;
  }
}

export async function saveLastSelectedStaff(staffId: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastSelectedStaffId: staffId }
    });
    return { success: true };
  } catch (error) {
    console.error("Save last selected staff error:", error);
    return { error: "Failed to save selected practitioner" };
  }
}
