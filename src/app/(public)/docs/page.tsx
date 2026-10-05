import { ArrowRight, CheckCircle2, Zap, Shield, Users, MapPin, Sliders, Calendar, Mail } from "lucide-react";
import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Header */}
      <div className="space-y-4">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
          Welcome to <span className="text-indigo-600 dark:text-indigo-400">FluxBooking Documentation</span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 font-normal leading-relaxed max-w-2xl">
          Everything you need to configure your business, onboard practitioners, manage multi-location branches, and automate client booking flows.
        </p>
      </div>

      {/* Intro Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {/* Quick Start Card */}
        <Link href="/docs/quick-start" className="block group">
          <div className="p-8 h-full rounded-[2.5rem] border border-indigo-100/60 dark:border-slate-800 bg-indigo-50/50 dark:bg-slate-900/50 shadow-sm hover:bg-white dark:hover:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all relative overflow-hidden">
            <div className="h-12 w-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-md mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all relative z-10">
              <Zap className="h-6 w-6" />
            </div>
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Quick Start</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-relaxed mb-6">
                Launch your booking system in under 5 minutes. Select your industry, set business hours, onboard practitioners, and publish your URL.
              </p>
              <div className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-sm font-bold">
                Start here <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </Link>

        {/* Business Profile Card */}
        <Link href="/docs/business-profile" className="block group">
          <div className="p-8 h-full rounded-[2.5rem] border border-blue-100/60 dark:border-slate-800 bg-blue-50/50 dark:bg-slate-900/50 shadow-sm hover:bg-white dark:hover:bg-slate-900 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-2xl hover:shadow-blue-500/10 transition-all relative overflow-hidden">
            <div className="h-12 w-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-md mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all relative z-10">
              <Sliders className="h-6 w-6" />
            </div>
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Business Profile</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-relaxed mb-6">
                Learn how to switch between Healthcare, Salon, Fitness, and Consulting modes to adapt all terminology across your workspace.
              </p>
              <div className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-bold">
                Explore profile <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Feature Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
        <Link href="/docs/staff" className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group">
          <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mb-3" />
          <h4 className="font-bold text-slate-900 dark:text-white mb-1">Staff & Practitioners</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">Staff portals, availability, leave requests, and plan limits.</p>
        </Link>

        <Link href="/docs/locations" className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group">
          <MapPin className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mb-3" />
          <h4 className="font-bold text-slate-900 dark:text-white mb-1">Locations</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">Manage multiple clinics, studios, and branch locations.</p>
        </Link>

        <Link href="/docs/notifications" className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-rose-300 dark:hover:border-rose-700 transition-all group">
          <Mail className="h-6 w-6 text-rose-600 dark:text-rose-400 mb-3" />
          <h4 className="font-bold text-slate-900 dark:text-white mb-1">Email Notifications</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">Transactional emails with 1-click customer rescheduling.</p>
        </Link>
      </div>

      {/* Core Platform Capabilities */}
      <div className="space-y-6 pt-8">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Key Platform Capabilities</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            "Domain-specific terminology for Clinics, Salons, Fitness & Consulting",
            "Individual Staff Portal with customized working hours & leave requests",
            "Multi-location support with branch assignments",
            "Automatic buffer times before and after appointments",
            "Full calendar view (Day, Week, Month, Agenda) with manual walk-in dialog",
            "Self-service 1-click rescheduling and cancellation directly from email",
            "Complete patient and customer directory with history and spend metrics",
            "Enterprise database-level tenant isolation & LemonSqueezy subscription sync"
          ].map((item) => (
            <div key={item} className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm">
              <CheckCircle2 className="h-5 w-5 text-indigo-500 shrink-0" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Call to Action */}
      <div className="p-10 rounded-[2.5rem] bg-slate-900 text-white flex flex-col items-center text-center space-y-6">
        <h3 className="text-2xl font-black tracking-tight">Ready to start configuring?</h3>
        <p className="text-slate-400 text-sm max-w-sm font-medium">
          Set up your organization in less than 5 minutes and explore all features on a 14-day free trial.
        </p>
        <Link 
          href="/register" 
          className="h-14 px-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold transition-all hover:bg-indigo-700 hover:scale-[1.03] active:scale-95 shadow-xl shadow-indigo-500/20"
        >
          Get Started for Free
        </Link>
      </div>

      <div className="pt-12 border-t border-slate-100 dark:border-slate-800 flex justify-end">
        <Link href="/docs/quick-start" className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">Quick Start →</Link>
      </div>
    </div>
  );
}
