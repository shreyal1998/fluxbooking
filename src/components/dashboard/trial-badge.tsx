"use client";

import { Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { differenceInCalendarDays } from "date-fns";

interface TrialBadgeProps {
  planStatus: string | null;
  trialEndsAt: Date | null;
}

export function TrialBadge({ planStatus, trialEndsAt }: TrialBadgeProps) {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const TRIAL_DURATION = 14; // Standard 14-day trial

  useEffect(() => {
    if (trialEndsAt) {
      const now = new Date();
      const end = new Date(trialEndsAt);
      const diffDays = differenceInCalendarDays(end, now);
      setDaysRemaining(diffDays > 0 ? diffDays : 0);
    }
  }, [trialEndsAt]);

  if (planStatus !== "TRIALING" || daysRemaining === null) return null;

  // Calculate circular progress (dash-offset)
  // Circumference = 2 * PI * R (R=16 here, so ~100)
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(100, Math.max(0, (daysRemaining / TRIAL_DURATION) * 100));
  const offset = circumference - (percentage / 100) * circumference;

  const isCritical = daysRemaining <= 3;

  return (
    <Link 
      href="/dashboard/settings"
      className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 rounded-2xl bg-white/50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 transition-all hover:scale-[1.02] active:scale-95 group shadow-sm"
    >
      {/* Circular Progress SVG */}
      <div className="relative h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center shrink-0">
        <svg viewBox="0 0 40 40" className="transform -rotate-90 h-full w-full">
          <circle
            cx="20"
            cy="20"
            r={radius}
            stroke="currentColor"
            strokeWidth="2.5"
            fill="transparent"
            className="text-slate-100 dark:text-slate-700/50"
          />
          <circle
            cx="20"
            cy="20"
            r={radius}
            stroke="currentColor"
            strokeWidth="2.5"
            fill="transparent"
            strokeDasharray={circumference}
            style={{ strokeDashoffset: offset }}
            strokeLinecap="round"
            className={`transition-all duration-1000 ease-in-out ${
              isCritical ? "text-rose-500" : "text-indigo-600"
            }`}
          />
        </svg>
        <span className={`absolute text-[10px] sm:text-[11px] font-black tracking-tighter ${
          isCritical ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"
        }`}>
          {daysRemaining}
        </span>
      </div>

      {/* Info Text - Hidden on smallest mobile, shown from 'sm' breakpoint up */}
      <div className="hidden sm:flex flex-col leading-none">
        <div className="flex items-center gap-1 mb-0.5">
          <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-tight ${
            isCritical ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-200"
          }`}>
            TRIAL DAYS
          </span>
          <Zap className={`h-2 w-2 sm:h-2.5 sm:w-2.5 ${isCritical ? "text-rose-500 fill-rose-500" : "text-indigo-500 fill-indigo-500"} group-hover:animate-bounce`} />
        </div>
        <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest group-hover:underline underline-offset-2 ${
          isCritical ? "text-rose-600 dark:text-rose-400" : "text-indigo-600 dark:text-indigo-400"
        }`}>
          Upgrade
        </span>
      </div>
    </Link>
  );
}
