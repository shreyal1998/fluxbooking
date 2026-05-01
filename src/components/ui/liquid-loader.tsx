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
    <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-slate-950">
      <LiquidLoader />
    </div>
  );
}
