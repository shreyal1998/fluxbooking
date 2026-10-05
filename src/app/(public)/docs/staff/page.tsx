import { Users, Clock, Calendar as CalendarIcon, ShieldCheck, CheckCircle2, AlertTriangle, Coffee, Sparkles } from "lucide-react";
import Link from "next/link";

export default function StaffManagementDocs() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
          Practitioners & <span className="text-indigo-600 dark:text-indigo-400">Staff Management</span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 font-normal leading-relaxed max-w-2xl">
          Empower your team with individual staff portals, custom calendar color tags, weekly working schedules, and time-off request management.
        </p>
      </div>

      {/* Tiered Practitioner Limits & Plan Enforcement */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
            <Users className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Tiered Practitioner Capacity</h2>
        </div>
        <p className="text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
          FluxBooking scales with your team size according to your subscription tier:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Free Plan</span>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white">1 Practitioner</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Solo practitioners, independent stylists, and freelancers.</p>
          </div>

          <div className="p-6 rounded-3xl border-2 border-indigo-600 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/30 shadow-sm space-y-2">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Starter Plan</span>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white">Up to 5 Practitioners</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Growing clinics, boutique studios, and multi-chair salons.</p>
          </div>

          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Pro Plan</span>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white">Unlimited</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Large medical centers, fitness franchises, and multi-branch networks.</p>
          </div>
        </div>

        <div className="p-5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl flex gap-3 text-sm text-amber-800 dark:text-amber-300 font-medium">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <span><strong>Graceful Downgrade Protection:</strong> If your plan changes or trial expires, existing practitioner profiles are safely retained. Excess staff profiles are locked from taking new bookings, and Administrators can easily designate which practitioner remains active.</span>
        </div>
      </section>

      {/* Staff Portal & Role-Based Access */}
      <section className="space-y-6">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          Dedicated Staff Portal & Roles
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all space-y-3">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Administrator Role</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
              Full access to organization billing, business profile settings, practitioner capacity, location management, and service pricing.
            </p>
          </div>
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all space-y-3">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Staff Member Role</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
              Access to personal "My Schedule" calendar, assigned client bookings, weekly availability configuration, and leave requests.
            </p>
          </div>
        </div>
      </section>

      {/* Leave & Time-Off Management */}
      <section className="p-8 sm:p-10 rounded-[2.5rem] bg-indigo-600 text-white space-y-6">
        <div className="space-y-4">
          <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
            <Coffee className="h-6 w-6" />
            Leave & Time-Off Workflows
          </h3>
          <p className="text-indigo-100 text-sm font-normal leading-relaxed max-w-xl">
            Staff members can submit sick leave or vacation requests directly through their portal. Once an Administrator approves the request, the calendar automatically blocks those time slots from public booking.
          </p>
          <ul className="space-y-2.5 pt-2">
            {[
              "Automated slot blocking upon leave approval",
              "Admin leave request review and approval dashboard",
              "Emergency active-block tools for instant slot closure"
            ].map(item => (
              <li key={item} className="flex items-center gap-2 text-sm font-medium text-white/90">
                <CheckCircle2 className="h-4 w-4 text-white" /> {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="pt-12 border-t border-slate-100 dark:border-slate-800 flex justify-between">
        <Link href="/docs/locations" className="text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">← Locations</Link>
        <Link href="/docs/services" className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">Services & Pricing →</Link>
      </div>
    </div>
  );
}
