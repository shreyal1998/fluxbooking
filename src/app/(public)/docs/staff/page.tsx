import { Users, Clock, Calendar as CalendarIcon, ShieldCheck, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function StaffManagementDocs() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4">
        <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-tight">
          Staff <span className="text-indigo-600">Management</span>
        </h1>
        <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-2xl">
          Build and manage your professional team. Each staff member gets their own customized schedule and booking link.
        </p>
      </div>

      {/* Staff Profiles Section */}
      <section className="space-y-6">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <Users className="h-6 w-6 text-indigo-600" />
          Staff Profiles
        </h2>
        <p className="text-slate-600 font-medium leading-relaxed">
          Create profiles for your team members including their name, bio, and a unique display color for the dashboard calendar.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="p-6 rounded-3xl border border-slate-100 bg-slate-50/50 space-y-3">
              <h4 className="font-black text-sm text-slate-900 uppercase tracking-wider">Bio & Details</h4>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">Help customers choose the right professional by adding short bios to staff profiles.</p>
           </div>
           <div className="p-6 rounded-3xl border border-slate-100 bg-slate-50/50 space-y-3">
              <h4 className="font-black text-sm text-slate-900 uppercase tracking-wider">Role Permissions</h4>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">Grant ADMIN or STAFF access to control who can edit business-wide settings.</p>
           </div>
        </div>
      </section>

      {/* Availability Section */}
      <section className="space-y-6 p-10 rounded-[2.5rem] bg-indigo-600 text-white relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
            <Clock className="h-6 w-6" />
            Dynamic Availability
          </h2>
          <p className="text-indigo-100 font-medium leading-relaxed max-w-xl">
            Our intelligent scheduler prevents overlaps. Staff can set their own working hours for every day of the week.
          </p>
          <ul className="space-y-3">
            {["Set different hours for each day", "Add break times and lunches", "Block specific dates for vacation"].map(t => (
              <li key={t} className="flex items-center gap-2 text-sm font-bold text-white/90">
                <CheckCircle2 className="h-4 w-4 text-white" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="absolute top-0 right-0 h-full w-1/3 bg-white/5 skew-x-12"></div>
      </section>

      <div className="pt-12 border-t border-slate-100 flex justify-between">
        <Link href="/docs/branding" className="text-sm font-black text-slate-400 hover:text-slate-600">← Branding</Link>
        <Link href="/docs/services" className="text-sm font-black text-indigo-600 hover:text-indigo-700">Services & Pricing →</Link>
      </div>
    </div>
  );
}
