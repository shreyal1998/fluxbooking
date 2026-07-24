"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { saveUserTheme } from "@/app/actions/schedule";

function ThemeCookieSyncer() {
  const { theme } = useTheme();
  
  React.useEffect(() => {
    if (theme === "dark" || theme === "light" || theme === "system") {
      document.cookie = `theme=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
      saveUserTheme(theme);
    }
  }, [theme]);

  return null;
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <ThemeCookieSyncer />
      {children}
    </NextThemesProvider>
  );
}
