import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { BookingsClient } from "./bookings-client";
import { cookies } from "next/headers";

export default async function BookingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tenantId = (session.user as any).tenantId;
  const userRole = (session.user as any).role;
  const userId = (session.user as any).id;

  const userPrefs = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      calendarViewMode: true,
      calendarSlotDuration: true
    }
  });
  const defaultViewMode = userPrefs?.calendarViewMode || "week";
  const defaultSlotDuration = userPrefs?.calendarSlotDuration || 60;
  const serverDateIso = new Date().toISOString();

  const cookieStore = await cookies();
  const savedZoom = cookieStore.get(`zoom-level-${userId}`)?.value;
  const initialZoomLevel = savedZoom ? parseInt(savedZoom, 10) : 100;

  // Filter logic for staff: only see their own appointments
  const bookingQuery: any = { tenantId };
  const blockedQuery: any = { tenantId };
  const overrideQuery: any = { tenantId };

  const leaveQuery: any = { tenantId, status: "APPROVED" };

  if (userRole === "STAFF") {
    const staffProfile = await prisma.staff.findUnique({ where: { userId } });
    if (staffProfile) {
      bookingQuery.staffId = staffProfile.id;
      blockedQuery.staffId = staffProfile.id;
      overrideQuery.staffId = staffProfile.id;
      leaveQuery.staffId = staffProfile.id;
    }
  }

  const [bookings, blockedSlots, availabilityOverrides, services, staffRaw, tenant, leaveRequests] = await Promise.all([
    prisma.booking.findMany({
      where: bookingQuery,
      include: {
        service: true,
        staff: true,
        customer: true,
      },
      orderBy: { startTime: "desc" },
    }),
    prisma.blockedSlot.findMany({
      where: blockedQuery,
      include: {
        staff: true,
      },
      orderBy: { startTime: "desc" },
    }),
    prisma.availabilityOverride.findMany({
      where: overrideQuery,
      include: {
        staff: true,
      },
      orderBy: { startTime: "desc" },
    }),
    prisma.service.findMany({ where: { tenantId } }),
    prisma.staff.findMany({ 
      where: { tenantId },
      orderBy: { createdAt: "asc" },
      include: { services: true }
    }),
    prisma.tenant.findUnique({ 
      where: { id: tenantId }
    }),
    prisma.leaveRequest.findMany({
      where: leaveQuery,
      include: {
        staff: true
      },
      orderBy: { startTime: "desc" }
    })
  ]);

  // If user is STAFF, filter the staff list to only include themselves for manual booking options
  let staff = staffRaw;
  if (userRole === "STAFF") {
    const staffProfile = staffRaw.find(s => s.userId === userId);
    staff = staffProfile ? [staffProfile] : [];
  }

  const serializedBookings = bookings.map(b => ({
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
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    service: b.service ? {
      id: b.service.id,
      tenantId: b.service.tenantId,
      name: b.service.name,
      durationMinutes: b.service.durationMinutes,
      bufferTime: b.service.bufferTime,
      price: b.service.price.toString(),
      color: b.service.color,
      capacity: b.service.capacity,
      createdAt: b.service.createdAt,
      updatedAt: b.service.updatedAt
    } : null,
    staff: b.staff ? {
      id: b.staff.id,
      tenantId: b.staff.tenantId,
      userId: b.staff.userId,
      name: b.staff.name,
      bio: b.staff.bio,
      color: b.staff.color,
      availabilityJson: b.staff.availabilityJson,
      createdAt: b.staff.createdAt,
      updatedAt: b.staff.updatedAt
    } : null,
    customer: b.customer ? {
      name: b.customer.name,
      email: b.customer.email
    } : null
  }));

  // Smart currency fallback
  let currency = tenant?.currency || "USD";
  if (currency === "USD" && tenant?.country && tenant.country !== "US") {
    const { COUNTRIES } = require("@/config/countries");
    const countryData = COUNTRIES.find((c: any) => c.code === tenant.country);
    if (countryData) currency = countryData.currency;
  }

  const updatedTenant = tenant ? { ...tenant, currency } : null;

  const serializedStaff = staff.map(s => ({
    id: s.id,
    tenantId: s.tenantId,
    userId: s.userId,
    name: s.name,
    bio: s.bio,
    color: s.color,
    availabilityJson: s.availabilityJson,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    services: s.services?.map(srv => ({
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
    })) || []
  }));

  const serializedLeaves = leaveRequests.map(l => ({
    id: l.id,
    tenantId: l.tenantId,
    staffId: l.staffId,
    startTime: l.startTime,
    endTime: l.endTime,
    type: l.type,
    reason: l.reason,
    status: l.status,
    staff: {
      id: l.staff.id,
      tenantId: l.staff.tenantId,
      userId: l.staff.userId,
      name: l.staff.name,
      bio: l.staff.bio,
      color: l.staff.color,
      availabilityJson: l.staff.availabilityJson,
      createdAt: l.staff.createdAt,
      updatedAt: l.staff.updatedAt
    }
  }));

  const serializedBlockedSlots = blockedSlots.map(bs => ({
    id: bs.id,
    tenantId: bs.tenantId,
    staffId: bs.staffId,
    reason: bs.reason,
    startTime: bs.startTime,
    endTime: bs.endTime,
    createdAt: bs.createdAt,
    updatedAt: bs.updatedAt,
    staff: {
      id: bs.staff.id,
      tenantId: bs.staff.tenantId,
      userId: bs.staff.userId,
      name: bs.staff.name,
      bio: bs.staff.bio,
      color: bs.staff.color,
      availabilityJson: bs.staff.availabilityJson,
      createdAt: bs.staff.createdAt,
      updatedAt: bs.staff.updatedAt
    }
  }));

  const serializedOverrides = availabilityOverrides.map(ao => ({
    id: ao.id,
    tenantId: ao.tenantId,
    staffId: ao.staffId,
    startTime: ao.startTime,
    endTime: ao.endTime,
    reason: ao.reason,
    createdAt: ao.createdAt,
    updatedAt: ao.updatedAt,
    staff: ao.staff ? {
      id: ao.staff.id,
      tenantId: ao.staff.tenantId,
      userId: ao.staff.userId,
      name: ao.staff.name,
      bio: ao.staff.bio,
      color: ao.staff.color,
      availabilityJson: ao.staff.availabilityJson,
      createdAt: ao.staff.createdAt,
      updatedAt: ao.staff.updatedAt
    } : null
  }));

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

  return (
    <BookingsClient 
      bookings={serializedBookings as any}
      blockedSlots={serializedBlockedSlots}
      availabilityOverrides={serializedOverrides}
      leaveRequests={serializedLeaves}
      services={serializedServices}
      staff={serializedStaff as any}
      tenantId={tenantId}
      userRole={userRole}
      tenant={updatedTenant}
      defaultViewMode={defaultViewMode as any}
      serverDateIso={serverDateIso}
      defaultSlotDuration={defaultSlotDuration}
      initialZoomLevel={initialZoomLevel}
      userId={userId}
    />
  );
}
