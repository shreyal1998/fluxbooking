"use client";

import { useEffect } from "react";

export function ThemeCleaner() {
  useEffect(() => {
    const html = document.documentElement;

    // Force light scheme scrollbars
    const originalColorScheme = html.style.colorScheme;
    html.style.colorScheme = "light";

    // Set up observer to block dark mode from being re-added on public pages
    const observer = new MutationObserver(() => {
      if (html.classList.contains("dark")) {
        html.classList.remove("dark");
      }
    });

    observer.observe(html, { attributes: true, attributeFilter: ["class"] });

    // Initial check and cleanup
    if (html.classList.contains("dark")) {
      html.classList.remove("dark");
    }

    return () => {
      observer.disconnect();
      html.style.colorScheme = originalColorScheme;
    };
  }, []);

  return null;
}
