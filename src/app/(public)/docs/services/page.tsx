import { CreditCard, Clock, Layers, Sparkles, CheckCircle2, MapPin, Palette } from "lucide-react";
import Link from "next/link";

export default function ServicesDocs() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
          Treatments & <span className="text-indigo-600 dark:text-indigo-400">Services</span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 font-normal leading-relaxed max-w-2xl">
          Build and organize your service catalog with precise pricing, duration in minutes, automatic buffer gaps, and practitioner assignments.
        </p>
      </div>

      {/* Core Attributes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Price & Duration</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
            Every treatment specifies a transparent base price and duration (e.g., 30m, 60m, 90m) to calculate calendar slot consumption accurately.
          </p>
        </section>

        <section className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400">
              <Clock className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Buffer Times</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
            Set automatic rest, disinfection, or travel gaps before and after appointments. FluxBooking automatically prevents back-to-back collisions.
          </p>
        </section>
      </div>

      {/* Advanced Assignment Section */}
      <section className="p-8 sm:p-10 rounded-[2.5rem] bg-slate-950 text-white space-y-6">
        <div className="flex items-center gap-3 text-indigo-400">
          <Layers className="h-6 w-6" />
          <h2 className="text-2xl font-black tracking-tight">Assignment & Organization</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Practitioner Assignment</h4>
            <p className="text-slate-400 text-xs font-normal leading-relaxed">
              Designate exactly which doctors or therapists can perform each treatment.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Location Availability</h4>
            <p className="text-slate-400 text-xs font-normal leading-relaxed">
              Restrict specific complex treatments or equipment to branches with the proper facilities.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Color Identification</h4>
            <p className="text-slate-400 text-xs font-normal leading-relaxed">
              Assign custom color badges to treatments for instant identification on the master schedule.
            </p>
          </div>
        </div>
      </section>

      <div className="pt-12 border-t border-slate-100 dark:border-slate-800 flex justify-between">
        <Link href="/docs/staff" className="text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">← Staff & Practitioners</Link>
        <Link href="/docs/bookings" className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">Calendar & Bookings →</Link>
      </div>
    </div>
  );
}
