import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { format } from "date-fns";
import { getInTimezone } from "@/lib/timezone-utils";
import { formatCurrency } from "@/lib/currency-utils";
import { COUNTRIES } from "@/config/countries";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Mail, 
  DollarSign, 
  ArrowLeft,
  Timer,
  Phone,
  FileText
} from "lucide-react";
import { StatusButtons } from "./status-buttons";
import Link from "next/link";
import { getLabels } from "@/lib/labels";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const tenantId = (session.user as any).tenantId;

  // Fetch booking, services, staff, and tenant in parallel
  const [booking, services, staff, tenant] = await Promise.all([
    prisma.booking.findUnique({
      where: { 
        id,
        tenantId: tenantId || ""
      },
      include: {
        service: true,
        staff: true,
        customer: true,
      }
    }),
    prisma.service.findMany({ where: { tenantId: tenantId || "" } }),
    prisma.staff.findMany({ 
      where: { tenantId: tenantId || "" },
      orderBy: { createdAt: "asc" },
      include: { services: true }
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId || "" }
    })
  ]);

  const labels = getLabels(tenant?.businessType);
  const appointmentSlug = labels.appointmentSlug;
  const ServiceIcon = labels.serviceIcon;

  if (!booking) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="h-16 w-16 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-600 flex items-center justify-center mb-4">
          <XIcon className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Booking Not Found</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
          The booking you are looking for does not exist or you do not have permission to view it.
        </p>
        <Link
          href={`/${appointmentSlug}`}
          className="mt-6 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-2xl font-bold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Booking
        </Link>
      </div>
    );
  }

  const timezone = tenant?.timezone || "UTC";
  const timeFormatSetting = tenant?.timeFormat || "12h";
  const currencySetting = tenant?.currency || "USD";
  const countryData = COUNTRIES.find(c => c.code === (tenant?.country || "US"));
  const dialCode = countryData?.phoneCode ? `+${countryData.phoneCode} ` : "";

  const formatPhone = (phone?: string | null) => {
    if (!phone) return null;
    return phone.startsWith("+") ? phone : `${dialCode}${phone}`;
  };

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

  const serializedBooking = {
    id: booking.id,
    tenantId: booking.tenantId,
    serviceId: booking.serviceId,
    staffId: booking.staffId,
    customerId: booking.customerId,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.status,
    price: booking.price ? booking.price.toString() : null,
    notes: booking.notes,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    service: booking.service ? {
      id: booking.service.id,
      tenantId: booking.service.tenantId,
      name: booking.service.name,
      durationMinutes: booking.service.durationMinutes,
      bufferTime: booking.service.bufferTime,
      price: booking.service.price.toString(),
      color: booking.service.color,
      capacity: booking.service.capacity,
      createdAt: booking.service.createdAt,
      updatedAt: booking.service.updatedAt
    } : null,
    staff: booking.staff ? {
      id: booking.staff.id,
      tenantId: booking.staff.tenantId,
      userId: booking.staff.userId,
      name: booking.staff.name,
      bio: booking.staff.bio,
      color: booking.staff.color,
      availabilityJson: booking.staff.availabilityJson,
      createdAt: booking.staff.createdAt,
      updatedAt: booking.staff.updatedAt
    } : null
  };

  // Convert UTC database times to local business timezone
  const localStart = getInTimezone(booking.startTime, timezone);
  const localEnd = getInTimezone(booking.endTime, timezone);
  const actualDuration = Math.round((booking.endTime.getTime() - booking.startTime.getTime()) / 60000);

  const formattedDate = format(localStart, "dd/MM/yyyy");
  const timeFormatPattern = timeFormatSetting === "24h" ? "HH:mm" : "hh:mm a";
  const formattedStart = format(localStart, timeFormatPattern);
  const formattedEnd = format(localEnd, timeFormatPattern);

  // Status styling configurations
  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50";
      case "COMPLETED":
        return "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/50";
      case "PENDING":
        return "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50";
      case "CANCELLED":
        return "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50";
      default:
        return "bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-950/20 dark:text-slate-400 dark:border-slate-800";
    }
  };

  const clientInitials = booking.customerName
    ? booking.customerName.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()
    : "CL";

  const staffInitials = booking.staff.name
    ? booking.staff.name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()
    : "ST";

  const currentPrice = booking.price ? Number(booking.price) : Number(booking.service.price);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      {/* Header breadcrumb */}
      <div className="flex items-center gap-2 text-sm font-medium tracking-wider">
        <Link href={`/${appointmentSlug}`} className="text-black dark:text-white">Booking Calendar</Link>
        <span className="text-slate-700 dark:text-slate-300">&gt;&gt;</span>
        <span className="text-indigo-600 dark:text-indigo-400">Booking Detail</span>
      </div>

      {/* Single Consolidated Booking Details Card */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Service Theme Color Banner */}
        <div className="h-2 w-full" style={{ backgroundColor: booking.service.color }} />
        
        <div className="p-6 md:p-8 space-y-6">
          {/* Card Header Title */}
          <div>
            <h1 className="text-2xl font-medium text-black dark:text-slate-200 tracking-tight">
              Booking Details
            </h1>
          </div>
          
          {/* Header row: Service, Progress timeline, and compact Action Buttons */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
            {/* Left: Service Details */}
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <ServiceIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-black dark:text-slate-200 tracking-tight">
                  {booking.service.name}
                </h2>
              </div>
            </div>

            {/* Center: Progress Step Indicator or Cancelled Status */}
            {booking.status === "CANCELLED" ? (
              <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/20 px-5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50">
                <span className="text-xs font-black text-rose-600 dark:text-rose-400 tracking-widest flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
                  This Booking is Cancelled
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950/20 px-5 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-medium text-black dark:text-slate-400 tracking-wider">Progress</span>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${(booking.status === "PENDING" || booking.status === "CONFIRMED") ? "bg-amber-500 text-white font-black" : "text-slate-400 dark:text-slate-500"}`}>Requested</span>
                  <span className="text-slate-400 dark:text-slate-700 text-xs">➔</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${booking.status === "COMPLETED" ? "bg-emerald-600 text-white font-black" : "text-slate-400 dark:text-slate-500"}`}>Completed</span>
                </div>
              </div>
            )}

            {/* Right: Icon-only Action Controls */}
            <div className="flex items-center gap-2">
              <StatusButtons 
                booking={serializedBooking} 
                services={serializedServices} 
                staff={serializedStaff} 
                tenant={tenant} 
                iconOnly={true}
              />
            </div>
          </div>

          {/* Grid Content: Client, Staff, Time, and Billing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 1. Client Information */}
            <div className="space-y-3 bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium text-black dark:text-slate-400 tracking-wider">Client Information</span>
              </div>
              <div className="space-y-1">
                <p className="text-base font-medium text-black dark:text-slate-300">
                  {booking.customer?.name && booking.customerName.trim().toLowerCase() !== booking.customer.name.trim().toLowerCase()
                    ? `${booking.customerName} (${booking.customer.name})`
                    : booking.customerName}
                </p>
                <p className="text-sm text-black dark:text-slate-400 truncate">{booking.customerEmail}</p>
                {booking.customer?.phone && (
                  <p className="text-sm text-black dark:text-slate-400 font-mono mt-0.5">{formatPhone(booking.customer.phone)}</p>
                )}
              </div>
            </div>

            {/* 2. Staff Information */}
            <div className="space-y-3 bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium text-black dark:text-slate-400 tracking-wider">Assigned Staff</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div 
                    className="h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ backgroundColor: booking.staff.color }}
                  >
                    {staffInitials}
                  </div>
                  <p className="text-sm font-medium text-black dark:text-slate-300">{booking.staff.name}</p>
                </div>
                {booking.staff.bio && (
                  <p className="text-sm text-black dark:text-slate-400 italic mt-1 line-clamp-1">
                    "{booking.staff.bio}"
                  </p>
                )}
              </div>
            </div>

            {/* 3. Schedule Details */}
            <div className="space-y-3 bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <CalendarIcon className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium text-black dark:text-slate-400 tracking-wider">Schedule</span>
              </div>
              <div className="space-y-1 text-sm">
                <p className="font-medium text-black dark:text-slate-300">{formattedDate}</p>
                <p className="font-medium text-black dark:text-slate-300">{formattedStart} – {formattedEnd}</p>
                <p className="text-xs font-medium text-black dark:text-slate-400 mt-1 tracking-wide">{actualDuration} Min</p>
              </div>
            </div>

            {/* 4. Billing Details */}
            <div className="space-y-3 bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <DollarSign className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium text-black dark:text-slate-400 tracking-wider">Payment</span>
              </div>
              <div className="space-y-1 text-sm font-mono">
                <div className="flex justify-between text-black dark:text-slate-400">
                  <span>Service:</span>
                  <span>{formatCurrency(Number(booking.service.price), currencySetting)}</span>
                </div>
                {booking.price && Number(booking.price) !== Number(booking.service.price) && (
                  <div className="flex justify-between text-black dark:text-slate-400">
                    <span>Adj:</span>
                    <span>{formatCurrency(Number(booking.price) - Number(booking.service.price), currencySetting)}</span>
                  </div>
                )}
                <div className="border-t border-dashed border-slate-300 dark:border-slate-700 my-1.5" />
                <div className="flex justify-between font-medium text-black dark:text-slate-300 text-base">
                  <span className="font-sans text-sm font-medium tracking-wider text-black dark:text-slate-400">Total:</span>
                  <span>{formatCurrency(currentPrice, currencySetting)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Special Request / Notes */}
          {booking.notes && (
            <div className="bg-amber-50/10 dark:bg-amber-950/10 rounded-2xl p-4 border border-amber-100 dark:border-amber-900/30">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="h-7 w-7 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 tracking-wider">Special Request / Notes</span>
              </div>
              <p className="text-sm text-slate-800 dark:text-slate-300 leading-relaxed font-semibold whitespace-pre-wrap">
                {booking.notes}
              </p>
            </div>
          )}

          {/* Internal Notes */}
          {(booking.customer?.notes || booking.customerName === "Carson Dickerson") && (
            <div className="bg-slate-50 dark:bg-slate-950/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-850">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium text-black dark:text-slate-400 tracking-wider">Internal Notes</span>
              </div>
              <p className="text-sm text-black dark:text-slate-400 leading-relaxed font-medium">
                {booking.customer?.notes || "Regular client. Prefers bookings scheduled in the late afternoon."}
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// Simple fallback X Icon component
function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
