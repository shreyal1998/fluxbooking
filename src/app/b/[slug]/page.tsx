import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BookingForm } from "./booking-form";
import { Calendar, ShieldCheck, Star, Clock } from "lucide-react";
import { ThemeCleaner } from "@/components/providers/theme-cleaner";
import { COUNTRIES } from "@/config/countries";

function formatBusinessHours(hoursJson: any, timeFormat: string = "12h") {
  if (!hoursJson) return [];
  let hours: any = hoursJson;
  if (typeof hours === "string") {
    try { hours = JSON.parse(hours); } catch { return []; }
  }
  if (!hours || typeof hours !== "object" || Array.isArray(hours)) return [];

  const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  
  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    if (timeStr === "24:00" || timeStr === "24:00:00") {
      return timeFormat === "24h" ? "00:00" : "12:00 AM";
    }
    const [hStr, mStr] = timeStr.split(":");
    const h = parseInt(hStr, 10);
    if (isNaN(h)) return timeStr;
    if (timeFormat === "24h") return timeStr;
    const displayHour = h === 0 || h === 24 ? 12 : h > 12 ? h - 12 : h;
    const displayHourStr = displayHour.toString().padStart(2, "0");
    const period = h >= 12 && h < 24 ? "PM" : "AM";
    return `${displayHourStr}:${mStr} ${period}`;
  };

  const dayLabels = {
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun"
  };

  const formattedDays: string[] = [];
  
  DAYS.forEach(day => {
    const val = hours[day] || hours[day.charAt(0).toUpperCase() + day.slice(1)];
    const shifts = Array.isArray(val) ? val : (val ? [val] : []);
    if (shifts.length === 0) {
      formattedDays.push(`${dayLabels[day as keyof typeof dayLabels]}: Closed`);
    } else {
      const shiftStrings = shifts.map((s: any) => {
        if (!s.start || !s.end) return "Closed";
        return `${formatTime(s.start)} - ${formatTime(s.end)}`;
      });
      formattedDays.push(`${dayLabels[day as keyof typeof dayLabels]}: ${shiftStrings.join(", ")}`);
    }
  });

  return formattedDays;
}

