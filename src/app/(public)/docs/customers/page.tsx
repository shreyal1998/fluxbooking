import { UserCheck, History, Shield, CheckCircle2, Phone, Mail, FileText, Search } from "lucide-react";
import Link from "next/link";

export default function CustomersDocs() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
          Patients & <span className="text-indigo-600 dark:text-indigo-400">Customer Records</span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 font-normal leading-relaxed max-w-2xl">
          Maintain full customer profiles with chronological appointment histories, spend metrics, contact details, and internal notes.
        </p>
      </div>

      {/* Customer Directory Features */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
            <UserCheck className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Unified Client Database</h2>
        </div>
        <p className="text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
          Every time a client books through your portal or is entered manually, FluxBooking creates or links their dedicated profile:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all space-y-3">
            <div className="flex items-center gap-3">
              <History className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Appointment History</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
              Review every treatment, consultation, or session the client has attended, complete with timestamps and assigned practitioners.
            </p>
          </div>

          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all space-y-3">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Protected Archive & Restore</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
              Inactivate customer profiles without losing historical data. Only authenticated Administrators can restore archived client files.
            </p>
          </div>
        </div>
      </section>

      {/* Communication Shortcuts */}
      <section className="p-8 sm:p-10 rounded-[2.5rem] bg-slate-900 text-white border border-slate-800 shadow-xl space-y-6">
        <h3 className="text-2xl font-black tracking-tight">Direct Client Communication</h3>
        <p className="text-slate-400 text-sm font-normal leading-relaxed max-w-xl">
          Quickly access phone numbers and email links directly from client profile cards to confirm special requests or share post-treatment instructions.
        </p>
      </section>

      <div className="pt-12 border-t border-slate-100 dark:border-slate-800 flex justify-between">
        <Link href="/docs/bookings" className="text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">← Calendar & Bookings</Link>
        <Link href="/docs/notifications" className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">Email Notifications →</Link>
      </div>
    </div>
  );
}
