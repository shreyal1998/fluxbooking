"use client";

import { signOut } from "next-auth/react";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export function LockedStaffScreen({ tenantName }: { tenantName: string }) {
  useEffect(() => {
    // Automatically trigger sign out and redirect
    signOut({ callbackUrl: "/login?error=locked" });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl p-10 space-y-8 animate-fade-in">
        <div className="h-16 w-16 rounded-[1.5rem] bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        
        <div className="space-y-3">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
            Signing Out...
          </h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {tenantName}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed pt-2">
            Your practitioner account is locked because the active plan limit is exceeded. Signing you out...
          </p>
        </div>
      </div>
    </div>
  );
}
