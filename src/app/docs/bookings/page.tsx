import { Calendar, MousePointer2, Bell, CheckCircle2, Layout } from "lucide-react";
import Link from "next/link";

export default function BookingsDocs() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4">
        <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-tight">
          Calendar & <span className="text-indigo-600">Bookings</span>
        </h1>
        <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-2xl">
          The heartbeat of your business. Manage your daily schedule, track appointments, and keep your flux in motion.
        </p>
      </div>

      {/* Master View Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 font-black">
            <Layout className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">The Master Schedule</h2>
        </div>
        <p className="text-slate-600 font-medium leading-relaxed">
          The dashboard provides a unified view of all staff members. You can toggle between "Daily" and "Weekly" views to get the full picture.
        </p>
        <div className="p-8 rounded-[2rem] border border-slate-100 bg-white shadow-sm flex flex-col md:flex-row gap-8 items-center">
           <div className="h-24 w-24 bg-indigo-100 rounded-3xl flex items-center justify-center text-indigo-600 flex-shrink-0 animate-pulse">
              <Calendar className="h-10 w-10" />
           </div>
           <div className="space-y-2 text-center md:text-left">
              <h4 className="font-black text-slate-900">Drag-and-Drop Control</h4>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">Easily reschedule appointments by dragging them across the calendar. FluxBooking handles the staff and service collision logic automatically.</p>
           </div>
        </div>
      </section>

      {/* Booking Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <MousePointer2 className="h-6 w-6 text-blue-600" />
             <h3 className="text-xl font-black text-slate-900">Manual Bookings</h3>
          </div>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            Need to add a walk-in customer? Use the "New Booking" button on the dashboard to manually reserve slots for customers who aren't using your public link.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <Bell className="h-6 w-6 text-amber-600" />
             <h3 className="text-xl font-black text-slate-900">Notifications</h3>
          </div>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            Once a booking is confirmed, both the staff member and the customer receive immediate confirmation via email (and SMS if enabled).
          </p>
        </div>
      </div>

      <div className="pt-12 border-t border-slate-100 flex justify-between">
        <Link href="/docs/services" className="text-sm font-black text-slate-400 hover:text-slate-600">← Services & Pricing</Link>
        <Link href="/docs/multi-tenancy" className="text-sm font-black text-indigo-600 hover:text-indigo-700">Multi-Tenancy →</Link>
      </div>
    </div>
  );
}
