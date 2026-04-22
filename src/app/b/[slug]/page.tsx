import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BookingForm } from "./booking-form";
import { Calendar, ShieldCheck, Star } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PublicBookingPage({
  params,
}: {
  params: { slug: string };
}) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: params.slug },
    include: {
      services: true,
      staff: true,
    },
  });

  if (!tenant) {
    notFound();
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
            staff={tenant.staff} 
          />
        </div>

        <div className="mt-12 text-center space-y-4 animate-fade-in">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Powered by FluxBooking SaaS</p>
          <div className="flex items-center justify-center gap-6">
             <Link href="#" className="text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-colors">Privacy</Link>
             <Link href="#" className="text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-colors">Terms</Link>
             <Link href="#" className="text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-colors">Support</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
