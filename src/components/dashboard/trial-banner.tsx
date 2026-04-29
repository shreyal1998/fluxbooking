"use client";

import { AlertCircle, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { differenceInCalendarDays } from "date-fns";

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
      const diffDays = differenceInCalendarDays(end, now);
      setDaysRemaining(diffDays > 0 ? diffDays : 0);
    }
  }, [trialEndsAt]);

  if (planStatus !== "TRIALING" || daysRemaining === null) return null;

  const isCritical = daysRemaining <= 3;

  return (
    <div className={`mx-4 mb-4 p-5 rounded-[2rem] border transition-all duration-500 group ${
      isCritical 
      ? "bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-900/50 shadow-lg shadow-rose-500/5" 
      : "bg-indigo-50 border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-900/30 shadow-lg shadow-indigo-500/5"
    }`}>
      <div className="flex items-start gap-3 mb-4">
        <div className={`h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg ${
          isCritical 
          ? "bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-rose-500/20" 
          : "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-indigo-500/20"
        }`}>
          {isCritical ? (
            <AlertCircle className="h-5 w-5 animate-pulse" />
          ) : (
            <Clock className="h-5 w-5" />
          )}
        </div>
        <div>
           <p className={`text-xs font-black tracking-tight leading-tight ${
             isCritical ? "text-rose-900 dark:text-rose-100" : "text-slate-900 dark:text-indigo-100"
           }`}>
             {daysRemaining === 0 
               ? "Trial ends today!" 
               : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left on trial.`}
           </p>
           <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest leading-relaxed">
             Starter Features
           </p>
        </div>
      </div>
      
      <Link 
        href="/dashboard/settings" 
        className={`flex items-center justify-center gap-2 w-full py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg ${
          isCritical 
          ? "bg-gradient-to-r from-rose-500 to-red-600 text-white hover:from-rose-600 hover:to-red-700 shadow-rose-500/30" 
          : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 shadow-indigo-500/30"
        }`}
      >
        <span>Upgrade Plan</span>
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
