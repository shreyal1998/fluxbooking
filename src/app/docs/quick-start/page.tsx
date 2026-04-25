import { 
  Rocket, 
  Settings, 
  Users, 
  CreditCard, 
  ArrowRight,
  ChevronRight
} from "lucide-react";
import Link from "next/link";

const steps = [
  {
    icon: Settings,
    title: "Configure your Business Profile",
    description: "Set your business name, pick a custom URL (slug), and choose your base currency and country.",
    color: "bg-blue-50 text-blue-600"
  },
  {
    icon: Users,
    title: "Add your Team Members",
    description: "Invite your staff and set their individual availability. Each member gets their own booking calendar.",
    color: "bg-indigo-50 text-indigo-600"
  },
  {
    icon: CreditCard,
    title: "Create your Services",
    description: "Define what you offer, the duration of each service, and your pricing.",
    color: "bg-emerald-50 text-emerald-600"
  },
  {
    icon: Rocket,
    title: "Go Live",
    description: "Share your booking link with customers and start accepting appointments immediately.",
    color: "bg-violet-50 text-violet-600"
  }
];

export default function QuickStart() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4">
        <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-tight">
          Quick <span className="text-indigo-600">Start Guide</span>
        </h1>
        <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-2xl">
          Get your booking system up and running in less than 5 minutes. 
          Follow these simple steps to launch your business.
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
                <div className="w-0.5 h-full bg-slate-100 my-2"></div>
              )}
            </div>
            <div className="pb-10">
              <h3 className="text-xl font-black text-slate-900 mb-2">Step {index + 1}: {step.title}</h3>
              <p className="text-slate-500 font-medium leading-relaxed mb-4">
                {step.description}
              </p>
              <div className="flex items-center gap-4">
                <Link href="/register" className="text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700">
                  Try it now
                </Link>
                <ChevronRight className="h-3 w-3 text-slate-300" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-8 rounded-[2rem] bg-indigo-50 border border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h4 className="text-lg font-black text-slate-900">Need a deep dive?</h4>
          <p className="text-sm font-bold text-slate-500">Check out our detailed branding and customization guide.</p>
        </div>
        <Link 
          href="/docs/branding" 
          className="px-6 py-3 bg-white text-indigo-600 border border-indigo-100 rounded-xl font-black text-sm hover:shadow-lg transition-all flex items-center gap-2"
        >
          Branding Guide <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="pt-12 border-t border-slate-100 flex justify-between">
        <Link href="/docs" className="text-sm font-black text-slate-400 hover:text-slate-600">← Introduction</Link>
        <Link href="/docs/business-profile" className="text-sm font-black text-indigo-600 hover:text-indigo-700">Business Profile →</Link>
      </div>
    </div>
  );
}
