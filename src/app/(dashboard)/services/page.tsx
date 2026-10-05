import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { ServicesClient } from "./services-client";

export default async function ServicesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tenantId = (session.user as any).tenantId;
  const userRole = (session.user as any).role;

  const [services, tenant, locations] = await Promise.all([
    prisma.service.findMany({
      where: { tenantId },
      include: { locations: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { 
        plan: true,
        planStatus: true,
        businessType: true,
        currency: true,
        country: true,
        timeFormat: true
      }
    }),
    prisma.location.findMany({
      where: { tenantId },
      orderBy: [{ isPrimary: "desc" }, { name: "asc" }]
    })
  ]);

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
    updatedAt: s.updatedAt,
    locations: (s as any).locations || []
  }));

  // Smart currency fallback
  let currency = tenant?.currency || "USD";
  if (currency === "USD" && tenant?.country && tenant.country !== "US") {
    const { COUNTRIES } = require("@/config/countries");
    const countryData = COUNTRIES.find((c: any) => c.code === tenant.country);
    if (countryData) currency = countryData.currency;
  }

  const isPro = tenant?.plan === "PRO" || tenant?.planStatus === "TRIALING";
  const activeLocations = isPro 
    ? locations 
    : (locations.filter(l => l.isPrimary).length > 0 
        ? locations.filter(l => l.isPrimary).slice(0, 1) 
        : locations.slice(0, 1));

  return (
    <div className="h-full flex flex-col animate-fade-in p-4 md:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
      <ServicesClient 
        initialServices={serializedServices} 
        locations={activeLocations}
        isPro={isPro}
        userRole={userRole} 
        businessType={tenant?.businessType}
        currency={currency}
      />
    </div>
  );
}
