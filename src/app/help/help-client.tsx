"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { 
  Calendar, 
  ArrowLeft, 
  Send, 
  CheckCircle2, 
  MessageSquare, 
  LifeBuoy,
  Clock,
  Shield,
  ChevronDown,
  CreditCard,
  Zap,
  Users,
  Bug
} from "lucide-react";

const REASONS = [
  { id: "booking", label: "Booking Issue", icon: Calendar },
  { id: "scheduling", label: "Scheduling & Availability", icon: Clock },
  { id: "billing", label: "Billing & Subscription", icon: CreditCard },
  { id: "branding", label: "Branding & Customization", icon: Zap },
  { id: "staff", label: "Staff Management", icon: Users },
  { id: "feature", label: "Feature Request", icon: MessageSquare },
  { id: "bug", label: "Technical Bug", icon: Bug },
  { id: "other", label: "Other", icon: LifeBuoy },
];

export default function HelpClient() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedReason, setSelectedReason] = useState<typeof REASONS[0] | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.history.replaceState(null, '', '/help');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) return;
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[3rem] p-12 text-center shadow-2xl shadow-slate-200 border border-slate-100">
          <div className="h-20 w-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4">Request Sent!</h2>
          <p className="text-slate-500 font-medium leading-relaxed mb-10">
            Our support team has received your message. We usually respond within 2-4 business hours.
          </p>
          <Link 
            href="/" 
            className="inline-flex h-14 px-10 bg-slate-900 text-white rounded-2xl items-center justify-center font-black transition-all hover:bg-slate-800 hover:scale-105 active:scale-95"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Mini Header */}
      <header className="h-20 flex items-center px-8 lg:px-12 bg-white/50 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
        <button 
          onClick={scrollToTop}
          className="flex items-center gap-2 group outline-none cursor-pointer"
        >
          <div className="bg-indigo-600 p-1.5 rounded-lg group-hover:scale-110 transition-transform">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <span className="font-black text-xl tracking-tight text-slate-900">FluxHelp</span>
        </button>
      </header>
      <main className="flex-1 container mx-auto px-4 py-16 lg:py-24 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-10">
            <div className="space-y-4">
              <Link 
                href="/" 
                className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full border border-slate-200 bg-white text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:shadow-md transition-all group"
              >
                <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" />
                fluxbooking.com
              </Link>
              <h1 className="text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                Help <span className="text-indigo-600">Center</span>
              </h1>
              <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-md">
                Have a question about your account, billing, or a technical issue? Our team is ready to assist.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {[
                 { icon: Clock, title: "Fast Response", desc: "Average 2hr reply time" },
                 { icon: Shield, title: "Secure Portal", desc: "End-to-end encryption" },
                 { icon: LifeBuoy, title: "Expert Support", desc: "Talk to real developers" },
                 { icon: MessageSquare, title: "Multi-Channel", desc: "Email, SMS, and Chat" }
               ].map((item, i) => (
                 <div key={i} className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-2">
                    <item.icon className="h-5 w-5 text-indigo-500" />
                    <h4 className="font-black text-sm text-slate-900">{item.title}</h4>
                    <p className="text-[11px] text-slate-500 font-bold leading-relaxed">{item.desc}</p>
                 </div>
               ))}
            </div>
          </div>

          <div className="bg-white rounded-[3rem] p-10 lg:p-12 shadow-2xl shadow-indigo-500/5 border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-50 rounded-bl-[5rem] -mr-16 -mt-16"></div>
            
            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Your Name</label>
                  <input required type="text" placeholder="John Doe" className="w-full h-14 px-6 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white outline-none transition-all font-bold text-slate-900" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Email Address</label>
                  <input required type="email" placeholder="john@example.com" className="w-full h-14 px-6 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white outline-none transition-all font-bold text-slate-900" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Subject / Title</label>
                <input required type="text" placeholder="How do I set up my custom domain?" className="w-full h-14 px-6 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white outline-none transition-all font-bold text-slate-900" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Reason for Inquiry</label>
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full h-14 px-6 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white outline-none transition-all font-bold text-slate-900 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      {selectedReason ? (
                        <>
                          <selectedReason.icon className="h-4 w-4 text-indigo-500" />
                          <span>{selectedReason.label}</span>
                        </>
                      ) : (
                        <span className="text-slate-300">Select a reason...</span>
                      )}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 overflow-hidden animate-in fade-in zoom-in duration-200">
                      <div className="max-h-64 overflow-y-auto">
                        {REASONS.map((reason) => (
                          <button
                            key={reason.id}
                            type="button"
                            onClick={() => {
                              setSelectedReason(reason);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full px-6 py-3 flex items-center gap-3 text-sm font-bold transition-colors text-left ${
                              selectedReason?.id === reason.id 
                                ? "bg-indigo-50 text-indigo-600" 
                                : "text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <reason.icon className={`h-4 w-4 ${selectedReason?.id === reason.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                            {reason.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Message</label>
                <textarea required rows={5} placeholder="Describe your issue in detail..." className="w-full p-6 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white outline-none font-bold text-slate-900 resize-none"></textarea>
              </div>
              <button disabled={loading} className="w-full h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center gap-3 font-black text-base shadow-xl shadow-indigo-500/20 transition-all hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 disabled:bg-slate-300">
                {loading ? <div className="h-6 w-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Send className="h-5 w-5" /> Send Request</>}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
