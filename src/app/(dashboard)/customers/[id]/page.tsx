import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { getLabels } from "@/lib/labels";
import { ArrowLeft, UserX } from "lucide-react";
import { CustomerDetailClient } from "./customer-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const tenantId = (session.user as any).tenantId;
  const userRole = (session.user as any).role;

  const [customer, tenant] = await Promise.all([
    prisma.customer.findUnique({
      where: {
        id,
        tenantId: tenantId || ""
      },
      include: {
        bookings: {
          include: {
            service: true,
            staff: true,
            location: true
          },
          orderBy: { startTime: "desc" }
        }
      }
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
        primaryColor: true
      }
    })
  ]);

  const labels = getLabels(tenant?.businessType);
  const customerSlug = labels.customerSlug;

  if (!customer) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="h-16 w-16 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-600 flex items-center justify-center mb-4 border border-rose-100 dark:border-rose-900/40">
          <UserX className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{labels.customer} Not Found</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm font-medium">
          The {labels.customerLower} profile you are looking for does not exist or you do not have permission to view it.
        </p>
        <Link
          href={`/${customerSlug}`}
          className="mt-6 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-2xl font-bold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {labels.customer}s
        </Link>
      </div>
    );
  }

  const serializedCustomer = {
    id: customer.id,
    tenantId: customer.tenantId,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    notes: customer.notes,
    status: customer.status,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
    bookings: customer.bookings.map((b) => ({
      id: b.id,
      tenantId: b.tenantId,
      serviceId: b.serviceId,
      staffId: b.staffId,
      locationId: b.locationId,
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
      service: b.service
        ? {
            id: b.service.id,
            name: b.service.name,
            color: b.service.color,
            durationMinutes: b.service.durationMinutes,
            price: b.service.price ? b.service.price.toString() : "0"
          }
        : null,
      staff: b.staff
        ? {
            id: b.staff.id,
            name: b.staff.name,
            color: b.staff.color
          }
        : null,
      location: b.location
        ? {
            id: b.location.id,
            name: b.location.name,
            address: b.location.address
          }
        : null
    }))
  };

  return (
    <CustomerDetailClient
      customer={serializedCustomer}
      userRole={userRole}
      tenant={tenant}
      country={tenant?.country}
      timeFormat={tenant?.timeFormat || "12h"}
      timezone={tenant?.timezone || "UTC"}
      currency={tenant?.currency || "USD"}
    />
  );
}
