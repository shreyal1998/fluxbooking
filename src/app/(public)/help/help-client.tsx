"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { sendSupportRequest } from "@/app/actions/support";
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
  Bug,
  AlertCircle
} from "lucide-react";

const REASONS = [
  { id: "booking", label: "Booking Issue", icon: Calendar, subject: "e.g. Cannot select a specific time slot", placeholder: "Please provide your appointment details (date or time) and describe what went wrong..." },
  { id: "scheduling", label: "Scheduling & Availability", icon: Clock, subject: "e.g. Syncing my external calendar", placeholder: "Describe the issue with your hours or staff availability..." },
  { id: "billing", label: "Billing & Subscription", icon: CreditCard, subject: "e.g. Inquiry about my recent invoice", placeholder: "Tell us about your billing inquiry or plan change request..." },
  { id: "branding", label: "Branding & Customization", icon: Zap, subject: "e.g. Uploading my business logo", placeholder: "Describe the custom domain or branding issue you are facing..." },
  { id: "staff", label: "Staff Management", icon: Users, subject: "e.g. Adding a new team member", placeholder: "Tell us about the issue with adding or managing team members..." },
  { id: "feature", label: "Feature Request", icon: MessageSquare, subject: "e.g. Integration with Google Meet", placeholder: "What new feature would you like to see? How would it help your business?" },
  { id: "bug", label: "Technical Bug", icon: Bug, subject: "e.g. Page crashes when clicking 'Save'", placeholder: "Please describe the steps to reproduce the bug and what happened..." },
  { id: "other", label: "Other", icon: LifeBuoy, subject: "e.g. General inquiry", placeholder: "Describe your inquiry in detail..." },
];

