"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { format, addMinutes, parse } from "date-fns";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  X,
  Pencil,
  Search,
  UserPlus,
  AlertCircle,
  Plus,
  ArrowRight,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Check
} from "lucide-react";
import { createBooking, updateBooking } from "@/app/actions/booking";
import { searchCustomers, addCustomer, getActiveCustomers, getPaginatedActiveCustomers } from "@/app/actions/customer";
import { toast } from "sonner";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { Portal } from "@/components/ui/portal";
import { Tooltip } from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";

import { getLabels } from "@/lib/labels";
import { formatCurrency, getCurrencySymbol } from "@/lib/currency-utils";
import { getInTimezone } from "@/lib/timezone-utils";

function InputError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1.5 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200 text-left">
      <AlertCircle className="h-3 w-3" />
      <span className="text-[10px] font-black uppercase tracking-wider">{message}</span>
    </div>
  );
}

const timeOptions = (() => {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (const m of ["00", "15", "30", "45"]) {
      const hourStr = h.toString().padStart(2, "0");
      const timeStr = `${hourStr}:${m}`;
      const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const displayHourStr = displayHour.toString().padStart(2, "0");
      const label = `${displayHourStr}:${m}${h === 0 && m === "00" ? " (Midnight)" : h === 12 && m === "00" ? " (Noon)" : ""}`;
      options.push({ value: timeStr, label });
    }
  }
  return options;
})();

