import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Calendar, Clock, User, Scissors, ShieldCheck } from "lucide-react";
import { Footer } from "@/components/footer";
import { getSuggestedSlots } from "@/app/actions/booking";
import { ManageActions } from "./manage-actions";

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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 w-full z-50 glass">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group outline-none">
            <div className="bg-indigo-600 p-1.5 rounded-lg group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/20">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">FluxBooking</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-16 lg:py-24 max-w-2xl">
        <div className="space-y-10">
          {/* Status Header */}
          <div className="text-center space-y-4">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600">
               <ShieldCheck className="h-4 w-4" />
               <span className="text-[10px] font-black uppercase tracking-widest">Verified Booking</span>
             </div>
             <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">Manage Your <span className="text-indigo-600">Appointment</span></h1>
             <p className="text-slate-500 font-medium leading-relaxed max-w-md mx-auto">
               You can instantly reschedule to a new time or browse the full calendar for more options.
             </p>
          </div>

          {/* Current Appointment Card */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-indigo-500/5 overflow-hidden">
            <div className="p-8 lg:p-12 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Service</p>
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <Scissors className="h-4 w-4 text-indigo-500" />
                    <span>{booking.service.name}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">With Staff</p>
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <User className="h-4 w-4 text-indigo-500" />
                    <span>{booking.staff.name}</span>
                  </div>
                </div>
                <div className="md:col-span-2 space-y-1 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Currently Scheduled For</p>
                  <div className="flex items-center gap-3 text-slate-900 mt-2">
                    <Clock className="h-5 w-5 text-indigo-600" />
                    <span className="text-xl font-black">{format(new Date(booking.startTime), "PPPP 'at' p")}</span>
                  </div>
                </div>
              </div>

              {!isPast ? (
                <ManageActions 
                  bookingId={id} 
                  slug={slug} 
                  suggestions={suggestions} 
                />
              ) : (
                <div className="p-6 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                   <p className="text-sm font-bold text-amber-700">This appointment has already passed and cannot be modified.</p>
                </div>
              )}
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
              <Link href={`/b/${slug}`} className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:underline transition-all">
                 Book a new appointment with {booking.tenant.name}
              </Link>
            </div>
          </div>

          <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Powered by FluxBooking
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
