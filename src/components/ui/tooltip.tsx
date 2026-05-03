"use client";

import React, { useState, useRef, useLayoutEffect, useEffect, ReactNode } from "react";
import { Portal } from "./portal";

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

export function Tooltip({ 
  content, 
  children, 
  position = "bottom", 
  delay = 300 
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
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

      const offset = 8;

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
      // Use a small timeout to ensure the browser has computed the dimensions
      setTimeout(() => {
        updatePosition(el);
      }, 0);
    }
  };

  const showTooltip = () => {
    timerRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsVisible(false);
    setIsPositioned(false);
  };

  useEffect(() => {
    if (isVisible) {
      window.addEventListener("scroll", hideTooltip, { passive: true });
      window.addEventListener("resize", hideTooltip);
    }
    return () => {
      window.removeEventListener("scroll", hideTooltip);
      window.removeEventListener("resize", hideTooltip);
    };
  }, [isVisible]);

  return (
    <div 
      ref={triggerRef} 
      className="inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onMouseDown={hideTooltip}
    >
      {children}
      {isVisible && (
        <Portal>
          <div
            ref={setTooltipRef}
            style={{ 
              top: coords.top, 
              left: coords.left,
              position: 'absolute',
              zIndex: 9999999,
              opacity: isPositioned ? 1 : 0,
              visibility: isPositioned ? 'visible' : 'hidden'
            }}
            className={`
              pointer-events-none px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest
              bg-slate-900/90 dark:bg-slate-800/95 backdrop-blur-md text-white
              border border-white/10 shadow-2xl shadow-black/20
              transition-opacity duration-150
              animate-in fade-in zoom-in-95
            `}
          >
            {content}
          </div>
        </Portal>
      )}
    </div>
  );
}
