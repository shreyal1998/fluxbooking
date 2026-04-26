"use client";

import { useEffect } from "react";

export function useLockBodyScroll(lock: boolean) {
  useEffect(() => {
    if (lock) {
      // Save the original body overflow style
      const originalStyle = window.getComputedStyle(document.body).overflow;
      // Prevent scrolling
      document.body.style.overflow = "hidden";
      
      // Cleanup: Restore the original style
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [lock]);
}