function parseTimeTo24h(input: string): string | null {
  const clean = input.trim().toUpperCase();
  if (!clean) return null;

  // Pattern 1: HH:mm AM/PM or H:mm AM/PM
  const ampmRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/;
  const ampmMatch = clean.match(ampmRegex);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2];
    const period = ampmMatch[3];
    if (hours < 1 || hours > 12) return null;
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, "0")}:${minutes}`;
  }

  // Pattern 2: HH:mm or H:mm (24h)
  const hhmmRegex = /^(\d{1,2}):(\d{2})$/;
  const hhmmMatch = clean.match(hhmmRegex);
  if (hhmmMatch) {
    const hours = parseInt(hhmmMatch[1], 10);
    const minutes = parseInt(hhmmMatch[2], 10);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    }
  }

  // Pattern 3: Simple digits like "930" or "1430"
  const digitsRegex = /^(\d{1,2})(\d{2})$/;
  const digitsMatch = clean.match(digitsRegex);
  if (digitsMatch) {
    const hours = parseInt(digitsMatch[1], 10);
    const minutes = parseInt(digitsMatch[2], 10);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    }
  }

  // Pattern 4: Single digit hours like "9" -> "09:00"
  const singleDigitRegex = /^(\d{1,2})$/;
  const singleDigitMatch = clean.match(singleDigitRegex);
  if (singleDigitMatch) {
    const hours = parseInt(singleDigitMatch[1], 10);
    if (hours >= 0 && hours < 24) {
      return `${hours.toString().padStart(2, "0")}:00`;
    }
  }

  return null;
}

interface ManualBookingProps {
  tenantId: string;
  services: any[];
  staff: any[];
  mode?: "create" | "edit";
  initialData?: any;
  onClose?: () => void;
  inline?: boolean;
  businessType?: any;
  currency?: string;
  timeFormat?: string;
  timezone?: string;
}

export function ManualBooking({ 
  tenantId, 
  services, 
  staff, 
  mode = "create", 
  initialData = null,
  onClose,
  inline = false,
  businessType,
  currency = "USD",
  timeFormat = "12h",
  timezone = "UTC"
}: ManualBookingProps) {
  const router = useRouter();
  const labels = getLabels(businessType);

  const formatOptionLabel = (timeVal: string) => {
    if (!timeVal) return "";
    let normalized = timeVal;
    if (timeVal.includes(":")) {
      const parts = timeVal.split(":");
      normalized = `${parts[0].padStart(2, "0")}:${parts[1]}`;
    }
    const is12h = timeFormat === "12h" || !timeFormat;
    const matched = timeOptions.find(t => t.value === normalized);
    if (is12h) {
      return matched ? matched.label : normalized;
    }
    if (normalized === "24:00") return "00:00";
    return normalized;
  };

  const [isOpen, setIsOpen] = useState(mode === "edit" || inline);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  
  // Patient Selector States
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [customerDir, setCustomerDir] = useState<"up" | "down">("down");
  const [activeCustomers, setActiveCustomers] = useState<any[]>([]);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const [hasMoreCustomers, setHasMoreCustomers] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerSkip, setCustomerSkip] = useState(0);

  const fetchPatients = async (currentSearch: string, currentSkip: number, isReset: boolean) => {
    if (loadingCustomers) return;
    setLoadingCustomers(true);
    
    const newCustomers = await getPaginatedActiveCustomers(currentSearch, currentSkip, 5);
    
    if (isReset) {
      setActiveCustomers(newCustomers || []);
      setCustomerSkip(newCustomers?.length || 0);
    } else {
      setActiveCustomers(prev => [...prev, ...(newCustomers || [])]);
      setCustomerSkip(prev => prev + (newCustomers?.length || 0));
    }
    
    setHasMoreCustomers((newCustomers?.length || 0) === 5);
    setLoadingCustomers(false);
  };

  const handleDropdownScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (container.scrollHeight - container.scrollTop <= container.clientHeight + 15) {
      if (hasMoreCustomers && !loadingCustomers) {
        fetchPatients(customerSearch, customerSkip, false);
      }
    }
  };
  
  // Custom Dropdown Open States
  const [isServiceOpen, setIsServiceOpen] = useState(false);
  const [isStaffOpen, setIsStaffOpen] = useState(false);
  const [isStartTimeOpen, setIsStartTimeOpen] = useState(false);
  const [isEndTimeOpen, setIsEndTimeOpen] = useState(false);
  const [startTimeDir, setStartTimeDir] = useState<"up" | "down">("down");
  const [endTimeDir, setEndTimeDir] = useState<"up" | "down">("down");
  const [serviceDir, setServiceDir] = useState<"up" | "down">("down");
  const [staffDir, setStaffDir] = useState<"up" | "down">("down");
  const [isStartAmPmOpen, setIsStartAmPmOpen] = useState(false);
  const [isEndAmPmOpen, setIsEndAmPmOpen] = useState(false);
  const [startAmPmDir, setStartAmPmDir] = useState<"up" | "down">("down");
  const [endAmPmDir, setEndAmPmDir] = useState<"up" | "down">("down");

  // Dropdown Refs for Click Outside Detection
  const serviceRef = useRef<HTMLDivElement>(null);
  const staffRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<HTMLDivElement>(null);
  const endTimeRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const startAmPmRef = useRef<HTMLDivElement>(null);
  const endAmPmRef = useRef<HTMLDivElement>(null);

  // Customer Search State
  const [customerSearch, setCustomerSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);

  useLockBodyScroll(isOpen && !inline);

  // Selection States
  const [selectedService, setSelectedService] = useState<any>(
    initialData?.service || null
  );
  
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    initialData?.staffId || ""
  );

  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    initialData?.startTime 
      ? format(new Date(initialData.startTime), "yyyy-MM-dd") 
      : ""
  );

  const [startTimeStr, setStartTimeStr] = useState<string>(
    initialData?.startTime 
      ? format(new Date(initialData.startTime), "HH:mm") 
      : ""
  );

  const [endTimeStr, setEndTimeStr] = useState<string>(
    initialData?.endTime 
      ? format(new Date(initialData.endTime), "HH:mm") 
      : ""
  );

  const [isStartTimeFocused, setIsStartTimeFocused] = useState(false);
  const [isEndTimeFocused, setIsEndTimeFocused] = useState(false);

  // HH:MM digit-only inputs (max 5 chars with colon)
  const [startTimeInput, setStartTimeInput] = useState<string>(() => {
    if (initialData?.startTime) {
      const h = parseInt(format(new Date(initialData.startTime), "HH"), 10);
      const m = format(new Date(initialData.startTime), "mm");
      if (timeFormat === "24h") {
        return `${h.toString().padStart(2, "0")}:${m}`;
      }
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${h12.toString().padStart(2, "0")}:${m}`;
    }
    return "";
  });

  const [endTimeInput, setEndTimeInput] = useState<string>(() => {
    if (initialData?.endTime) {
      const h = parseInt(format(new Date(initialData.endTime), "HH"), 10);
      const m = format(new Date(initialData.endTime), "mm");
      if (timeFormat === "24h") {
        return `${h.toString().padStart(2, "0")}:${m}`;
      }
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${h12.toString().padStart(2, "0")}:${m}`;
    }
    return "";
  });

  // AM/PM state
  const [startAmPm, setStartAmPm] = useState<"AM" | "PM">(() => {
    if (initialData?.startTime) {
      const h = parseInt(format(new Date(initialData.startTime), "HH"), 10);
      return h >= 12 ? "PM" : "AM";
    }
    return "AM";
  });

  const [endAmPm, setEndAmPm] = useState<"AM" | "PM">(() => {
    if (initialData?.endTime) {
      const h = parseInt(format(new Date(initialData.endTime), "HH"), 10);
      return h >= 12 ? "PM" : "AM";
    }
    return "AM";
  });

  const [customPrice, setCustomPrice] = useState<string>(
    initialData?.price ? initialData.price.toString() : ""
  );

  const [customerInfo, setCustomerInfo] = useState({
    id: initialData?.customerId || "",
    name: initialData?.customerName || "",
    email: initialData?.customerEmail || "",
    phone: ""
  });

  // Clear errors when context changes
  useEffect(() => {
    setFieldErrors({});
  }, [initialData]);

  // Click Outside Hook
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (serviceRef.current && !serviceRef.current.contains(event.target as Node)) {
        setIsServiceOpen(false);
      }
      if (staffRef.current && !staffRef.current.contains(event.target as Node)) {
        setIsStaffOpen(false);
      }
      if (startTimeRef.current && !startTimeRef.current.contains(event.target as Node)) {
        setIsStartTimeOpen(false);
      }
      if (endTimeRef.current && !endTimeRef.current.contains(event.target as Node)) {
        setIsEndTimeOpen(false);
      }
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
      if (startAmPmRef.current && !startAmPmRef.current.contains(event.target as Node)) {
        setIsStartAmPmOpen(false);
      }
      if (endAmPmRef.current && !endAmPmRef.current.contains(event.target as Node)) {
        setIsEndAmPmOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate remaining viewport space to determine dropdown opening direction (up vs down)
  // Register scroll and resize listeners when any dropdown is open to update positions in real-time
  useLayoutEffect(() => {
    const handleScrollOrResize = () => {
      if (isStartTimeOpen && startTimeRef.current) {
        const rect = startTimeRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setStartTimeDir(spaceBelow < 280 ? "up" : "down");
      }
      if (isEndTimeOpen && endTimeRef.current) {
        const rect = endTimeRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setEndTimeDir(spaceBelow < 280 ? "up" : "down");
      }
      if (isCustomerDropdownOpen && customerDropdownRef.current) {
        const rect = customerDropdownRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setCustomerDir(spaceBelow < 280 ? "up" : "down");
      }
      if (isServiceOpen && serviceRef.current) {
        const rect = serviceRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setServiceDir(spaceBelow < 280 ? "up" : "down");
      }
      if (isStaffOpen && staffRef.current) {
        const rect = staffRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setStaffDir(spaceBelow < 280 ? "up" : "down");
      }
      if (isStartAmPmOpen && startAmPmRef.current) {
        const rect = startAmPmRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setStartAmPmDir(spaceBelow < 120 ? "up" : "down");
      }
      if (isEndAmPmOpen && endAmPmRef.current) {
        const rect = endAmPmRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setEndAmPmDir(spaceBelow < 120 ? "up" : "down");
      }
    };

    if (
      isStartTimeOpen || 
      isEndTimeOpen || 
      isCustomerDropdownOpen || 
      isServiceOpen || 
      isStaffOpen ||
      isStartAmPmOpen ||
      isEndAmPmOpen
    ) {
      // Run once immediately on open
      handleScrollOrResize();

      const scrollEl = scrollContainerRef.current;
      if (scrollEl) {
        scrollEl.addEventListener("scroll", handleScrollOrResize, { passive: true });
      }
      window.addEventListener("resize", handleScrollOrResize);

      return () => {
        if (scrollEl) {
          scrollEl.removeEventListener("scroll", handleScrollOrResize);
        }
        window.removeEventListener("resize", handleScrollOrResize);
      };
    }
  }, [
    isStartTimeOpen, 
    isEndTimeOpen, 
    isCustomerDropdownOpen, 
    isServiceOpen, 
    isStaffOpen,
    isStartAmPmOpen,
    isEndAmPmOpen
  ]);

  // Reset form when popup is closed
  useEffect(() => {
    if (!isOpen && !inline) {
      setSelectedService(initialData?.service || null);
      setSelectedStaffId(initialData?.staffId || "");
      setSelectedDateStr(
        initialData?.startTime 
          ? format(new Date(initialData.startTime), "yyyy-MM-dd") 
          : ""
      );
      setStartTimeStr(
        initialData?.startTime 
          ? format(new Date(initialData.startTime), "HH:mm") 
          : ""
      );
      setEndTimeStr(
        initialData?.endTime 
          ? format(new Date(initialData.endTime), "HH:mm") 
          : ""
      );
      setIsStartTimeFocused(false);
      setIsEndTimeFocused(false);
      if (initialData?.startTime) {
        const parsedTime = format(new Date(initialData.startTime), "HH:mm");
        setStartTimeInput(formatOptionLabel(parsedTime));
      } else {
        setStartTimeInput("");
      }
      if (initialData?.endTime) {
        const parsedTime = format(new Date(initialData.endTime), "HH:mm");
        setEndTimeInput(formatOptionLabel(parsedTime));
      } else {
        setEndTimeInput("");
      }

      setCustomPrice(
        initialData?.price ? initialData.price.toString() : ""
      );
      setCustomerInfo({
        id: initialData?.customerId || "",
        name: initialData?.customerName || "",
        email: initialData?.customerEmail || "",
        phone: ""
      });
      setCustomerSearch("");
      setSearchResults([]);
      setIsAddingNewCustomer(false);
      setFieldErrors({});
      setGeneralError(null);
      setIsCustomerDropdownOpen(false);
      setHasMoreCustomers(true);
      setCustomerSkip(0);
    }
  }, [isOpen, initialData, inline]);

  // Debounced search and initial load for patients in dropdown
  useEffect(() => {
    if (!isOpen || !isCustomerDropdownOpen) return;
    
    const handler = setTimeout(() => {
      fetchPatients(customerSearch, 0, true);
    }, 150);

    return () => clearTimeout(handler);
  }, [customerSearch, isCustomerDropdownOpen, isOpen]);

  // Autofill start and end times when a service is selected
  useEffect(() => {
    // Only pre-fill automatically if we are booking directly from a calendar slot click (initialData is present)
    if (selectedService && initialData) {
      const currentStart = startTimeStr;
      if (currentStart) {
        try {
          const parsedStart = parse(currentStart, "HH:mm", new Date());
          const end = addMinutes(parsedStart, selectedService.durationMinutes);
          setEndTimeStr(format(end, "HH:mm"));
        } catch (err) {
          console.error(err);
        }
      }
    }
  }, [selectedService, initialData, startTimeStr]);

  // Adjust End Time when Start Time changes manually
  useEffect(() => {
    if (selectedService && startTimeStr) {
      try {
        const parsedStart = parse(startTimeStr, "HH:mm", new Date());
        const end = addMinutes(parsedStart, selectedService.durationMinutes);
        setEndTimeStr(format(end, "HH:mm"));
      } catch (err) {
        console.error(err);
      }
    }
  }, [startTimeStr, selectedService]);

  // Sync text inputs when raw time values change (e.g. from dropdown or initialData)
  // Sync text input & AM/PM when raw 24h time changes (e.g. from dropdown)
  useEffect(() => {
    if (startTimeStr) {
      const h = parseInt(startTimeStr.split(":")[0], 10);
      const m = startTimeStr.split(":")[1] || "00";
      const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
      if (timeFormat === "24h") {
        setStartTimeInput(`${h.toString().padStart(2, "0")}:${m}`);
      } else {
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        setStartTimeInput(`${h12.toString().padStart(2, "0")}:${m}`);
      }
      setStartAmPm(period);
    } else {
      setStartTimeInput("");
    }
  }, [startTimeStr, timeFormat]);

  useEffect(() => {
    if (endTimeStr) {
      const h = parseInt(endTimeStr.split(":")[0], 10);
      const m = endTimeStr.split(":")[1] || "00";
      const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
      if (timeFormat === "24h") {
        setEndTimeInput(`${h.toString().padStart(2, "0")}:${m}`);
      } else {
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        setEndTimeInput(`${h12.toString().padStart(2, "0")}:${m}`);
      }
      setEndAmPm(period);
    } else {
      setEndTimeInput("");
    }
  }, [endTimeStr, timeFormat]);

  // Keep custom price synced with service default price
  useEffect(() => {
    if (selectedService && !initialData) {
      setCustomPrice(selectedService.price.toString());
    } else if (!selectedService) {
      setCustomPrice("");
    }
  }, [selectedService, initialData]);

  // Digits-only auto-format with smart format-aware hour detection
  // prevVal is the current field value, used to detect backspace vs forward typing
  // Digits-only auto-format with smart format-aware hour detection
  // prevVal is the current field value, used to detect backspace vs forward typing
  const handleTimeInputChange = (
    val: string, 
    prevVal: string, 
    setter: (v: string) => void,
    ampm?: "AM" | "PM",
    setAmpm?: (p: "AM" | "PM") => void
  ) => {
    const digits = val.replace(/[^0-9]/g, "");
    const prevDigits = prevVal.replace(/[^0-9]/g, "");
    const maxH = timeFormat === "24h" ? 23 : 12;
    
    if (digits.length === 0) {
      setter("");
      return;
    }

    const isDeleting = digits.length < prevDigits.length;
    if (isDeleting) {
      // While deleting: show raw digits, add colon only when 3+ digits remain
      if (digits.length <= 2) setter(digits);
      else setter(`${digits.slice(0, 2)}:${digits.slice(2)}`);
      return;
    }

    // While typing forward:
    if (digits.length === 1) {
      setter(digits);
    } else if (digits.length === 2) {
      const hh = parseInt(digits, 10);
      if (hh > maxH) {
        setter(`0${digits[0]}:${digits[1]}`); // e.g. "32" -> "03:2"
      } else {
        setter(digits); // e.g. "12" -> "12"
      }
    } else if (digits.length === 3) {
      if (digits.startsWith("0")) {
        setter(`${digits.slice(0, 2)}:${digits[2]}`);
      } else {
        const hh = parseInt(digits.slice(0, 2), 10);
        if (hh > maxH) {
          setter(`0${digits[0]}:${digits[1]}${digits[2]}`); // e.g. "320" -> "03:20"
        } else {
          setter(`${digits.slice(0, 2)}:${digits[2]}`); // e.g. "120" -> "12:0"
        }
      }
    } else if (digits.length >= 4) {
      const fourDigits = digits.slice(0, 4);
      let hhStr = "";
      let mmStr = "";
      if (fourDigits.startsWith("0")) {
        hhStr = fourDigits.slice(0, 2);
        mmStr = fourDigits.slice(2, 4);
      } else {
        const hh = parseInt(fourDigits.slice(0, 2), 10);
        if (hh > maxH) {
          hhStr = `0${fourDigits[0]}`;
          mmStr = `${fourDigits[1]}${fourDigits[2]}`;
        } else {
          hhStr = fourDigits.slice(0, 2);
          mmStr = fourDigits.slice(2, 4);
        }
      }

      let hhVal = parseInt(hhStr, 10);
      let mmVal = parseInt(mmStr, 10);
      
      if (mmVal === 60) {
        // Roll over exactly 60 minutes to the next hour
        mmVal = 0;
        if (timeFormat === "24h") {
          hhVal = (hhVal + 1) % 24;
        } else if (ampm && setAmpm) {
          let h24 = hhVal;
          if (ampm === "PM" && hhVal < 12) h24 += 12;
          if (ampm === "AM" && hhVal === 12) h24 = 0;
          h24 = (h24 + 1) % 24;
          
          const newAmPm = h24 >= 12 ? "PM" : "AM";
          setAmpm(newAmPm);
          
          let h12 = h24 % 12;
          if (h12 === 0) h12 = 12;
          hhVal = h12;
        } else {
          hhVal = hhVal + 1;
          if (hhVal > 12) hhVal = 12;
        }
      } else if (mmVal > 60) {
        // Any minute value strictly above 60 resets to the base hour (e.g. 4:65 -> 4:00)
        mmVal = 0;
      }

      hhStr = hhVal.toString().padStart(2, "0");
      mmStr = mmVal.toString().padStart(2, "0");

      setter(`${hhStr}:${mmStr}`);
    }
  };

  // Pads any partial raw digit entry to full HH:MM on blur:
  const padTimeInput = (
    input: string,
    ampm?: "AM" | "PM",
    setAmpm?: (p: "AM" | "PM") => void
  ): string => {
    const digits = input.replace(/[^0-9]/g, "");
    if (!digits) return input;
    const maxH = timeFormat === "24h" ? 23 : 12;
    
    let result = "";
    if (digits.length === 1) {
      result = `0${digits}:00`;
    } else if (digits.length === 2) {
      const hh = parseInt(digits, 10);
      if (hh > maxH) {
        result = `0${digits[0]}:0${digits[1]}`; // e.g. "98" -> "09:08"
      } else {
        result = `${digits}:00`; // e.g. "12" -> "12:00"
      }
    } else if (digits.length === 3) {
      if (digits.startsWith("0")) {
        result = `${digits.slice(0, 2)}:${digits[2]}0`;
      } else {
        const hh = parseInt(digits.slice(0, 2), 10);
        if (hh > maxH) {
          result = `0${digits[0]}:${digits[1]}${digits[2]}`; // e.g. "320" -> "03:20"
        } else {
          result = `${digits.slice(0, 2)}:${digits[2]}0`; // e.g. "120" -> "12:00" (or 12:05)
        }
      }
    } else {
      const fourDigits = digits.slice(0, 4);
      if (fourDigits.startsWith("0")) {
        result = `${fourDigits.slice(0, 2)}:${fourDigits.slice(2, 4)}`;
      } else {
        const hh = parseInt(fourDigits.slice(0, 2), 10);
        if (hh > maxH) {
          result = `0${fourDigits[0]}:${fourDigits[1]}${fourDigits[2]}`;
        } else {
          result = `${fourDigits.slice(0, 2)}:${fourDigits.slice(2, 4)}`;
        }
      }
    }

    // Auto-correct/rollover minutes if they are above 59
    const parts = result.split(":");
    if (parts.length === 2) {
      let hhVal = parseInt(parts[0], 10);
      let mmVal = parseInt(parts[1], 10);
      if (mmVal === 60) {
        mmVal = 0;
        if (timeFormat === "24h") {
          hhVal = (hhVal + 1) % 24;
        } else if (ampm && setAmpm) {
          let h24 = hhVal;
          if (ampm === "PM" && hhVal < 12) h24 += 12;
          if (ampm === "AM" && hhVal === 12) h24 = 0;
          h24 = (h24 + 1) % 24;
          
          const newAmPm = h24 >= 12 ? "PM" : "AM";
          setAmpm(newAmPm);
          
          let h12 = h24 % 12;
          if (h12 === 0) h12 = 12;
          hhVal = h12;
        } else {
          hhVal = hhVal + 1;
          if (hhVal > 12) hhVal = 12;
        }
      } else if (mmVal > 60) {
        mmVal = 0;
      }
      return `${hhVal.toString().padStart(2, "0")}:${mmVal.toString().padStart(2, "0")}`;
    }
    return result;
  };

  const validateTimeInput = (paddedInput: string, ampm: "AM" | "PM"): string | null => {
    const match = paddedInput.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      const example = timeFormat === "24h" ? "14:30" : "09:30";
      return `Enter time as HH:MM (e.g. ${example})`;
    }
    
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const maxHour = timeFormat === "24h" ? 23 : 12;
    const minHour = timeFormat === "24h" ? 0 : 1;

    if (h < minHour || h > maxHour) {
      return `Hour must be ${minHour}–${maxHour}`;
    }
    if (m < 0 || m > 59) {
      return "Minutes must be between 00 and 59";
    }
    return null;
  };

  // Parse HH:MM + AM/PM (12h) or HH:MM (24h) into 24h storage string
  const parseHHMMAmPm = (hhmm: string, ampm: "AM" | "PM"): string | null => {
    const match = hhmm.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (m < 0 || m > 59) return null;
    if (timeFormat === "24h") {
      // 24h mode: allow 0–23 directly, no AM/PM conversion
      if (h < 0 || h > 23) return null;
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    }
    // 12h mode: 1–12 with AM/PM
    if (h < 1 || h > 12) return null;
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const handleStartTimeBlur = () => {
    setIsStartTimeFocused(false);
    if (!startTimeInput) {
      setStartTimeStr("");
      return;
    }
    const padded = padTimeInput(startTimeInput, startAmPm, setStartAmPm);
    const validationError = validateTimeInput(padded, startAmPm);
    if (validationError) {
      setFieldErrors(prev => ({ ...prev, startTime: validationError }));
      return;
    }
    setStartTimeInput(padded);
    const parsed = parseHHMMAmPm(padded, startAmPm);
    if (parsed) {
      setStartTimeStr(parsed);
      setFieldErrors(prev => ({ ...prev, startTime: "" }));
      // Re-validate end time cross-check if end is already set
      if (endTimeStr) {
        if (parsed >= endTimeStr) {
          setFieldErrors(prev => ({ ...prev, endTime: "End time must be after start time" }));
        } else {
          setFieldErrors(prev => ({ ...prev, endTime: "" }));
        }
      }
    }
  };

  const handleEndTimeBlur = () => {
    setIsEndTimeFocused(false);
    if (!endTimeInput) {
      setEndTimeStr("");
      return;
    }
    const padded = padTimeInput(endTimeInput, endAmPm, setEndAmPm);
    const validationError = validateTimeInput(padded, endAmPm);
    if (validationError) {
      setFieldErrors(prev => ({ ...prev, endTime: validationError }));
      return;
    }
    setEndTimeInput(padded);
    const parsed = parseHHMMAmPm(padded, endAmPm);
    if (parsed) {
      setEndTimeStr(parsed);
      // Cross-check: end must be strictly after start
      if (startTimeStr && parsed <= startTimeStr) {
        setFieldErrors(prev => ({ ...prev, endTime: "End time must be after start time" }));
      } else {
        setFieldErrors(prev => ({ ...prev, endTime: "" }));
      }
    }
  };

  const handleSelectCustomer = (customer: any) => {
    setCustomerInfo({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone || ""
    });
    setCustomerSearch("");
    setSearchResults([]);
    setIsAddingNewCustomer(false);
    setFieldErrors(prev => ({ ...prev, customer: "" }));
    setGeneralError(null);
  };

  useEffect(() => {
    const search = async () => {
      if (customerSearch.length > 2) {
        const results = await searchCustomers(customerSearch);
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    };
    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, tenantId]);

  const handleCreateNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    formData.append("tenantId", tenantId);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;

    const errors: Record<string, string> = {};
    if (!name) errors.customerName = "Name is required";
    if (!email) errors.customerEmail = "Email is required";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    const result = await addCustomer(formData);
    if (result.success) {
      toast.success(`${labels.customer} created and selected!`);
      handleSelectCustomer(result.customer);
    } else {
      if (result.error?.includes("email")) {
        setFieldErrors({ customerEmail: "This email is already in use" });
      } else {
        setGeneralError(result.error || "Failed to add customer");
        toast.error(result.error || "Failed to add customer");
      }
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    
    let resolvedStart = startTimeStr;
    let resolvedEnd = endTimeStr;

    // Resolve start time from input if present
    if (startTimeInput) {
      const padded = padTimeInput(startTimeInput);
      const error = validateTimeInput(padded, startAmPm);
      if (error) {
        errors.startTime = error;
      } else {
        const parsed = parseHHMMAmPm(padded, startAmPm);
        if (parsed) resolvedStart = parsed;
      }
    } else {
      errors.startTime = "Please select a start time.";
    }

    // Resolve end time from input if present
    if (endTimeInput) {
      const padded = padTimeInput(endTimeInput);
      const error = validateTimeInput(padded, endAmPm);
      if (error) {
        errors.endTime = error;
      } else {
        const parsed = parseHHMMAmPm(padded, endAmPm);
        if (parsed) resolvedEnd = parsed;
      }
    } else {
      errors.endTime = "Please select an end time.";
    }

    if (!selectedService) {
      errors.service = "Please select a service.";
    }
    if (!selectedStaffId) {
      errors.staff = "Please select a team member.";
    }
    if (!selectedDateStr) {
      errors.date = "Please select a date.";
    }
    if (!errors.startTime && !resolvedStart) {
      errors.startTime = "Please select a start time.";
    }
    if (!errors.endTime && !resolvedEnd) {
      errors.endTime = "Please select an end time.";
    }
    if (!errors.startTime && !errors.endTime && resolvedStart && resolvedEnd && resolvedEnd <= resolvedStart) {
      errors.endTime = "End time must be after start time";
    }
    if (!customerInfo.name) {
      errors.customer = `Please select or add a ${labels.customerLower}.`;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setLoading(true);
    
    const formData = new FormData();
    formData.append("serviceId", selectedService.id);
    formData.append("staffId", selectedStaffId);
    formData.append("date", selectedDateStr);
    formData.append("time", resolvedStart);
    formData.append("endTime", resolvedEnd);
    formData.append("customerName", customerInfo.name);
    formData.append("customerEmail", customerInfo.email);
    if (customerInfo.id) formData.append("customerId", customerInfo.id);
    if (customPrice) formData.append("price", customPrice);

    let result;
    if (mode === "edit") {
      result = await updateBooking(initialData.id, formData);
    } else {
      formData.append("tenantId", tenantId);
      result = await createBooking(formData);
    }

    if (result.success) {
      toast.success(mode === "edit" ? `${labels.appointment} updated successfully!` : `${labels.appointment} created successfully!`);
      router.refresh();
      handleClose();
    } else {
      setGeneralError(result.error || "Failed to save booking");
      toast.error(result.error || "Failed to save booking");
    }
    setLoading(false);
  };

  const handleClose = () => {
    if (!inline) setIsOpen(false);
    if (onClose) onClose();
    setGeneralError(null);
    if (mode !== "edit" && !inline) {
      setSelectedService(services.length > 0 ? services[0] : null);
      setSelectedStaffId(staff.length > 0 ? staff[0].id : "");
      setCustomerInfo({ id: "", name: "", email: "", phone: "" });
      setCustomerSearch("");
    }
  };

  const content = (
    <div className={`relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] ${inline ? '' : 'shadow-2xl border border-indigo-100/50 dark:border-slate-800 overflow-hidden'} animate-fade-in-up flex flex-col max-h-[90vh] transition-colors`}>
      <div className="px-8 py-6 border-b border-indigo-100/50 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 rounded-t-[2.4rem] z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 dark:shadow-none border border-transparent dark:border-white/10">
            {mode === 'edit' ? <Pencil className="h-5 w-5" /> : <CalendarIcon className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {mode === 'edit' ? `Edit ${labels.appointment}` : `Add ${labels.appointment}`}
            </h2>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Manual Booking Form</p>
          </div>
        </div>
        <button 
          onClick={handleClose}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
        >
          <X className="h-5 w-5 text-slate-400 dark:text-slate-500" />
        </button>
      </div>

      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-8 space-y-6 premium-scrollbar"
      >
        {/* Service Selector */}
        <div className="space-y-2 relative" ref={serviceRef}>
          <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Select {labels.service} <span className="text-rose-500">*</span></label>
          <button 
            type="button"
            onClick={() => {
              if (!isServiceOpen) {
                setIsStaffOpen(false);
                setIsStartTimeOpen(false);
                setIsEndTimeOpen(false);
                setIsCustomerDropdownOpen(false);
                setIsStartAmPmOpen(false);
                setIsEndAmPmOpen(false);
                if (serviceRef.current) {
                  const rect = serviceRef.current.getBoundingClientRect();
                  const spaceBelow = window.innerHeight - rect.bottom;
                  setServiceDir(spaceBelow < 280 ? "up" : "down");
                }
              }
              setIsServiceOpen(!isServiceOpen);
            }}
            className={`w-full flex items-center justify-between bg-indigo-50/30 dark:bg-slate-800 border-2 rounded-2xl p-4 text-sm font-bold outline-none transition-all shadow-sm text-left ${selectedService ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'} ${fieldErrors.service ? 'border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500' : 'border-indigo-100/50 dark:border-slate-700/50 hover:border-indigo-200 dark:hover:border-slate-600'}`}
          >
            <span>{selectedService ? `${selectedService.name} (${selectedService.durationMinutes} mins)` : "Select Treatment"}</span>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isServiceOpen ? 'rotate-180' : ''}`} />
          </button>
          <InputError message={fieldErrors.service} />
          {isServiceOpen && (
            <div className={`absolute left-0 right-0 ${serviceDir === "up" ? "bottom-full mb-2" : "top-full mt-2"} bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto py-1 premium-scrollbar`}>
              {services?.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedService(s);
                    setCustomPrice(s.price || "");
                    setIsServiceOpen(false);
                    setFieldErrors(prev => ({ ...prev, service: "" }));
                    
                    // Filter staff list to find members providing this service
                    const eligibleStaff = staff.filter(st => 
                      st.services && st.services.some((srv: any) => srv.id === s.id)
                    );
                    const defaultStaff = eligibleStaff.length > 0 ? eligibleStaff[0] : staff[0];
                    
                    if (defaultStaff) {
                      const isCurrentEligible = eligibleStaff.some(st => st.id === selectedStaffId);
                      if (!isCurrentEligible || !selectedStaffId) {
                        setSelectedStaffId(defaultStaff.id);
                        setFieldErrors(prev => ({ ...prev, staff: "" }));
                      }
                    }
                  }}
                  className={`w-full px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between ${selectedService?.id === s.id ? 'bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}
                >
                  <span>{s.name} ({s.durationMinutes} mins)</span>
                  {selectedService?.id === s.id && <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Team Member Selector */}
        <div className="space-y-2 relative" ref={staffRef}>
          <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Practitioner <span className="text-rose-500">*</span></label>
          <button 
            type="button"
            onClick={() => {
              if (!isStaffOpen) {
                setIsServiceOpen(false);
                setIsStartTimeOpen(false);
                setIsEndTimeOpen(false);
                setIsCustomerDropdownOpen(false);
                setIsStartAmPmOpen(false);
                setIsEndAmPmOpen(false);
                if (staffRef.current) {
                  const rect = staffRef.current.getBoundingClientRect();
                  const spaceBelow = window.innerHeight - rect.bottom;
                  setStaffDir(spaceBelow < 280 ? "up" : "down");
                }
              }
              setIsStaffOpen(!isStaffOpen);
            }}
            className={`w-full flex items-center justify-between bg-indigo-50/30 dark:bg-slate-800 border-2 rounded-2xl p-4 text-sm font-bold outline-none transition-all shadow-sm text-left ${selectedStaffId ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'} ${fieldErrors.staff ? 'border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500' : 'border-indigo-100/50 dark:border-slate-700/50 hover:border-indigo-200 dark:hover:border-slate-600'}`}
          >
            <span>{staff.find(st => st.id === selectedStaffId)?.name || "Select Practitioner"}</span>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isStaffOpen ? 'rotate-180' : ''}`} />
          </button>
          <InputError message={fieldErrors.staff} />
          {isStaffOpen && (
            <div className={`absolute left-0 right-0 ${staffDir === "up" ? "bottom-full mb-2" : "top-full mt-2"} bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto py-1 premium-scrollbar`}>
              {(selectedService 
                ? staff.filter(st => st.services && st.services.some((srv: any) => srv.id === selectedService.id))
                : staff
              )?.map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    setSelectedStaffId(st.id);
                    setIsStaffOpen(false);
                    setFieldErrors(prev => ({ ...prev, staff: "" }));
                  }}
                  className={`w-full px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between ${selectedStaffId === st.id ? 'bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}
                >
                  <span>{st.name}</span>
                  {selectedStaffId === st.id && <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Booking Date <span className="text-rose-500">*</span></label>
          <div className="relative">
            <input 
              type="date"
              value={selectedDateStr}
              onChange={(e) => {
                setSelectedDateStr(e.target.value);
                setFieldErrors(prev => ({ ...prev, date: "" }));
              }}
              className={`w-full bg-indigo-50/30 dark:bg-slate-800 border-2 rounded-2xl p-4 text-sm font-bold outline-none transition-all shadow-sm ${selectedDateStr ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'} ${fieldErrors.date ? 'border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500' : 'border-indigo-100/50 dark:border-slate-700/50 focus:border-indigo-600 dark:focus:border-indigo-500 hover:border-indigo-200 dark:hover:border-slate-600'}`}
            />
          </div>
          <InputError message={fieldErrors.date} />
        </div>

        {/* Start Time & End Time */}
        <div className="grid grid-cols-2 gap-4">
          {/* Start Time Selector */}
          <div className="space-y-2 relative" ref={startTimeRef}>
            <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Start Time <span className="text-rose-500">*</span></label>
            <div 
              onClick={() => {
                if (!isStartTimeOpen) {
                  setIsServiceOpen(false);
                  setIsStaffOpen(false);
                  setIsEndTimeOpen(false);
                  setIsCustomerDropdownOpen(false);
                  setIsStartAmPmOpen(false);
                  setIsEndAmPmOpen(false);
                  if (startTimeRef.current) {
                    const rect = startTimeRef.current.getBoundingClientRect();
                    const spaceBelow = window.innerHeight - rect.bottom;
                    setStartTimeDir(spaceBelow < 280 ? "up" : "down");
                  }
                }
                setIsStartTimeOpen(!isStartTimeOpen);
              }}
              className={`relative flex items-center w-full bg-indigo-50/30 dark:bg-slate-800 border-2 rounded-2xl shadow-sm transition-all px-4 py-2.5 gap-2 cursor-pointer ${fieldErrors.startTime ? 'border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus-within:border-rose-500' : 'border-indigo-100/50 dark:border-slate-700/50 focus-within:border-indigo-600 dark:focus-within:border-indigo-500 hover:border-indigo-200 dark:hover:border-slate-600'}`}
            >
              <div className="relative w-14 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {/* Ghost overlay — always visible showing untyped positions */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 flex items-center pointer-events-none select-none text-sm font-semibold"
                >
                  <span className="invisible">{startTimeInput}</span>
                  <span className="text-slate-400 dark:text-slate-500">{"00:00".slice(startTimeInput.length)}</span>
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={startTimeInput}
                  onChange={(e) => handleTimeInputChange(e.target.value, startTimeInput, setStartTimeInput, startAmPm, setStartAmPm)}
                  onFocus={() => {
                    setIsStartTimeFocused(true);
                    setIsStartTimeOpen(false);
                  }}
                  onBlur={handleStartTimeBlur}
                  maxLength={5}
                  placeholder=""
                  className={`relative z-10 w-full bg-transparent border-0 p-0 outline-none cursor-text text-sm font-semibold text-slate-900 dark:text-white`}
                />
              </div>
              
              {/* AM/PM Custom Select Dropdown — only shown in 12h mode, placed directly next to input */}
              {timeFormat !== "24h" && (
                <div className="relative flex-shrink-0" ref={startAmPmRef} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isStartAmPmOpen) {
                        setIsServiceOpen(false);
                        setIsStaffOpen(false);
                        setIsStartTimeOpen(false);
                        setIsEndTimeOpen(false);
                        setIsCustomerDropdownOpen(false);
                        setIsEndAmPmOpen(false);
                        if (startAmPmRef.current) {
                          const rect = startAmPmRef.current.getBoundingClientRect();
                          const spaceBelow = window.innerHeight - rect.bottom;
                          setStartAmPmDir(spaceBelow < 120 ? "up" : "down");
                        }
                      }
                      setIsStartAmPmOpen(!isStartAmPmOpen);
                    }}
                    className="flex items-center gap-1.5 bg-indigo-50/50 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 pl-3 pr-2 py-1.5 rounded-xl border border-indigo-100/50 dark:border-slate-800 text-[10px] font-black tracking-wider outline-none cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-850 transition-all"
                  >
                    <span>{startAmPm}</span>
                    <ChevronDown className={`h-3 w-3 text-indigo-500 transition-transform duration-200 ${isStartAmPmOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isStartAmPmOpen && (
                    <div className={`absolute left-0 ${startAmPmDir === "up" ? "bottom-full mb-1" : "top-full mt-1"} w-20 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-lg z-50 py-1`}>
                      {(["AM", "PM"] as const).map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setStartAmPm(opt);
                            setIsStartAmPmOpen(false);
                            // Re-parse if we have a value
                            if (startTimeInput) {
                              const parsed = parseHHMMAmPm(startTimeInput, opt);
                              if (parsed) {
                                setStartTimeStr(parsed);
                                setFieldErrors(prev => ({ ...prev, startTime: "" }));
                              }
                            }
                          }}
                          className={`w-full px-2.5 py-1.5 text-left text-[10px] font-bold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between ${startAmPm === opt ? 'bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}
                        >
                          <span>{opt}</span>
                          {startAmPm === opt && <Check className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Dropdown chevron — pushed to the far right edge of the wrapper */}
              <div className="ml-auto p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 dark:text-slate-500">
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isStartTimeOpen ? 'rotate-180' : ''}`} />
              </div>

              {isStartTimeOpen && (
                <div className={`absolute left-0 right-0 ${startTimeDir === "up" ? "bottom-full mb-2" : "top-full mt-2"} bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto py-1 premium-scrollbar`} onClick={(e) => e.stopPropagation()}>
                  {timeOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setStartTimeStr(opt.value);
                        setIsStartTimeOpen(false);
                        setFieldErrors(prev => ({ ...prev, startTime: "" }));
                      }}
                      className={`w-full px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between ${startTimeStr === opt.value ? 'bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}
                    >
                      <span>{formatOptionLabel(opt.value)}</span>
                      {startTimeStr === opt.value && <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <InputError message={fieldErrors.startTime} />
          </div>

          {/* End Time Selector */}
          <div className="space-y-2 relative" ref={endTimeRef}>
            <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">End Time <span className="text-rose-500">*</span></label>
            <div 
              onClick={() => {
                if (!isEndTimeOpen) {
                  setIsServiceOpen(false);
                  setIsStaffOpen(false);
                  setIsStartTimeOpen(false);
                  setIsCustomerDropdownOpen(false);
                  setIsStartAmPmOpen(false);
                  setIsEndAmPmOpen(false);
                  if (endTimeRef.current) {
                    const rect = endTimeRef.current.getBoundingClientRect();
                    const spaceBelow = window.innerHeight - rect.bottom;
                    setEndTimeDir(spaceBelow < 280 ? "up" : "down");
                  }
                }
                setIsEndTimeOpen(!isEndTimeOpen);
              }}
              className={`relative flex items-center w-full bg-indigo-50/30 dark:bg-slate-800 border-2 rounded-2xl shadow-sm transition-all px-4 py-2.5 gap-2 cursor-pointer ${fieldErrors.endTime ? 'border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus-within:border-rose-500' : 'border-indigo-100/50 dark:border-slate-700/50 focus-within:border-indigo-600 dark:focus-within:border-indigo-500 hover:border-indigo-200 dark:hover:border-slate-600'}`}
            >
              <div className="relative w-14 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <span
                  aria-hidden="true"
                  className="absolute inset-0 flex items-center pointer-events-none select-none text-sm font-semibold"
                >
                  <span className="invisible">{endTimeInput}</span>
                  <span className="text-slate-400 dark:text-slate-500">{"00:00".slice(endTimeInput.length)}</span>
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={endTimeInput}
                  onChange={(e) => handleTimeInputChange(e.target.value, endTimeInput, setEndTimeInput, endAmPm, setEndAmPm)}
                  onFocus={() => {
                    setIsEndTimeFocused(true);
                    setIsEndTimeOpen(false);
                  }}
                  onBlur={handleEndTimeBlur}
                  maxLength={5}
                  placeholder=""
                  className={`relative z-10 w-full bg-transparent border-0 p-0 outline-none cursor-text text-sm font-semibold text-slate-900 dark:text-white`}
                />
              </div>
              
              {/* AM/PM Custom Select Dropdown — only shown in 12h mode, placed directly next to input */}
              {timeFormat !== "24h" && (
                <div className="relative flex-shrink-0" ref={endAmPmRef} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isEndAmPmOpen) {
                        setIsServiceOpen(false);
                        setIsStaffOpen(false);
                        setIsStartTimeOpen(false);
                        setIsEndTimeOpen(false);
                        setIsCustomerDropdownOpen(false);
                        setIsStartAmPmOpen(false);
                        if (endAmPmRef.current) {
                          const rect = endAmPmRef.current.getBoundingClientRect();
                          const spaceBelow = window.innerHeight - rect.bottom;
                          setEndAmPmDir(spaceBelow < 120 ? "up" : "down");
                        }
                      }
                      setIsEndAmPmOpen(!isEndAmPmOpen);
                    }}
                    className="flex items-center gap-1.5 bg-indigo-50/50 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 pl-3 pr-2 py-1.5 rounded-xl border border-indigo-100/50 dark:border-slate-800 text-[10px] font-black tracking-wider outline-none cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-850 transition-all"
                  >
                    <span>{endAmPm}</span>
                    <ChevronDown className={`h-3 w-3 text-indigo-500 transition-transform duration-200 ${isEndAmPmOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isEndAmPmOpen && (
                    <div className={`absolute left-0 ${endAmPmDir === "up" ? "bottom-full mb-1" : "top-full mt-1"} w-20 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-lg z-50 py-1`}>
                      {(["AM", "PM"] as const).map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setEndAmPm(opt);
                            setIsEndAmPmOpen(false);
                            if (endTimeInput) {
                              const parsed = parseHHMMAmPm(endTimeInput, opt);
                              if (parsed) {
                                setEndTimeStr(parsed);
                                setFieldErrors(prev => ({ ...prev, endTime: "" }));
                              }
                            }
                          }}
                          className={`w-full px-2.5 py-1.5 text-left text-[10px] font-bold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between ${endAmPm === opt ? 'bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}
                        >
                          <span>{opt}</span>
                          {endAmPm === opt && <Check className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Dropdown chevron — pushed to the far right edge of the wrapper */}
              <div className="ml-auto p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 dark:text-slate-500">
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isEndTimeOpen ? 'rotate-180' : ''}`} />
              </div>

              {isEndTimeOpen && (
                <div className={`absolute left-0 right-0 ${endTimeDir === "up" ? "bottom-full mb-2" : "top-full mt-2"} bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto py-1 premium-scrollbar`} onClick={(e) => e.stopPropagation()}>
                  {timeOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setEndTimeStr(opt.value);
                        setIsEndTimeOpen(false);
                        setFieldErrors(prev => ({ ...prev, endTime: "" }));
                      }}
                      className={`w-full px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between ${endTimeStr === opt.value ? 'bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}
                    >
                      <span>{formatOptionLabel(opt.value)}</span>
                      {endTimeStr === opt.value && <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <InputError message={fieldErrors.endTime} />
          </div>
        </div>

        {/* Service Price Field */}
        <div className="space-y-2">
          <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Price</label>
          <div className={`flex items-center gap-3 bg-indigo-50/30 dark:bg-slate-800 border-2 border-indigo-100/50 dark:border-slate-700/50 rounded-2xl p-4 text-sm font-bold hover:border-indigo-200 dark:hover:border-slate-600 transition-all ${selectedService ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
            <span className="text-base font-bold text-indigo-600 dark:text-indigo-400 w-5 text-center select-none">{getCurrencySymbol(currency)}</span>
            <div className="flex-1">
              <span className="text-[10px] block text-slate-400 font-medium">Service Charge (Editable)</span>
              <input 
                type="number"
                step="0.01"
                disabled={!selectedService}
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder={selectedService ? "Enter custom price" : "Select Treatment first"}
                className="w-full bg-transparent border-none outline-none font-bold text-sm text-slate-900 dark:text-white disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Customer Section */}
        <div className="space-y-4 pt-2 border-t border-indigo-100/30 dark:border-slate-800">
          <div>
            <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Select {labels.customer} <span className="text-rose-500">*</span></label>
          </div>

          {!customerInfo.name && !isAddingNewCustomer ? (
            <div className="space-y-4 relative" ref={customerDropdownRef}>
              <button 
                type="button"
                onClick={() => {
                  if (!isCustomerDropdownOpen) {
                    setIsServiceOpen(false);
                    setIsStaffOpen(false);
                    setIsStartTimeOpen(false);
                    setIsEndTimeOpen(false);
                    setIsStartAmPmOpen(false);
                    setIsEndAmPmOpen(false);
                    if (customerDropdownRef.current) {
                      const rect = customerDropdownRef.current.getBoundingClientRect();
                      const spaceBelow = window.innerHeight - rect.bottom;
                      setCustomerDir(spaceBelow < 280 ? "up" : "down");
                    }
                  }
                  setIsCustomerDropdownOpen(!isCustomerDropdownOpen);
                }}
                className={`w-full flex items-center justify-between bg-indigo-50/30 dark:bg-slate-800 border-2 rounded-2xl p-4 text-sm font-bold outline-none transition-all shadow-sm text-left ${customerInfo.name ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'} ${fieldErrors.customer ? 'border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500' : 'border-indigo-100/50 dark:border-slate-700/50 hover:border-indigo-200 dark:hover:border-slate-600'}`}
              >
                <span>{customerInfo.name || `Select ${labels.customer}`}</span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isCustomerDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              <InputError message={fieldErrors.customer} />
              
              {isCustomerDropdownOpen && (
                <div 
                  onScroll={handleDropdownScroll}
                  className={`absolute left-0 right-0 ${customerDir === "up" ? "bottom-full mb-2" : "top-full mt-2"} bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto py-1 premium-scrollbar`}
                >
                  <div className="px-3 py-2 border-b-2 border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search patients..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-slate-50 dark:bg-slate-800 text-xs font-bold p-2 outline-none rounded-lg border border-slate-200 dark:border-slate-700/50 dark:text-white"
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        setIsAddingNewCustomer(true);
                        setIsCustomerDropdownOpen(false);
                        setGeneralError(null);
                      }}
                      className="w-full py-2.5 bg-indigo-50/50 hover:bg-indigo-100/50 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 transition-all flex items-center justify-center gap-2 border border-indigo-100/30 dark:border-indigo-900/30"
                    >
                      <UserPlus className="h-3.5 w-3.5" /> + Add New {labels.customer}
                    </button>
                  </div>
                  {activeCustomers.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-slate-400 font-bold text-center">
                      {loadingCustomers ? "Loading..." : "No patients found"}
                    </div>
                  ) : (
                    <>
                      {activeCustomers.map(customer => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => {
                            handleSelectCustomer(customer);
                            setIsCustomerDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between border-b last:border-b-0 border-slate-100 dark:border-slate-800 ${customerInfo.id === customer.id ? 'bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-950 dark:text-white">{customer.name}</span>
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">({customer.email})</span>
                          </div>
                          {customerInfo.id === customer.id && <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
                        </button>
                      ))}
                      {loadingCustomers && (
                        <div className="px-4 py-2 text-center text-xs text-slate-400 font-bold">
                          Loading more...
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ) : isAddingNewCustomer ? (
            <form onSubmit={handleCreateNewCustomer} className="space-y-4 animate-fade-in" noValidate>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest">New {labels.customer} Details</h4>
                <button type="button" onClick={() => { setIsAddingNewCustomer(false); setGeneralError(null); }} className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors">Back to search</button>
              </div>
              <div>
                <input 
                  name="name" 
                  placeholder="Full Name *" 
                  required 
                  className={`w-full bg-indigo-50/30 dark:bg-slate-800 rounded-2xl px-5 py-3 text-sm font-bold dark:text-white outline-none border-2 transition-all shadow-sm ${
                    fieldErrors.customerName 
                      ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" 
                      : "border-indigo-100/50 dark:border-slate-700/50 hover:border-indigo-200 dark:hover:border-slate-600 focus:border-indigo-600 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800"
                  }`} 
                />
                <InputError message={fieldErrors.customerName} />
              </div>
              <div>
                <input 
                  name="email" 
                  type="email" 
                  placeholder="Email Address *" 
                  required 
                  className={`w-full bg-indigo-50/30 dark:bg-slate-800 rounded-2xl px-5 py-3 text-sm font-bold dark:text-white outline-none border-2 transition-all shadow-sm ${
                    fieldErrors.customerEmail 
                      ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" 
                      : "border-indigo-100/50 dark:border-slate-700/50 hover:border-indigo-200 dark:hover:border-slate-600 focus:border-indigo-600 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800"
                  }`} 
                />
                <InputError message={fieldErrors.customerEmail} />
              </div>
              <input name="phone" placeholder="Phone Number (Optional)" className="w-full bg-indigo-50/30 dark:bg-slate-800 border-2 border-indigo-100/50 dark:border-slate-700/50 focus:border-indigo-600 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 rounded-2xl px-5 py-3 text-sm font-bold dark:text-white outline-none transition-all shadow-sm hover:border-indigo-200 dark:hover:border-slate-600" />
              {generalError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-450 rounded-xl text-xs font-bold border border-rose-100 dark:border-rose-900/30 animate-in fade-in slide-in-from-top-2 duration-200 text-center">
                  {generalError}
                </div>
              )}
              <button type="submit" disabled={loading} className="w-full py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-[0.98]">
                {loading ? "Creating..." : `Create & Select ${labels.customer}`}
              </button>
            </form>
          ) : (
            <div className="w-full flex items-center justify-between bg-indigo-50/30 dark:bg-slate-800 border-2 border-indigo-100/50 dark:border-slate-700/50 rounded-2xl p-4 text-sm font-bold text-slate-900 dark:text-white animate-fade-in shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-[10px] font-black">
                  {customerInfo.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <span className="text-slate-900 dark:text-white">{customerInfo.name}</span>
                  {customerInfo.email && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold ml-2">({customerInfo.email})</span>
                  )}
                </div>
              </div>
              {mode !== 'edit' && (
                <button 
                  type="button"
                  onClick={() => setCustomerInfo({ id: "", name: "", email: "", phone: "" })} 
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all"
                >
                  <X className="h-4 w-4 text-slate-400 hover:text-slate-650" />
                </button>
              )}
            </div>
          )}
        </div>


      </div>

      <form onSubmit={handleSave} className="px-6 py-4 border-t border-indigo-100/30 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-[2.5rem] transition-colors flex flex-col gap-3">
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md border border-transparent dark:border-white/10 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
        >
          {loading ? "Saving..." : (
            <>
              {mode === 'edit' ? `Update ${labels.appointment}` : `Confirm ${labels.appointment}`} <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
        {generalError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-450 rounded-xl text-xs font-bold border border-rose-100 dark:border-rose-900/30 animate-in fade-in slide-in-from-top-2 duration-200 text-center">
            {generalError}
          </div>
        )}
      </form>
    </div>
  );

  if (inline) return content;

  return (
    <>
      {mode === "create" && (
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-2xl font-bold text-xs hover:bg-indigo-700 transition-all shadow-sm border border-transparent dark:border-white/10"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      )}

      {isOpen && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4 md:p-8">
            <div 
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse" 
            />
            <div className="relative w-full max-w-lg">
              {content}
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
