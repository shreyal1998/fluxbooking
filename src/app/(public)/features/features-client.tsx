"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Calendar,
  Users,
  Clock,
  Shield,
  MapPin,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Mail,
  RefreshCw,
  Sliders,
  UserCheck,
  Stethoscope,
  Scissors,
  Dumbbell,
  Briefcase,
  Layers,
  Check,
  Building2,
  Phone,
  Lock,
  ChevronRight,
  Smartphone,
  Eye,
  CalendarCheck
} from "lucide-react";

const BUSINESS_TYPES = [
  {
    id: "healthcare",
    name: "Healthcare & Clinics",
    icon: Stethoscope,
    color: "text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-950/30 dark:border-rose-900/40",
    activeColor: "bg-rose-600 text-white",
    customer: "Patients",
    staff: "Practitioners",
    service: "Treatments",
    booking: "Appointments",
    desc: "Optimized for dental clinics, physiotherapy, medical centers, and specialized practices.",
  },
  {
    id: "salon",
    name: "Salons & Spas",
    icon: Scissors,
    color: "text-violet-600 bg-violet-50 border-violet-100 dark:bg-violet-950/30 dark:border-violet-900/40",
    activeColor: "bg-violet-600 text-white",
    customer: "Clients",
    staff: "Stylists",
    service: "Services",
    booking: "Appointments",
    desc: "Tailored for hair salons, nail studios, barbershops, and wellness spas.",
  },
  {
    id: "fitness",
    name: "Fitness & Wellness",
    icon: Dumbbell,
    color: "text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/40",
    activeColor: "bg-amber-600 text-white",
    customer: "Members",
    staff: "Trainers",
    service: "Classes",
    booking: "Sessions",
    desc: "Built for personal trainers, yoga studios, crossfit gyms, and wellness coaches.",
  },
  {
    id: "consulting",
    name: "Consulting & Agencies",
    icon: Briefcase,
    color: "text-blue-600 bg-blue-50 border-blue-100 dark:bg-blue-950/30 dark:border-blue-900/40",
    activeColor: "bg-blue-600 text-white",
    customer: "Clients",
    staff: "Advisors",
    service: "Consultations",
    booking: "Meetings",
    desc: "Designed for legal advisors, financial planners, design agencies, and consultants.",
  },
];

const FEATURE_PILLARS = [
  {
    category: "Adaptive Terminology & Localization",
    badge: "Unique to FluxBooking",
    title: "A Platform That Speaks Your Industry's Language",
    description: "Switch your business type with one click. FluxBooking automatically transforms all interface labels, buttons, navigation menus, and public booking portals to match your domain terminology.",
    points: [
      "Dynamic terminology: Patients, Clients, Members, or Customers",
      "Practitioner & Doctor profiles vs Stylists, Trainers, and Consultants",
      "Treatments, Sessions, Classes, and Service catalogs with custom duration",
      "Global localization with multi-currency formatting & 12h/24h time support",
      "Automatic country-based time zone and contact standard sync"
    ],
    icon: Sliders,
    color: "indigo",
  },
  {
    category: "Practitioners & Staff Scheduling",
    badge: "Smart Resource Engine",
    title: "Granular Team Management & Staff Portal",
    description: "Equip every team member with their own dedicated staff portal, weekly working hours, and time-off request workflow while administrators retain total operational oversight.",
    points: [
      "Dedicated Staff Portal for individual logins, schedule viewing, and availability setup",
      "Leave & Time-Off Management: Submit sick leave or vacation requests with admin approvals",
      "Tiered Practitioner plans with graceful locking controls on plan downgrades",
      "Individual weekly hours, split shifts, lunch breaks, and emergency time-blockers",
      "Custom calendar color coding per practitioner for instant visual distinction"
    ],
    icon: Users,
    color: "emerald",
  },
  {
    category: "Multi-Location & Branch Operations",
    badge: "Enterprise Ready",
    title: "Manage Multiple Studios, Clinics & Offices",
    description: "Whether you operate a single studio or multiple physical locations across different cities, FluxBooking unifies your operations under a single synchronized dashboard.",
    points: [
      "Multi-branch directory with location addresses, contact info, and business hours",
      "Assign practitioners and staff to specific branch locations",
      "Location-specific service availability and room allocation",
      "Allow clients to filter and book by their preferred clinic or branch",
      "Unified revenue and performance reporting across all branches"
    ],
    icon: MapPin,
    color: "blue",
  },
  {
    category: "Calendar & Appointment Management",
    badge: "High Performance",
    title: "Real-Time Conflict Prevention & Multi-View Calendar",
    description: "Master your daily schedule with a fast, interactive calendar designed to eliminate double-bookings, accommodate buffer times, and manage walk-ins effortlessly.",
    points: [
      "Interactive Day, Week, Month, and Agenda schedule views",
      "Buffer time support: automatic gaps before and after appointments for cleanup or prep",
      "Manual walk-in booking modal with instant conflict checking & price calculation",
      "Comprehensive appointment status tracking: Pending, Confirmed, Completed, Cancelled, No-Show",
      "Real-time schedule synchronization across all active team members"
    ],
    icon: CalendarCheck,
    color: "violet",
  },
  {
    category: "Customer & Patient Directory",
    badge: "Complete Records",
    title: "Rich Client Profiles & History Tracking",
    description: "Maintain comprehensive records for every patient or customer. Track past appointments, total revenue generated, contact info, and internal operational notes.",
    points: [
      "Unified customer directory with search, filtering, and status badges",
      "Complete chronological appointment history and practitioner notes",
      "Safe customer archiving with Administrator-only restore protection",
      "Direct one-click email and phone communication shortcuts",
      "Lifetime value and frequency metrics per customer"
    ],
    icon: UserCheck,
    color: "amber",
  },
  {
    category: "Self-Service Portal & Notifications",
    badge: "Zero Friction",
    title: "Seamless Public Booking, Rescheduling & Resend Emails",
    description: "Deliver a modern booking experience that looks stunning on every device. Clients receive automated confirmation emails with secure one-click reschedule and cancellation links.",
    points: [
      "Branded public booking portal (`fluxbooking.com/b/[your-slug]`)",
      "Automated transactional emails powered by Resend for confirmations, reminders, and updates",
      "Secure token-based self-service rescheduling and cancellation directly from email",
      "100% responsive design optimized for all iPhones, Androids, iPads, tablets, and desktops",
      "Light mode and Dark mode with persistent user theme preferences"
    ],
    icon: Mail,
    color: "rose",
  },
];

