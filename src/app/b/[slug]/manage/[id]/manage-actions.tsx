"use client";

import { useState } from "react";
import { format, isToday, isTomorrow } from "date-fns";
import { ArrowRight, XCircle, CheckCircle2, Loader2, Sparkles, AlertCircle, Calendar } from "lucide-react";
import { rescheduleBookingByCustomer, cancelBookingByCustomer } from "@/app/actions/booking";
import { toast } from "sonner";
import Link from "next/link";

interface Slot {
  date: string;
  time: string;
  staffName: string;
}

interface ManageActionsProps {
  bookingId: string;
  slug: string;
  suggestions: Slot[];
}

export function ManageActions({ bookingId, slug, suggestions }: ManageActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "cancelled">("idle");

  const handleInstantReschedule = async (slot: Slot) => {
    const slotKey = `${slot.date}-${slot.time}`;
    setLoading(slotKey);
    
    const result = await rescheduleBookingByCustomer(bookingId, slot.date, slot.time);
    
    if (result.success) {
      setStatus("success");
      toast.success("Appointment moved successfully!");
    } else {
      toast.error(result.error || "Failed to reschedule");
      setLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this appointment? This cannot be undone.")) return;
    
    setLoading("cancel");
    const result = await cancelBookingByCustomer(bookingId);
    
    if (result.success) {
      setStatus("cancelled");
      toast.success("Appointment cancelled.");
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

  if (status === "success") {
    return (
      <div className="p-12 text-center space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-xl shadow-emerald-500/10">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>
        <div className="space-y-2">
          <h3 className="text-3xl font-black text-slate-900">Time Updated!</h3>
          <p className="text-slate-500 font-medium">We've sent a new confirmation email with your updated details.</p>
        </div>
        <Link 
          href={`/b/${slug}`}
          className="inline-flex h-14 px-10 bg-slate-900 text-white rounded-2xl items-center justify-center font-black transition-all hover:bg-slate-800 hover:scale-105 active:scale-95"
        >
          Back to Booking
        </Link>
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className="p-12 text-center space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100 shadow-xl shadow-rose-500/10">
          <XCircle className="h-10 w-10 text-rose-500" />
        </div>
        <div className="space-y-2">
          <h3 className="text-3xl font-black text-slate-900">Appointment Cancelled</h3>
          <p className="text-slate-500 font-medium">Your slot has been released. We hope to see you again soon!</p>
        </div>
        <Link 
          href={`/b/${slug}`}
          className="inline-flex h-14 px-10 bg-slate-900 text-white rounded-2xl items-center justify-center font-black transition-all hover:bg-slate-800 hover:scale-105 active:scale-95"
        >
          Book a New Time
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Suggestions Section */}
      {suggestions.length > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <div className="flex items-center gap-2 px-1">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Fast Reschedule Options</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {suggestions.map((slot, i) => {
              const slotKey = `${slot.date}-${slot.time}`;
              const isThisLoading = loading === slotKey;
              return (
                <button
                  key={i}
                  disabled={!!loading}
                  onClick={() => handleInstantReschedule(slot)}
                  className="p-5 rounded-[1.5rem] border-2 border-slate-100 bg-white hover:border-indigo-600 hover:shadow-xl hover:shadow-indigo-500/10 transition-all text-left group disabled:opacity-50"
                >
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider mb-1">{getFriendlyDate(slot.date)}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-slate-900">{slot.time}</span>
                    {isThisLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                    ) : (
                      <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Actions */}
      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <Link 
          href={`/b/${slug}?reschedule=${bookingId}`}
          className={`flex-1 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center gap-2 font-black transition-all hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 shadow-xl shadow-indigo-100 ${loading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          Browse Full Calendar <Calendar className="h-5 w-5 ml-1" />
        </Link>
        <button 
          onClick={handleCancel}
          disabled={!!loading}
          className="flex-1 h-16 bg-white text-rose-600 border-2 border-rose-100 rounded-2xl flex items-center justify-center gap-2 font-black transition-all hover:bg-rose-50 hover:border-rose-200 disabled:opacity-50"
        >
          {loading === "cancel" ? <Loader2 className="h-5 w-5 animate-spin" /> : <XCircle className="h-5 w-5" />}
          Cancel Appointment
        </button>
      </div>
    </div>
  );
}
