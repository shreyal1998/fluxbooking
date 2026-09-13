"use client";

import React, { useState, useRef, useLayoutEffect, useEffect, ReactNode } from "react";
import { Portal } from "./portal";

interface TooltipProps {
  content: React.ReactNode;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
  interactive?: boolean;
  variant?: "default" | "light";
  className?: string;
}

export function Tooltip({ 
  content, 
  children, 
  position = "bottom", 
  delay = 300,
  interactive = true,
  variant = "default",
  className = ""
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const isPinnedRef = useRef(false);
  isPinnedRef.current = isPinned;

  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const updatePosition = (el: HTMLDivElement) => {
    if (triggerRef.current && el) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = el.getBoundingClientRect();
      
      let top = 0;
      let left = 0;

      const offset = 6;

      switch (position) {
        case "top":
          top = triggerRect.top - tooltipRect.height - offset;
          left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
          break;
        case "bottom":
          top = triggerRect.bottom + offset;
          left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
          break;
        case "left":
          top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
          left = triggerRect.left - tooltipRect.width - offset;
          break;
        case "right":
          top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
          left = triggerRect.right + offset;
          break;
      }

      setCoords({ top: top + window.scrollY, left: left + window.scrollX });
      setIsPositioned(true);
    }
  };

  const setTooltipRef = (el: HTMLDivElement | null) => {
    tooltipRef.current = el;
    if (el) {
      setTimeout(() => {
        updatePosition(el);
      }, 0);
    }
  };

  const showTooltip = () => {
    if (isPinnedRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (isPinnedRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!isPinnedRef.current) {
        setIsVisible(false);
        setIsPositioned(false);
      }
    }, 180);
  };

  const cancelHide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsPinned((prev) => {
      const next = !prev;
      if (next) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
        setIsPositioned(false);
      }
      return next;
    });
  };

  // Outside click listener for pinned mode
  useEffect(() => {
    if (!isPinned) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        tooltipRef.current && !tooltipRef.current.contains(target)
      ) {
        setIsPinned(false);
        setIsVisible(false);
        setIsPositioned(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPinned]);

  // Window repositioning on scroll/resize
  useEffect(() => {
    if (isVisible) {
      const handleScrollOrResize = () => {
        if (tooltipRef.current) {
          updatePosition(tooltipRef.current);
        }
      };
      window.addEventListener("scroll", handleScrollOrResize, { passive: true });
      window.addEventListener("resize", handleScrollOrResize);
      return () => {
        window.removeEventListener("scroll", handleScrollOrResize);
        window.removeEventListener("resize", handleScrollOrResize);
      };
    }
  }, [isVisible]);

  const variantClasses = variant === "light"
    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-900/10 dark:shadow-black/60"
    : "bg-indigo-600 dark:bg-indigo-600 text-white border border-indigo-500/20 dark:border-indigo-400/20 shadow-2xl shadow-indigo-500/10";

  return (
    <div 
      ref={triggerRef} 
      className="inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onClick={handleTriggerClick}
    >
      {children}
      {isVisible && (
        <Portal>
          <div
            ref={setTooltipRef}
            onMouseEnter={cancelHide}
            onMouseLeave={hideTooltip}
            style={{ 
              top: coords.top, 
              left: coords.left,
              position: 'absolute',
              zIndex: 9999999,
              opacity: isPositioned ? 1 : 0,
              visibility: isPositioned ? 'visible' : 'hidden'
            }}
            className={`
              ${interactive ? "pointer-events-auto" : "pointer-events-none"} px-3.5 py-2.5 rounded-2xl text-xs font-medium tracking-wide
              ${variantClasses}
              transition-opacity duration-150
              animate-in fade-in zoom-in-95
              ${className}
            `}
          >
            {content}
          </div>
        </Portal>
      )}
    </div>
  );
}
