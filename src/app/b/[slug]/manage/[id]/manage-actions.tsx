"use client";

import { useState } from "react";
import { format, isToday, isTomorrow, parse } from "date-fns";
import { ArrowRight, XCircle, CheckCircle2, Loader2, Sparkles, Calendar, AlertCircle } from "lucide-react";
import { rescheduleBookingByCustomer, cancelBookingByCustomer } from "@/app/actions/booking";
import { toast } from "sonner";
import Link from "next/link";
import { getLabels } from "@/lib/labels";
import { BusinessType } from "@prisma/client";

interface Slot {
  date: string;
  time: string;
  staffName: string;
}

interface ManageActionsProps {
  bookingId: string;
  slug: string;
  suggestions: Slot[];
  timeFormat?: string;
  businessType?: BusinessType;
  initialStatus?: "idle" | "success" | "cancelled";
}

export function ManageActions({ 
  bookingId, 
  slug, 
  suggestions, 
  timeFormat = "12h", 
  businessType,
  initialStatus = "idle"
}: ManageActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "cancelled">(initialStatus);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const labels = getLabels(businessType);

  const handleInstantReschedule = async (slot: Slot) => {
    const slotKey = `${slot.date}-${slot.time}`;
    loading === null && setLoading(slotKey);
    
    const result = await rescheduleBookingByCustomer(bookingId, slot.date, slot.time);
    
    if (result.success) {
      setStatus("success");
      toast.success("Booking moved successfully!");
    } else {
      toast.error(result.error || "Failed to reschedule");
      setLoading(null);
    }
  };

  const proceedCancel = async () => {
    setLoading("cancel");
    const result = await cancelBookingByCustomer(bookingId);
    
    if (result.success) {
      setStatus("cancelled");
      toast.success(`${labels.appointment} cancelled.`);
    } else {
      toast.error(result.error || "Failed to cancel");
      setLoading(null);
    }
  };

  const getFriendlyDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    return format(d, "EEEE");
  };

  const formatTimeSlot = (timeStr: string) => {
    try {
      const parsedTime = parse(timeStr, "HH:mm", new Date());
      return format(parsedTime, timeFormat === "24h" ? "HH:mm" : "h:mm a");
    } catch {
      return timeStr;
    }
  };

  if (status === "success") {
    return (
      <div className="p-10 text-center space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 dark:border-emerald-900/30 shadow-xl shadow-emerald-500/10 dark:shadow-none">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />
        </div>
        <div className="space-y-1">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Time Updated!</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">We've sent a new confirmation email with your updated details.</p>
        </div>
        <Link 
          href={`/b/${slug}`}
          className="inline-flex h-12 px-8 bg-slate-900 dark:bg-slate-100 text-sm text-white dark:text-slate-950 rounded-xl items-center justify-center font-bold transition-all hover:bg-slate-800 dark:hover:bg-slate-200 hover:scale-105 active:scale-95"
        >
          Back to Booking
        </Link>
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className="p-10 text-center space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100 dark:border-rose-900/30 shadow-xl shadow-rose-500/10 dark:shadow-none">
          <XCircle className="h-8 w-8 text-rose-500 dark:text-rose-400" />
        </div>
        <div className="space-y-1">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{labels.appointment} Cancelled</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Your slot has been released. We hope to see you again soon!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Suggestions Section */}
      {suggestions.length > 0 && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <div className="flex items-center gap-2 px-1">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h2 className="text-xs sm:text-sm font-semibold tracking-wide text-slate-500 dark:text-slate-400">Fast Reschedule Options</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {suggestions.map((slot, i) => {
              const slotKey = `${slot.date}-${slot.time}`;
              const isThisLoading = loading === slotKey;
              return (
                <button
                  key={i}
                  disabled={!!loading}
                  onClick={() => handleInstantReschedule(slot)}
                  className="p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-600 dark:hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/5 transition-all text-left group disabled:opacity-50 cursor-pointer"
                >
                  <p className="text-[10px] sm:text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-0.5">{getFriendlyDate(slot.date)}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">{formatTimeSlot(slot.time)}</span>
                    {isThisLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-700 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Actions */}
      <div className="flex flex-col sm:flex-row gap-3.5 pt-2">
        <Link 
          href={`/b/${slug}?reschedule=${bookingId}`}
          className={`flex-1 h-12 bg-indigo-600 dark:bg-indigo-600 text-sm sm:text-base text-white rounded-xl flex items-center justify-center gap-2 font-bold transition-all hover:bg-indigo-700 dark:hover:bg-indigo-500 hover:scale-[1.01] active:scale-95 shadow-lg shadow-indigo-100 dark:shadow-none ${loading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          Reschedule booking <Calendar className="h-4 w-4 ml-0.5" />
        </Link>
        <button 
          onClick={() => setShowCancelModal(true)}
          disabled={!!loading}
          className="flex-1 h-12 bg-white dark:bg-slate-900 text-sm sm:text-base text-rose-600 dark:text-rose-400 border-2 border-rose-100 dark:border-rose-950/40 rounded-xl flex items-center justify-center gap-2 font-bold transition-all hover:bg-rose-50 dark:hover:bg-rose-950/15 hover:border-rose-200 disabled:opacity-50 cursor-pointer"
        >
          {loading === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
          Cancel {labels.appointment}
        </button>
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md" 
          />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-2xl p-6 text-center space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="mx-auto h-16 w-16 rounded-full bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 shadow-xl shadow-rose-500/10 dark:shadow-none animate-bounce">
              <XCircle className="h-8 w-8" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Cancel {labels.appointment}?</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Are you sure you want to cancel this {labels.appointmentLower}? This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3.5 pt-2">
              <button 
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                No, Keep It
              </button>
              <button 
                onClick={() => {
                  setShowCancelModal(false);
                  proceedCancel();
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 dark:bg-rose-700 text-white text-sm font-bold hover:bg-rose-700 dark:hover:bg-rose-600 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
