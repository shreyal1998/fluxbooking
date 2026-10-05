import { ShieldCheck, Lock, Database, Globe, CheckCircle2, Server, Key } from "lucide-react";
import Link from "next/link";

export default function MultiTenancyDocs() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
          Data Isolation & <span className="text-indigo-600 dark:text-indigo-400">Security</span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 font-normal leading-relaxed max-w-2xl">
          Learn how our architecture ensures your organization data remains secure, private, and strictly isolated at the database layer.
        </p>
      </div>

      {/* The Core Concept */}
      <section className="p-8 sm:p-10 rounded-[2.5rem] bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 shadow-sm space-y-6">
        <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
          <ShieldCheck className="h-6 w-6" />
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">The Tenant Isolation Model</h2>
        </div>
        <p className="text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
          Every organization is registered as a unique <strong>Tenant</strong> entity. All customer records, practitioner schedules, locations, and revenue logs are strictly isolated using tenant scoping:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {[
            { icon: Lock, title: "Tenant ID Scoping", desc: "Every database model (Staff, Services, Bookings, Customers, Locations) is strictly tied to a unique tenantId." },
            { icon: Database, title: "Prisma Query Isolation", desc: "Server actions and API endpoints enforce tenant ownership on every query and mutation." },
            { icon: Globe, title: "Isolated Slugs", desc: "Your public booking portal runs on its own isolated slug path at /b/[your-slug]." }
          ].map((item, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all space-y-2">
              <item.icon className="h-5 w-5 text-indigo-500" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">{item.title}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Technical Security Section */}
      <section className="space-y-6">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <Server className="h-6 w-6 text-slate-900 dark:text-white" />
          Enterprise Security Standards
        </h2>
        <div className="space-y-3">
          {[
            "Bcrypt salted hashing for all user and staff account credentials",
            "NextAuth.js session tokens with secure HTTP-only cookies",
            "Tokenized, encrypted public reschedule and cancellation URLs",
            "Role-Based Access Control (RBAC) separating Admin and Staff permissions",
            "Secure HTTPS/TLS connections with database SSL encryption"
          ].map((t) => (
            <div key={t} className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="pt-12 border-t border-slate-100 dark:border-slate-800 flex justify-between">
        <Link href="/docs/notifications" className="text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">← Email Notifications</Link>
        <Link href="/docs" className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">Back to Intro →</Link>
      </div>
    </div>
  );
}
