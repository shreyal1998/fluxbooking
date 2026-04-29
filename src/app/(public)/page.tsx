"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Calendar, 
  Shield, 
  Users, 
  Zap, 
  ArrowRight,
  Plus,
  Scissors,
  CheckCircle2
} from "lucide-react";

export default function Home() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-8 lg:pt-48 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-white to-white">
        <div className="bg-grid absolute inset-0 opacity-[0.4] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Flux = Continuous Flow & Change</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 max-w-4xl mx-auto leading-[1.1]">
            Keep Your Business in <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Constant Flux</span>
          </h1>
          
          <p className="mx-auto max-w-2xl text-slate-500 text-lg md:text-xl mb-10 leading-relaxed">
            The high-performance booking system built for movement. Scale your staff, services, and revenue with precision.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex h-14 items-center justify-center rounded-2xl bg-indigo-600 px-10 text-base font-bold text-white shadow-2xl shadow-indigo-500/20 transition-all hover:bg-indigo-700 hover:scale-[1.02] active:scale-95"
            >
              Start 14-Day Free Trial <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/#pricing"
              className="w-full sm:w-auto inline-flex h-14 items-center justify-center rounded-2xl border border-slate-100 bg-white px-10 text-base font-bold text-slate-900 transition-all hover:bg-slate-50 hover:border-slate-100"
            >
              View Plans
            </Link>
          </div>

          {/* Mock UI Showcase */}
          <div className="relative max-w-5xl mx-auto px-4">
            <div className="rounded-[2.5rem] border border-slate-100 bg-white p-3 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.12)] overflow-hidden">
              <div className="rounded-[2rem] border border-slate-100 bg-[#F8FAFC] flex flex-col overflow-hidden">
                <div className="h-12 bg-white border-b border-slate-100 flex items-center px-8 justify-between text-left">
                  <div className="flex gap-2">
                    <div className="h-3 w-3 rounded-full bg-[#FF5F57] border border-[#E0443E] shadow-sm"></div>
                    <div className="h-3 w-3 rounded-full bg-[#FEBC2E] border border-[#D8A020] shadow-sm"></div>
                    <div className="h-3 w-3 rounded-full bg-[#28C840] border border-[#1AAB2F] shadow-sm"></div>
                  </div>
                  <div className="bg-slate-50 rounded-lg px-6 py-2 text-[10px] font-bold text-slate-400 font-mono tracking-tight flex items-center gap-2">
                    <Shield className="h-3 w-3" />
                    fluxbooking.com/dashboard/appointments
                  </div>
                  <div className="w-12"></div>
                </div>

                <div className="flex-1 flex overflow-hidden min-h-[450px] text-left">
                  <div className="w-56 bg-white border-r border-slate-100 p-6 space-y-6 hidden md:block">
                     <div className="space-y-4">
                       <div className="h-10 w-full bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 flex items-center px-4 gap-3">
                          <Calendar className="h-4.5 w-4.5" />
                          <span className="text-xs font-black">Appointments</span>
                       </div>
                       <div className="h-10 w-full bg-slate-50 rounded-xl flex items-center px-4 gap-3">
                          <Users className="h-4.5 w-4.5 text-slate-300" />
                          <span className="text-xs font-bold text-slate-400">Team Members</span>
                       </div>
                       <div className="h-10 w-full bg-slate-50 rounded-xl flex items-center px-4 gap-3">
                          <Scissors className="h-4.5 w-4.5 text-slate-300" />
                          <span className="text-xs font-bold text-slate-400">Services</span>
                       </div>
                     </div>
                  </div>

                  <div className="flex-1 bg-white p-10">
                     <div className="flex justify-between items-center mb-10">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Daily Schedule</h3>
                        <div className="h-11 px-5 bg-indigo-600 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-100">
                           <Plus className="h-4 w-4" /> New Booking
                        </div>
                     </div>
                     <div className="space-y-4">
                        {[
                          { time: "09:00 AM", client: "Emma Wilson", service: "Hair Highlight", price: "$120", status: "CONFIRMED", color: "emerald" },
                          { time: "11:30 AM", client: "Marcus Chen", service: "Men's Cut", price: "$45", status: "PENDING", color: "amber" },
                          { time: "02:00 PM", client: "Sarah Smith", service: "Balayage", price: "$180", status: "COMPLETED", color: "indigo" }
                        ].map((item, i) => (
                          <div key={i} className="p-5 border border-slate-100 rounded-[1.5rem] flex items-center justify-between hover:border-indigo-100 transition-colors">
                             <div className="flex items-center gap-5">
                                <div className="h-11 w-11 bg-slate-50 rounded-2xl flex items-center justify-center text-[10px] font-black text-slate-400">{item.time.split(' ')[0]}</div>
                                <div>
                                   <p className="text-base font-black text-slate-900">{item.client}</p>
                                   <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{item.service}</p>
                                </div>
                             </div>
                             <span className={`px-4 py-1.5 rounded-full text-[10px] font-black bg-${item.color}-50 text-${item.color}-600 border border-${item.color}-100`}>{item.status}</span>
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

      {/* Features Section */}
      <section id="features" className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <h2 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-3">The Platform</h2>
            <h3 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">Engineered for Momentum</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-[2.5rem] border border-indigo-100/50 bg-indigo-50/50 shadow-sm hover:bg-white hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all group relative overflow-hidden">
              <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-md mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <Zap className="h-6 w-6" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-2">Instant Flow</h4>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">Optimized booking funnel that converts visitors into customers in seconds.</p>
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-indigo-100/50 rounded-full blur-2xl group-hover:bg-indigo-200/50 transition-colors"></div>
            </div>

            <div className="p-8 rounded-[2.5rem] border border-emerald-100/50 bg-emerald-50/50 shadow-sm hover:bg-white hover:border-emerald-200 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all group relative overflow-hidden">
              <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-md mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                <Shield className="h-6 w-6" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-2">Deep Isolation</h4>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">Enterprise-grade multi-tenancy ensures your business data stays your own.</p>
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-100/50 rounded-full blur-2xl group-hover:bg-emerald-200/50 transition-colors"></div>
            </div>

            <div className="p-8 rounded-[2.5rem] border border-violet-100/50 bg-violet-50/50 shadow-sm hover:bg-white hover:border-violet-200 hover:shadow-2xl hover:shadow-violet-500/10 transition-all group relative overflow-hidden">
              <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-violet-600 shadow-md mb-6 group-hover:bg-violet-600 group-hover:text-white transition-all">
                <Users className="h-6 w-6" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-2">Team Scale</h4>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">Manage 1 to 100 staff members with zero scheduling overlaps.</p>
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-violet-100/50 rounded-full blur-2xl group-hover:bg-violet-200/50 transition-colors"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-3">Simple Pricing</h2>
            <h3 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">Pick your pace of flux</h3>
            
            <div className="mt-8 flex items-center justify-center gap-4">
              <span className={`text-xs font-black transition-colors ${!isYearly ? 'text-slate-900' : 'text-slate-400'}`}>Monthly</span>
              <button 
                onClick={() => setIsYearly(!isYearly)}
                className={`w-12 h-6 rounded-full p-1 transition-all duration-300 relative ${isYearly ? 'bg-indigo-600' : 'bg-slate-200'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${isYearly ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </button>
              <span className={`text-xs font-black transition-colors ${isYearly ? 'text-indigo-600' : 'text-slate-400'}`}>Yearly (-20%)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
            {/* Free Plan */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col hover:scale-[1.02] transition-transform">
              <h4 className="font-black text-slate-400 uppercase tracking-widest text-xs mb-4">Start-up</h4>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900">$0</span>
                <span className="text-slate-400 text-sm">{isYearly ? '/yr' : '/mo'}</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {["1 Staff Member", "Unlimited Bookings", "Email Notifications", "Basic Calendar"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm font-semibold text-slate-600"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {f}</li>
                ))}
              </ul>
              <div className="space-y-3">
                <Link href="/register" className="block w-full py-4 bg-slate-100 text-slate-600 rounded-2xl text-center font-black text-sm hover:bg-slate-200 transition-all">Start Free</Link>
                <p className="text-[10px] text-center font-bold text-slate-400 px-2 leading-tight">Includes 14-day trial of <span className="text-indigo-500">Starter features</span></p>
              </div>
            </div>

            {/* Starter Plan */}
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-indigo-600 shadow-2xl shadow-indigo-100 flex flex-col relative scale-105 z-10">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">Popular</div>
              <h4 className="text-3xl font-black text-slate-900 mb-2">Starter Plan</h4>
              <div className="mb-10 flex items-baseline gap-1">
                <span className="text-5xl font-black text-slate-900">${isYearly ? '69.90' : '6.99'}</span>
                <span className="text-slate-400 text-sm">{isYearly ? '/yr' : '/mo'}</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {["Up to 5 Staff Members", "Unlimited Bookings", "Email Notifications", "No Flux Branding", "Advanced Analytics"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm font-semibold text-slate-700"><CheckCircle2 className="h-4 w-4 text-indigo-500" /> {f}</li>
                ))}
              </ul>
              <Link href="/register" className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-center font-black text-sm hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all">Start 14-Day Trial</Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col hover:scale-[1.02] transition-transform">
              <h4 className="text-3xl font-black text-slate-900 mb-2">Pro Plan</h4>
              <div className="mb-10 flex items-baseline gap-1">
                <span className="text-5xl font-black text-slate-900">${isYearly ? '149.90' : '14.99'}</span>
                <span className="text-slate-400 text-sm">{isYearly ? '/yr' : '/mo'}</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {["Unlimited Staff Members", "Unlimited Bookings", "Email Notifications", "Multiple Location Support", "Priority 24/7 Support"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm font-bold text-slate-600"><CheckCircle2 className="h-4 w-4 text-indigo-500" /> {f}</li>
                ))}
              </ul>
              <Link href="/register" className="w-full py-4 bg-slate-900 text-white rounded-2xl text-center font-black text-sm hover:bg-slate-800 transition-all">Start 14-Day Trial</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