export default function HelpClient() {
  const { data: session } = useSession();
  const isPro = (session?.user as any)?.plan === "PRO";
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedReason, setSelectedReason] = useState<typeof REASONS[0] | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
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

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      const newErrors = { ...fieldErrors };
      delete newErrors[field];
      setFieldErrors(newErrors);
    }
    setGeneralError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});
    setGeneralError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const subject = formData.get("subject") as string;
    const message = formData.get("message") as string;

    const errors: Record<string, string> = {};
    if (!name) errors.name = "Your name is required";
    if (!email) errors.email = "Email address is required";
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = "Please enter a valid email";
    if (!subject) errors.subject = "Subject is required";
    if (!selectedReason) errors.reason = "Please select a reason";
    if (!message) errors.message = "Message cannot be empty";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    if (selectedReason) {
      formData.append("reason", selectedReason.label);
    }

    const result = await sendSupportRequest(formData);

    if (result.error) {
      setGeneralError(result.error);
      toast.error(result.error);
      setLoading(false);
    } else {
      toast.success("Message sent successfully!");
      setSubmitted(true);
      setLoading(false);
    }
  };

  const InputError = ({ message }: { message?: string }) => {
    if (!message) return null;
    return (
      <div className="flex items-center gap-1.5 mt-1.5 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200">
        <AlertCircle className="h-3 w-3" />
        <span className="text-[10px] font-black uppercase tracking-wider">{message}</span>
      </div>
    );
  };

  if (submitted) {
    return (
      <div className="py-32 flex items-center justify-center p-4">
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
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 lg:py-24">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        <div className="space-y-10">
          <div className="space-y-4">
            <h1 className="text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
              Help <span className="text-indigo-600">Center</span>
            </h1>
            {isPro && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 shadow-sm animate-in fade-in zoom-in duration-500">
                <Zap className="h-3.5 w-3.5 fill-indigo-600" />
                <span className="text-[10px] font-black uppercase tracking-widest">Priority Support Active</span>
              </div>
            )}
            <p className="text-xl text-slate-500 font-normal leading-relaxed max-w-md">
              Have a question about your account, billing, or a technical issue? Our team is ready to assist.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {[
               { icon: Clock, title: "Fast Response", desc: "Average 2hr reply time" },
               { icon: Shield, title: "Secure Portal", desc: "End-to-end encryption" },
               { icon: LifeBuoy, title: "Expert Support", desc: "Talk to real developers" },
               { icon: MessageSquare, title: "Multi-Channel", desc: "Email and Chat Support" }
             ].map((item, i) => (
               <div key={i} className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-2 text-left">
                  <item.icon className="h-5 w-5 text-indigo-500" />
                  <h4 className="font-bold text-sm text-slate-900">{item.title}</h4>
                  <p className="text-sm text-slate-500 font-normal leading-relaxed">{item.desc}</p>
               </div>
             ))}
          </div>
        </div>

        <div className="bg-white rounded-[3rem] p-10 lg:p-12 shadow-2xl shadow-indigo-500/5 border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-50 rounded-bl-[5rem] -mr-16 -mt-16"></div>
          
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10" noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Your Name</label>
                <input 
                  name="name"
                  required 
                  type="text" 
                  onChange={() => clearFieldError("name")}
                  placeholder="e.g. John Doe" 
                  className={`w-full h-14 px-6 rounded-2xl border-2 outline-none transition-all font-bold placeholder:text-slate-300 dark:text-white ${
                    fieldErrors.name ? "border-rose-100 bg-rose-50 focus:border-rose-500" : "border-transparent bg-slate-50 focus:border-indigo-100 focus:bg-white"
                  }`}
                />
                <InputError message={fieldErrors.name} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Email Address</label>
                <input 
                  name="email"
                  required 
                  type="email" 
                  onChange={() => clearFieldError("email")}
                  placeholder="e.g. john@example.com" 
                  className={`w-full h-14 px-6 rounded-2xl border-2 outline-none transition-all font-bold placeholder:text-slate-300 dark:text-white ${
                    fieldErrors.email ? "border-rose-100 bg-rose-50 focus:border-rose-500" : "border-transparent bg-slate-50 focus:border-indigo-100 focus:bg-white"
                  }`}
                />
                <InputError message={fieldErrors.email} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Reason for Inquiry</label>
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`w-full h-14 px-6 rounded-2xl border-2 outline-none transition-all font-bold flex items-center justify-between group ${
                    fieldErrors.reason ? "border-rose-100 bg-rose-50 focus:border-rose-500" : "border-transparent bg-slate-50 focus:border-indigo-100 focus:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {selectedReason ? (
                      <>
                        <selectedReason.icon className="h-4 w-4 text-indigo-500" />
                        <span className="text-slate-900">{selectedReason.label}</span>
                      </>
                    ) : (
                      <span className="text-slate-300 font-bold">Select a reason...</span>
                    )}
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                <InputError message={fieldErrors.reason} />

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
                            clearFieldError("reason");
                            clearFieldError("subject");
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
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Subject / Title</label>
              <input 
                name="subject"
                required 
                type="text" 
                onChange={() => clearFieldError("subject")}
                placeholder={selectedReason?.subject || "e.g. How do I set up my custom domain?"} 
                className={`w-full h-14 px-6 rounded-2xl border-2 outline-none transition-all font-bold placeholder:text-slate-300 dark:text-white ${
                  fieldErrors.subject ? "border-rose-100 bg-rose-50 focus:border-rose-500" : "border-transparent bg-slate-50 focus:border-indigo-100 focus:bg-white"
                }`}
              />
              <InputError message={fieldErrors.subject} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Message</label>
              <textarea 
                name="message"
                required 
                rows={5} 
                onChange={() => clearFieldError("message")}
                placeholder={selectedReason?.placeholder || "Describe your issue in detail..."} 
                className={`w-full p-6 rounded-2xl border-2 outline-none font-bold resize-none placeholder:text-slate-300 ${
                  fieldErrors.message ? "border-rose-100 bg-rose-50 focus:border-rose-500" : "border-transparent bg-slate-50 focus:border-indigo-100 focus:bg-white"
                }`}
              ></textarea>
              <InputError message={fieldErrors.message} />
            </div>
            <button disabled={loading} className="w-full h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center gap-3 font-black text-base shadow-xl shadow-indigo-500/20 transition-all hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 disabled:bg-slate-300">
              {loading ? <div className="h-6 w-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Send className="h-5 w-5" /> Send Request</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
