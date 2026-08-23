"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";

export function ScrollToTop() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [brandColor, setBrandColor] = useState<string | null>(null);

  // 1. EARLY EXIT: Identify pages where the utility should NEVER appear
  const hideOnPages = [
    "/register", "/login", "/overview",
    "/services", "/staff", "/customers", 
    "/classes", "/treatments",
    "/team", "/trainers", "/practitioners",
    "/clients", "/members", "/patients",
    "/my-schedule", "/settings"
  ];
  const shouldHide = hideOnPages.some(path => pathname === path || pathname.startsWith(path + "/"));

  useEffect(() => {
    if (shouldHide) return;

    const findBrandColor = () => {
      const el = document.querySelector("[data-brand-color]");
      if (el) {
        const color = el.getAttribute("data-brand-color");
        setBrandColor(color || null);
      } else {
        setBrandColor(null);
      }
    };

    findBrandColor();
    const observer = new MutationObserver(findBrandColor);
    observer.observe(document.body, { attributes: true, childList: true, subtree: true });

    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    toggleVisibility();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, [pathname, shouldHide]);

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
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={
          brandColor
            ? {
                backgroundColor: isHovered ? brandColor : `${brandColor}b3`,
                borderColor: `${brandColor}33`,
                boxShadow: isHovered ? `0 10px 25px -5px ${brandColor}50` : undefined,
              }
            : undefined
        }
        className={`h-9 w-9 text-white rounded-xl flex items-center justify-center shadow-md backdrop-blur-sm hover:scale-110 active:scale-95 transition-all group border ${
          brandColor
            ? ""
            : "bg-indigo-600/70 dark:bg-indigo-500/70 hover:bg-indigo-600 dark:hover:bg-indigo-500 border-indigo-500/20"
        }`}
        aria-label="Scroll to top"
      >
        <ArrowUp className="h-4 w-4 stroke-[3] group-hover:-translate-y-0.5 transition-transform" />
      </button>
    </div>
  );
}
