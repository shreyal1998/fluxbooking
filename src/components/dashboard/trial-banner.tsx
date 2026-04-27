"use client";

import { AlertCircle, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface TrialBannerProps {
  planStatus: string | null;
  trialEndsAt: Date | null;
}

export function TrialBanner({ planStatus, trialEndsAt }: TrialBannerProps) {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (trialEndsAt) {
      const now = new Date();
      const end = new Date(trialEndsAt);
      const diffTime = end.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysRemaining(diffDays > 0 ? diffDays : 0);
    }
  }, [trialEndsAt]);

  if (planStatus !== "TRIALING" || daysRemaining === null) return null;

  return (
    <div className={`w-full px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-500 ${
      daysRemaining <= 3 
      ? "bg-rose-500 text-white shadow-lg shadow-rose-200" 
      : "bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none border border-transparent dark:border-white/10"
    }`}>
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm shadow-inner">
          {daysRemaining <= 3 ? (
            <AlertCircle className="h-5 w-5 animate-pulse" />
          ) : (
            <Clock className="h-5 w-5" />
          )}
        </div>
        <div>
           <p className="text-sm font-black tracking-tight leading-tight">
             {daysRemaining === 0 
               ? "Your Starter features trial ends today!" 
               : `Free Trial Active: You're using Starter features for ${daysRemaining} more day${daysRemaining === 1 ? "" : "s"}.`}
           </p>
           <p className="text-[10px] font-bold opacity-80 mt-0.5 uppercase tracking-widest">
             After the trial, you will revert to the 1-staff Free plan.
           </p>
        </div>
      </div>
      
      <Link 
        href="/dashboard/settings" 
        className="flex items-center gap-2 bg-white text-indigo-600 hover:bg-slate-50 px-6 py-2 rounded-xl text-xs font-black transition-all shadow-xl dark:shadow-none border border-transparent dark:border-indigo-400/20 active:scale-95"
      >
        Upgrade Now
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
