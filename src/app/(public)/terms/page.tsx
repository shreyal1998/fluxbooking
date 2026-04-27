import Link from "next/link";
import { Shield, Lock, ArrowLeft, Zap, Clock, UserCheck } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="py-16 lg:py-24 max-w-7xl mx-auto px-6 md:px-12">
      <div className="space-y-16">
        {/* Hero Section */}
        <div className="space-y-6 max-w-4xl">
          <h1 className="text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
            Terms of <span className="text-indigo-600">Service</span>
          </h1>
          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Last updated: April 26, 2026
            </p>
            <p className="text-xl text-slate-500 font-normal leading-relaxed max-w-2xl">
              FluxBooking is a multi-tenant scheduling platform. These terms govern your relationship with our platform as a Business Owner (Tenant) or Staff Member.
            </p>
          </div>
        </div>

        {/* Quick Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-10 rounded-[2.5rem] border border-indigo-100/50 bg-indigo-50/50 shadow-sm hover:bg-white hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all group relative overflow-hidden text-left">
            <div className="h-14 w-14 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-md mb-8 group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <Zap className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Trial Access</h3>
            <p className="text-slate-500 text-sm leading-relaxed font-normal">
              New businesses receive a limited-time trial. Features may be restricted upon trial expiration unless a plan is active.
            </p>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-indigo-100/50 rounded-full blur-2xl group-hover:bg-indigo-200/50 transition-colors"></div>
          </div>

          <div className="p-10 rounded-[2.5rem] border border-emerald-100/50 bg-emerald-50/50 shadow-sm hover:bg-white hover:border-emerald-200 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all group relative overflow-hidden text-left">
            <div className="h-14 w-14 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-md mb-8 group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <Clock className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Booking Integrity</h3>
            <p className="text-slate-500 text-sm leading-relaxed font-normal">
              Businesses are responsible for fulfilling appointments booked through their unique public links.
            </p>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-100/50 rounded-full blur-2xl group-hover:bg-emerald-200/50 transition-colors"></div>
          </div>

          <div className="p-10 rounded-[2.5rem] border border-amber-100/50 bg-amber-50/50 shadow-sm hover:bg-white hover:border-amber-200 hover:shadow-2xl hover:shadow-amber-500/10 transition-all group relative overflow-hidden text-left">
            <div className="h-14 w-14 bg-white rounded-2xl flex items-center justify-center text-amber-600 shadow-md mb-8 group-hover:bg-amber-600 group-hover:text-white transition-all">
              <Shield className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Data Scoping</h3>
            <p className="text-slate-500 text-sm leading-relaxed font-normal">
              Your data is strictly isolated using our tenant-based architecture to ensure complete privacy.
            </p>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-amber-100/50 rounded-full blur-2xl group-hover:bg-amber-200/50 transition-colors"></div>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="bg-white rounded-[3rem] p-10 lg:p-16 shadow-2xl shadow-indigo-500/5 border border-slate-100 space-y-16">
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                 <UserCheck className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">1. Tenant & Staff Accounts</h2>
            </div>
            <p className="text-slate-500 font-normal leading-relaxed">
              When you create a Business (Tenant) on FluxBooking, you are responsible for managing your staff members and their access levels. You must ensure that all business information, including your custom slug and logo, does not violate any third-party rights.
            </p>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                 <Clock className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">2. The Scheduling Platform</h2>
            </div>
            <div className="space-y-6 text-slate-500 font-normal leading-relaxed">
              <p>FluxBooking provides the software to facilitate scheduling. However:</p>
              <ul className="list-disc pl-5 space-y-2">
                 <li>The Business is solely responsible for fulfilling appointments.</li>
                 <li>The Business is responsible for setting correct availability and service pricing.</li>
                 <li>FluxBooking is not liable for missed appointments or customer disputes.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                 <Zap className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">3. Subscriptions & Trials</h2>
            </div>
            <p className="text-slate-500 font-normal leading-relaxed">
              Access to premium features, including advanced staff management and custom branding, requires an active subscription via **Lemon Squeezy**. If a trial period expires without an active plan, we reserve the right to pause your public booking link until a subscription is started.
            </p>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                 <Shield className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">4. Data Isolation</h2>
            </div>
            <p className="text-slate-500 font-normal leading-relaxed">
              Every Tenant on our platform operates in an isolated data environment. We employ strict `tenantId` scoping at the database level to ensure your customer lists, staff records, and appointments are never accessible to other businesses on the platform.
            </p>
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
    </div>
  );
}
