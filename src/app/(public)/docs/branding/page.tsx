import { Layout, Palette, Image as ImageIcon, CheckCircle2, Paintbrush } from "lucide-react";
import Link from "next/link";

export default function BrandingDocs() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4">
        <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-tight">
          Visual <span className="text-indigo-600">Branding</span>
        </h1>
        <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-2xl">
          Customize the look and feel of your booking page to match your brand identity.
        </p>
      </div>

      {/* Primary Color Section */}
      <section className="space-y-6 p-10 rounded-[2.5rem] bg-slate-50 border border-slate-100">
        <div className="flex items-center gap-3 text-indigo-600">
          <Palette className="h-6 w-6" />
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Primary Color</h2>
        </div>
        <p className="text-slate-600 font-medium leading-relaxed max-w-xl">
          Your primary color is applied to buttons, selection states, and highlights throughout your customer-facing booking page.
        </p>
        <div className="flex gap-4">
          {["#6366f1", "#0ea5e9", "#10b981", "#f43f5e"].map((color) => (
            <div key={color} className="h-12 w-12 rounded-2xl shadow-lg border-4 border-white" style={{ backgroundColor: color }}></div>
          ))}
          <div className="h-12 w-12 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-300">
            <Paintbrush className="h-5 w-5" />
          </div>
        </div>
      </section>

      {/* Logo & Icons */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <ImageIcon className="h-6 w-6 text-violet-600" />
             <h3 className="text-xl font-black text-slate-900">Logo Upload</h3>
          </div>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            Upload a transparent PNG or SVG. We recommend a square or wide aspect ratio for the best header fit.
          </p>
          <ul className="space-y-2">
            {["Max size: 2MB", "Recommended: 512x512px"].map(t => (
              <li key={t} className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" /> {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <Layout className="h-6 w-6 text-blue-600" />
             <h3 className="text-xl font-black text-slate-900">Layout Options</h3>
          </div>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            Choose between a modern "Glass" layout or a clean "Minimal" grid for your public booking page.
          </p>
        </div>
      </section>

      <div className="pt-12 border-t border-slate-100 flex justify-between">
        <Link href="/docs/business-profile" className="text-sm font-black text-slate-400 hover:text-slate-600">← Business Profile</Link>
        <Link href="/docs/staff" className="text-sm font-black text-indigo-600 hover:text-indigo-700">Staff Management →</Link>
      </div>
    </div>
  );
}
