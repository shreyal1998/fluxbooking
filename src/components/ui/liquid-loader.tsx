"use client";

export function LiquidLoader({ color }: { color?: string } = {}) {
  return (
    <div className="premium-pulsar-container">
      <div 
        className="liquid-loader"
        style={
          color
            ? ({
                "--liquid-blob-1": color,
                "--liquid-blob-2": `${color}cc`,
                "--liquid-blob-3": `${color}99`,
                "--liquid-blob-shadow": `0 0 15px ${color}66`,
              } as React.CSSProperties)
            : undefined
        }
      >
        <div className="liquid-blob"></div>
        <div className="liquid-blob"></div>
        <div className="liquid-blob"></div>
      </div>
    </div>
  );
}

export function FullPageLiquidLoader({ color }: { color?: string } = {}) {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-slate-950 transition-colors duration-500">
      <LiquidLoader color={color} />
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
