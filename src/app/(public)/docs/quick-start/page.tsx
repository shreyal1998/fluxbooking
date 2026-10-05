import { 
  Rocket, 
  Settings, 
  Users, 
  CreditCard, 
  ArrowRight,
  ChevronRight,
  MapPin,
  Mail,
  Sliders
} from "lucide-react";
import Link from "next/link";

const steps = [
  {
    icon: Settings,
    title: "Configure Business Profile & Industry Type",
    description: "Select your Business Type (Healthcare, Salon, Fitness, Consulting, or General) to automatically adapt all system terminology. Choose your unique booking URL slug and base currency.",
    color: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
  },
  {
    icon: MapPin,
    title: "Add Locations & Clinic Branches",
    description: "Add your physical studios, clinic rooms, or branch offices with full addresses, contact details, and custom business hours.",
    color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
  },
  {
    icon: Users,
    title: "Onboard Practitioners & Set Availability",
    description: "Invite team members, assign them to locations, set custom calendar colors, and configure their weekly working hours or lunch breaks.",
    color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
  },
  {
    icon: CreditCard,
    title: "Define Services, Treatments & Buffer Times",
    description: "Set prices, durations in minutes, and buffer time gaps before/after appointments for room preparation or cleanup.",
    color: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400"
  },
  {
    icon: Rocket,
    title: "Publish Your Self-Service Booking Portal",
    description: "Your business is live at fluxbooking.com/b/[slug]. Clients can book 24/7 and receive instant email confirmations with 1-click rescheduling.",
    color: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
  }
];

export default function QuickStart() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
          Quick <span className="text-indigo-600 dark:text-indigo-400">Start Guide</span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 font-normal leading-relaxed max-w-2xl">
          Get your practice or booking system up and running in less than 5 minutes. Follow these simple steps to start taking bookings today.
        </p>
      </div>

      <div className="space-y-8">
        {steps.map((step, index) => (
          <div key={index} className="flex gap-6 group">
            <div className="flex flex-col items-center">
              <div className={`h-12 w-12 ${step.color} rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                <step.icon className="h-6 w-6" />
              </div>
              {index < steps.length - 1 && (
                <div className="w-0.5 h-full bg-slate-100 dark:bg-slate-800 my-2"></div>
              )}
            </div>
            <div className="pb-10">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Step {index + 1}: {step.title}</h3>
              <p className="text-slate-500 dark:text-slate-400 font-normal leading-relaxed mb-4">
                {step.description}
              </p>
              <div className="flex items-center gap-4">
                <Link href="/register" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                  Try it now
                </Link>
                <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-8 rounded-[2rem] bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h4 className="text-lg font-bold text-slate-900 dark:text-white">Need to customize your industry language?</h4>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Read our complete guide to business profile and adaptive terminology.</p>
        </div>
        <Link 
          href="/docs/business-profile" 
          className="px-6 py-3 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 transition-all flex items-center gap-2 shrink-0"
        >
          Business Profile <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="pt-12 border-t border-slate-100 dark:border-slate-800 flex justify-between">
        <Link href="/docs" className="text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">← Introduction</Link>
        <Link href="/docs/business-profile" className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">Business Profile →</Link>
      </div>
    </div>
  );
}
