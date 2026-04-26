import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BookingForm } from "./booking-form";
import { Calendar, ShieldCheck, Star } from "lucide-react";

export const dynamic = "force-dynamic";
export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
...
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
          <div className="mt-8 pt-8 border-t border-slate-50">
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Service by FluxBooking</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8 selection:bg-indigo-100 relative overflow-hidden">
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
            <div className="flex items-center justify-center gap-4">
               <div className="flex items-center gap-1 text-amber-500 font-bold text-sm bg-amber-50 px-2 py-0.5 rounded-full">
                 <Star className="h-3.5 w-3.5 fill-current" /> 4.9
               </div>
               <div className="flex items-center gap-1 text-slate-400 font-semibold text-sm">
                 <ShieldCheck className="h-4 w-4 text-emerald-500" /> Secure Booking
               </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden animate-fade-in-up">
          <BookingForm 
            tenantId={tenant.id} 
            services={tenant.services.map(s => ({ ...s, price: s.price.toString() }))} 
            staff={tenant.staff as any} 
            primaryColor={tenant.primaryColor}
          />
        </div>

        <div className="mt-12 text-center space-y-4 animate-fade-in">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Powered by FluxBooking SaaS</p>
          <div className="flex items-center justify-center gap-6">
             <Link href="/privacy" className="text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-colors">Privacy</Link>             <Link href="#" className="text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-colors">Terms</Link>
             <Link href="#" className="text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-colors">Support</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
