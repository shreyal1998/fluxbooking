import { Settings, Globe, DollarSign, Link2, Info } from "lucide-react";
import Link from "next/link";

export default function BusinessProfileDocs() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4">
        <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-tight">
          Business <span className="text-indigo-600">Profile</span>
        </h1>
        <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-2xl">
          Learn how to configure your fundamental business settings to create a seamless booking experience.
        </p>
      </div>

      {/* Section: Business Slug */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
            <Link2 className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Your Business URL (Slug)</h2>
        </div>
        <p className="text-slate-600 font-medium leading-relaxed">
          The slug is your unique identifier in the FluxBooking ecosystem. It determines your public booking page URL.
        </p>
        <div className="p-6 bg-slate-950 rounded-2xl font-mono text-sm text-indigo-300 border border-slate-800 shadow-xl">
          fluxbooking.com/b/<span className="text-white">your-business-name</span>
        </div>
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3 italic text-sm text-amber-700 font-medium">
          <Info className="h-5 w-5 flex-shrink-0" />
          Note: Slugs must be unique across the platform. Once set, they can only be changed by contacting support.
        </div>
      </section>

      {/* Section: Country & Currency */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Globe className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Localization</h3>
          </div>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            Set your country to automatically handle phone number formatting and time zone defaults.
          </p>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <DollarSign className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Currency</h3>
          </div>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            Choose your base currency. This will be used for all service pricing and customer invoices.
          </p>
        </div>
      </section>

      <div className="pt-12 border-t border-slate-100 flex justify-between">
        <Link href="/docs/quick-start" className="text-sm font-black text-slate-400 hover:text-slate-600">← Quick Start</Link>
        <Link href="/docs/branding" className="text-sm font-black text-indigo-600 hover:text-indigo-700 font-black">Branding →</Link>
      </div>
    </div>
  );
}
