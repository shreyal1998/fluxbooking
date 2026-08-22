import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock, ShieldCheck, XCircle } from "lucide-react";
import { getSuggestedSlots } from "@/app/actions/booking";
import { ManageActions } from "./manage-actions";
import { Logo } from "@/components/logo";
import { ThemeCleaner } from "@/components/providers/theme-cleaner";
import { getLabels } from "@/lib/labels";

import { formatInTimezone } from "@/lib/timezone-utils";

interface ManageBookingPageProps {
  params: Promise<{
    slug: string;
    id: string;
  }>;
}

export default async function ManageBookingPage({ params }: ManageBookingPageProps) {
  const { slug, id } = await params;

  // 1. Fetch booking with full context
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      tenant: true,
      service: true,
      staff: true,
    },
  });

  // 2. Security Check: Must exist and match the business slug
  if (!booking || booking.tenant.slug !== slug) {
    return notFound();
  }

  // 3. Fetch suggestions for "One-Click" rescheduling
  const suggestions = await getSuggestedSlots(
    booking.tenantId,
    booking.serviceId,
    booking.staffId
  );

  const isPast = new Date(booking.startTime) < new Date();

  const labels = getLabels(booking.tenant.businessType);
  const ServiceIcon = labels.serviceIcon;
  const StaffIcon = labels.staffIcon;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300">
      <ThemeCleaner />

      <main className="flex-1 container mx-auto px-4 py-8 lg:py-12 max-w-2xl">
        <div className="space-y-6">
          {/* Status Header */}
          <div className="text-center space-y-3">
             <div className="flex justify-center">
               <Link href="/" className="outline-none">
                 <Logo size="2xl" />
               </Link>
             </div>
             {booking.status === "CANCELLED" ? (
               <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-100 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400">
                 <XCircle className="h-4.5 w-4.5" />
                 <span className="text-xs sm:text-sm font-bold tracking-wide">Cancelled {labels.appointment}</span>
               </div>
             ) : (
               <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400">
                 <ShieldCheck className="h-4.5 w-4.5" />
                 <span className="text-xs sm:text-sm font-bold tracking-wide">Verified {labels.appointment}</span>
               </div>
             )}
             <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
               {booking.status === "CANCELLED" ? (
                 <>Your <span className="text-rose-600 dark:text-rose-450">{labels.appointment}</span> is Cancelled</>
               ) : (
                 <>Manage Your <span className="text-indigo-600 dark:text-indigo-400">{labels.appointment}</span></>
               )}
             </h1>
             <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base font-medium leading-relaxed max-w-md mx-auto">
               {booking.status === "CANCELLED"
                 ? `This ${labels.appointmentLower} has been cancelled and cannot be rescheduled.`
                 : "You can instantly reschedule to a new time or browse the full calendar for more options."}
             </p>
          </div>

          {/* Current Booking Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl shadow-indigo-500/5 dark:shadow-none overflow-hidden">
            <div className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <p className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-500">
                    <ServiceIcon className="h-4 w-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                    <span>{labels.service}</span>
                  </p>
                  <div className="text-slate-900 dark:text-slate-200 text-sm sm:text-base font-bold pl-5.5">
                    <span className="break-words">{booking.service.name}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-500">
                    <StaffIcon className="h-4 w-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                    <span>With {labels.staff}</span>
                  </p>
                  <div className="text-slate-900 dark:text-slate-200 text-sm sm:text-base font-bold pl-5.5">
                    <span className="break-words">{booking.staff.name}</span>
                  </div>
                </div>
                <div className="sm:col-span-2 space-y-1.5 p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800/50">
                  <p className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-500">
                    <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>Currently scheduled for</span>
                  </p>
                  <div className="text-slate-900 dark:text-slate-200 mt-1 pl-5.5">
                    <span className="text-sm sm:text-base font-bold break-words">{formatInTimezone(new Date(booking.startTime), booking.tenant.timezone || "UTC", "EEEE, MMMM do 'at' h:mm a")}</span>
                  </div>
                </div>
                {booking.notes && (
                  <div className="sm:col-span-2 space-y-1.5 p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800/50">
                    <p className="text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-500">Special Request / Notes</p>
                    <p className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">{booking.notes}</p>
                  </div>
                )}
              </div>

              {booking.status === "CANCELLED" ? (
                <ManageActions 
                  bookingId={id} 
                  slug={slug} 
                  suggestions={suggestions} 
                  timeFormat={booking.tenant.timeFormat}
                  businessType={booking.tenant.businessType}
                  initialStatus="cancelled"
                />
              ) : !isPast ? (
                <ManageActions 
                  bookingId={id} 
                  slug={slug} 
                  suggestions={suggestions} 
                  timeFormat={booking.tenant.timeFormat}
                  businessType={booking.tenant.businessType}
                  initialStatus="idle"
                />
              ) : (
                <div className="p-6 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                   <p className="text-sm font-bold text-amber-700">This booking has already passed and cannot be modified.</p>
                </div>
              )}
            </div>
            
            {booking.status === "CANCELLED" && (
              <div className="p-6 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 text-center">
                <Link href={`/b/${slug}`} className="text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline transition-all">
                   Book a new {labels.serviceLower} with {booking.tenant.name}
                </Link>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-slate-400 font-medium tracking-wide">
            Powered by FluxBooking
          </p>
        </div>
      </main>
    </div>
  );
}
