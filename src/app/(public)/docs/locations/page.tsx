import { MapPin, Building2, Users, CreditCard, CheckCircle2, Phone, Clock } from "lucide-react";
import Link from "next/link";

export default function LocationsDocs() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
          Locations & <span className="text-indigo-600 dark:text-indigo-400">Branches</span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 font-normal leading-relaxed max-w-2xl">
          Scale your business across multiple physical studios, clinics, or regional branches under one central administrative dashboard.
        </p>
      </div>

      {/* Overview Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
            <Building2 className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Multi-Branch Architecture</h2>
        </div>
        <p className="text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
          FluxBooking allows you to create and configure distinct branches with their own street addresses, contact phone numbers, and operational hours:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all space-y-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400 w-fit">
              <MapPin className="h-4 w-4" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Physical Addresses & Directions</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
              Include specific suite numbers, street addresses, and cities. These are automatically included in customer confirmation emails and calendar invites.
            </p>
          </div>

          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all space-y-3">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400 w-fit">
              <Users className="h-4 w-4" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Staff & Practitioner Assignment</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
              Assign staff members to one or multiple locations. Practitioners will only be bookable at branches where they are actively stationed.
            </p>
          </div>
        </div>
      </section>

      {/* Customer Booking Flow with Locations */}
      <section className="p-8 sm:p-10 rounded-[2.5rem] bg-indigo-600 text-white space-y-6 relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <h3 className="text-2xl font-black tracking-tight">Location-Aware Booking Flow</h3>
          <p className="text-indigo-100 text-sm font-normal leading-relaxed max-w-xl">
            When multiple locations are enabled, clients begin their booking journey by picking their closest branch or preferred studio.
          </p>
          <ul className="space-y-3 pt-2">
            {[
              "Filters available services and treatments by branch capabilities",
              "Displays only practitioners working at that specific branch",
              "Prevents scheduling conflicts across different geographic locations"
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm font-medium text-white/95">
                <CheckCircle2 className="h-4 w-4 text-white" /> {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="pt-12 border-t border-slate-100 dark:border-slate-800 flex justify-between">
        <Link href="/docs/branding" className="text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">← Visual Branding</Link>
        <Link href="/docs/staff" className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">Staff & Practitioners →</Link>
      </div>
    </div>
  );
}
