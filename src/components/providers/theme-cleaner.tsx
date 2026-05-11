"use client";

import { useEffect } from "react";

export function ThemeCleaner() {
  useEffect(() => {
    // Force remove 'dark' class from html on mount
    // and ensure it stays off while this component is active
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
  }, []);

  return null;
}
