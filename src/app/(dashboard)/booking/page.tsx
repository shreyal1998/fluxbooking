import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { BookingsClient } from "./bookings-client";

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

  // Filter logic for staff: only see their own appointments
  const bookingQuery: any = { tenantId };
  const blockedQuery: any = { tenantId };
  const overrideQuery: any = { tenantId };

  if (userRole === "STAFF") {
    const staffProfile = await prisma.staff.findUnique({ where: { userId } });
    if (staffProfile) {
      bookingQuery.staffId = staffProfile.id;
      blockedQuery.staffId = staffProfile.id;
      overrideQuery.staffId = staffProfile.id;
    }
  }

  const [bookings, blockedSlots, availabilityOverrides, services, staffRaw, tenant] = await Promise.all([
    prisma.booking.findMany({
      where: bookingQuery,
      include: {
        service: true,
        staff: true,
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
    })
  ]);

  // If user is STAFF, filter the staff list to only include themselves for manual booking options
  let staff = staffRaw;
  if (userRole === "STAFF") {
    const staffProfile = staffRaw.find(s => s.userId === userId);
    staff = staffProfile ? [staffProfile] : [];
  }

  const serializedBookings = bookings.map(b => ({
    ...b,
    price: b.price ? b.price.toString() : null,
    service: b.service ? {
      ...b.service,
      price: b.service.price.toString()
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
    ...s,
    services: s.services?.map(srv => ({
      ...srv,
      price: srv.price.toString()
    })) || []
  }));

  return (
    <BookingsClient 
      bookings={serializedBookings as any}
      blockedSlots={blockedSlots}
      availabilityOverrides={availabilityOverrides}
      services={services.map(s => ({ ...s, price: s.price.toString() }))}
      staff={serializedStaff as any}
      tenantId={tenantId}
      userRole={userRole}
      tenant={updatedTenant}
      defaultViewMode={defaultViewMode as any}
      serverDateIso={serverDateIso}
      defaultSlotDuration={defaultSlotDuration}
    />
  );
}
