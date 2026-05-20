import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { ScheduleClient } from "./schedule-client";

export default async function SchedulePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tenantId = (session.user as any).tenantId;
  const userRole = (session.user as any).role;
  const userId = (session.user as any).id;

  const [staffRaw, tenant] = await Promise.all([
    prisma.staff.findMany({ 
      where: { tenantId },
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

  return (
    <ScheduleClient 
      staff={staff as any}
      tenant={tenant as any}
      userRole={userRole}
    />
  );
}
