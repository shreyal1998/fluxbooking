import { ShieldCheck, Lock, Database, Globe, CheckCircle2, Server } from "lucide-react";
import Link from "next/link";

export default function MultiTenancyDocs() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4">
        <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-tight">
          Data <span className="text-indigo-600">Isolation</span>
        </h1>
        <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-2xl">
          Learn how our multi-tenant architecture ensures your business data remains secure, private, and completely isolated.
        </p>
      </div>

      {/* The Core Concept */}
      <section className="p-10 rounded-[2.5rem] bg-indigo-50 border border-indigo-100 space-y-6">
        <div className="flex items-center gap-3 text-indigo-600">
          <ShieldCheck className="h-6 w-6" />
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">What is Multi-Tenancy?</h2>
        </div>
        <p className="text-slate-600 font-medium leading-relaxed">
          FluxBooking is a multi-tenant platform, meaning that while multiple businesses share the same application infrastructure, their data is strictly separated at the database level. Each business is a "Tenant."
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
           {[
             { icon: Lock, title: "Private Data", desc: "No staff or admin from another business can ever see your bookings." },
             { icon: Database, title: "ID Scoping", desc: "Every database query is strictly scoped to your unique Tenant ID." },
             { icon: Globe, title: "Custom URLs", desc: "Your business lives on its own isolated path at /b/your-slug." }
           ].map((item, i) => (
             <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100/50 space-y-2">
                <item.icon className="h-5 w-5 text-indigo-500" />
                <h4 className="font-black text-sm text-slate-900">{item.title}</h4>
                <p className="text-[11px] text-slate-500 font-bold leading-relaxed">{item.desc}</p>
             </div>
           ))}
        </div>
      </section>

      {/* Technical Security Section */}
      <section className="space-y-6">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <Server className="h-6 w-6 text-slate-900" />
          Security Measures
        </h2>
        <div className="space-y-4">
          {[
            "Industry-standard JWT encryption for all user sessions",
            "Bcrypt hashing for all passwords (we never store plain text)",
            "Secure database connections via SSL/TLS",
            "Strict CORS policies to prevent unauthorized access"
          ].map((t) => (
            <div key={t} className="flex items-center gap-3 p-4 rounded-2xl border border-slate-50 bg-slate-50/50">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-bold text-slate-700">{t}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="p-10 rounded-[2.5rem] bg-slate-950 text-white flex flex-col items-center text-center space-y-6">
        <div className="h-16 w-16 bg-white/10 rounded-3xl flex items-center justify-center">
          <Lock className="h-8 w-8 text-indigo-400" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-black tracking-tight">Your data is safe with us</h3>
          <p className="text-slate-500 text-sm max-w-sm font-medium leading-relaxed">
            We use enterprise-grade architecture to ensure that your business flux never crosses paths with anyone else.
          </p>
        </div>
      </div>

      <div className="pt-12 border-t border-slate-100 flex justify-between">
        <Link href="/docs/bookings" className="text-sm font-black text-slate-400 hover:text-slate-600">← Calendar & Bookings</Link>
        <Link href="/docs" className="text-sm font-black text-indigo-600 hover:text-indigo-700">Back to Intro →</Link>
      </div>
    </div>
  );
}
