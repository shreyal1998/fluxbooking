import { Layout, Palette, Image as ImageIcon, CheckCircle2, Paintbrush, Sun, Moon } from "lucide-react";
import Link from "next/link";

export default function BrandingDocs() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
          Visual Branding & <span className="text-indigo-600 dark:text-indigo-400">Themes</span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 font-normal leading-relaxed max-w-2xl">
          Customize the aesthetic of your public booking portal and dashboard to seamlessly reflect your brand identity.
        </p>
      </div>

      {/* Primary Brand Color Section */}
      <section className="space-y-6 p-8 sm:p-10 rounded-[2.5rem] bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
          <Palette className="h-6 w-6" />
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Primary Brand Color</h2>
        </div>
        <p className="text-slate-600 dark:text-slate-300 font-normal leading-relaxed max-w-xl">
          Your primary color accent is applied to buttons, selected time slots, active dates, and highlight banners throughout your public booking portal.
        </p>
        <div className="flex flex-wrap gap-4 pt-2">
          {["#6366f1", "#0ea5e9", "#10b981", "#f43f5e", "#8b5cf6", "#f59e0b"].map((color) => (
            <div key={color} className="h-12 w-12 rounded-2xl shadow-md border-4 border-white dark:border-slate-800" style={{ backgroundColor: color }}></div>
          ))}
          <div className="h-12 w-12 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400">
            <Paintbrush className="h-5 w-5" />
          </div>
        </div>
      </section>

      {/* Dark Mode & Theme Persistence */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400">
              <Sun className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Dark & Light Mode</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
            FluxBooking includes built-in system theme detection with one-click toggling between Light Mode and Dark Mode.
          </p>
        </div>

        <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700 transition-all space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-50 dark:bg-violet-950/40 rounded-xl text-violet-600 dark:text-violet-400">
              <ImageIcon className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Logo & Favicon</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
            Upload your transparent PNG or SVG logo to replace default headers on the client booking portal and email notifications.
          </p>
        </div>
      </section>

      <div className="pt-12 border-t border-slate-100 dark:border-slate-800 flex justify-between">
        <Link href="/docs/business-profile" className="text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">← Business Profile</Link>
        <Link href="/docs/locations" className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">Locations →</Link>
      </div>
    </div>
  );
}
