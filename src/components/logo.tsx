"use client";

interface LogoProps {
  className?: string;
  showIcon?: boolean;
  iconClassName?: string;
  textClassName?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export function Logo({ 
  className = "", 
  showIcon = true, 
  iconClassName = "", 
  textClassName = "",
  size = "2xl" 
}: LogoProps) {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-md",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl"
  };

  const iconSizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
    xl: "h-5 w-5",
    "2xl": "h-5 w-5"
  };

  const iconPaddingClasses = {
    sm: "p-1",
    md: "p-1",
    lg: "p-1.5",
    xl: "p-1.5",
    "2xl": "p-1.5"
  };

  return (
    <div className={`flex items-center gap-2 group outline-none ${className}`}>
      {showIcon && (
        <div className={`bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20 ${iconPaddingClasses[size]} ${iconClassName} shrink-0`}>
          <svg 
            viewBox="0 0 32 32" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className={`text-white transition-transform duration-300 group-hover:scale-110 ${iconSizeClasses[size]}`}
          >
            <path d="M10 8H22V11H13V15H20V18H13V24H10V8Z" fill="currentColor"/>
            <path d="M18 20L21 23L26 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
      <span className={`font-bold tracking-tight text-slate-900 dark:text-white ${sizeClasses[size]} ${textClassName}`}>
        FluxBooking
      </span>
    </div>
  );
}
