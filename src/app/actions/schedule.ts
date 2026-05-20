"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function toggleSlotStatus({
  staffId,
  startTime,
  endTime,
  type, // 'available' (to become blocked) or 'unavailable' (to become override) or 'delete-block' or 'delete-override'
  reason
}: {
  staffId: string;
  startTime: Date;
  endTime: Date;
  type: 'block' | 'override' | 'remove-block' | 'remove-override';
  reason?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not authenticated" };

  const tenantId = session.user.tenantId;
  const userRole = session.user.role;
  const userId = session.user.id;

  try {
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
      await prisma.blockedSlot.create({
        data: {
          tenantId: tenantId || "",
          staffId,
          startTime,
          endTime,
          reason: reason || "Scheduled Off"
        }
      });
    } else if (type === 'override') {
      await prisma.availabilityOverride.create({
        data: {
          tenantId: tenantId || "",
          staffId,
          startTime,
          endTime,
          reason: reason || "One-off Shift"
        }
      });
    } else if (type === 'remove-block') {
      await prisma.blockedSlot.deleteMany({
        where: {
          staffId,
          startTime: { lte: startTime },
          endTime: { gt: startTime }
        }
      });
    } else if (type === 'remove-override') {
      await prisma.availabilityOverride.deleteMany({
        where: {
          staffId,
          startTime: { lte: startTime },
          endTime: { gt: startTime }
        }
      });
    }

    revalidatePath("/schedule");
    revalidatePath("/appointments");
    revalidatePath("/(public)/b/[slug]", "layout");
    
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
