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
    return {
      id: req.id,
      tenantId: req.tenantId,
      staffId: req.staffId,
      type: req.type,
      reason: req.reason,
      startTime: req.startTime,
      endTime: req.endTime,
      status: req.status,
      createdAt: req.createdAt,
      updatedAt: req.updatedAt,
      hasConflicts,
      staff: {
        id: req.staff.id,
        name: req.staff.name
      }
    };
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

  const serializedStaff = staffMembers.map(s => ({
    id: s.id,
    tenantId: s.tenantId,
    userId: s.userId,
    name: s.name,
    bio: s.bio,
    color: s.color,
    availabilityJson: s.availabilityJson,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    user: s.user ? {
      id: s.user.id,
      name: s.user.name,
      email: s.user.email,
      role: s.user.role,
      image: s.user.image,
      phone: s.user.phone
    } : null,
    services: s.services.map(srv => ({
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
      currentUserId={(session.user as any).id}
    />
  );
}

