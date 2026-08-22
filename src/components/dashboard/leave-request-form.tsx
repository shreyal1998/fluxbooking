"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { submitLeaveRequest } from "@/app/actions/dashboard";
import { Calendar, Clock, Send, AlertCircle, ChevronDown, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

// 15-minute interval time options (same as manual booking popup)
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

const InputError = ({ message }: { message?: string }) => {
  if (!message) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1.5 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200">
      <AlertCircle className="h-3 w-3" />
      <span className="text-[10px] font-black uppercase tracking-wider">{message}</span>
    </div>
  );
};

export function LeaveRequestForm({ 
  isAdmin = false, 
  timeFormat = "12h",
  weekStart = "sunday"
}: { 
  isAdmin?: boolean; 
  timeFormat?: string;
  weekStart?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isAllDay, setIsAllDay] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // ---------- Date formatting helper ----------
  const formatDateInput = (raw: string): string => {
    const digits = raw.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4, 8);
  };

  // ---------- Date picker 1: Start Date (All Day) ----------
  const [startDateInputValue, setStartDateInputValue] = useState("");
  const [selectedStartDate, setSelectedStartDate] = useState("");
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [startDatePickerMonth, setStartDatePickerMonth] = useState(new Date().getMonth());
  const [startDatePickerYear, setStartDatePickerYear] = useState(new Date().getFullYear());
  const [startDatePickerDir, setStartDatePickerDir] = useState<"up" | "down">("down");
  const startDatePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedStartDate) {
      const d = new Date(selectedStartDate + "T00:00");
      if (!isNaN(d.getTime())) {
        setStartDatePickerMonth(d.getMonth());
        setStartDatePickerYear(d.getFullYear());
      }
    }
  }, [selectedStartDate]);

  // ---------- Date picker 2: End Date (All Day) ----------
  const [endDateInputValue, setEndDateInputValue] = useState("");
  const [selectedEndDate, setSelectedEndDate] = useState("");
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);
  const [endDatePickerMonth, setEndDatePickerMonth] = useState(new Date().getMonth());
  const [endDatePickerYear, setEndDatePickerYear] = useState(new Date().getFullYear());
  const [endDatePickerDir, setEndDatePickerDir] = useState<"up" | "down">("down");
  const endDatePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedEndDate) {
      const d = new Date(selectedEndDate + "T00:00");
      if (!isNaN(d.getTime())) {
        setEndDatePickerMonth(d.getMonth());
        setEndDatePickerYear(d.getFullYear());
      }
    }
  }, [selectedEndDate]);

  // ---------- Date picker 3: Specific Date (Specific Time) ----------
  const [dateInputValue, setDateInputValue] = useState("");
  const [selectedBlockDate, setSelectedBlockDate] = useState("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(new Date().getMonth());
  const [datePickerYear, setDatePickerYear] = useState(new Date().getFullYear());
  const [datePickerDir, setDatePickerDir] = useState<"up" | "down">("down");
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedBlockDate) {
      const d = new Date(selectedBlockDate + "T00:00");
      if (!isNaN(d.getTime())) {
        setDatePickerMonth(d.getMonth());
        setDatePickerYear(d.getFullYear());
      }
    }
  }, [selectedBlockDate]);

  // ---------- Time picker state (mirrors manual booking) ----------
  const [isStartTimeOpen, setIsStartTimeOpen] = useState(false);
  const [isEndTimeOpen, setIsEndTimeOpen] = useState(false);
  const [startTimeDir, setStartTimeDir] = useState<"up" | "down">("down");
  const [endTimeDir, setEndTimeDir] = useState<"up" | "down">("down");
  const [isStartAmPmOpen, setIsStartAmPmOpen] = useState(false);
  const [isEndAmPmOpen, setIsEndAmPmOpen] = useState(false);
  const [startAmPmDir, setStartAmPmDir] = useState<"up" | "down">("down");
  const [endAmPmDir, setEndAmPmDir] = useState<"up" | "down">("down");

  const startTimeRef = useRef<HTMLDivElement>(null);
  const endTimeRef = useRef<HTMLDivElement>(null);
  const startAmPmRef = useRef<HTMLDivElement>(null);
  const endAmPmRef = useRef<HTMLDivElement>(null);

  // 24h storage strings (HH:mm)
  const [startTimeStr, setStartTimeStr] = useState("");
  const [endTimeStr, setEndTimeStr] = useState("");
  const [startAmPm, setStartAmPm] = useState<"AM" | "PM">("AM");
  const [endAmPm, setEndAmPm] = useState<"AM" | "PM">("AM");
  const [startTimeInput, setStartTimeInput] = useState("");
  const [endTimeInput, setEndTimeInput] = useState("");

  // ---------- Leave Type Custom Dropdown state ----------
  const [selectedLeaveType, setSelectedLeaveType] = useState("SICK");
  const [isLeaveTypeOpen, setIsLeaveTypeOpen] = useState(false);
  const leaveTypeRef = useRef<HTMLDivElement>(null);

  // Sync display input + AM/PM when raw 24h string changes (e.g. from dropdown)
  useEffect(() => {
    if (startTimeStr) {
      const h = parseInt(startTimeStr.split(":")[0], 10);
      const m = startTimeStr.split(":")[1] || "00";
      setStartAmPm(h >= 12 ? "PM" : "AM");
      if (timeFormat === "24h") {
        setStartTimeInput(`${h.toString().padStart(2, "0")}:${m}`);
      } else {
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        setStartTimeInput(`${h12.toString().padStart(2, "0")}:${m}`);
      }
    } else {
      setStartTimeInput("");
    }
  }, [startTimeStr, timeFormat]);

  useEffect(() => {
    if (endTimeStr) {
      const h = parseInt(endTimeStr.split(":")[0], 10);
      const m = endTimeStr.split(":")[1] || "00";
      setEndAmPm(h >= 12 ? "PM" : "AM");
      if (timeFormat === "24h") {
        setEndTimeInput(`${h.toString().padStart(2, "0")}:${m}`);
      } else {
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        setEndTimeInput(`${h12.toString().padStart(2, "0")}:${m}`);
      }
    } else {
      setEndTimeInput("");
    }
  }, [endTimeStr, timeFormat]);

  // Click-outside to close dropdowns & calendars
  useEffect(() => {
    if (!isStartTimeOpen && !isEndTimeOpen && !isStartAmPmOpen && !isEndAmPmOpen && !isDatePickerOpen && !isStartDatePickerOpen && !isEndDatePickerOpen && !isLeaveTypeOpen) {
      return;
    }
    function onMouseDown(e: MouseEvent) {
      if (startTimeRef.current && !startTimeRef.current.contains(e.target as Node)) setIsStartTimeOpen(false);
      if (endTimeRef.current && !endTimeRef.current.contains(e.target as Node)) setIsEndTimeOpen(false);
      if (startAmPmRef.current && !startAmPmRef.current.contains(e.target as Node)) setIsStartAmPmOpen(false);
      if (endAmPmRef.current && !endAmPmRef.current.contains(e.target as Node)) setIsEndAmPmOpen(false);
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) setIsDatePickerOpen(false);
      if (startDatePickerRef.current && !startDatePickerRef.current.contains(e.target as Node)) setIsStartDatePickerOpen(false);
      if (endDatePickerRef.current && !endDatePickerRef.current.contains(e.target as Node)) setIsEndDatePickerOpen(false);
      if (leaveTypeRef.current && !leaveTypeRef.current.contains(e.target as Node)) setIsLeaveTypeOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [isStartTimeOpen, isEndTimeOpen, isStartAmPmOpen, isEndAmPmOpen, isDatePickerOpen, isStartDatePickerOpen, isEndDatePickerOpen, isLeaveTypeOpen]);

  // Update dropdown direction on open/resize
  useLayoutEffect(() => {
    const update = () => {
      if (isStartTimeOpen && startTimeRef.current) {
        const rect = startTimeRef.current.getBoundingClientRect();
        setStartTimeDir(window.innerHeight - rect.bottom < 280 ? "up" : "down");
      }
      if (isEndTimeOpen && endTimeRef.current) {
        const rect = endTimeRef.current.getBoundingClientRect();
        setEndTimeDir(window.innerHeight - rect.bottom < 280 ? "up" : "down");
      }
      if (isStartAmPmOpen && startAmPmRef.current) {
        const rect = startAmPmRef.current.getBoundingClientRect();
        setStartAmPmDir(window.innerHeight - rect.bottom < 120 ? "up" : "down");
      }
      if (isEndAmPmOpen && endAmPmRef.current) {
        const rect = endAmPmRef.current.getBoundingClientRect();
        setEndAmPmDir(window.innerHeight - rect.bottom < 120 ? "up" : "down");
      }
    };
    if (isStartTimeOpen || isEndTimeOpen || isStartAmPmOpen || isEndAmPmOpen) {
      update();
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
  }, [isStartTimeOpen, isEndTimeOpen, isStartAmPmOpen, isEndAmPmOpen]);

  // Calendar calculations
  const getDaysInMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = weekStart === "monday" ? (firstDay.getDay() + 6) % 7 : firstDay.getDay();
    const days = [];
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({ day: prevMonthTotalDays - i, monthOffset: -1, date: new Date(year, month - 1, prevMonthTotalDays - i) });
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push({ day: i, monthOffset: 0, date: new Date(year, month, i) });
    }
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ day: i, monthOffset: 1, date: new Date(year, month + 1, i) });
    }
    return days;
  };

  const handlePrevBlockMonth = () => {
    if (datePickerMonth === 0) { setDatePickerMonth(11); setDatePickerYear(prev => prev - 1); }
    else setDatePickerMonth(prev => prev - 1);
  };
  const handleNextBlockMonth = () => {
    if (datePickerMonth === 11) { setDatePickerMonth(0); setDatePickerYear(prev => prev + 1); }
    else setDatePickerMonth(prev => prev + 1);
  };

  const handlePrevStartMonth = () => {
    if (startDatePickerMonth === 0) { setStartDatePickerMonth(11); setStartDatePickerYear(prev => prev - 1); }
    else setStartDatePickerMonth(prev => prev - 1);
  };
  const handleNextStartMonth = () => {
    if (startDatePickerMonth === 11) { setStartDatePickerMonth(0); setStartDatePickerYear(prev => prev + 1); }
    else setStartDatePickerMonth(prev => prev + 1);
  };

  const handlePrevEndMonth = () => {
    if (endDatePickerMonth === 0) { setEndDatePickerMonth(11); setEndDatePickerYear(prev => prev - 1); }
    else setEndDatePickerMonth(prev => prev - 1);
  };
  const handleNextEndMonth = () => {
    if (endDatePickerMonth === 11) { setEndDatePickerMonth(0); setEndDatePickerYear(prev => prev + 1); }
    else setEndDatePickerMonth(prev => prev + 1);
  };

  // Time input helpers
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
    if (digits.length === 0) { setter(""); return; }
    const isDeleting = digits.length < prevDigits.length;
    if (isDeleting) {
      if (digits.length <= 2) setter(digits);
      else setter(`${digits.slice(0, 2)}:${digits.slice(2)}`);
      return;
    }
    if (digits.length === 1) {
      setter(digits);
    } else if (digits.length === 2) {
      const hh = parseInt(digits, 10);
      if (hh > maxH) setter(`0${digits[0]}:${digits[1]}`);
      else setter(digits);
    } else if (digits.length === 3) {
      if (digits.startsWith("0")) setter(`${digits.slice(0, 2)}:${digits[2]}`);
      else {
        const hh = parseInt(digits.slice(0, 2), 10);
        if (hh > maxH) setter(`0${digits[0]}:${digits[1]}${digits[2]}`);
        else setter(`${digits.slice(0, 2)}:${digits[2]}`);
      }
    } else {
      const fourDigits = digits.slice(0, 4);
      let hhStr: string, mmStr: string;
      if (fourDigits.startsWith("0")) { hhStr = fourDigits.slice(0, 2); mmStr = fourDigits.slice(2, 4); }
      else {
        const hh = parseInt(fourDigits.slice(0, 2), 10);
        if (hh > maxH) { hhStr = `0${fourDigits[0]}`; mmStr = `${fourDigits[1]}${fourDigits[2]}`; }
        else { hhStr = fourDigits.slice(0, 2); mmStr = fourDigits.slice(2, 4); }
      }
      let hhVal = parseInt(hhStr, 10), mmVal = parseInt(mmStr, 10);
      if (mmVal === 60) {
        mmVal = 0;
        if (timeFormat === "24h") { hhVal = (hhVal + 1) % 24; }
        else if (ampm && setAmpm) {
          let h24 = ampm === "PM" && hhVal < 12 ? hhVal + 12 : ampm === "AM" && hhVal === 12 ? 0 : hhVal;
          h24 = (h24 + 1) % 24;
          setAmpm(h24 >= 12 ? "PM" : "AM");
          let h12 = h24 % 12; if (h12 === 0) h12 = 12;
          hhVal = h12;
        }
      } else if (mmVal > 60) mmVal = 0;
      setter(`${hhVal.toString().padStart(2, "0")}:${mmVal.toString().padStart(2, "0")}`);
    }
  };

  const padTimeInput = (input: string, ampm?: "AM" | "PM", setAmpm?: (p: "AM" | "PM") => void): string => {
    const digits = input.replace(/[^0-9]/g, "");
    if (!digits) return input;
    const maxH = timeFormat === "24h" ? 23 : 12;
    let result = "";
    if (digits.length === 1) result = `0${digits}:00`;
    else if (digits.length === 2) {
      const hh = parseInt(digits, 10);
      result = hh > maxH ? `0${digits[0]}:0${digits[1]}` : `${digits}:00`;
    } else if (digits.length === 3) {
      if (digits.startsWith("0")) result = `${digits.slice(0, 2)}:${digits[2]}0`;
      else {
        const hh = parseInt(digits.slice(0, 2), 10);
        result = hh > maxH ? `0${digits[0]}:${digits[1]}${digits[2]}` : `${digits.slice(0, 2)}:${digits[2]}0`;
      }
    } else {
      const four = digits.slice(0, 4);
      if (four.startsWith("0")) result = `${four.slice(0, 2)}:${four.slice(2, 4)}`;
      else {
        const hh = parseInt(four.slice(0, 2), 10);
        result = hh > maxH ? `0${four[0]}:${four[1]}${four[2]}` : `${four.slice(0, 2)}:${four.slice(2, 4)}`;
      }
    }
    const parts = result.split(":");
    if (parts.length === 2) {
      let hhVal = parseInt(parts[0], 10), mmVal = parseInt(parts[1], 10);
      if (mmVal === 60) {
        mmVal = 0;
        if (timeFormat === "24h") hhVal = (hhVal + 1) % 24;
        else if (ampm && setAmpm) {
          let h24 = ampm === "PM" && hhVal < 12 ? hhVal + 12 : ampm === "AM" && hhVal === 12 ? 0 : hhVal;
          h24 = (h24 + 1) % 24;
          setAmpm(h24 >= 12 ? "PM" : "AM");
          let h12 = h24 % 12; if (h12 === 0) h12 = 12;
          hhVal = h12;
        }
      } else if (mmVal > 60) mmVal = 0;
      return `${hhVal.toString().padStart(2, "0")}:${mmVal.toString().padStart(2, "0")}`;
    }
    return result;
  };

  const validateTimeInput = (padded: string, ampm: "AM" | "PM"): string | null => {
    const match = padded.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return `Enter time as HH:MM (e.g. ${timeFormat === "24h" ? "14:30" : "09:30"})`;
    const h = parseInt(match[1], 10), m = parseInt(match[2], 10);
    const maxH = timeFormat === "24h" ? 23 : 12, minH = timeFormat === "24h" ? 0 : 1;
    if (h < minH || h > maxH) return `Hour must be ${minH}–${maxH}`;
    if (m < 0 || m > 59) return "Minutes must be between 00 and 59";
    return null;
  };

  const parseHHMMAmPm = (hhmm: string, ampm: "AM" | "PM"): string | null => {
    const match = hhmm.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (m < 0 || m > 59) return null;
    if (timeFormat === "24h") {
      if (h < 0 || h > 23) return null;
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    }
    if (h < 1 || h > 12) return null;
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const formatOptionLabel = (timeVal: string) => {
    if (!timeVal) return "";
    let normalized = timeVal;
    if (timeVal.includes(":")) {
      const parts = timeVal.split(":");
      normalized = `${parts[0].padStart(2, "0")}:${parts[1]}`;
    }
    const matched = timeOptions.find(t => t.value === normalized);
    if (timeFormat !== "24h") return matched ? matched.label : normalized;
    if (normalized === "24:00") return "00:00";
    return normalized;
  };

  const handleStartTimeBlur = () => {
    if (!startTimeInput) { setStartTimeStr(""); return; }
    const padded = padTimeInput(startTimeInput, startAmPm, setStartAmPm);
    const err = validateTimeInput(padded, startAmPm);
    if (err) { setFieldErrors(prev => ({ ...prev, startTime: err })); return; }
    setStartTimeInput(padded);
    const parsed = parseHHMMAmPm(padded, startAmPm);
    if (parsed) {
      setStartTimeStr(parsed);
      setFieldErrors(prev => ({ ...prev, startTime: "" }));
      if (endTimeStr && parsed >= endTimeStr) {
        setFieldErrors(prev => ({ ...prev, endTime: "End time must be after start time" }));
      } else if (endTimeStr) {
        setFieldErrors(prev => ({ ...prev, endTime: "" }));
      }
    }
  };

  const handleEndTimeBlur = () => {
    if (!endTimeInput) { setEndTimeStr(""); return; }
    const padded = padTimeInput(endTimeInput, endAmPm, setEndAmPm);
    const err = validateTimeInput(padded, endAmPm);
    if (err) { setFieldErrors(prev => ({ ...prev, endTime: err })); return; }
    setEndTimeInput(padded);
    const parsed = parseHHMMAmPm(padded, endAmPm);
    if (parsed) {
      setEndTimeStr(parsed);
      if (startTimeStr && parsed <= startTimeStr) {
        setFieldErrors(prev => ({ ...prev, endTime: "End time must be after start time" }));
      } else {
        setFieldErrors(prev => ({ ...prev, endTime: "" }));
      }
    }
  };

  const clearFieldError = (field: string) => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    let finalStartTime = "";
    let finalEndTime = "";

    if (isAllDay) {
      if (selectedStartDate) finalStartTime = `${selectedStartDate}T00:00`;
      if (selectedEndDate) finalEndTime = `${selectedEndDate}T23:59`;
    } else {
      if (selectedBlockDate && startTimeStr) finalStartTime = `${selectedBlockDate}T${startTimeStr}`;
      if (selectedBlockDate && endTimeStr) finalEndTime = `${selectedBlockDate}T${endTimeStr}`;
    }

    const errors: Record<string, string> = {};
    if (isAllDay) {
      if (!selectedStartDate) errors.startDate = "Start date is required";
      if (!selectedEndDate) errors.endDate = "End date is required";
      if (selectedStartDate && selectedEndDate) {
        const start = new Date(selectedStartDate);
        const end = new Date(selectedEndDate);
        if (start > end) errors.endDate = "End date must be on or after start date";
      }
    } else {
      if (!selectedBlockDate) errors.date = "Date is required";
      if (!startTimeStr) errors.startTime = "Start time is required";
      if (!endTimeStr) errors.endTime = "End time is required";
      if (selectedBlockDate && startTimeStr && endTimeStr) {
        const start = new Date(`${selectedBlockDate}T${startTimeStr}`);
        const end = new Date(`${selectedBlockDate}T${endTimeStr}`);
        if (start >= end) errors.endTime = "End time must be after start time";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    const submitData = new FormData();
    submitData.append("type", formData.get("type") as string);
    submitData.append("reason", formData.get("reason") as string);
    submitData.append("startTime", finalStartTime);
    submitData.append("endTime", finalEndTime);

    const result = await submitLeaveRequest(submitData);

    if (result.success) {
      if (isAdmin) {
        toast.success("Leave applied successfully!");
        setMessage(null);
      } else {
        toast.success("Leave request submitted successfully!");
        setMessage({ type: 'success', text: "Request submitted! Waiting for Admin approval." });
      }
      (e.target as HTMLFormElement).reset();
      setIsAllDay(true);
      setStartTimeStr("");
      setEndTimeStr("");
      setStartTimeInput("");
      setEndTimeInput("");
      setStartAmPm("AM");
      setEndAmPm("AM");
      setDateInputValue("");
      setSelectedBlockDate("");
      setStartDateInputValue("");
      setSelectedStartDate("");
      setEndDateInputValue("");
      setSelectedEndDate("");
      router.refresh();
    } else {
      setMessage({ type: 'error', text: result.error || "Failed to submit request" });
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 transition-colors" noValidate>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">
            Leave Type <span className="text-rose-500">*</span>
          </label>
          <div className="relative" ref={leaveTypeRef}>
            <input type="hidden" name="type" value={selectedLeaveType} />
            <div
              onClick={() => {
                setIsStartTimeOpen(false);
                setIsEndTimeOpen(false);
                setIsStartAmPmOpen(false);
                setIsEndAmPmOpen(false);
                setIsDatePickerOpen(false);
                setIsStartDatePickerOpen(false);
                setIsEndDatePickerOpen(false);
                setIsLeaveTypeOpen(!isLeaveTypeOpen);
              }}
              className="relative flex items-center justify-between w-full bg-indigo-50/30 dark:bg-slate-800 border-2 border-indigo-100/50 dark:border-slate-700/50 hover:border-indigo-200 dark:hover:border-slate-600 rounded-2xl p-4 text-sm font-semibold text-slate-900 dark:text-white cursor-pointer transition-all shadow-sm"
            >
              <span>
                {(() => {
                  switch (selectedLeaveType) {
                    case "SICK": return "Sick Leave";
                    case "EMERGENCY": return "Emergency / Urgent Personal";
                    case "VACATION": return "Vacation (Planned)";
                    case "PERSONAL": return "Personal Day (Planned)";
                    default: return "Select Leave Type";
                  }
                })()}
              </span>
              <ChevronDown className={`h-4 w-4 text-indigo-500 transition-transform duration-200 ${isLeaveTypeOpen ? "rotate-180" : ""}`} />
            </div>

            {isLeaveTypeOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl z-50 py-1" onClick={e => e.stopPropagation()}>
                {[
                  { value: "SICK", label: "Sick Leave" },
                  { value: "EMERGENCY", label: "Emergency / Urgent Personal" },
                  { value: "VACATION", label: "Vacation (Planned)" },
                  { value: "PERSONAL", label: "Personal Day (Planned)" }
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSelectedLeaveType(opt.value);
                      setIsLeaveTypeOpen(false);
                    }}
                    className={`w-full px-4 py-3.5 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between transition-all ${
                      selectedLeaveType === opt.value 
                        ? "bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400" 
                        : "text-slate-700 dark:text-slate-350"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {selectedLeaveType === opt.value && <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">Reason (Optional)</label>
          <input
            name="reason"
            type="text"
            placeholder="e.g., Family event"
            className="w-full bg-indigo-50/30 dark:bg-slate-800 border-2 border-indigo-100/50 dark:border-slate-700/50 focus:border-indigo-600 dark:focus:border-indigo-500 hover:border-indigo-200 dark:hover:border-slate-600 rounded-2xl p-4 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {/* All Day Toggle Switch */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50/20 dark:bg-slate-800/40 border border-indigo-100/30 dark:border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">All Day Leave</p>
            <p className="text-[10px] font-medium text-slate-400">Block entire day availability</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setIsAllDay(!isAllDay); setFieldErrors({}); }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isAllDay ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAllDay ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {isAllDay ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Start Date Selector */}
          <div>
            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">
              Start Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative" ref={startDatePickerRef}>
              <input
                type="text"
                value={startDateInputValue}
                placeholder="dd/mm/yyyy"
                onChange={(e) => {
                  const formatted = formatDateInput(e.target.value);
                  setStartDateInputValue(formatted);
                  clearFieldError("startDate");

                  if (formatted.length < 10) {
                    setSelectedStartDate("");
                    return;
                  }

                  const match = formatted.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                  if (match) {
                    const day = parseInt(match[1], 10);
                    const month = parseInt(match[2], 10) - 1;
                    const year = parseInt(match[3], 10);
                    const parsed = new Date(year, month, day);
                    if (
                      parsed.getFullYear() === year &&
                      parsed.getMonth() === month &&
                      parsed.getDate() === day &&
                      !isNaN(parsed.getTime())
                    ) {
                      const yyyymmdd = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      setSelectedStartDate(yyyymmdd);
                      return;
                    }
                  }
                  setSelectedStartDate("");
                  setFieldErrors(prev => ({ ...prev, startDate: "Please enter a valid date in dd/mm/yyyy format." }));
                }}
                className={`w-full bg-indigo-50/30 dark:bg-slate-800 border-2 rounded-2xl p-4 pr-12 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all shadow-sm ${fieldErrors.startDate ? "border-rose-200 bg-rose-50/30 focus:border-rose-500" : "border-indigo-100/50 dark:border-slate-700/50 focus:border-indigo-600 dark:focus:border-indigo-500 hover:border-indigo-200 dark:hover:border-slate-600"}`}
              />
              <button
                type="button"
                onClick={() => {
                  const newOpen = !isStartDatePickerOpen;
                  setIsStartDatePickerOpen(newOpen);
                  if (newOpen && startDatePickerRef.current) {
                    const rect = startDatePickerRef.current.getBoundingClientRect();
                    setStartDatePickerDir(window.innerHeight - rect.bottom < 320 ? "up" : "down");
                  }
                  setIsEndDatePickerOpen(false);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 focus:outline-none hover:opacity-80 active:scale-95 transition-all cursor-pointer"
              >
                <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              </button>

              {isStartDatePickerOpen && (
                <div className={`absolute z-[100] w-[240px] right-0 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[1.25rem] shadow-xl p-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
                  startDatePickerDir === "up" ? "bottom-full mb-2" : "top-full mt-2"
                }`}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      onClick={handlePrevStartMonth}
                      className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {format(new Date(startDatePickerYear, startDatePickerMonth, 1), "MMMM yyyy")}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextStartMonth}
                      className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Days of Week */}
                  <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
                    {(weekStart === "monday"
                      ? ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
                      : ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
                    ).map((d) => (
                      <span key={d} className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 py-0.5">
                        {d}
                      </span>
                    ))}
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-0.5">
                    {getDaysInMonth(startDatePickerYear, startDatePickerMonth).map((dayObj, idx) => {
                      const dayStr = format(dayObj.date, "yyyy-MM-dd");
                      const isSelected = selectedStartDate === dayStr;
                      const isToday = format(new Date(), "yyyy-MM-dd") === dayStr;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedStartDate(dayStr);
                            const d = dayObj.date;
                            const dd = String(d.getDate()).padStart(2, '0');
                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                            setStartDateInputValue(`${dd}/${mm}/${d.getFullYear()}`);
                            setFieldErrors(prev => ({ ...prev, startDate: "" }));
                            setIsStartDatePickerOpen(false);
                          }}
                          className={`aspect-square flex items-center justify-center rounded-lg text-[11px] font-bold cursor-pointer transition-all active:scale-90 ${
                            dayObj.monthOffset !== 0
                              ? "text-slate-300 dark:text-slate-600 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                          } ${
                            isSelected
                              ? "!bg-indigo-600 !text-white hover:!bg-indigo-700 shadow-md shadow-indigo-100 dark:shadow-none"
                              : ""
                          } ${
                            isToday && !isSelected
                              ? "ring-2 ring-indigo-500/20 dark:ring-indigo-400/20 font-black text-indigo-600 dark:text-indigo-400"
                              : ""
                          }`}
                        >
                          {dayObj.day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <InputError message={fieldErrors.startDate} />
          </div>

          {/* End Date Selector */}
          <div>
            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">
              End Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative" ref={endDatePickerRef}>
              <input
                type="text"
                value={endDateInputValue}
                placeholder="dd/mm/yyyy"
                onChange={(e) => {
                  const formatted = formatDateInput(e.target.value);
                  setEndDateInputValue(formatted);
                  clearFieldError("endDate");

                  if (formatted.length < 10) {
                    setSelectedEndDate("");
                    return;
                  }

                  const match = formatted.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                  if (match) {
                    const day = parseInt(match[1], 10);
                    const month = parseInt(match[2], 10) - 1;
                    const year = parseInt(match[3], 10);
                    const parsed = new Date(year, month, day);
                    if (
                      parsed.getFullYear() === year &&
                      parsed.getMonth() === month &&
                      parsed.getDate() === day &&
                      !isNaN(parsed.getTime())
                    ) {
                      const yyyymmdd = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      setSelectedEndDate(yyyymmdd);
                      return;
                    }
                  }
                  setSelectedEndDate("");
                  setFieldErrors(prev => ({ ...prev, endDate: "Please enter a valid date in dd/mm/yyyy format." }));
                }}
                className={`w-full bg-indigo-50/30 dark:bg-slate-800 border-2 rounded-2xl p-4 pr-12 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all shadow-sm ${fieldErrors.endDate ? "border-rose-200 bg-rose-50/30 focus:border-rose-500" : "border-indigo-100/50 dark:border-slate-700/50 focus:border-indigo-600 dark:focus:border-indigo-500 hover:border-indigo-200 dark:hover:border-slate-600"}`}
              />
              <button
                type="button"
                onClick={() => {
                  const newOpen = !isEndDatePickerOpen;
                  setIsEndDatePickerOpen(newOpen);
                  if (newOpen && endDatePickerRef.current) {
                    const rect = endDatePickerRef.current.getBoundingClientRect();
                    setEndDatePickerDir(window.innerHeight - rect.bottom < 320 ? "up" : "down");
                  }
                  setIsStartDatePickerOpen(false);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 focus:outline-none hover:opacity-80 active:scale-95 transition-all cursor-pointer"
              >
                <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              </button>

              {isEndDatePickerOpen && (
                <div className={`absolute z-[100] w-[240px] right-0 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[1.25rem] shadow-xl p-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
                  endDatePickerDir === "up" ? "bottom-full mb-2" : "top-full mt-2"
                }`}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      onClick={handlePrevEndMonth}
                      className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {format(new Date(endDatePickerYear, endDatePickerMonth, 1), "MMMM yyyy")}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextEndMonth}
                      className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Days of Week */}
                  <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
                    {(weekStart === "monday"
                      ? ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
                      : ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
                    ).map((d) => (
                      <span key={d} className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 py-0.5">
                        {d}
                      </span>
                    ))}
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-0.5">
                    {getDaysInMonth(endDatePickerYear, endDatePickerMonth).map((dayObj, idx) => {
                      const dayStr = format(dayObj.date, "yyyy-MM-dd");
                      const isSelected = selectedEndDate === dayStr;
                      const isToday = format(new Date(), "yyyy-MM-dd") === dayStr;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedEndDate(dayStr);
                            const d = dayObj.date;
                            const dd = String(d.getDate()).padStart(2, '0');
                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                            setEndDateInputValue(`${dd}/${mm}/${d.getFullYear()}`);
                            setFieldErrors(prev => ({ ...prev, endDate: "" }));
                            setIsEndDatePickerOpen(false);
                          }}
                          className={`aspect-square flex items-center justify-center rounded-lg text-[11px] font-bold cursor-pointer transition-all active:scale-90 ${
                            dayObj.monthOffset !== 0
                              ? "text-slate-300 dark:text-slate-600 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                          } ${
                            isSelected
                              ? "!bg-indigo-600 !text-white hover:!bg-indigo-700 shadow-md shadow-indigo-100 dark:shadow-none"
                              : ""
                          } ${
                            isToday && !isSelected
                              ? "ring-2 ring-indigo-500/20 dark:ring-indigo-400/20 font-black text-indigo-600 dark:text-indigo-400"
                              : ""
                          }`}
                        >
                          {dayObj.day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <InputError message={fieldErrors.endDate} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {/* Specific Date Selector */}
          <div>
            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">
              Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative" ref={datePickerRef}>
              <input
                type="text"
                value={dateInputValue}
                placeholder="dd/mm/yyyy"
                onChange={(e) => {
                  const formatted = formatDateInput(e.target.value);
                  setDateInputValue(formatted);
                  clearFieldError("date");

                  if (formatted.length < 10) {
                    setSelectedBlockDate("");
                    return;
                  }

                  const match = formatted.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                  if (match) {
                    const day = parseInt(match[1], 10);
                    const month = parseInt(match[2], 10) - 1;
                    const year = parseInt(match[3], 10);
                    const parsed = new Date(year, month, day);
                    if (
                      parsed.getFullYear() === year &&
                      parsed.getMonth() === month &&
                      parsed.getDate() === day &&
                      !isNaN(parsed.getTime())
                    ) {
                      const yyyymmdd = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      setSelectedBlockDate(yyyymmdd);
                      return;
                    }
                  }
                  setSelectedBlockDate("");
                  setFieldErrors(prev => ({ ...prev, date: "Please enter a valid date in dd/mm/yyyy format." }));
                }}
                className={`w-full bg-indigo-50/30 dark:bg-slate-800 border-2 rounded-2xl p-4 pr-12 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all shadow-sm ${fieldErrors.date ? "border-rose-200 bg-rose-50/30 focus:border-rose-500" : "border-indigo-100/50 dark:border-slate-700/50 focus:border-indigo-600 dark:focus:border-indigo-500 hover:border-indigo-200 dark:hover:border-slate-600"}`}
              />
              <button
                type="button"
                onClick={() => {
                  const newOpen = !isDatePickerOpen;
                  setIsDatePickerOpen(newOpen);
                  if (newOpen && datePickerRef.current) {
                    const rect = datePickerRef.current.getBoundingClientRect();
                    setDatePickerDir(window.innerHeight - rect.bottom < 320 ? "up" : "down");
                  }
                  setIsStartTimeOpen(false);
                  setIsEndTimeOpen(false);
                  setIsStartAmPmOpen(false);
                  setIsEndAmPmOpen(false);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 focus:outline-none hover:opacity-80 active:scale-95 transition-all cursor-pointer"
              >
                <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              </button>

              {isDatePickerOpen && (
                <div className={`absolute z-[100] w-[240px] right-0 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[1.25rem] shadow-xl p-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
                  datePickerDir === "up" ? "bottom-full mb-2" : "top-full mt-2"
                }`}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      onClick={handlePrevBlockMonth}
                      className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {format(new Date(datePickerYear, datePickerMonth, 1), "MMMM yyyy")}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextBlockMonth}
                      className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Days of Week */}
                  <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
                    {(weekStart === "monday"
                      ? ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
                      : ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
                    ).map((d) => (
                      <span key={d} className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 py-0.5">
                        {d}
                      </span>
                    ))}
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-0.5">
                    {getDaysInMonth(datePickerYear, datePickerMonth).map((dayObj, idx) => {
                      const dayStr = format(dayObj.date, "yyyy-MM-dd");
                      const isSelected = selectedBlockDate === dayStr;
                      const isToday = format(new Date(), "yyyy-MM-dd") === dayStr;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedBlockDate(dayStr);
                            const d = dayObj.date;
                            const dd = String(d.getDate()).padStart(2, '0');
                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                            setDateInputValue(`${dd}/${mm}/${d.getFullYear()}`);
                            setFieldErrors(prev => ({ ...prev, date: "" }));
                            setIsDatePickerOpen(false);
                          }}
                          className={`aspect-square flex items-center justify-center rounded-lg text-[11px] font-bold cursor-pointer transition-all active:scale-90 ${
                            dayObj.monthOffset !== 0
                              ? "text-slate-300 dark:text-slate-600 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                          } ${
                            isSelected
                              ? "!bg-indigo-600 !text-white hover:!bg-indigo-700 shadow-md shadow-indigo-100 dark:shadow-none"
                              : ""
                          } ${
                            isToday && !isSelected
                              ? "ring-2 ring-indigo-500/20 dark:ring-indigo-400/20 font-black text-indigo-600 dark:text-indigo-400"
                              : ""
                          }`}
                        >
                          {dayObj.day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <InputError message={fieldErrors.date} />
          </div>

          {/* Start & End Time — full manual-booking dropdown */}
          <div className="grid grid-cols-2 gap-4">
            {/* Start Time Selector */}
            <div className="space-y-1 relative" ref={startTimeRef}>
              <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">
                Start Time <span className="text-rose-500">*</span>
              </label>
              <div
                onClick={() => {
                  if (!isStartTimeOpen) {
                    setIsEndTimeOpen(false);
                    setIsStartAmPmOpen(false);
                    setIsEndAmPmOpen(false);
                    if (startTimeRef.current) {
                      const rect = startTimeRef.current.getBoundingClientRect();
                      setStartTimeDir(window.innerHeight - rect.bottom < 280 ? "up" : "down");
                    }
                  }
                  setIsStartTimeOpen(!isStartTimeOpen);
                }}
                className={`relative flex items-center w-full bg-indigo-50/30 dark:bg-slate-800 border-2 rounded-2xl shadow-sm transition-all px-4 py-2.5 gap-2 cursor-pointer ${
                  fieldErrors.startTime ? "border-rose-200 bg-rose-50/30 focus-within:border-rose-500" : "border-indigo-100/50 dark:border-slate-700/50 focus-within:border-indigo-600 dark:focus-within:border-indigo-500 hover:border-indigo-200 dark:hover:border-slate-600"
                }`}
              >
                {/* Ghost overlay + typed input */}
                <div className="relative w-14 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <span aria-hidden="true" className="absolute inset-0 flex items-center pointer-events-none select-none text-sm font-semibold">
                    <span className="invisible">{startTimeInput}</span>
                    <span className="text-slate-400 dark:text-slate-500">{"00:00".slice(startTimeInput.length)}</span>
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={startTimeInput}
                    onChange={e => handleTimeInputChange(e.target.value, startTimeInput, setStartTimeInput, startAmPm, setStartAmPm)}
                    onFocus={() => setIsStartTimeOpen(false)}
                    onBlur={handleStartTimeBlur}
                    maxLength={5}
                    placeholder=""
                    className="relative z-10 w-full bg-transparent border-0 p-0 outline-none cursor-text text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </div>

                {/* AM/PM dropdown — 12h mode only */}
                {timeFormat !== "24h" && (
                  <div className="relative flex-shrink-0" ref={startAmPmRef} onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isStartAmPmOpen) {
                          setIsStartTimeOpen(false);
                          setIsEndTimeOpen(false);
                          setIsEndAmPmOpen(false);
                          if (startAmPmRef.current) {
                            const rect = startAmPmRef.current.getBoundingClientRect();
                            setStartAmPmDir(window.innerHeight - rect.bottom < 120 ? "up" : "down");
                          }
                        }
                        setIsStartAmPmOpen(!isStartAmPmOpen);
                      }}
                      className="flex items-center gap-1.5 bg-indigo-50/50 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 pl-3 pr-2 py-1.5 rounded-xl border border-indigo-100/50 dark:border-slate-800 text-[10px] font-black tracking-wider outline-none cursor-pointer hover:border-indigo-300 dark:hover:border-slate-700 transition-all"
                    >
                      <span>{startAmPm}</span>
                      <ChevronDown className={`h-3 w-3 text-indigo-500 transition-transform duration-200 ${isStartAmPmOpen ? "rotate-180" : ""}`} />
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
                              if (startTimeInput) {
                                const parsed = parseHHMMAmPm(startTimeInput, opt);
                                if (parsed) { setStartTimeStr(parsed); setFieldErrors(prev => ({ ...prev, startTime: "" })); }
                              }
                            }}
                            className={`w-full px-2.5 py-1.5 text-left text-[10px] font-bold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between ${startAmPm === opt ? "bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300"}`}
                          >
                            <span>{opt}</span>
                            {startAmPm === opt && <Check className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Chevron toggle for time list */}
                <div className="ml-auto p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 dark:text-slate-500">
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isStartTimeOpen ? "rotate-180" : ""}`} />
                </div>

                {/* Scrollable time list */}
                {isStartTimeOpen && (
                  <div className={`absolute left-0 right-0 ${startTimeDir === "up" ? "bottom-full mb-2" : "top-full mt-2"} bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto py-1 premium-scrollbar`} onClick={e => e.stopPropagation()}>
                    {timeOptions.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setStartTimeStr(opt.value);
                          setIsStartTimeOpen(false);
                          setFieldErrors(prev => ({ ...prev, startTime: "" }));
                        }}
                        className={`w-full px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between ${startTimeStr === opt.value ? "bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300"}`}
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
            <div className="space-y-1 relative" ref={endTimeRef}>
              <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">
                End Time <span className="text-rose-500">*</span>
              </label>
              <div
                onClick={() => {
                  if (!isEndTimeOpen) {
                    setIsStartTimeOpen(false);
                    setIsStartAmPmOpen(false);
                    setIsEndAmPmOpen(false);
                    if (endTimeRef.current) {
                      const rect = endTimeRef.current.getBoundingClientRect();
                      setEndTimeDir(window.innerHeight - rect.bottom < 280 ? "up" : "down");
                    }
                  }
                  setIsEndTimeOpen(!isEndTimeOpen);
                }}
                className={`relative flex items-center w-full bg-indigo-50/30 dark:bg-slate-800 border-2 rounded-2xl shadow-sm transition-all px-4 py-2.5 gap-2 cursor-pointer ${
                  fieldErrors.endTime ? "border-rose-200 bg-rose-50/30 focus-within:border-rose-500" : "border-indigo-100/50 dark:border-slate-700/50 focus-within:border-indigo-600 dark:focus-within:border-indigo-500 hover:border-indigo-200 dark:hover:border-slate-600"
                }`}
              >
                {/* Ghost overlay + typed input */}
                <div className="relative w-14 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <span aria-hidden="true" className="absolute inset-0 flex items-center pointer-events-none select-none text-sm font-semibold">
                    <span className="invisible">{endTimeInput}</span>
                    <span className="text-slate-400 dark:text-slate-500">{"00:00".slice(endTimeInput.length)}</span>
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={endTimeInput}
                    onChange={e => handleTimeInputChange(e.target.value, endTimeInput, setEndTimeInput, endAmPm, setEndAmPm)}
                    onFocus={() => setIsEndTimeOpen(false)}
                    onBlur={handleEndTimeBlur}
                    maxLength={5}
                    placeholder=""
                    className="relative z-10 w-full bg-transparent border-0 p-0 outline-none cursor-text text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </div>

                {/* AM/PM dropdown — 12h mode only */}
                {timeFormat !== "24h" && (
                  <div className="relative flex-shrink-0" ref={endAmPmRef} onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isEndAmPmOpen) {
                          setIsStartTimeOpen(false);
                          setIsEndTimeOpen(false);
                          setIsStartAmPmOpen(false);
                          if (endAmPmRef.current) {
                            const rect = endAmPmRef.current.getBoundingClientRect();
                            setEndAmPmDir(window.innerHeight - rect.bottom < 120 ? "up" : "down");
                          }
                        }
                        setIsEndAmPmOpen(!isEndAmPmOpen);
                      }}
                      className="flex items-center gap-1.5 bg-indigo-50/50 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 pl-3 pr-2 py-1.5 rounded-xl border border-indigo-100/50 dark:border-slate-800 text-[10px] font-black tracking-wider outline-none cursor-pointer hover:border-indigo-300 dark:hover:border-slate-700 transition-all"
                    >
                      <span>{endAmPm}</span>
                      <ChevronDown className={`h-3 w-3 text-indigo-500 transition-transform duration-200 ${isEndAmPmOpen ? "rotate-180" : ""}`} />
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
                                if (parsed) { setEndTimeStr(parsed); setFieldErrors(prev => ({ ...prev, endTime: "" })); }
                              }
                            }}
                            className={`w-full px-2.5 py-1.5 text-left text-[10px] font-bold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between ${endAmPm === opt ? "bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300"}`}
                          >
                            <span>{opt}</span>
                            {endAmPm === opt && <Check className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Chevron toggle for time list */}
                <div className="ml-auto p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 dark:text-slate-500">
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isEndTimeOpen ? "rotate-180" : ""}`} />
                </div>

                {/* Scrollable time list */}
                {isEndTimeOpen && (
                  <div className={`absolute left-0 right-0 ${endTimeDir === "up" ? "bottom-full mb-2" : "top-full mt-2"} bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto py-1 premium-scrollbar`} onClick={e => e.stopPropagation()}>
                    {timeOptions.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setEndTimeStr(opt.value);
                          setIsEndTimeOpen(false);
                          setFieldErrors(prev => ({ ...prev, endTime: "" }));
                        }}
                        className={`w-full px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between ${endTimeStr === opt.value ? "bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300"}`}
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
        </div>
      )}

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-2 text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'}`}>
          {message.type === 'success' ? <Send className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none border border-transparent dark:border-indigo-400/20 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
      >
        {loading ? "Submitting..." : (
          <>
            <Send className="h-4 w-4" />
            {isAdmin ? "Submit" : "Submit Request for Approval"}
          </>
        )}
      </button>
    </form>
  );
}
