"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";

export function ScrollToTop() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  // 1. EARLY EXIT: Identify pages where the utility should NEVER appear
  const hideOnPages = ["/register", "/login", "/dashboard"];
  const shouldHide = hideOnPages.some(path => pathname === path || pathname.startsWith(path + "/"));

  useEffect(() => {
    if (shouldHide) return;

    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    toggleVisibility();
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, [shouldHide]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  };

  // 2. Absolute Block: Return nothing if on a hidden page
  if (shouldHide) return null;

  return (
    <div 
      className={`fixed bottom-8 right-8 z-[100] transition-all duration-500 transform ${
        isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-10 scale-50 pointer-events-none"
      }`}
    >
      <button
        onClick={scrollToTop}
        className="h-12 w-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/40 hover:bg-indigo-700 hover:scale-110 active:scale-95 transition-all group border border-indigo-400/20"
        aria-label="Scroll to top"
      >
        <ArrowUp className="h-5 w-5 stroke-[3] group-hover:-translate-y-1 transition-transform" />
      </button>
    </div>
  );
}
