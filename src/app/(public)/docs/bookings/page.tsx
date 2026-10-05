import { Calendar, MousePointer2, Bell, CheckCircle2, Layout, RefreshCw, AlertCircle, Eye } from "lucide-react";
import Link from "next/link";

export default function BookingsDocs() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
          Calendar & <span className="text-indigo-600 dark:text-indigo-400">Appointment Management</span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 font-normal leading-relaxed max-w-2xl">
          Master your daily schedule with a fast, multi-view calendar designed to eliminate double bookings, manage walk-ins, and track appointment statuses.
        </p>
      </div>

      {/* Multi-View Scheduling */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
            <Layout className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Flexible Multi-View Calendar</h2>
        </div>
        <p className="text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
          The dashboard provides full multi-practitioner calendar views. Easily switch between:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Day View</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Granular time slot breakdown per practitioner.</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Week View</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Full 7-day overview of appointments.</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Month View</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">High-level capacity and booking density.</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Agenda View</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Sequential list ideal for mobile and tablet checking.</p>
          </div>
        </div>
      </section>

      {/* Manual Booking Creation & Conflict Prevention */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all space-y-3">
          <div className="flex items-center gap-3">
            <MousePointer2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Manual & Walk-in Bookings</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
            Quickly add walk-in clients or phone reservations using the "New Booking" button. The modal automatically verifies practitioner availability and calculates pricing.
          </p>
        </div>

        <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all space-y-3">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Status Lifecycle</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
            Update appointment status through its full lifecycle: <span className="text-amber-600 font-semibold">Pending</span> → <span className="text-blue-600 font-semibold">Confirmed</span> → <span className="text-emerald-600 font-semibold">Completed</span> or <span className="text-rose-600 font-semibold">Cancelled</span>.
          </p>
        </div>
      </section>

      <div className="pt-12 border-t border-slate-100 dark:border-slate-800 flex justify-between">
        <Link href="/docs/services" className="text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">← Services & Pricing</Link>
        <Link href="/docs/customers" className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">Patients & Customers →</Link>
      </div>
    </div>
  );
}
