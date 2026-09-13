import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { getLabels } from "@/lib/labels";
import { ArrowLeft, UserX } from "lucide-react";
import { StaffDetailClient } from "./staff-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StaffDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const tenantId = (session.user as any).tenantId;
  const userRole = (session.user as any).role;
  const currentUserId = (session.user as any).id;

  const [staffMember, allStaff, tenant, allServices, allLocations] = await Promise.all([
    prisma.staff.findUnique({
      where: { 
        id,
        tenantId: tenantId || ""
      },
      include: {
        user: true,
        services: true,
        locations: true,
        bookings: {
          include: {
            service: true,
            customer: true
          },
          orderBy: { startTime: "desc" }
        },
        leaveRequests: {
          orderBy: { createdAt: "desc" },
          take: 20
        },
        availabilityOverrides: {
          orderBy: { startTime: "desc" },
          take: 30
        },
        blockedSlots: {
          orderBy: { startTime: "desc" },
          take: 30
        }
      }
    }),
    prisma.staff.findMany({
      where: { tenantId: tenantId || "" },
      orderBy: { createdAt: "asc" },
      select: { id: true }
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId || "" },
      select: { 
        id: true,
        name: true,
        businessType: true,
        timezone: true,
        timeFormat: true,
        country: true,
        currency: true,
        plan: true,
        planStatus: true,
        trialEndsAt: true,
        businessHoursJson: true
      }
    }),
    prisma.service.findMany({
      where: { tenantId: tenantId || "" },
      orderBy: { name: "asc" }
    }),
    prisma.location.findMany({
      where: { tenantId: tenantId || "" },
      orderBy: { name: "asc" }
    })
  ]);

  const labels = getLabels(tenant?.businessType);
  const staffSlug = labels.staffSlug;

  if (!staffMember) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="h-16 w-16 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-600 flex items-center justify-center mb-4 border border-rose-100 dark:border-rose-900/40">
          <UserX className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{labels.staff} Not Found</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm font-medium">
          The {labels.staffLower} profile you are looking for does not exist or you do not have permission to view it.
        </p>
        <Link
          href={`/${staffSlug}`}
          className="mt-6 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-2xl font-bold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {labels.staff}s
        </Link>
      </div>
    );
  }

  const limits = { FREE: 1, STARTER: 5, PRO: 1000000 };
  const baseLimit = limits[tenant?.plan as keyof typeof limits] || 1;
  const now = new Date();
  const isTrialActive = tenant?.planStatus === "TRIALING" && tenant?.trialEndsAt && new Date(tenant.trialEndsAt) > now;
  const currentLimit = isTrialActive ? Math.max(baseLimit, 5) : baseLimit;
  
  const staffIndex = allStaff.findIndex(s => s.id === staffMember.id);
  const isLocked = staffIndex >= currentLimit;

  const serializedServices = allServices.map(s => ({
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

  const serializedStaff = {
    id: staffMember.id,
    tenantId: staffMember.tenantId,
    userId: staffMember.userId,
    name: staffMember.name,
    bio: staffMember.bio,
    color: staffMember.color,
    availabilityJson: staffMember.availabilityJson,
    createdAt: staffMember.createdAt,
    updatedAt: staffMember.updatedAt,
    user: staffMember.user ? {
      id: staffMember.user.id,
      name: staffMember.user.name,
      email: staffMember.user.email,
      role: staffMember.user.role,
      image: staffMember.user.image,
      phone: staffMember.user.phone
    } : null,
    services: staffMember.services.map(srv => ({
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
    })),
    locations: staffMember.locations.map(l => ({
      id: l.id,
      name: l.name,
      address: l.address,
      phone: l.phone,
      isPrimary: l.isPrimary
    })),
    bookings: staffMember.bookings.map(b => ({
      id: b.id,
      tenantId: b.tenantId,
      serviceId: b.serviceId,
      staffId: b.staffId,
      customerId: b.customerId,
      customerName: b.customerName,
      customerEmail: b.customerEmail,
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status,
      price: b.price ? b.price.toString() : null,
      notes: b.notes,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      service: b.service ? {
        id: b.service.id,
        name: b.service.name,
        color: b.service.color,
        durationMinutes: b.service.durationMinutes
      } : null,
      customer: b.customer ? {
        id: b.customer.id,
        name: b.customer.name,
        email: b.customer.email,
        phone: b.customer.phone
      } : null
    })),
    leaveRequests: staffMember.leaveRequests.map(lr => ({
      id: lr.id,
      type: lr.type,
      reason: lr.reason,
      startTime: lr.startTime,
      endTime: lr.endTime,
      status: lr.status,
      createdAt: lr.createdAt
    })),
    availabilityOverrides: (staffMember.availabilityOverrides || []).map(ov => ({
      id: ov.id,
      tenantId: ov.tenantId,
      staffId: ov.staffId,
      startTime: ov.startTime,
      endTime: ov.endTime,
      reason: ov.reason,
      createdAt: ov.createdAt
    })),
    blockedSlots: (staffMember.blockedSlots || []).map(bl => ({
      id: bl.id,
      tenantId: bl.tenantId,
      staffId: bl.staffId,
      startTime: bl.startTime,
      endTime: bl.endTime,
      reason: bl.reason,
      createdAt: bl.createdAt
    }))
  };

  return (
    <StaffDetailClient 
      staff={serializedStaff}
      allServices={serializedServices}
      allLocations={allLocations}
      isLocked={isLocked}
      userRole={userRole}
      currentUserId={currentUserId}
      tenant={tenant}
      country={tenant?.country}
      timeFormat={tenant?.timeFormat || "12h"}
      timezone={tenant?.timezone || "UTC"}
      currency={tenant?.currency || "USD"}
    />
  );
}
