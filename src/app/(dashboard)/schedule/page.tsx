import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { ScheduleClient } from "./schedule-client";

import { Suspense } from "react";

export default async function SchedulePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tenantId = (session.user as any).tenantId;
  const userRole = (session.user as any).role;
  const userId = (session.user as any).id;

  const [staffRaw, tenant] = await Promise.all([
    prisma.staff.findMany({ 
      where: { tenantId },
      orderBy: { createdAt: "asc" },
      include: {
        blockedSlots: true,
        availabilityOverrides: true
      }
    }),
    prisma.tenant.findUnique({ 
      where: { id: tenantId }
    })
  ]);

  let staff = staffRaw;
  if (userRole === "STAFF") {
    const staffProfile = staffRaw.find(s => s.userId === userId);
    staff = staffProfile ? [staffProfile] : [];
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      lastSelectedStaffId: true,
      scheduleViewMode: true,
      scheduleSlotDuration: true
    }
  });
  
  const defaultView = user?.scheduleViewMode || "week";
  const defaultSlotDuration = user?.scheduleSlotDuration || 60;
  const serverDateIso = new Date().toISOString();

  return (
    <Suspense fallback={null}>
      <ScheduleClient 
        staff={staff as any}
        tenant={tenant as any}
        userRole={userRole}
        defaultStaffId={user?.lastSelectedStaffId || undefined}
        defaultView={defaultView}
        serverDateIso={serverDateIso}
        defaultSlotDuration={defaultSlotDuration}
      />
    </Suspense>
  );
}
