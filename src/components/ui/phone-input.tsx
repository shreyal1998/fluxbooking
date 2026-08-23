"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronDown, Search } from "lucide-react";
import { COUNTRIES } from "@/config/countries";
import { Portal } from "@/components/ui/portal";
import { validatePhoneNumber } from "@/lib/utils";

// Helper to convert country ISO code to flag emoji
export function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  try {
    return String.fromCodePoint(...codePoints);
  } catch (e) {
    return "🌐";
  }
}

interface PhoneInputProps {
  name?: string;
  defaultValue?: string;
  defaultCountry?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  hasError?: boolean;
  primaryColor?: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
}

const getMaxDigits = (code: string) => {
  switch (code) {
    case "IN":
    case "US":
    case "CA":
      return 10;
    case "AU":
      return 9;
    case "GB":
      return 10;
    default:
      return 15;
  }
};

export function PhoneInput({
  name = "phone",
  defaultValue = "",
  defaultCountry = "US",
  placeholder = "234 567 890",
  className = "",
  required = false,
  hasError = false,
  primaryColor,
  onChange,
  onFocus,
}: PhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const triggerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownContentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Position state for portal dropdown
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  // Function to calculate exact floating position
  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      
      // If space below is less than dropdown height (256px) and there's more space above, open upwards
      if (spaceBelow < 280 && rect.top > 280) {
        setCoords({
          top: rect.top + window.scrollY - 264, // 256px dropdown height + 8px margin
          left: rect.left + window.scrollX,
        });
      } else {
        setCoords({
          top: rect.bottom + window.scrollY + 8, // 8px margin
          left: rect.left + window.scrollX,
        });
      }
    }
  };

  // Update coordinates whenever dropdown is opened, window is resized, or scrolled
  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener("resize", updateCoords);
      window.addEventListener("scroll", updateCoords, { capture: true });
    }
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, { capture: true });
    };
  }, [isOpen]);

  // Sort countries by phoneCode length descending to match longest code first
  const sortedCountries = useMemo(() => {
    return [...COUNTRIES].sort((a, b) => b.phoneCode.length - a.phoneCode.length);
  }, []);

  // Parse initial value to extract country code and local number
  const initialData = useMemo(() => {
    let cleanVal = defaultValue.trim();
    if (!cleanVal.startsWith("+")) {
      const defaultData = COUNTRIES.find((c) => c.code === defaultCountry) || COUNTRIES.find((c) => c.code === "US");
      return {
        country: defaultData || COUNTRIES[0],
        local: cleanVal,
      };
    }

    for (const c of sortedCountries) {
      const prefix = `+${c.phoneCode}`;
      if (cleanVal.startsWith(prefix)) {
        let local = cleanVal.slice(prefix.length).trim();
        return {
          country: c,
          local: local,
        };
      }
    }

    const defaultData = COUNTRIES.find((c) => c.code === defaultCountry) || COUNTRIES.find((c) => c.code === "US");
    return {
      country: defaultData || COUNTRIES[0],
      local: cleanVal,
    };
  }, [defaultValue, defaultCountry, sortedCountries]);

  const [selectedCountry, setSelectedCountry] = useState(initialData.country);
  const [localNumber, setLocalNumber] = useState(initialData.local);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const activePlaceholder = useMemo(() => {
    if (placeholder && placeholder !== "234 567 890" && placeholder !== "Phone (Optional)") {
      return placeholder;
    }
    switch (selectedCountry.code) {
      case "IN":
        return "98765 43210";
      case "GB":
        return "7911 123456";
      case "AU":
        return "412 345 678";
      case "US":
      case "CA":
        return "234 567 890";
      default:
        return "123 456 7890";
    }
  }, [placeholder, selectedCountry]);

  const handleValidation = (value: string) => {
    const cleanLocal = value.replace(/[^\d\s-]/g, "").trim();
    if (!cleanLocal) {
      setError(null);
      return;
    }
    const fullNum = `+${selectedCountry.phoneCode} ${cleanLocal}`;
    setError(validatePhoneNumber(fullNum));
  };

  useEffect(() => {
    setSelectedCountry(initialData.country);
    setLocalNumber(initialData.local);
    setError(null);
    setTouched(false);
  }, [initialData]);

  // Truncate number if country switches and it exceeds max length
  useEffect(() => {
    const max = getMaxDigits(selectedCountry.code);
    const digits = localNumber.replace(/\D/g, "");
    if (digits.length > max) {
      let digitCount = 0;
      let truncateIndex = localNumber.length;
      for (let i = 0; i < localNumber.length; i++) {
        if (/\d/.test(localNumber[i])) {
          digitCount++;
          if (digitCount > max) {
            truncateIndex = i;
            break;
          }
        }
      }
      setLocalNumber(localNumber.slice(0, truncateIndex));
    }
  }, [selectedCountry]);

  // Handle click outside dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedInsideTrigger = triggerRef.current && triggerRef.current.contains(target);
      const clickedInsideDropdown = dropdownContentRef.current && dropdownContentRef.current.contains(target);
      
      if (!clickedInsideTrigger && !clickedInsideDropdown) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredCountries = useMemo(() => {
    if (!searchQuery) return COUNTRIES;
    const lower = searchQuery.toLowerCase();
    const cleanQuery = lower.startsWith("+") ? lower.slice(1) : lower;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        c.phoneCode.includes(cleanQuery) ||
        c.code.toLowerCase().includes(lower)
    );
  }, [searchQuery]);

  const fullNumber = useMemo(() => {
    const cleanLocal = localNumber.replace(/[^\d\s-]/g, "").trim();
    if (!cleanLocal) return "";
    return `+${selectedCountry.phoneCode} ${cleanLocal}`;
  }, [selectedCountry, localNumber]);

  const isError = Boolean(error || (hasError && !isFocused));

  return (
    <div className="w-full flex flex-col gap-1.5">
      <div 
        ref={triggerRef}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (!target.closest("button") && !isOpen) {
            inputRef.current?.focus();
          }
        }}
        style={
          primaryColor
            ? {
                borderColor: isError ? undefined : (isFocused ? primaryColor : `${primaryColor}25`),
                backgroundColor: isError ? undefined : (isFocused ? "#ffffff" : `${primaryColor}08`),
              }
            : undefined
        }
        className={`relative flex items-center w-full rounded-2xl border-2 transition-colors duration-75 shadow-sm cursor-text ${
          isError 
            ? "border-rose-200 bg-rose-50/10 dark:bg-rose-900/10 focus-within:border-rose-500 hover:border-rose-300" 
            : isFocused
              ? "border-indigo-600 dark:border-indigo-500 bg-white dark:bg-slate-900"
              : "border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-800"
        } ${className}`}
      >
        {/* Country Select Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={primaryColor ? { borderColor: `${primaryColor}25` } : undefined}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm text-slate-800 dark:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 rounded-l-2xl border-r transition-colors cursor-pointer select-none ${
            isError 
              ? "border-rose-200 dark:border-rose-900/30" 
              : "border-indigo-100/50 dark:border-slate-800"
          }`}
        >
          <span className="text-base leading-none select-none">{getFlagEmoji(selectedCountry.code)}</span>
          <span className="font-mono text-xs select-none">+{selectedCountry.phoneCode}</span>
          <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-200 select-none ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {/* Main input for local part */}
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          value={localNumber}
          onFocus={() => {
            setIsFocused(true);
            setError(null);
            setTouched(false);
            onFocus?.();
          }}
          onKeyDown={(e) => {
            if (
              !/^\d$/.test(e.key) &&
              !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Enter"].includes(e.key) &&
              !e.ctrlKey &&
              !e.metaKey
            ) {
              e.preventDefault();
            }
          }}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "");
            const max = getMaxDigits(selectedCountry.code);
            const limited = digits.slice(0, max);
            setLocalNumber(limited);
            setError(null);
            setTouched(false);
            const fullNum = limited ? `+${selectedCountry.phoneCode} ${limited}` : "";
            onChange?.(fullNum);
          }}
          onBlur={() => {
            setIsFocused(false);
            setTouched(true);
            handleValidation(localNumber);
          }}
          placeholder={activePlaceholder}
          required={required}
          className="flex-1 bg-transparent px-5 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
        />

        {/* Hidden input for form submission */}
        <input type="hidden" name={name} value={fullNumber} />

        {/* Dropdown list (Rendered in Portal to prevent layout clipping) */}
        {isOpen && (
          <Portal>
            <div 
              ref={dropdownContentRef}
              style={{
                position: "absolute",
                top: coords.top,
                left: coords.left,
              }}
              className="w-64 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl z-[2147483647] max-h-64 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
            >
              {/* Search bar inside dropdown */}
              <div className="relative p-2 border-b border-slate-100 dark:border-slate-800">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search country or code..."
                  className="w-full bg-slate-50 dark:bg-slate-950 pl-8 pr-4 py-2 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none border border-transparent focus:border-indigo-500"
                />
              </div>

              {/* List items */}
              <div className="flex-1 overflow-y-auto py-1 premium-scrollbar">
                {filteredCountries.length > 0 ? (
                  filteredCountries.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setSelectedCountry(c);
                        setIsOpen(false);
                        setSearchQuery("");
                        setError(null);
                        setTouched(false);
                        const cleanLocal = localNumber.replace(/[^\d\s-]/g, "").trim();
                        const fullNum = cleanLocal ? `+${c.phoneCode} ${cleanLocal}` : "";
                        onChange?.(fullNum);
                      }}
                      style={
                        selectedCountry.code === c.code && primaryColor
                          ? { backgroundColor: `${primaryColor}18`, color: primaryColor }
                          : undefined
                      }
                      className={`w-full px-4 py-2.5 text-left text-xs font-bold flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                        selectedCountry.code === c.code && !primaryColor
                          ? "bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm leading-none">{getFlagEmoji(c.code)}</span>
                        <span className="truncate max-w-[130px]">{c.name}</span>
                      </div>
                      <span className="font-mono text-slate-400">+{c.phoneCode}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-6 text-center text-xs font-bold text-slate-400">
                    No country found
                  </div>
                )}
              </div>
            </div>
          </Portal>
        )}
      </div>
      {error && (
        <div className="flex items-center gap-1.5 ml-1 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200">
          <span className="text-xs font-semibold">{error}</span>
        </div>
      )}
    </div>
  );
}
