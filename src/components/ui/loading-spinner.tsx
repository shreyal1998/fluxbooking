"use client";

export function LoadingSpinner() {
  return (
    <div className="relative flex flex-col items-center justify-center gap-6">
      {/* High-Fidelity Glass Backdrop */}
      <div className="absolute -inset-16 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[3rem] animate-pulse pointer-events-none border border-white/20 dark:border-slate-800/50 shadow-2xl"></div>
      
      <div className="relative">
        {/* Deep Indigo Glow */}
        <div className="absolute inset-0 rounded-full bg-indigo-500/30 blur-2xl animate-pulse scale-150"></div>
        
        {/* The Spinner */}
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-800"></div>
          <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin shadow-[0_0_20px_rgba(79,70,229,0.4)]"></div>
        </div>
      </div>
    </div>
  );
}

export function PremiumLoadingPage() {
  return (
    <div className="flex-1 w-full flex items-center justify-center transition-all duration-500">
      <LoadingSpinner />
    </div>
  );
}
