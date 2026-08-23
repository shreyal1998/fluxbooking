"use client";

import { useState, useRef, useEffect } from "react";
import { sendSupportRequest } from "@/app/actions/support";
import { toast } from "sonner";
import {
  Send, CheckCircle2, MessageSquare, LifeBuoy,
  Clock, CreditCard, Zap, Users, Bug,
  AlertCircle, ChevronDown, Paperclip, X
} from "lucide-react";

const REASONS = [
  { id: "booking",    label: "Booking Issue",              icon: Clock,         placeholder: "Please provide your appointment details and describe what went wrong..." },
  { id: "scheduling", label: "Scheduling & Availability",  icon: Clock,         placeholder: "Describe the issue with your hours or staff availability..." },
  { id: "billing",    label: "Billing & Subscription",     icon: CreditCard,    placeholder: "Tell us about your billing inquiry or plan change request..." },
  { id: "branding",   label: "Branding & Customization",   icon: Zap,           placeholder: "Describe the custom domain or branding issue you are facing..." },
  { id: "staff",      label: "Staff Management",           icon: Users,         placeholder: "Tell us about the issue with adding or managing team members..." },
  { id: "feature",    label: "Feature Request",            icon: MessageSquare, placeholder: "What new feature would you like to see? How would it help your business?" },
  { id: "bug",        label: "Technical Bug",              icon: Bug,           placeholder: "Please describe the steps to reproduce the bug and what happened..." },
  { id: "other",      label: "Other",                      icon: LifeBuoy,      placeholder: "Describe your inquiry in detail..." },
];

const InputError = ({ message }: { message?: string }) => {
  if (!message) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1.5 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      <span className="text-xs font-semibold">{message}</span>
    </div>
  );
};

export default function SupportClient({ userName, userEmail }: { userName: string; userEmail: string }) {
  const [submitted, setSubmitted]       = useState(false);
  const [loading, setLoading]           = useState(false);
  const [selectedReason, setReason]     = useState<typeof REASONS[0] | null>(null);
  const [isDropdownOpen, setDropdown]   = useState(false);
  const [fieldErrors, setFieldErrors]   = useState<Record<string, string>>({});
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const dropdownRef  = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdown(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const clearErr = (field: string) => {
    setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const subject  = (formData.get("subject") as string || "").trim();
    const message  = (formData.get("message") as string || "").trim();

    const errors: Record<string, string> = {};
    if (!selectedReason) errors.reason  = "Please select a category";
    if (!subject)        errors.subject = "Subject is required";
    if (!message)        errors.message = "Message cannot be empty";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    formData.set("name",  userName);
    formData.set("email", userEmail);
    formData.append("reason", selectedReason!.label);
    if (attachedFile) formData.append("attachment", attachedFile);

    const result = await sendSupportRequest(formData);
    if (result.error) {
      toast.error(result.error);
    } else {
      setSubmitted(true);
    }
    setLoading(false);
  };

  /* ── Success screen ─────────────────────────────────── */
  if (submitted) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 animate-fade-in">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2.5rem] p-12 text-center border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="h-20 w-20 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">Request Sent!</h2>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-8 text-sm">
            Our support team has received your message and will get back to you at{" "}
            <strong className="text-slate-700 dark:text-slate-300">{userEmail}</strong> within 2–4 business hours.
          </p>
          <button
            onClick={() => { setSubmitted(false); setReason(null); setAttachedFile(null); }}
            className="inline-flex h-12 px-8 bg-indigo-600 text-white rounded-2xl items-center justify-center font-bold text-sm transition-all hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-500/20"
          >
            Send Another Request
          </button>
        </div>
      </div>
    );
  }

  /* ── Form ───────────────────────────────────────────── */
  return (
    <div className="flex-1 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
      {/* Unified Section Header */}
      <div className="px-8 md:px-10 py-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-medium text-slate-900 dark:text-slate-200 tracking-tight">Support</h2>
        </div>
      </div>

      {/* Form Content in the Same Section */}
      <div className="p-8 md:p-10 max-w-2xl w-full">
        <form onSubmit={handleSubmit} noValidate className="space-y-6">

          {/* Category */}
          <div>
            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">
              Category <span className="text-rose-500">*</span>
            </label>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdown(v => !v)}
                className={`w-full rounded-2xl border-2 px-5 py-3 text-sm focus:outline-none transition-all flex items-center justify-between font-medium shadow-sm ${
                  fieldErrors.reason
                    ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500"
                    : "border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-800 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  {selectedReason ? (
                    <><selectedReason.icon className="h-4 w-4 text-indigo-500" /><span className="text-slate-900 dark:text-slate-100">{selectedReason.label}</span></>
                  ) : (
                    <span className="text-slate-400">Select a category...</span>
                  )}
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              <InputError message={fieldErrors.reason} />

              {isDropdownOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="max-h-64 overflow-y-auto">
                    {REASONS.map(r => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => { setReason(r); setDropdown(false); clearErr("reason"); }}
                        className={`w-full px-5 py-3 flex items-center gap-3 text-sm font-medium transition-colors text-left ${
                          selectedReason?.id === r.id
                            ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <r.icon className={`h-4 w-4 shrink-0 ${selectedReason?.id === r.id ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`} />
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">
              Subject <span className="text-rose-500">*</span>
            </label>
            <input
              name="subject"
              type="text"
              required
              onChange={() => clearErr("subject")}
              placeholder="Briefly describe your issue"
              className={`w-full rounded-2xl border-2 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white shadow-sm ${
                fieldErrors.subject
                  ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500"
                  : "border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-800 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900"
              }`}
            />
            <InputError message={fieldErrors.subject} />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">
              Message <span className="text-rose-500">*</span>
            </label>
            <textarea
              name="message"
              rows={6}
              required
              onChange={() => clearErr("message")}
              placeholder={selectedReason?.placeholder || "Describe your issue, request, or feedback in detail..."}
              className={`w-full rounded-2xl border-2 p-5 text-sm focus:outline-none resize-none transition-all dark:text-white shadow-sm ${
                fieldErrors.message
                  ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500"
                  : "border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-800 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900"
              }`}
            />
            <InputError message={fieldErrors.message} />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">
              Attachment <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.txt"
              onChange={e => { setAttachedFile(e.target.files?.[0] || null); }}
              className="hidden"
            />
            {attachedFile ? (
              <div className="flex items-center justify-between px-5 py-3 rounded-2xl border-2 border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 text-sm shadow-sm">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 truncate">
                  <Paperclip className="h-4 w-4 text-indigo-500 shrink-0" />
                  <span className="truncate font-medium">{attachedFile.name}</span>
                  <span className="text-slate-400 shrink-0 text-xs">({(attachedFile.size / 1024).toFixed(0)} KB)</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setAttachedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="ml-3 text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-2xl border-2 border-dashed border-indigo-100/80 dark:border-slate-800 bg-indigo-50/20 dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-slate-700 px-5 py-3 text-sm text-slate-400 dark:text-slate-500 flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Paperclip className="h-4 w-4" />
                Click to attach a file (image, PDF, doc…)
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? <div className="h-5 w-5 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
              : <><Send className="h-4 w-4" />Send Support Request</>
            }
          </button>
        </form>
      </div>
    </div>
  );
}
