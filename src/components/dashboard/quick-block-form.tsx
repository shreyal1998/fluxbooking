"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { blockTimeSlot } from "@/app/actions/dashboard";
import { Ban, AlertCircle, Loader2, Calendar, ChevronDown, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { toast } from "sonner";
import { format, addHours } from "date-fns";
import { useRouter } from "next/navigation";

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

function InputError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1.5 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200 text-left">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      <span className="text-xs font-semibold">{message}</span>
    </div>
  );
}

export function QuickBlockForm({ 
  staffId, 
  existingBlocks = [], 
  leaveRequests = [],
  initialData = null,
  onSuccess,
  inline = false,
  timeFormat = "12h",
  weekStart = "sunday"
}: { 
  staffId: string, 
  existingBlocks?: any[], 
  leaveRequests?: any[],
  initialData?: any,
  onSuccess?: () => void,
  inline?: boolean,
  timeFormat?: string,
  weekStart?: string
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Reset errors when data changes
  useEffect(() => {
    setFieldErrors({});
  }, [staffId, initialData]);

  const clearFieldError = (field: string) => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const formatDateForInput = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Dropdown open/direction states
  const [isStartTimeOpen, setIsStartTimeOpen] = useState(false);
  const [isEndTimeOpen, setIsEndTimeOpen] = useState(false);
  const [startTimeDir, setStartTimeDir] = useState<"up" | "down">("down");
  const [endTimeDir, setEndTimeDir] = useState<"up" | "down">("down");
  const [isStartAmPmOpen, setIsStartAmPmOpen] = useState(false);
  const [isEndAmPmOpen, setIsEndAmPmOpen] = useState(false);
  const [startAmPmDir, setStartAmPmDir] = useState<"up" | "down">("down");
  const [endAmPmDir, setEndAmPmDir] = useState<"up" | "down">("down");

  // Refs for click-outside detection
  const startTimeRef = useRef<HTMLDivElement>(null);
  const endTimeRef = useRef<HTMLDivElement>(null);
  const startAmPmRef = useRef<HTMLDivElement>(null);
  const endAmPmRef = useRef<HTMLDivElement>(null);

  // 24h storage strings (HH:mm)
  const [startTimeStr, setStartTimeStr] = useState<string>(() =>
    initialData?.startTime ? format(new Date(initialData.startTime), "HH:mm") : ""
  );
  const [endTimeStr, setEndTimeStr] = useState<string>(() =>
    initialData?.endTime ? format(new Date(initialData.endTime), "HH:mm") :
    initialData?.startTime ? format(addHours(new Date(initialData.startTime), 1), "HH:mm") : ""
  );

  // AM/PM state
  const [startAmPm, setStartAmPm] = useState<"AM" | "PM">(() => {
    if (initialData?.startTime) {
      return new Date(initialData.startTime).getHours() >= 12 ? "PM" : "AM";
    }
    return "AM";
  });
  const [endAmPm, setEndAmPm] = useState<"AM" | "PM">(() => {
    const ref = initialData?.endTime ? new Date(initialData.endTime)
      : initialData?.startTime ? addHours(new Date(initialData.startTime), 1) : null;
    return ref && ref.getHours() >= 12 ? "PM" : "AM";
  });

  // Display inputs (HH:MM in 12h or 24h)
  const [startTimeInput, setStartTimeInput] = useState<string>(() => {
    if (initialData?.startTime) {
      const h = parseInt(format(new Date(initialData.startTime), "HH"), 10);
      const m = format(new Date(initialData.startTime), "mm");
      if (timeFormat === "24h") return `${h.toString().padStart(2, "0")}:${m}`;
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${h12.toString().padStart(2, "0")}:${m}`;
    }
    return "";
  });
  const [endTimeInput, setEndTimeInput] = useState<string>(() => {
    const ref = initialData?.endTime ? new Date(initialData.endTime)
      : initialData?.startTime ? addHours(new Date(initialData.startTime), 1) : null;
    if (ref) {
      const h = ref.getHours();
      const m = format(ref, "mm");
      if (timeFormat === "24h") return `${h.toString().padStart(2, "0")}:${m}`;
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${h12.toString().padStart(2, "0")}:${m}`;
    }
    return "";
  });

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

  // Click-outside to close dropdowns
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (startTimeRef.current && !startTimeRef.current.contains(e.target as Node)) setIsStartTimeOpen(false);
      if (endTimeRef.current && !endTimeRef.current.contains(e.target as Node)) setIsEndTimeOpen(false);
      if (startAmPmRef.current && !startAmPmRef.current.contains(e.target as Node)) setIsStartAmPmOpen(false);
      if (endAmPmRef.current && !endAmPmRef.current.contains(e.target as Node)) setIsEndAmPmOpen(false);
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) setIsDatePickerOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Update dropdown direction on open/resize/scroll
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

  const validateTimeInput = (padded: string, ampm: "AM" | "PM") => {
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

  // dd/mm/yyyy auto-format (same as manual booking popup)
  const formatDateInput = (raw: string): string => {
    const digits = raw.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4, 8);
  };

  const [dateInputValue, setDateInputValue] = useState(() => {
    if (initialData?.startTime) {
      const d = new Date(initialData.startTime);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${dd}/${mm}/${d.getFullYear()}`;
    }
    return "";
  });
  const [selectedBlockDate, setSelectedBlockDate] = useState(() => {
    if (initialData?.startTime) {
      const d = new Date(initialData.startTime);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return "";
  });

  // ---------- Date picker state (mirrors manual booking) ----------
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(new Date().getMonth());
  const [datePickerYear, setDatePickerYear] = useState(new Date().getFullYear());
  const [datePickerDir, setDatePickerDir] = useState<"up" | "down">("down");
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Sync calendar view when date is selected
  useEffect(() => {
    if (selectedBlockDate) {
      const d = new Date(selectedBlockDate + "T00:00");
      if (!isNaN(d.getTime())) {
        setDatePickerMonth(d.getMonth());
        setDatePickerYear(d.getFullYear());
      }
    }
  }, [selectedBlockDate]);

  const getDaysInMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = weekStart === "monday"
      ? (firstDay.getDay() + 6) % 7
      : firstDay.getDay();
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

  const handlePrevMonth = () => {
    if (datePickerMonth === 0) { setDatePickerMonth(11); setDatePickerYear(prev => prev - 1); }
    else setDatePickerMonth(prev => prev - 1);
  };

  const handleNextMonth = () => {
    if (datePickerMonth === 11) { setDatePickerMonth(0); setDatePickerYear(prev => prev + 1); }
    else setDatePickerMonth(prev => prev + 1);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    formData.append("staffId", staffId);

    const blockDate = selectedBlockDate;

    const errors: Record<string, string> = {};
    const reason = formData.get("reason")?.toString().trim();
    if (!reason) errors.reason = "Block reason is required";
    if (!blockDate) errors.blockDate = "Date is required";
    if (!startTimeStr) errors.startTime = "Start time is required";
    if (!endTimeStr) errors.endTime = "End time is required";

    if (blockDate && startTimeStr && endTimeStr) {
      const start = new Date(`${blockDate}T${startTimeStr}`);
      const end = new Date(`${blockDate}T${endTimeStr}`);
      
      if (start >= end) {
        errors.endTime = "End time must be after start time";
      } else {
        const overlappingLeave = leaveRequests.find((l: any) => {
          const leaveStart = new Date(l.startTime);
          const leaveEnd = new Date(l.endTime);
          return start < leaveEnd && end > leaveStart;
        });
        if (overlappingLeave) {
          const leaveStart = new Date(overlappingLeave.startTime);
          const leaveEnd = new Date(overlappingLeave.endTime);
          const timePattern = timeFormat === "24h" ? "HH:mm" : "h:mm a";
          const leaveEndAdjusted = new Date(leaveEnd.getTime() - 60000);
          const startMin = format(leaveStart, "HH:mm");
          const endMinActual = format(leaveEnd, "HH:mm");
          const endMinAdjusted = format(leaveEndAdjusted, "HH:mm");
          const isAllDay = startMin === "00:00" && (endMinActual === "23:59" || endMinAdjusted === "23:59" || endMinActual === "00:00");
          const isSameDay = format(leaveStart, "yyyy-MM-dd") === format(leaveEndAdjusted, "yyyy-MM-dd");
          const leaveEndDisplay = isAllDay ? new Date(leaveEnd.getTime() + 60000) : leaveEnd;
          const rangeStr = isAllDay
            ? isSameDay
              ? format(leaveStart, "MMM d, yyyy")
              : `${format(leaveStart, "MMM d")} - ${format(leaveEndAdjusted, "MMM d, yyyy")}`
            : isSameDay
              ? `${format(leaveStart, "MMM d, yyyy")}, ${format(leaveStart, timePattern)} - ${format(leaveEndDisplay, timePattern)}`
              : `${format(leaveStart, `MMM d, yyyy, ${timePattern}`)} - ${format(leaveEndDisplay, `MMM d, yyyy, ${timePattern}`)}`;
          const isApproved = overlappingLeave.status === "APPROVED";
          errors.startTime = `You already have ${isApproved ? "an approved" : "a pending"} leave${isApproved ? "" : " request"} for ${rangeStr}.`;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    // Set combined fields in formData for server action
    formData.set("startTime", `${blockDate}T${startTimeStr}`);
    formData.set("endTime", `${blockDate}T${endTimeStr}`);

    const result = await blockTimeSlot(formData);

    if (result.success) {
      toast.success("Time blocked successfully!");
      if (!inline) {
        (e.target as HTMLFormElement).reset();
        setStartAmPm("AM");
        setEndAmPm("AM");
        setStartTimeStr("");
        setEndTimeStr("");
        setStartTimeInput("");
        setEndTimeInput("");
        setDateInputValue("");
        setSelectedBlockDate("");
      }
      setFieldErrors({});
      router.refresh();
      if (onSuccess) onSuccess();
    } else {
      toast.error(result.error || "Failed to block time");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      {/* Block Form */}
      <form onSubmit={handleSubmit} className={`${inline ? '' : 'bg-slate-50/50 dark:bg-slate-900/30 p-6 rounded-3xl border border-slate-300 dark:border-slate-800'} space-y-4`} noValidate>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">
              Block Reason <span className="text-rose-500">*</span>
            </label>
            <input
              name="reason"
              type="text"
              placeholder="e.g., Lunch Break, Errand"
              onChange={() => clearFieldError("reason")}
              className={`w-full bg-indigo-50/30 dark:bg-slate-800 border-2 rounded-2xl p-4 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all shadow-sm ${
                fieldErrors.reason ? "border-rose-200 bg-rose-50/30 focus:border-rose-500" : "border-indigo-100/50 dark:border-slate-700/50 focus:border-indigo-600 dark:focus:border-indigo-500 hover:border-indigo-200 dark:hover:border-slate-600"
              }`}
            />
            <InputError message={fieldErrors.reason} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">Block Date <span className="text-rose-500">*</span></label>
            <div className="relative" ref={datePickerRef}>
              <input
                type="text"
                value={dateInputValue}
                placeholder="dd/mm/yyyy"
                onChange={(e) => {
                  const formatted = formatDateInput(e.target.value);
                  setDateInputValue(formatted);
                  clearFieldError("blockDate");

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
                  setFieldErrors(prev => ({ ...prev, blockDate: "Please enter a valid date in dd/mm/yyyy format." }));
                }}
                className={`w-full bg-indigo-50/30 dark:bg-slate-800 border-2 rounded-2xl p-4 pr-12 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all shadow-sm ${
                  fieldErrors.blockDate ? "border-rose-200 bg-rose-50/30 focus:border-rose-500" : "border-indigo-100/50 dark:border-slate-700/50 focus:border-indigo-600 dark:focus:border-indigo-500 hover:border-indigo-200 dark:hover:border-slate-600"
                }`}
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
                      onClick={handlePrevMonth}
                      className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {format(new Date(datePickerYear, datePickerMonth, 1), "MMMM yyyy")}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextMonth}
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
                            setFieldErrors(prev => ({ ...prev, blockDate: "" }));
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
            <InputError message={fieldErrors.blockDate} />
          </div>

          {/* Start & End Time */}
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
                            className={`w-full px-2.5 py-1.5 text-left text-[10px] font-bold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between ${startAmPm === opt ? "bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-350"}`}
                          >
                            <span>{opt}</span>
                            {startAmPm === opt && <Check className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="ml-auto p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 dark:text-slate-500">
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isStartTimeOpen ? "rotate-180" : ""}`} />
                </div>

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
                        className={`w-full px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between ${startTimeStr === opt.value ? "bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-350"}`}
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
                            className={`w-full px-2.5 py-1.5 text-left text-[10px] font-bold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between ${endAmPm === opt ? "bg-indigo-50/50 dark:bg-indigo-955/30 text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-350"}`}
                          >
                            <span>{opt}</span>
                            {endAmPm === opt && <Check className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="ml-auto p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 dark:text-slate-500">
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isEndTimeOpen ? "rotate-180" : ""}`} />
                </div>

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
                        className={`w-full px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between ${endTimeStr === opt.value ? "bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-355"}`}
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
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-indigo-100 dark:shadow-none"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
          Confirm Time Block
        </button>
      </form>
    </div>
  );
}
