import { CreditCard, Clock, Layers, Sparkles, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function ServicesDocs() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4">
        <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-tight">
          Services & <span className="text-indigo-600">Pricing</span>
        </h1>
        <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-2xl">
          Define your offerings with precision. Control time, cost, and availability for every service you provide.
        </p>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 font-black">
              <CreditCard className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Price & Duration</h2>
          </div>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            Every service requires a clear price and a specific duration (in minutes). This ensures accurate calendar blocking.
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 font-black">
              <Clock className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Buffer Time</h2>
          </div>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            Add automatic gaps between appointments for cleanup, preparation, or travel time.
          </p>
        </section>
      </div>

      {/* Advanced Logic Section */}
      <section className="p-10 rounded-[2.5rem] bg-slate-950 text-white space-y-6">
        <div className="flex items-center gap-3 text-indigo-400">
          <Layers className="h-6 w-6" />
          <h2 className="text-2xl font-black tracking-tight">Capacity & Assignment</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h4 className="text-sm font-black uppercase tracking-widest text-slate-500">Service Assignment</h4>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">
              Link specific services to certain staff members. For example, your senior barbers might offer "Premium Cuts" while others don't.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-black uppercase tracking-widest text-slate-500">Custom Colors</h4>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">
              Assign colors to services to instantly identify them on your team's master schedule.
            </p>
          </div>
        </div>
      </section>

      <div className="pt-12 border-t border-slate-100 flex justify-between">
        <Link href="/docs/staff" className="text-sm font-black text-slate-400 hover:text-slate-600">← Staff Management</Link>
        <Link href="/docs/bookings" className="text-sm font-black text-indigo-600 hover:text-indigo-700">Calendar & Bookings →</Link>
      </div>
    </div>
  );
}
