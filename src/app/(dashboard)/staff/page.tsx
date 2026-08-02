import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { StaffClient } from "./staff-client";

export default async function StaffPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tenantId = (session.user as any).tenantId;
  const userRole = (session.user as any).role;

  const [staffMembers, users, pendingRequests, tenant, services] = await Promise.all([
    prisma.staff.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
      include: { 
        user: true,
        services: true
      }
    }),
    prisma.user.findMany({
      where: { 
        tenantId,
        staffProfile: null
      }
    }),
    prisma.leaveRequest.findMany({
      where: { 
        tenantId,
        status: "PENDING"
      },
      include: { 
        staff: {
          include: {
            bookings: {
              where: {
                status: { in: ["PENDING", "CONFIRMED"] }
              }
            }
          }
        } 
      },
      orderBy: { createdAt: "asc" }
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, planStatus: true, trialEndsAt: true, businessType: true, timeFormat: true, country: true }
    }),
    prisma.service.findMany({
      where: { tenantId },
      orderBy: { name: "asc" }
    })
  ]);

  const limits = { FREE: 1, STARTER: 5, PRO: 1000000 };
  const baseLimit = limits[tenant?.plan as keyof typeof limits] || 1;

  // Check if trial is active
  const now = new Date();
  const isTrialActive = tenant?.planStatus === "TRIALING" && tenant?.trialEndsAt && new Date(tenant.trialEndsAt) > now;
  const currentLimit = isTrialActive ? Math.max(baseLimit, 5) : baseLimit;

  const requestsWithConflicts = pendingRequests.map(req => {
    const hasConflicts = req.staff.bookings.some(booking => {
      const bStart = new Date(booking.startTime);
      const bEnd = new Date(booking.endTime);
      return bStart < new Date(req.endTime) && bEnd > new Date(req.startTime);
    });
    return { ...req, hasConflicts };
  });

  const serializedServices = services.map(s => ({
    ...s,
    price: s.price.toString()
  }));

  const serializedStaff = staffMembers.map(s => ({
    ...s,
    services: s.services.map(srv => ({
      ...srv,
      price: srv.price.toString()
    }))
  }));

  return (
    <StaffClient 
      initialStaff={serializedStaff}
      initialUsers={users}
      initialServices={serializedServices}
      pendingRequests={requestsWithConflicts}
      currentLimit={currentLimit}
      businessType={tenant?.businessType}
      userRole={userRole}
      plan={tenant?.plan || "FREE"}
      timeFormat={tenant?.timeFormat || "12h"}
      trialEndsAt={tenant?.trialEndsAt}
      country={tenant?.country}
    />
  );
}

