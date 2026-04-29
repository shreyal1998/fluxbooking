"use client";

import { Calendar } from "lucide-react";

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
        <div className={`bg-indigo-600 rounded-lg group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/20 ${iconPaddingClasses[size]} ${iconClassName}`}>
          <Calendar className={`text-white ${iconSizeClasses[size]}`} />
        </div>
      )}
      <span className={`font-bold tracking-tight text-slate-900 ${sizeClasses[size]} ${textClassName}`}>
        FluxBooking
      </span>
    </div>
  );
}