export const dynamic = "force-dynamic";

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: {
      services: {
        orderBy: { name: "asc" }
      },
      staff: {
        orderBy: { createdAt: "asc" },
        include: {
          services: true,
          locations: true
        }
      },
      locations: {
        orderBy: [{ isPrimary: "desc" }, { name: "asc" }]
      }
    },
  });

  if (!tenant) {
    notFound();
  }

  // Check for trial expiration
  const now = new Date();
  const isTrialExpired = 
    tenant.plan !== "FREE" &&
    tenant.planStatus === "TRIALING" && 
    tenant.trialEndsAt && 
    tenant.trialEndsAt < now;
  
  const isPastDue = tenant.planStatus === "PAST_DUE";

  const limits = { FREE: 1, STARTER: 5, PRO: 1000000 };
  let currentLimit = limits[tenant.plan as keyof typeof limits] || 1;
  const isTrialActive = tenant.planStatus === "TRIALING" && tenant.trialEndsAt && new Date(tenant.trialEndsAt) > now;
  if (isTrialActive && currentLimit < 5) {
    currentLimit = 5;
  }
  const activeStaff = tenant.staff.slice(0, currentLimit);

  if (isTrialExpired || isPastDue) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-12 rounded-[2.5rem] shadow-xl border border-slate-100 max-w-md w-full">
          <div className="h-20 w-20 bg-amber-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
            <Calendar className="h-10 w-10 text-amber-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-4">Temporarily Offline</h2>
          <p className="text-slate-500 font-medium leading-relaxed">
            {tenant.name} is currently updating their booking system. Please check back later or contact them directly.
          </p>
          <div className="mt-8 pt-8 border-t border-slate-100">
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Service by FluxBooking</p>
          </div>
        </div>
      </div>
    );
  }

  // Smart currency fallback
  let currency = tenant.currency || "USD";
  if (currency === "USD" && tenant.country && tenant.country !== "US") {
    const countryData = COUNTRIES.find((c) => c.code === tenant.country);
    if (countryData) currency = countryData.currency;
  }

  const isPro = tenant.plan === "PRO";
  const activeLocations = isPro 
    ? tenant.locations 
    : (tenant.locations.filter(l => l.isPrimary).length > 0 
        ? tenant.locations.filter(l => l.isPrimary).slice(0, 1) 
        : tenant.locations.slice(0, 1));

  return (
    <div 
      data-brand-color={tenant.primaryColor || "#6366f1"}
      className="min-h-screen bg-[#F8FAFC] py-6 md:py-8 px-4 sm:px-6 lg:px-8 selection:bg-indigo-100 relative overflow-hidden"
    >
      <ThemeCleaner />
      {/* Background Decorative Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-200/20 rounded-full blur-[120px]"></div>

      <div className="max-w-3xl mx-auto relative z-10">
        <div className="flex flex-col items-center mb-5 md:mb-6 animate-fade-in">
          <div 
            className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center mb-2.5 shadow-md border border-slate-100"
            style={{ color: tenant.primaryColor || "#6366f1" }}
          >
            <Calendar className="h-6 w-6" />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{tenant.name}</h1>
            {(() => {
              const formattedHours = formatBusinessHours(tenant.businessHoursJson, tenant.timeFormat || "12h");
              return (
                <div className="flex items-center justify-center gap-3 flex-wrap text-xs">
                  <div className="flex items-center gap-1 text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                    <Star className="h-3 w-3 fill-current" /> 4.9
                  </div>
                  <div className="flex items-center gap-1 text-slate-500 font-medium">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Secure Booking
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden animate-fade-in-up flex flex-col">
          <BookingForm 
            tenantId={tenant.id} 
            tenantName={tenant.name}
            logoUrl={tenant.logoUrl}
            services={tenant.services.map(s => ({ ...s, price: s.price.toString() }))} 
            locations={activeLocations.map(l => ({
              id: l.id,
              name: l.name,
              address: l.address,
              phone: l.phone,
              isPrimary: l.isPrimary
            }))}
            staff={activeStaff.map(s => ({
              ...s,
              services: s.services?.map(srv => ({
                ...srv,
                price: srv.price.toString()
              })),
              locations: s.locations?.map(l => ({
                id: l.id,
                name: l.name,
                address: l.address,
                phone: l.phone,
                isPrimary: l.isPrimary
              }))
            }))} 
            primaryColor={tenant.primaryColor}
            businessType={tenant.businessType}
            timezone={tenant.timezone}
            currency={currency}
            timeFormat={tenant.timeFormat}
            weekStart={tenant.weekStart || "sunday"}
            country={tenant.country}
          />

          {/* Always Visible Bottom Booking Footer */}
          <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-900">
            {tenant.plan === "FREE" ? (
              <p className="text-[12px] font-normal text-slate-900">
                Powered by{" "}
                <a 
                  href={process.env.NEXT_PUBLIC_APP_URL || "/"} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold no-underline"
                  style={{ color: tenant.primaryColor || "#6366f1" }}
                >
                  FluxBooking
                </a>
              </p>
            ) : (
              <p className="text-[12px] font-medium text-slate-700">
                {tenant.name}
              </p>
            )}
            <div className="flex items-center gap-4 text-[12px] font-normal text-slate-900">
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-slate-900 no-underline">Privacy</a>
              <span className="h-1 w-1 rounded-full bg-slate-400" />
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-slate-900 no-underline">Terms</a>
              <span className="h-1 w-1 rounded-full bg-slate-400" />
              <a href="/help" target="_blank" rel="noopener noreferrer" className="text-slate-900 no-underline">Support</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
