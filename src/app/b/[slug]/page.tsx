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
    const [hStr, mStr] = timeStr.split(":");
    const h = parseInt(hStr, 10);
    if (isNaN(h)) return timeStr;
    if (timeFormat === "24h") return timeStr;
    const period = h < 12 ? "AM" : "PM";
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayHour}:${mStr} ${period}`;
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
        include: {
          services: true
        }
      },
    },
  });

  if (!tenant) {
    notFound();
  }

  // Check for trial expiration
  const now = new Date();
  const isTrialExpired = 
    tenant.planStatus === "TRIALING" && 
    tenant.trialEndsAt && 
    tenant.trialEndsAt < now;
  
  const isPastDue = tenant.planStatus === "PAST_DUE";

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

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8 selection:bg-indigo-100 relative overflow-hidden">
      <ThemeCleaner />
      {/* Background Decorative Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-200/20 rounded-full blur-[120px]"></div>

      <div className="max-w-3xl mx-auto relative z-10">
        <div className="flex flex-col items-center mb-16 animate-fade-in">
          <div className="h-20 w-20 bg-white rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/10 border border-slate-100 transform hover:rotate-6 transition-transform">
            <Calendar className="h-10 w-10 text-indigo-600" />
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">{tenant.name}</h1>
            {(() => {
              const formattedHours = formatBusinessHours(tenant.businessHoursJson, tenant.timeFormat || "12h");
              return (
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1 text-amber-500 font-bold text-sm bg-amber-50 px-2 py-0.5 rounded-full">
                    <Star className="h-3.5 w-3.5 fill-current" /> 4.9
                  </div>
                  
                  {formattedHours.length > 0 && (
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-bold text-xs bg-slate-100/80 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200/50 dark:border-slate-700 relative group cursor-pointer select-none">
                      <Clock className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Venue Hours</span>
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full pb-3 hidden group-hover:block z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <div className="w-52 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl p-5 text-left">
                          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-3">Venue Hours</p>
                          <div className="space-y-2">
                            {formattedHours.map((fh, idx) => {
                              const [day, hoursText] = fh.split(": ");
                              return (
                                <div key={idx} className="flex justify-between text-[11px] font-bold">
                                  <span className="text-slate-400">{day}</span>
                                  <span className="text-slate-700 dark:text-slate-200">{hoursText}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-slate-400 font-semibold text-sm">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" /> Secure Booking
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden animate-fade-in-up">
          <BookingForm 
            tenantId={tenant.id} 
            services={tenant.services.map(s => ({ ...s, price: s.price.toString() }))} 
            staff={tenant.staff.map(s => ({
              ...s,
              services: s.services?.map(srv => ({
                ...srv,
                price: srv.price.toString()
              }))
            }))} 
            primaryColor={tenant.primaryColor}
            businessType={tenant.businessType}
            timezone={tenant.timezone}
            currency={currency}
            timeFormat={tenant.timeFormat}
          />
        </div>

        <div className="mt-12 text-center space-y-4 animate-fade-in">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Powered by FluxBooking SaaS</p>
          <div className="flex items-center justify-center gap-6">
             <Link href="/privacy" className="text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-colors">Privacy</Link>
             <Link href="/terms" className="text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-colors">Terms</Link>
             <Link href="/help" className="text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-colors">Support</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