export function FeaturesClient() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const [selectedType, setSelectedType] = useState(BUSINESS_TYPES[0]);

  const registerHref = isAuthenticated ? "/overview" : "/register";
  const registerText = isAuthenticated ? "Go to Dashboard" : "Start 14-Day Free Trial";

  return (
    <div className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20 lg:pt-44 lg:pb-28 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50/70 via-white to-white dark:from-indigo-950/20 dark:via-slate-950 dark:to-slate-950">
        <div className="bg-grid-light absolute inset-0 opacity-[0.35] dark:opacity-[0.07] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/60 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Complete Feature Suite
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 max-w-4xl mx-auto leading-[1.1]">
            Everything You Need to Run Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600">Practice & Schedule</span>
          </h1>

          <p className="mx-auto max-w-2xl text-slate-600 dark:text-slate-300 text-lg md:text-xl mb-10 leading-relaxed font-normal">
            From adaptive domain terminology and staff portals to multi-location management, buffer times, and tokenized rescheduling — built for maximum momentum.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={registerHref}
              className="w-full sm:w-auto inline-flex h-14 items-center justify-center rounded-2xl bg-indigo-600 px-9 text-base font-bold text-white shadow-2xl shadow-indigo-500/25 transition-all hover:bg-indigo-700 hover:scale-[1.02] active:scale-95"
            >
              {registerText} <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto inline-flex h-14 items-center justify-center rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-9 text-base font-bold text-slate-900 dark:text-white transition-all hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-md active:scale-95"
            >
              View Plans & Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Business Type Showcase */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800/60 relative">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">
              Tailored Terminology
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
              Switch Industries. The Interface Adapts Instantly.
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">
              No generic "one size fits all" labels. FluxBooking adapts all dashboard views, customer lists, and booking portals to your exact domain language.
            </p>
          </div>

          {/* Industry Selector Tabs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto mb-12">
            {BUSINESS_TYPES.map((type) => {
              const isSelected = selectedType.id === type.id;
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type)}
                  className={`flex flex-col items-center p-5 rounded-2xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? "bg-white dark:bg-slate-800 border-indigo-500 shadow-xl shadow-indigo-500/10 scale-105"
                      : "bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center mb-3 ${type.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {type.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Dynamic Interactive Preview Card */}
          <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 sm:p-10 border border-slate-200/80 dark:border-slate-800 shadow-2xl shadow-indigo-500/5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2.5 rounded-xl ${selectedType.color}`}>
                    <selectedType.icon className="h-5 w-5" />
                  </div>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white">
                    {selectedType.name} Mode
                  </h4>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{selectedType.desc}</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 self-start md:self-auto">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Live Terminology Preview</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8">
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Customer Term</p>
                <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">{selectedType.customer}</p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Staff Term</p>
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{selectedType.staff}</p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Offering Term</p>
                <p className="text-lg font-black text-violet-600 dark:text-violet-400">{selectedType.service}</p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Calendar Term</p>
                <p className="text-lg font-black text-rose-600 dark:text-rose-400">{selectedType.booking}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars Detailed Section */}
      <section className="py-24 max-w-7xl mx-auto px-6 md:px-12">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">
            Core Architecture
          </h2>
          <h3 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Engineered for Precision & Growth
          </h3>
        </div>

        <div className="space-y-16">
          {FEATURE_PILLARS.map((pillar, idx) => {
            const Icon = pillar.icon;
            const isEven = idx % 2 === 1;

            return (
              <div
                key={pillar.category}
                className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-16 p-8 sm:p-12 rounded-[3rem] border border-slate-100 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl shadow-slate-100/50 dark:shadow-none ${
                  isEven ? "lg:flex-row-reverse" : ""
                }`}
              >
                {/* Content Side */}
                <div className="flex-1 space-y-6">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800">
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      {pillar.badge}
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {pillar.title}
                  </h3>

                  <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
                    {pillar.description}
                  </p>

                  <ul className="space-y-3 pt-2">
                    {pillar.points.map((point) => (
                      <li key={point} className="flex items-start gap-3">
                        <div className="h-5 w-5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100 dark:border-emerald-900">
                          <Check className="h-3 w-3" />
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {point}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Visual Side */}
                <div className="w-full lg:w-5/12 bg-gradient-to-br from-indigo-50/80 via-slate-50 to-white dark:from-slate-800/80 dark:via-slate-900 dark:to-slate-900 rounded-[2.5rem] p-8 sm:p-10 border border-slate-200/80 dark:border-slate-700/80 shadow-lg relative overflow-hidden flex flex-col justify-center">
                  <div className="h-16 w-16 rounded-2xl bg-white dark:bg-slate-800 shadow-md flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6 border border-slate-100 dark:border-slate-700">
                    <Icon className="h-8 w-8" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    {pillar.category}
                  </h4>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                    Fully automated and integrated across your entire FluxBooking ecosystem with zero configuration required.
                  </p>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full w-3/4 animate-pulse"></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Security & Multi-Tenancy Banner */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-indigo-300">
                <Lock className="h-3.5 w-3.5" />
                <span className="text-xs font-bold uppercase tracking-wider">Enterprise Security</span>
              </div>
              <h3 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                Complete Tenant Data Isolation & Role-Based Access
              </h3>
              <p className="text-slate-400 text-base leading-relaxed">
                Every query, record, customer file, and booking is strictly scoped by <code className="bg-white/10 px-2 py-0.5 rounded text-indigo-300 text-sm">tenantId</code>. Admins maintain full administrative governance, while team members access dedicated Staff Portals with restricted views.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="font-bold text-sm text-white">NextAuth.js Session</p>
                  <p className="text-xs text-slate-400 mt-0.5">Encrypted JWT tokens</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="font-bold text-sm text-white">LemonSqueezy Sync</p>
                  <p className="text-xs text-slate-400 mt-0.5">Secure billing webhooks</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 sm:p-10 space-y-6">
              <h4 className="text-xl font-bold">Why Top Businesses Choose FluxBooking</h4>
              <div className="space-y-4">
                {[
                  "Never worry about accidental double bookings or schedule collisions",
                  "Keep clients informed with automated Resend email confirmations & reminders",
                  "Enable self-service 1-click rescheduling and cancellations from emails",
                  "Smooth practitioner scale with tiered plans and graceful locking",
                  "Fluid responsiveness across all mobile, tablet, and desktop screens"
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-300 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-24 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-6">
            Ready to Put Your Business in Constant Flux?
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg mb-10 max-w-2xl mx-auto">
            Get started with our 14-day free trial on the Starter plan. No credit card required upfront.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={registerHref}
              className="w-full sm:w-auto inline-flex h-14 items-center justify-center rounded-2xl bg-indigo-600 px-10 text-base font-bold text-white shadow-2xl shadow-indigo-500/20 transition-all hover:bg-indigo-700 hover:scale-[1.02] active:scale-95"
            >
              {registerText} <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/docs"
              className="w-full sm:w-auto inline-flex h-14 items-center justify-center rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-10 text-base font-bold text-slate-900 dark:text-white transition-all hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Read Documentation
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
