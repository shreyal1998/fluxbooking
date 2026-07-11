"use client";

import { useEffect, useState, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { Portal } from "@/components/ui/portal";
import { Clock, LogOut } from "lucide-react";

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const WARNING_TIMEOUT_SECS = 30;

export function InactivityTimeout() {
  const { data: session, status } = useSession();
  const [isLoggedOutOpen, setIsLoggedOutOpen] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      handleAutoLogout();
    }, INACTIVITY_TIMEOUT);
  };

  const handleAutoLogout = async () => {
    setIsLoggedOutOpen(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // Sign out on the server in the background
    await signOut({ redirect: false });
  };

  const handleRedirectToLogin = () => {
    window.location.href = "/login?reason=inactive";
  };

  useEffect(() => {
    if (status !== "authenticated" || isLoggedOutOpen) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    resetTimer();

    const activityEvents = ["mousemove", "keydown", "mousedown", "scroll", "touchstart"];
    const handleUserActivity = () => {
      if (isLoggedOutOpen) return;
      const now = Date.now();
      if (now - lastActivityRef.current > 2000) {
        lastActivityRef.current = now;
        resetTimer();
      }
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity);
    });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [status, isLoggedOutOpen]);

  useEffect(() => {
    if (isLoggedOutOpen) {
      document.body.classList.add("inactivity-active");
    } else {
      document.body.classList.remove("inactivity-active");
    }
    return () => {
      document.body.classList.remove("inactivity-active");
    };
  }, [isLoggedOutOpen]);

  if (!isLoggedOutOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
        <div 
          className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-[0_32px_64px_-12px_rgba(15,23,42,0.15)] w-full max-w-sm overflow-hidden transform transition-all scale-100 p-8 animate-in zoom-in-95 duration-300"
          role="dialog"
          aria-modal="true"
        >
          {/* Animated clock warning icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-500 animate-pulse">
            <Clock className="h-8 w-8" />
          </div>

          <h3 className="text-center text-2xl font-black text-slate-900 dark:text-white mt-5 tracking-tight">
            Logout
          </h3>
          <p className="text-center text-sm font-medium text-slate-500 dark:text-slate-400 mt-3 px-2 leading-relaxed">
            Your security is our priority. Your session has closed due to inactivity.
          </p>
          
          {/* Action */}
          <div className="mt-8">
            <button
              onClick={handleRedirectToLogin}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-600/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center outline-none"
            >
              <span>Login</span>
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
