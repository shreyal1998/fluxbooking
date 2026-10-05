import { Settings, Globe, DollarSign, Link2, Info, Sliders, Clock } from "lucide-react";
import Link from "next/link";

export default function BusinessProfileDocs() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
          Business Profile & <span className="text-indigo-600 dark:text-indigo-400">Terminology</span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 font-normal leading-relaxed max-w-2xl">
          Learn how to set up your organization profile, choose your business type for adaptive terminology, and configure global localization settings.
        </p>
      </div>

      {/* Section: Business Types & Adaptive Terminology */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
            <Sliders className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Business Types & Adaptive Labels</h2>
        </div>
        <p className="text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
          FluxBooking is built around a dynamic labeling engine. When you choose your business type in Settings, the entire workspace updates immediately:
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Healthcare & Medical</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Uses <strong>Patients</strong>, <strong>Practitioners / Doctors</strong>, <strong>Treatments</strong>, and <strong>Clinic Hours</strong>.</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Salons & Spas</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Uses <strong>Clients</strong>, <strong>Stylists / Specialists</strong>, <strong>Services</strong>, and <strong>Salon Hours</strong>.</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Fitness & Wellness</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Uses <strong>Members</strong>, <strong>Trainers / Coaches</strong>, <strong>Classes / Sessions</strong>, and <strong>Gym Hours</strong>.</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Consulting & Professional</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Uses <strong>Clients</strong>, <strong>Advisors / Consultants</strong>, <strong>Consultations</strong>, and <strong>Office Hours</strong>.</p>
          </div>
        </div>
      </section>

      {/* Section: Business Slug */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
            <Link2 className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Your Unique Booking URL (Slug)</h2>
        </div>
        <p className="text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
          The slug is your public business identifier. Share this link on your website, social media, or email signatures for client self-service booking:
        </p>
        <div className="p-6 bg-slate-950 rounded-3xl font-mono text-sm text-indigo-300 border border-slate-800 shadow-xl">
          fluxbooking.com/b/<span className="text-white">your-practice-name</span>
        </div>
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl flex gap-3 text-sm text-amber-800 dark:text-amber-300 font-medium">
          <Info className="h-5 w-5 shrink-0 mt-0.5" />
          Slugs must be unique across the platform. Ensure you choose your permanent brand name during initial setup.
        </div>
      </section>

      {/* Section: Country, Time Format & Currency */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all space-y-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400 w-fit">
            <Globe className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Localization & Country</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
            Automatically formats client phone number inputs and defaults to your country's time zone.
          </p>
        </div>

        <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all space-y-3">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400 w-fit">
            <DollarSign className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Currency Formatting</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
            Choose your base currency (USD, EUR, GBP, AUD, CAD, INR, etc.) for all treatment prices and revenue metrics.
          </p>
        </div>

        <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700 transition-all space-y-3">
          <div className="p-2.5 bg-violet-50 dark:bg-violet-950/40 rounded-xl text-violet-600 dark:text-violet-400 w-fit">
            <Clock className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Time Display (12h/24h)</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
            Switch between 12-hour AM/PM format and 24-hour military format across the entire calendar and public booking portal.
          </p>
        </div>
      </section>

      <div className="pt-12 border-t border-slate-100 dark:border-slate-800 flex justify-between">
        <Link href="/docs/quick-start" className="text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">← Quick Start</Link>
        <Link href="/docs/branding" className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">Visual Branding →</Link>
      </div>
    </div>
  );
}
