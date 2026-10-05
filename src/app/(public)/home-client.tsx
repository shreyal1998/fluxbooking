"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  Calendar, 
  Users, 
  Scissors, 
  Shield, 
  CheckCircle2, 
  Plus, 
  Zap,
  Sliders,
  MapPin,
  Mail,
  Clock,
  Sparkles,
  RefreshCw,
  UserCheck
} from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { PLANS } from "@/config/plans";

export function HomeClient() {
  const [isYearly, setIsYearly] = useState(false);
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const pathname = usePathname();

  useEffect(() => {
    const target = pathname === "/features" ? "features" : pathname === "/pricing" ? "pricing" : null;
    if (target) {
      const timeout = setTimeout(() => {
        const el = document.getElementById(target);
        if (el) {
          const headerOffset = 80;
          const elementPosition = el.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({ top: offsetPosition, behavior: "smooth" });
        }
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [pathname]);

  useEffect(() => {
    const handleManualScroll = (e: any) => {
      const sectionId = e.detail;
      
      if (sectionId === "top") {
        window.history.replaceState(null, "", "/");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (sectionId) {
        const el = document.getElementById(sectionId);
        if (el) {
          window.history.replaceState(null, "", `/${sectionId}`);
          const headerOffset = 80;
          const elementPosition = el.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({ top: offsetPosition, behavior: "smooth" });
        }
      }
    };

    window.addEventListener("flux-scroll", handleManualScroll);
    return () => window.removeEventListener("flux-scroll", handleManualScroll);
  }, []);

  const registerHref = isAuthenticated ? "/overview" : "/register";
  const registerText = isAuthenticated ? "Go to dashboard" : "Start 14-day free trial";

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-16 lg:pt-44 lg:pb-24 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50/80 via-white to-white dark:from-indigo-950/20 dark:via-slate-950 dark:to-slate-950">
        <div className="bg-grid-light absolute inset-0 opacity-[0.4] dark:opacity-[0.08] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10 text-center">
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/60 mb-8">
            <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
            <span className="text-sm sm:text-base font-semibold text-indigo-600 dark:text-indigo-400">The Adaptive Booking Engine</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 dark:text-white mb-6 max-w-4xl mx-auto leading-[1.1]">
            Keep Your Business in <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600">Constant Flux</span>
          </h1>
          
          <p className="mx-auto max-w-2xl text-slate-600 dark:text-slate-300 text-lg md:text-xl mb-10 leading-relaxed font-normal">
            The high-performance booking system with adaptive terminology for clinics, salons, fitness, and consulting. Scale staff, locations, and revenue with precision.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link
              href={registerHref}
              className="w-full sm:w-auto inline-flex h-14 items-center justify-center rounded-2xl bg-indigo-600 px-10 text-base font-bold text-white shadow-2xl shadow-indigo-500/20 transition-all hover:bg-indigo-700 hover:scale-[1.02] active:scale-95"
            >
              {registerText} <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <button
              type="button"
              onClick={() => {
                window.history.replaceState(null, "", "/features");
                window.dispatchEvent(new CustomEvent("flux-scroll", { detail: "features" }));
              }}
              className="w-full sm:w-auto inline-flex h-14 items-center justify-center rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-10 text-base font-bold text-slate-900 dark:text-white transition-all hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-md active:scale-95 cursor-pointer"
            >
              Explore Features
            </button>
          </div>

          {/* Mock UI Showcase */}
          <div className="relative max-w-5xl mx-auto px-4">
            <div className="rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.12)] overflow-hidden">
              <div className="rounded-[2rem] border border-slate-100 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-950 flex flex-col overflow-hidden">
                <div className="h-12 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center px-8 justify-between text-left">
                  <div className="flex gap-2">
                    <div className="h-3 w-3 rounded-full bg-[#FF5F57] border border-[#E0443E] shadow-sm"></div>
                    <div className="h-3 w-3 rounded-full bg-[#FEBC2E] border border-[#D8A020] shadow-sm"></div>
                    <div className="h-3 w-3 rounded-full bg-[#28C840] border border-[#1AAB2F] shadow-sm"></div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg px-6 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-300 font-mono tracking-tight flex items-center gap-2">
                    <Shield className="h-3 w-3" />
                    fluxbooking.com/b/apex-clinic
                  </div>
                  <div className="w-12"></div>
                </div>

                <div className="flex-1 flex overflow-hidden min-h-[420px] text-left">
                  <div className="w-56 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 p-6 space-y-6 hidden md:block">
                     <div className="space-y-4">
                       <div className="h-10 w-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-800 flex items-center px-4 gap-3">
                          <Calendar className="h-4 w-4" />
                          <span className="text-xs font-bold">Appointments</span>
                       </div>
                       <div className="h-10 w-full bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center px-4 gap-3">
                          <Users className="h-4 w-4 text-slate-400" />
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Practitioners</span>
                       </div>
                       <div className="h-10 w-full bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center px-4 gap-3">
                          <Scissors className="h-4 w-4 text-slate-400" />
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Treatments</span>
                       </div>
                       <div className="h-10 w-full bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center px-4 gap-3">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Locations</span>
                       </div>
                     </div>
                  </div>

                  <div className="flex-1 bg-white dark:bg-slate-900 p-8 sm:p-10">
                     <div className="flex justify-between items-center mb-8">
                        <div>
                          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Today's Practice Schedule</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Downtown Clinic • 3 Active Practitioners</p>
                        </div>
                        <div className="h-10 px-4 bg-indigo-600 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 dark:shadow-none">
                           <Plus className="h-4 w-4" /> New Booking
                        </div>
                     </div>
                     <div className="space-y-3">
                        {[
                          { time: "09:00 AM", client: "Emma Wilson", service: "Physiotherapy Session (45m + 15m buffer)", price: "$120", status: "CONFIRMED", color: "emerald", staff: "Dr. Sarah Adams" },
                          { time: "11:30 AM", client: "Marcus Chen", service: "Deep Tissue Therapy", price: "$95", status: "PENDING", color: "amber", staff: "Dr. Alex Rivera" },
                          { time: "02:00 PM", client: "Sarah Smith", service: "Post-Surgery Assessment", price: "$180", status: "COMPLETED", color: "indigo", staff: "Dr. Sarah Adams" }
                        ].map((item, i) => (
                          <div key={i} className="p-4 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between hover:border-indigo-100 dark:hover:border-indigo-800 transition-colors bg-slate-50/40 dark:bg-slate-800/30">
                             <div className="flex items-center gap-4">
                                <div className="h-10 w-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-400 shadow-sm">{item.time.split(' ')[0]}</div>
                                <div>
                                   <p className="text-sm font-bold text-slate-900 dark:text-white">{item.client}</p>
                                   <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.service} • with {item.staff}</p>
                                </div>
                             </div>
                             <span className={`px-3 py-1 rounded-full text-[10px] font-bold bg-${item.color}-50 dark:bg-${item.color}-950/40 text-${item.color}-600 dark:text-${item.color}-400 border border-${item.color}-100 dark:border-${item.color}-900`}>{item.status}</span>
                          </div>
                        ))}
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Expanded 6-Pillar Features Grid */}
      <section id="features" className="py-24 bg-white dark:bg-slate-950 relative overflow-hidden border-t border-slate-100 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <h2 className="text-base sm:text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-3">Core Platform</h2>
            <h3 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">Engineered for Momentum & Scale</h3>
            <p className="text-slate-600 dark:text-slate-400 text-base max-w-2xl mx-auto">
              Built with purpose for modern service businesses. Explore how our end-to-end booking infrastructure accelerates your day-to-day operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* 1. Adaptive Terminology */}
            <div className="p-8 rounded-[2.5rem] border border-indigo-100/60 dark:border-slate-800 bg-indigo-50/40 dark:bg-slate-900/40 shadow-sm hover:bg-white dark:hover:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all group relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="h-12 w-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-md mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Sliders className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Adaptive Industry Language</h4>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-normal">
                  Switch between Healthcare (Patients & Treatments), Salons, Fitness, and Consulting with instant terminology transformation.
                </p>
              </div>
              <Link href="/docs/business-profile" className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-6 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                Read docs <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* 2. Staff Portals & Leave */}
            <div className="p-8 rounded-[2.5rem] border border-emerald-100/60 dark:border-slate-800 bg-emerald-50/40 dark:bg-slate-900/40 shadow-sm hover:bg-white dark:hover:bg-slate-900 hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all group relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="h-12 w-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-md mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <Users className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Staff Portals & Leave Management</h4>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-normal">
                  Equip team members with individual schedules, custom availability, and vacation/sick leave approval workflows.
                </p>
              </div>
              <Link href="/docs/staff" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-6 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
                Read docs <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* 3. Multi-Location Operations */}
            <div className="p-8 rounded-[2.5rem] border border-violet-100/60 dark:border-slate-800 bg-violet-50/40 dark:bg-slate-900/40 shadow-sm hover:bg-white dark:hover:bg-slate-900 hover:border-violet-200 dark:hover:border-violet-800 hover:shadow-2xl hover:shadow-violet-500/10 transition-all group relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="h-12 w-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-violet-600 dark:text-violet-400 shadow-md mb-6 group-hover:bg-violet-600 group-hover:text-white transition-all">
                  <MapPin className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Multi-Location & Branches</h4>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-normal">
                  Manage multiple studios, clinics, or rooms. Assign staff and treatments to specific branch locations with ease.
                </p>
              </div>
              <Link href="/docs/locations" className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400 mt-6 hover:text-violet-700 dark:hover:text-violet-300 transition-colors">
                Read docs <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* 4. Automated Emails & Rescheduling */}
            <div className="p-8 rounded-[2.5rem] border border-rose-100/60 dark:border-slate-800 bg-rose-50/40 dark:bg-slate-900/40 shadow-sm hover:bg-white dark:hover:bg-slate-900 hover:border-rose-200 dark:hover:border-rose-800 hover:shadow-2xl hover:shadow-rose-500/10 transition-all group relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="h-12 w-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-md mb-6 group-hover:bg-rose-600 group-hover:text-white transition-all">
                  <Mail className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">1-Click Rescheduling & Emails</h4>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-normal">
                  Automated Resend transactional emails with secure tokenized action links for instant client self-service changes.
                </p>
              </div>
              <Link href="/docs/notifications" className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 mt-6 hover:text-rose-700 dark:hover:text-rose-300 transition-colors">
                Read docs <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* 5. Calendar with Buffer Times */}
            <div className="p-8 rounded-[2.5rem] border border-blue-100/60 dark:border-slate-800 bg-blue-50/40 dark:bg-slate-900/40 shadow-sm hover:bg-white dark:hover:bg-slate-900 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-2xl hover:shadow-blue-500/10 transition-all group relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="h-12 w-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-md mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <Clock className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Smart Calendar & Buffer Times</h4>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-normal">
                  Multi-view calendar (Day, Week, Month, Agenda) with automatic buffer time gaps before and after appointments.
                </p>
              </div>
              <Link href="/docs/bookings" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 mt-6 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                Read docs <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* 6. Patient/Customer Directory & Security */}
            <div className="p-8 rounded-[2.5rem] border border-amber-100/60 dark:border-slate-800 bg-amber-50/40 dark:bg-slate-900/40 shadow-sm hover:bg-white dark:hover:bg-slate-900 hover:border-amber-200 dark:hover:border-amber-800 hover:shadow-2xl hover:shadow-amber-500/10 transition-all group relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="h-12 w-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-md mb-6 group-hover:bg-amber-600 group-hover:text-white transition-all">
                  <Shield className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Data Isolation & Client Records</h4>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-normal">
                  Enterprise-grade tenantId database scoping, complete patient histories, notes, and LemonSqueezy subscription sync.
                </p>
              </div>
              <Link href="/docs/multi-tenancy" className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 mt-6 hover:text-amber-700 dark:hover:text-amber-300 transition-colors">
                Read docs <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden border-t border-slate-100 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-base sm:text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-3">Transparent Pricing</h2>
            <h3 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">Pick your pace of flux</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-lg mx-auto">
              Every plan includes unlimited client bookings and our full adaptive terminology engine.
            </p>
            
            <div className="mt-7 inline-flex items-center p-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-full shadow-sm">
              <button 
                type="button"
                onClick={() => setIsYearly(false)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${!isYearly ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
              >
                Monthly
              </button>
              <button 
                type="button"
                onClick={() => setIsYearly(true)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${isYearly ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
              >
                <span>Yearly</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 font-semibold px-1.5 py-0.5 rounded-full">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto px-2">
            {PLANS.map((plan) => {
              const isFree = plan.id === "FREE";
              const isStarter = plan.id === "STARTER";
              const price = isFree 
                ? "0" 
                : isStarter 
                  ? (isYearly ? "69.90" : "6.99") 
                  : (isYearly ? "149.90" : "14.99");

              const planHref = `/register?plan=${plan.id}`;

              return (
                <Link 
                  key={plan.id}
                  href={planHref}
                  className={`bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl flex flex-col justify-between transition-all cursor-pointer group hover:-translate-y-1 ${
                    isStarter 
                      ? "border-2 border-indigo-600 shadow-xl shadow-indigo-500/10 hover:shadow-2xl hover:shadow-indigo-500/20 relative" 
                      : "border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-800"
                  }`}
                >
                  {isStarter && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-3 py-0.5 rounded-full text-[10px] font-medium tracking-wider uppercase shadow-sm">
                      Popular
                    </div>
                  )}

                  <div>
                    <h4 className="text-xl font-medium text-slate-900 dark:text-white mb-1">{plan.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{plan.description}</p>
                    <div className="mb-6 flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-normal text-slate-900 dark:text-white">${price}</span>
                      <span className="text-slate-400 text-xs font-normal">{isYearly ? '/yr' : '/mo'}</span>
                    </div>
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2.5 text-xs sm:text-sm font-normal text-slate-600 dark:text-slate-300">
                          <CheckCircle2 className={`h-4 w-4 shrink-0 ${isStarter ? 'text-indigo-500' : 'text-emerald-500'}`} /> {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-2 space-y-2.5">
                    {isFree ? (
                      <p className="text-[11px] text-center font-normal text-slate-400 dark:text-slate-500 px-2 leading-tight">
                        Includes 14-day trial of <span className="text-indigo-500 font-medium">Starter features</span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-center font-normal text-slate-400 dark:text-slate-500 px-2 leading-tight">
                        Includes 14-day free trial • No credit card required
                      </p>
                    )}
                    <div 
                      className="block w-full py-3 rounded-xl text-center font-medium text-sm transition-all bg-indigo-600 text-white group-hover:bg-indigo-700 shadow-md shadow-indigo-500/25"
                    >
                      {isFree ? "Start free" : "Start here!"}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
