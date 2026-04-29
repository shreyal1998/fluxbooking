import { ArrowRight, CheckCircle2, Zap, Shield, Users } from "lucide-react";
import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Header */}
      <div className="space-y-4">
        <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-tight">
          Welcome to <span className="text-indigo-600">FluxBooking</span>
        </h1>
        <p className="text-xl text-slate-500 font-normal leading-relaxed max-w-2xl">
          Learn how to master the booking platform built for high-performance businesses. 
          Everything you need to scale your team and services.
        </p>
      </div>

      {/* Intro Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {/* Quick Start Card (Indigo) */}
        <Link href="/docs/quick-start" className="block group">
          <div className="p-8 h-full rounded-[2.5rem] border border-indigo-100/50 bg-indigo-50/50 shadow-sm hover:bg-white hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all relative overflow-hidden">
            <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-md mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all relative z-10">
              <Zap className="h-6 w-6" />
            </div>
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Quick start</h3>
              <p className="text-slate-500 text-sm font-normal leading-relaxed mb-6">
                Launch your business in under 5 minutes. Configure your unique URL, onboard your team, and define your services.
              </p>
              <div className="inline-flex items-center gap-2 text-indigo-600 text-sm font-black">
                Learn more <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
            {/* Visual Flourish */}
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-indigo-100/50 rounded-full blur-2xl group-hover:bg-indigo-200/50 transition-colors"></div>
          </div>
        </Link>

        {/* Multi-Tenancy Card (Emerald) */}
        <Link href="/docs/multi-tenancy" className="block group">
          <div className="p-8 h-full rounded-[2.5rem] border border-emerald-100/50 bg-emerald-50/50 shadow-sm hover:bg-white hover:border-emerald-200 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all relative overflow-hidden">
            <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-md mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-all relative z-10">
              <Shield className="h-6 w-6" />
            </div>
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Data Isolation</h3>
              <p className="text-slate-600 text-sm font-medium leading-relaxed mb-6">
                Understand how our Tenant-based architecture uses tenantId scoping to keep your business data secure and private.
              </p>
              <div className="inline-flex items-center gap-2 text-emerald-600 text-sm font-black">
                Learn more <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
            {/* Visual Flourish */}
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-100/50 rounded-full blur-2xl group-hover:bg-emerald-200/50 transition-colors"></div>
          </div>
        </Link>
      </div>

      {/* Core Benefits List */}
      <div className="space-y-6 pt-8">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Why use FluxBooking?</h2>
        <div className="space-y-4">
          {[
            "Blazing fast booking flow for your customers",
            "Individual calendars for every staff member",
            "Automatic email notifications",
            "Secure payments via Lemon Squeezy",
            "Full control over branding and colors"
          ].map((item) => (
            <div key={item} className="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
              <CheckCircle2 className="h-5 w-5 text-indigo-500" />
              <span className="text-sm font-bold text-slate-700">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Call to Action */}
      <div className="p-10 rounded-[2.5rem] bg-slate-900 text-white flex flex-col items-center text-center space-y-6">
        <h3 className="text-2xl font-black tracking-tight">Ready to start your journey?</h3>
        <p className="text-slate-400 text-sm max-w-sm font-medium">
          Join 500+ businesses already scaling their operations with FluxBooking.
        </p>
        <Link 
          href="/register" 
          className="h-14 px-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black transition-all hover:bg-indigo-700 hover:scale-[1.05] active:scale-95 shadow-xl shadow-indigo-500/20"
        >
          Get Started for Free
        </Link>
      </div>

      <div className="pt-12 border-t border-slate-100 flex justify-end">
        <Link href="/docs/quick-start" className="text-sm font-black text-indigo-600 hover:text-indigo-700">Quick Start â†’</Link>
      </div>
    </div>
  );
}
