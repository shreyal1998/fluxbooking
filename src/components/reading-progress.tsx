"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function ReadingProgress() {
  const pathname = usePathname();
  const [completion, setCompletion] = useState(0);

  // 1. EARLY EXIT: Identical exclusion list
  const hideOnPages = ["/register", "/login", "/dashboard"];
  const shouldHide = hideOnPages.some(path => pathname === path || pathname.startsWith(path + "/"));

  useEffect(() => {
    if (shouldHide) return;

    const updateScrollCompletion = () => {
      const currentProgress = window.scrollY;
      const scrollHeight = document.body.scrollHeight - window.innerHeight;
      if (scrollHeight) {
        setCompletion(Number((currentProgress / scrollHeight).toFixed(2)) * 100);
      }
    };

    window.addEventListener("scroll", updateScrollCompletion);
    return () => window.removeEventListener("scroll", updateScrollCompletion);
  }, [shouldHide]);

  // 2. Absolute Block
  if (shouldHide) return null;

  return (
    <div className="fixed top-0 left-0 w-full h-1 z-[101] pointer-events-none">
      <div 
        className="h-full bg-indigo-600 transition-all duration-150 ease-out"
        style={{ width: `${completion}%` }}
      />
    </div>
  );
}
