"use client";

import { useState, useEffect, useRef } from "react";
import { Clock, Plus, Minus, Save, AlertTriangle, User, Building, Loader2, ChevronDown, Check, Calendar, Info } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { updateBusinessHours, updateStaffAvailability } from "@/app/actions/dashboard";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const startTimes = (() => {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (const m of ["00", "30"]) {
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

const endTimes = (() => {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (const m of ["00", "30"]) {
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

const timeToMinutes = (timeStr: string, isEnd = false) => {
  if (!timeStr) return 0;
  if (isEnd && (timeStr === "00:00" || timeStr === "24:00")) return 1440;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

interface TimeRange {
  start: string;
  end: string;
}

interface StructuredAvailabilityEditorProps {
  staffList: any[];
  tenant: any;
  onSuccess?: () => void;
}

export function StructuredAvailabilityEditor({ staffList, tenant, onSuccess }: StructuredAvailabilityEditorProps) {
  const router = useRouter();
  
  // Multi-select targets (defaults to empty)
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  // Multi-select days (defaults to empty)
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const formatTimeStr = (timeVal: string) => {
    if (!timeVal) return "";
    let normalized = timeVal;
    if (timeVal.includes(":")) {
      const parts = timeVal.split(":");
      normalized = `${parts[0].padStart(2, "0")}:${parts[1]}`;
    }
    const is12h = tenant?.timeFormat === "12h" || !tenant?.timeFormat;
    if (!is12h) return normalized === "24:00" ? "00:00" : normalized;
    const matched = startTimes.find(t => t.value === normalized) || endTimes.find(t => t.value === normalized);
    if (matched) {
      return matched.label.replace(/\s*\(.*?\)/g, "");
    }
    return normalized;
  };

  const formatOptionLabel = (timeVal: string) => {
    if (!timeVal) return "";
    let normalized = timeVal;
    if (timeVal.includes(":")) {
      const parts = timeVal.split(":");
      normalized = `${parts[0].padStart(2, "0")}:${parts[1]}`;
    }
    const is12h = tenant?.timeFormat === "12h" || !tenant?.timeFormat;
    const matched = startTimes.find(t => t.value === normalized) || endTimes.find(t => t.value === normalized);
    if (is12h) {
      return matched ? matched.label : normalized;
    }
    if (normalized === "24:00") return "00:00";
    return normalized;
  };
  
  // Custom dropdown states
  const [isTargetOpen, setIsTargetOpen] = useState(false);
  const [isDayOpen, setIsDayOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<{ index: number; field: "start" | "end" } | null>(null);
  const [openUpward, setOpenUpward] = useState(false);

  const targetRef = useRef<HTMLDivElement>(null);
  const dayRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: any) {
      if (targetRef.current && !targetRef.current.contains(event.target as Node)) {
        setIsTargetOpen(false);
      }
      if (dayRef.current && !dayRef.current.contains(event.target as Node)) {
        setIsDayOpen(false);
      }
      if (!event.target.closest(".time-dropdown-wrapper")) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Time ranges currently being edited
  const [tempRanges, setTempRanges] = useState<TimeRange[]>(() => {
    try {
      const parsed = typeof tenant?.businessHoursJson === "string"
        ? JSON.parse(tenant.businessHoursJson)
        : tenant?.businessHoursJson;
      const val = parsed?.monday || parsed?.Monday;
      if (Array.isArray(val)) return val;
      if (val && val.start && val.end) return [val];
    } catch (e) {}
    return [{ start: "09:00", end: "17:00" }];
  });

  useEffect(() => {
    setErrorMsg(null);
  }, [selectedTargets, selectedDays, tempRanges]);

  // Load availability when selectedTarget/Day changes
  useEffect(() => {
    if (selectedTargets.length === 0 || selectedDays.length === 0) return;
    
    // Load from first selected target & first selected day as starting point
    const firstTarget = selectedTargets[0];
    const firstDay = selectedDays[0];
    
    let rawJson: any = null;
    if (firstTarget === "venue") {
      rawJson = tenant?.businessHoursJson;
    } else {
      const staffMember = staffList.find(s => s.id === firstTarget);
      rawJson = staffMember?.availabilityJson;
    }

    try {
      const parsed = typeof rawJson === "string" ? JSON.parse(rawJson) : rawJson;
      const val = parsed?.[firstDay] || parsed?.[firstDay.charAt(0).toUpperCase() + firstDay.slice(1)];
      if (Array.isArray(val)) {
        setTempRanges(val);
      } else if (val && val.start && val.end) {
        setTempRanges([val]);
      } else {
        setTempRanges([]);
      }
    } catch (e) {
      setTempRanges([]);
    }
  }, [selectedTargets[0], selectedDays[0], staffList, tenant]);

  const handleAddShift = () => {
    setTempRanges(prev => [...prev, { start: "09:00", end: "17:00" }]);
  };

  const handleRemoveShift = (index: number) => {
    setTempRanges(prev => prev.filter((_, i) => i !== index));
  };

  const handleTimeChange = (index: number, type: "start" | "end", value: string) => {
    setTempRanges(prev => {
      const newShifts = [...prev];
      const normalizedValue = value === "24:00" ? "00:00" : value;
      newShifts[index] = { ...newShifts[index], [type]: normalizedValue };
      return newShifts;
    });
  };

  const handleSave = async () => {
    if (selectedTargets.length === 0) {
      toast.error("Please select at least one schedule target.");
      return;
    }
    if (selectedDays.length === 0) {
      toast.error("Please select at least one day of the week.");
      return;
    }

    setLoading(true);
    setShowConfirm(false);
    try {
      // Loop over and save for each selected target
      for (const target of selectedTargets) {
        if (target === "venue") {
          const currentHours = typeof tenant?.businessHoursJson === "string"
            ? JSON.parse(tenant.businessHoursJson)
            : tenant?.businessHoursJson || {};
            
          const updated = { ...currentHours };
          selectedDays.forEach(day => {
            updated[day] = tempRanges;
          });
          
          await updateBusinessHours(updated);
        } else {
          const staffMember = staffList.find(s => s.id === target);
          const currentHours = typeof staffMember?.availabilityJson === "string"
            ? JSON.parse(staffMember.availabilityJson)
            : staffMember?.availabilityJson || {};
            
          const updated = { ...currentHours };
          selectedDays.forEach(day => {
            updated[day] = tempRanges;
          });
          
          await updateStaffAvailability(target, updated);
        }
      }

      toast.success("Schedule applied successfully!");
      router.refresh();
      onSuccess?.();
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyClick = () => {
    if (selectedTargets.length === 0) {
      setErrorMsg("Please select at least one schedule target.");
      return;
    }
    if (selectedDays.length === 0) {
      setErrorMsg("Please select at least one day of the week.");
      return;
    }

    // Validate time ranges
    if (tempRanges.length > 0) {
      const sorted = [...tempRanges].sort((a, b) => a.start.localeCompare(b.start));
      for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];
        if (!current.start || !current.end) {
          setErrorMsg("All time ranges must have a start and end time.");
          return;
        }
        
        const startMin = timeToMinutes(current.start, false);
        const endMin = timeToMinutes(current.end, true);

        if (endMin <= startMin) {
          setErrorMsg(`Invalid time range: End time (${formatTimeStr(current.end)}) must be after start time (${formatTimeStr(current.start)}).`);
          return;
        }
        if (i > 0) {
          const prev = sorted[i - 1];
          const prevEndMin = timeToMinutes(prev.end, true);
          if (startMin < prevEndMin) {
            setErrorMsg(`Shifts cannot overlap (e.g., ${formatTimeStr(prev.start)}-${formatTimeStr(prev.end)} and ${formatTimeStr(current.start)}-${formatTimeStr(current.end)} overlap).`);
            return;
          }
        }
      }
    }

    setErrorMsg(null);
    setShowConfirm(true);
  };

  // Toggle handlers for multi-select
  const toggleTarget = (targetId: string) => {
    setSelectedTargets(prev => 
      prev.includes(targetId)
        ? prev.filter(id => id !== targetId)
        : [...prev, targetId]
    );
  };

  const toggleAllTargets = () => {
    const allIds = ["venue", ...staffList.map(s => s.id)];
    if (selectedTargets.length === allIds.length) {
      setSelectedTargets([]);
    } else {
      setSelectedTargets(allIds);
    }
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const toggleAllDays = () => {
    if (selectedDays.length === DAYS.length) {
      setSelectedDays([]);
    } else {
      setSelectedDays(DAYS);
    }
  };

  // Display trigger labels
  const getTargetLabel = () => {
    const allCount = staffList.length + 1;
    if (selectedTargets.length === 0) return "Select targets";
    if (selectedTargets.length === allCount) return "All Targets Selected";
    
    const parts = [];
    if (selectedTargets.includes("venue")) parts.push("Venue Hours");
    const staffCount = selectedTargets.filter(id => id !== "venue").length;
    if (staffCount > 0) parts.push(`${staffCount} Practitioner${staffCount > 1 ? "s" : ""}`);
    
    return parts.join(" + ");
  };

  const getDayLabel = () => {
    if (selectedDays.length === 0) return "Select days";
    if (selectedDays.length === DAYS.length) return "All 7 Days";
    return selectedDays.map(d => d.substring(0, 3)).join(", ");
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Select Practitioner Targets (Multi-Select) */}
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Schedule Target(s)
        </label>
        <div className="relative" ref={targetRef}>
          <button
            type="button"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const spaceBelow = window.innerHeight - rect.bottom;
              setOpenUpward(spaceBelow < 280);
              setIsTargetOpen(!isTargetOpen);
            }}
            className="w-full flex items-center justify-between pl-10 pr-4 py-3 text-sm border-2 border-indigo-100/50 dark:border-indigo-900/50 focus:border-indigo-600 hover:border-indigo-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 rounded-2xl transition-all shadow-sm group min-h-[46px]"
          >
            <div className="flex items-center gap-3">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors">
                {selectedTargets.includes("venue") ? <Building className="h-4.5 w-4.5" /> : <User className="h-4.5 w-4.5" />}
              </div>
              <span className={`text-xs font-bold ${selectedTargets.length === 0 ? "text-slate-400 dark:text-slate-500" : "text-slate-900 dark:text-slate-100"}`}>{getTargetLabel()}</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isTargetOpen ? "rotate-180 text-indigo-500" : ""}`} />
          </button>

          {isTargetOpen && (
            <div className={`absolute left-0 w-full bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-2xl border-2 border-slate-100 dark:border-slate-800 py-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-200 max-h-64 overflow-y-auto custom-scrollbar ${openUpward ? "bottom-full mb-2" : "mt-2"}`}>
              {/* Select All Targets */}
              <button
                type="button"
                onClick={toggleAllTargets}
                className="w-full px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 text-left flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedTargets.length === staffList.length + 1}
                  onChange={() => {}} // Handler is on the parent button
                  className="h-4 w-4 text-indigo-600 border-slate-300 dark:border-slate-700 rounded focus:ring-indigo-500 cursor-pointer pointer-events-none"
                />
                <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                  Select All
                </span>
              </button>

              {/* Venue Hours */}
              <button
                type="button"
                onClick={() => toggleTarget("venue")}
                className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors ${
                  selectedTargets.includes("venue") ? "bg-indigo-50/20 dark:bg-indigo-900/10" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedTargets.includes("venue")}
                  onChange={() => {}}
                  className="h-4 w-4 text-indigo-600 border-slate-300 dark:border-slate-700 rounded focus:ring-indigo-500 cursor-pointer pointer-events-none"
                />
                <Building className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-bold text-black dark:text-white">
                  Venue Hours (Main Venue)
                </span>
              </button>

              {/* Practitioners */}
              {staffList.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleTarget(s.id)}
                  className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors ${
                    selectedTargets.includes(s.id) ? "bg-indigo-50/20 dark:bg-indigo-900/10" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTargets.includes(s.id)}
                    onChange={() => {}}
                    className="h-4 w-4 text-indigo-600 border-slate-300 dark:border-slate-700 rounded focus:ring-indigo-500 cursor-pointer pointer-events-none"
                  />
                  <div
                    className="h-6 w-6 rounded-lg flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                    style={{ backgroundColor: s.color }}
                  >
                    {s.name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-black dark:text-white">
                    {s.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Step 2: Day of Week Dropdown (Multi-Select) */}
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Day(s) of Week
        </label>
        <div className="relative" ref={dayRef}>
          <button
            type="button"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const spaceBelow = window.innerHeight - rect.bottom;
              setOpenUpward(spaceBelow < 280);
              setIsDayOpen(!isDayOpen);
            }}
            className="w-full flex items-center justify-between pl-10 pr-4 py-3 text-sm border-2 border-indigo-100/50 dark:border-indigo-900/50 focus:border-indigo-600 hover:border-indigo-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 rounded-2xl transition-all shadow-sm group min-h-[46px]"
          >
            <div className="flex items-center gap-3">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors">
                <Calendar className="h-4.5 w-4.5" />
              </div>
              <span className={`text-xs font-bold capitalize ${selectedDays.length === 0 ? "text-slate-400 dark:text-slate-500" : "text-slate-900 dark:text-slate-100"}`}>
                {getDayLabel()}
              </span>
            </div>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isDayOpen ? "rotate-180 text-indigo-500" : ""}`} />
          </button>

          {isDayOpen && (
            <div className={`absolute left-0 w-full bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-2xl border-2 border-slate-100 dark:border-slate-800 py-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-200 max-h-64 overflow-y-auto custom-scrollbar ${openUpward ? "bottom-full mb-2" : "mt-2"}`}>
              {/* Select All Days */}
              <button
                type="button"
                onClick={toggleAllDays}
                className="w-full px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 text-left flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedDays.length === DAYS.length}
                  onChange={() => {}}
                  className="h-4 w-4 text-indigo-600 border-slate-300 dark:border-slate-700 rounded focus:ring-indigo-500 cursor-pointer pointer-events-none"
                />
                <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                  Select All
                </span>
              </button>

              {/* Days List */}
              {DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors ${
                    selectedDays.includes(day) ? "bg-indigo-50/20 dark:bg-indigo-900/10" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedDays.includes(day)}
                    onChange={() => {}}
                    className="h-4 w-4 text-indigo-600 border-slate-300 dark:border-slate-700 rounded focus:ring-indigo-500 cursor-pointer pointer-events-none"
                  />
                  <span className="text-xs font-bold capitalize text-black dark:text-white">
                    {day}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Time Ranges Field */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Time Ranges
          </label>
          <button
            type="button"
            onClick={handleAddShift}
            className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-all border border-indigo-100/50 dark:border-indigo-900/30"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          {tempRanges.length > 0 ? (
            tempRanges.map((shift, index) => (
              <div key={index} className="flex items-center gap-3 animate-in slide-in-from-left-2 duration-200">
                {/* Start Time Dropdown */}
                <div className="flex-1 min-w-0 relative group time-dropdown-wrapper">
                  <button 
                    type="button"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const spaceBelow = window.innerHeight - rect.bottom;
                      setOpenUpward(spaceBelow < 250);
                      setOpenDropdown(prev => prev?.index === index && prev?.field === "start" ? null : { index, field: "start" });
                    }}
                    className="w-full flex items-center justify-between pl-10 pr-8 py-3 text-xs font-bold border-2 border-indigo-100/50 dark:border-indigo-900/50 focus:border-indigo-600 hover:border-indigo-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 rounded-2xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition-all shadow-sm min-h-[46px] text-left relative"
                  >
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors">
                      <Clock className="h-4 w-4" />
                    </div>
                    <span className="truncate w-full pr-2">
                      {formatOptionLabel(shift.start)}
                    </span>
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${openDropdown?.index === index && openDropdown?.field === "start" ? "rotate-180 text-indigo-500" : ""}`} />
                    </div>
                  </button>

                  {openDropdown?.index === index && openDropdown?.field === "start" && (
                    <div className={`absolute left-0 w-full bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-2xl border-2 border-slate-100 dark:border-slate-800 z-[100] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden py-1 ${openUpward ? "bottom-full mb-2" : "mt-2"}`}>
                      <div className="max-h-60 overflow-y-auto pr-1 premium-scrollbar">
                        {startTimes.map((t) => (
                          <button
                            key={t.value}
                            type="button"
                            onClick={() => {
                              handleTimeChange(index, "start", t.value);
                              setOpenDropdown(null);
                            }}
                            className={`w-full px-4 py-2.5 text-left text-xs font-bold transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-900/20 ${shift.start === t.value ? "bg-indigo-600 hover:bg-indigo-600 text-white dark:text-white" : "text-black dark:text-slate-200"}`}
                          >
                            {formatOptionLabel(t.value)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <span className="text-slate-400 dark:text-slate-600 font-bold text-xs uppercase shrink-0">to</span>

                {/* End Time Dropdown */}
                <div className="flex-1 min-w-0 relative group time-dropdown-wrapper">
                  <button 
                    type="button"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const spaceBelow = window.innerHeight - rect.bottom;
                      setOpenUpward(spaceBelow < 250);
                      setOpenDropdown(prev => prev?.index === index && prev?.field === "end" ? null : { index, field: "end" });
                    }}
                    className="w-full flex items-center justify-between pl-10 pr-8 py-3 text-xs font-bold border-2 border-indigo-100/50 dark:border-indigo-900/50 focus:border-indigo-600 hover:border-indigo-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 rounded-2xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition-all shadow-sm min-h-[46px] text-left relative"
                  >
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors">
                      <Clock className="h-4 w-4" />
                    </div>
                    <span className="truncate w-full pr-2">
                      {formatOptionLabel(shift.end === "00:00" ? "24:00" : shift.end)}
                    </span>
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${openDropdown?.index === index && openDropdown?.field === "end" ? "rotate-180 text-indigo-500" : ""}`} />
                    </div>
                  </button>

                  {openDropdown?.index === index && openDropdown?.field === "end" && (
                    <div className={`absolute left-0 w-full bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-2xl border-2 border-slate-100 dark:border-slate-800 z-[100] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden py-1 ${openUpward ? "bottom-full mb-2" : "mt-2"}`}>
                      <div className="max-h-60 overflow-y-auto pr-1 premium-scrollbar">
                        {endTimes.map((t) => (
                          <button
                            key={t.value}
                            type="button"
                            onClick={() => {
                              handleTimeChange(index, "end", t.value);
                              setOpenDropdown(null);
                            }}
                            className={`w-full px-4 py-2.5 text-left text-xs font-bold transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-900/20 ${(shift.end === "00:00" ? "24:00" : shift.end) === t.value ? "bg-indigo-600 hover:bg-indigo-600 text-white dark:text-white" : "text-black dark:text-slate-200"}`}
                          >
                            {formatOptionLabel(t.value)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveShift(index)}
                  className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all border border-transparent hover:border-rose-100 shrink-0"
                >
                  <Minus className="h-4.5 w-4.5" />
                </button>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-between pl-4 pr-4 py-3 text-sm border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-slate-400 dark:text-slate-500 rounded-2xl min-h-[46px]">
              <span className="text-xs font-bold capitalize">Closed / Unavailable on Selected Day(s)</span>
            </div>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-2xl flex items-center gap-2 border border-rose-100 dark:border-rose-950/50 animate-fade-in">
          <Info className="h-4 w-4 shrink-0 animate-pulse" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Save Button triggers Confirmation */}
      <div className="flex items-center justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={handleApplyClick}
          disabled={loading || selectedTargets.length === 0 || selectedDays.length === 0}
          className="flex items-center gap-2 bg-indigo-600 text-white px-10 py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-xl shadow-indigo-200 dark:shadow-none active:scale-95 cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Apply Schedule
        </button>
      </div>

      {/* Confirmation Dialog Pop-up */}
      {showConfirm && (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-md" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">

            {/* Top accent bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" />

            <div className="p-8 space-y-6">
              {/* Icon + Title */}
              <div className="flex flex-col items-center text-center gap-4">
                <div className="h-16 w-16 rounded-[1.25rem] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-100 dark:shadow-amber-950/30">
                  <AlertTriangle className="h-8 w-8 text-white" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-xl font-black text-black dark:text-white tracking-tight">Confirm Overwrite</h4>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
                    You&apos;re about to replace the existing recurring schedule for the selected targets.
                  </p>
                </div>
              </div>

              {/* What will happen */}
              <div className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl p-4 border border-amber-100 dark:border-amber-900/30 space-y-2.5">
                <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">What will happen</p>
                <ul className="space-y-2">
                  {[
                    "All selected days will be updated",
                    "Existing shifts will be overwritten",
                    "This cannot be undone automatically",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-5 py-3 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-5 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 transition-all active:scale-95 shadow-lg shadow-amber-100 dark:shadow-amber-950/30"
                >
                  Yes, Overwrite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
