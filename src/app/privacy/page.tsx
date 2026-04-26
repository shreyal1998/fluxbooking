import Link from "next/link";
import { Shield, Lock, Eye, FileText, ArrowLeft, Calendar } from "lucide-react";
import { Footer } from "@/components/footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 w-full z-50 glass">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group outline-none">
            <div className="bg-indigo-600 p-1.5 rounded-lg group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/20">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">FluxBooking</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-16 lg:py-24 max-w-6xl">
        <div className="space-y-16">
          {/* Hero Section */}
          <div className="space-y-6 max-w-4xl">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 mb-10 text-xs font-black uppercase tracking-[0.2em] text-slate-600 hover:text-indigo-600 transition-all group"
            >
              <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Link>
            <h1 className="text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
              Privacy <span className="text-indigo-600">Policy</span>
            </h1>
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                Last updated: April 26, 2026
              </p>
              <p className="text-xl text-slate-500 font-normal leading-relaxed max-w-2xl">
                Your privacy and data security are the foundation of everything we build at FluxBooking. We are committed to transparency in how we handle your business information.
              </p>
            </div>
          </div>

          {/* Quick Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-10 rounded-[2.5rem] border border-indigo-100/50 bg-indigo-50/50 shadow-sm hover:bg-white hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all group relative overflow-hidden text-left">
              <div className="h-14 w-14 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-md mb-8 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <Lock className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Data Isolation</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-normal">
                Multi-tenant architecture ensures your business data is never mixed with others.
              </p>
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-indigo-100/50 rounded-full blur-2xl group-hover:bg-indigo-200/50 transition-colors"></div>
            </div>

            <div className="p-10 rounded-[2.5rem] border border-emerald-100/50 bg-emerald-50/50 shadow-sm hover:bg-white hover:border-emerald-200 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all group relative overflow-hidden text-left">
              <div className="h-14 w-14 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-md mb-8 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                <Shield className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Secure Payments</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-normal">
                All transactions are processed via Lemon Squeezy. We never store credit card details.
              </p>
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-100/50 rounded-full blur-2xl group-hover:bg-emerald-200/50 transition-colors"></div>
            </div>

            <div className="p-10 rounded-[2.5rem] border border-amber-100/50 bg-amber-50/50 shadow-sm hover:bg-white hover:border-amber-200 hover:shadow-2xl hover:shadow-amber-500/10 transition-all group relative overflow-hidden text-left">
              <div className="h-14 w-14 bg-white rounded-2xl flex items-center justify-center text-amber-600 shadow-md mb-8 group-hover:bg-amber-600 group-hover:text-white transition-all">
                <Eye className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">No Selling</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-normal">
                We never sell your data or your customers' data to third parties. Period.
              </p>
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-amber-100/50 rounded-full blur-2xl group-hover:bg-amber-200/50 transition-colors"></div>
            </div>
          </div>

          {/* Detailed Sections */}
          <div className="bg-white rounded-[3rem] p-10 lg:p-16 shadow-2xl shadow-indigo-500/5 border border-slate-100 space-y-16">
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                   <FileText className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">1. Information we collect</h2>
              </div>
              <div className="space-y-6 text-slate-500 font-normal leading-relaxed">
                <p>To provide our booking services, we collect information across three core categories:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                      <p className="font-bold text-slate-900 text-sm mb-2">Business data</p>
                      <p className="text-xs text-slate-500 font-normal">Business name, logo, services, pricing, and staff availability.</p>
                   </div>
                   <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                      <p className="font-bold text-slate-900 text-sm mb-2">Staff data</p>
                      <p className="text-xs text-slate-500 font-normal">Names, bios, and schedules of your team members.</p>
                   </div>
                   <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                      <p className="font-bold text-slate-900 text-sm mb-2">Customer data</p>
                      <p className="text-xs text-slate-500 font-normal">Names, emails, and phone numbers for appointment management.</p>
                   </div>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                   <Lock className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">2. How we use data</h2>
              </div>
              <p className="text-slate-500 font-normal leading-relaxed">
                Data is used exclusively to facilitate the booking lifecycle. This includes managing schedules, sending automated email notifications, processing payments through Lemon Squeezy, and providing analytics for business owners.
              </p>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                   <Shield className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">3. Data security & isolation</h2>
              </div>
              <p className="text-slate-500 font-normal leading-relaxed">
                Our platform uses a multi-tenant architecture with Prisma-level data isolation. Every request is scoped to a specific Tenant ID, ensuring that business records, customer lists, and staff schedules remain strictly private and accessible only to authorized users.
              </p>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-50 rounded-lg text-violet-600">
                   <Eye className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">4. Third-party services</h2>
              </div>
              <p className="text-slate-500 font-normal leading-relaxed mb-4">
                We partner with industry leaders to ensure top-tier service:
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-500 font-normal">
                <li className="p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                   <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                   <span className="text-sm">Lemon Squeezy (Payments)</span>
                </li>
                <li className="p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                   <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                   <span className="text-sm">Managed PostgreSQL</span>
                </li>
                <li className="p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                   <div className="h-2 w-2 rounded-full bg-violet-500"></div>
                   <span className="text-sm">NextAuth.js (Security)</span>
                </li>
              </ul>
            </section>

            <div className="pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
              <p className="text-sm text-slate-400 font-bold">
                Questions? <a href="mailto:support@fluxbooking.com" className="text-indigo-600 hover:underline transition-all">support@fluxbooking.com</a>
              </p>
              <Link href="/register" className="h-14 px-8 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black transition-all hover:bg-indigo-700 hover:scale-105 active:scale-95 shadow-lg shadow-indigo-100">
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
