"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Monitor, Check } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const options = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = theme === option.value;

        return (
          <button
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-200 ${
              isActive 
                ? "bg-indigo-50 border-indigo-600 text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-500 dark:text-indigo-400 shadow-lg shadow-indigo-100 dark:shadow-none" 
                : "bg-white border-slate-100 text-slate-500 hover:border-indigo-200 hover:bg-indigo-50/30 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800/50"
            }`}
          >
            <div className={`p-3 rounded-xl ${isActive ? 'bg-indigo-600 text-white dark:bg-indigo-500' : 'bg-slate-50 dark:bg-slate-800'}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">{option.label}</span>
              {isActive && <Check className="h-4 w-4" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
