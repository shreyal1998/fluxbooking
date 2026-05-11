"use client";

export function LiquidLoader() {
  return (
    <div className="premium-pulsar-container">
      <div className="liquid-loader">
        <div className="liquid-blob"></div>
        <div className="liquid-blob"></div>
        <div className="liquid-blob"></div>
      </div>
    </div>
  );
}

export function FullPageLiquidLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-slate-950 transition-colors duration-500">
      <LiquidLoader />
    </div>
  );
}

export function DashboardContentLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[400px]">
      <LiquidLoader />
    </div>
  );
}
