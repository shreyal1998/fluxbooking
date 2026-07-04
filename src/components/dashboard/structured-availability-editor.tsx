"use client";

import { useState, useEffect, useRef } from "react";
import { Clock, Plus, Minus, Save, AlertTriangle, User, Building, Loader2, ChevronDown, Check, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

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
  
  // Multi-select targets (defaults to 'venue')
  const [selectedTargets, setSelectedTargets] = useState<string[]>(["venue"]);
  // Multi-select days (defaults to 'monday')
  const [selectedDays, setSelectedDays] = useState<string[]>(["monday"]);
  
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  // Custom dropdown states
  const [isTargetOpen, setIsTargetOpen] = useState(false);
  const [isDayOpen, setIsDayOpen] = useState(false);

  const targetRef = useRef<HTMLDivElement>(null);
  const dayRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (targetRef.current && !targetRef.current.contains(event.target as Node)) {
        setIsTargetOpen(false);
      }
      if (dayRef.current && !dayRef.current.contains(event.target as Node)) {
        setIsDayOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Time ranges currently being edited
  const [tempRanges, setTempRanges] = useState<TimeRange[]>([]);

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
      newShifts[index] = { ...newShifts[index], [type]: value };
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
          
          const { updateBusinessHours } = await import("@/app/actions/dashboard");
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
          
          const { updateStaffAvailability } = await import("@/app/actions/dashboard");
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
      toast.error("Please select at least one schedule target.");
      return;
    }
    if (selectedDays.length === 0) {
      toast.error("Please select at least one day of the week.");
      return;
    }

    // Validate time ranges
    if (tempRanges.length > 0) {
      const sorted = [...tempRanges].sort((a, b) => a.start.localeCompare(b.start));
      for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];
        if (!current.start || !current.end) {
          toast.error("All time ranges must have a start and end time.");
          return;
        }
        if (current.end <= current.start) {
          toast.error(`Invalid time range: End time (${current.end}) must be after start time (${current.start}).`);
          return;
        }
        if (i > 0) {
          const prev = sorted[i - 1];
          if (current.start < prev.end) {
            toast.error(`Shifts cannot overlap (e.g., ${prev.start}-${prev.end} and ${current.start}-${current.end} overlap).`);
            return;
          }
        }
      }
    }

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
    if (selectedTargets.length === 0) return "Select Target(s)";
    if (selectedTargets.length === allCount) return "All Targets Selected";
    
    const parts = [];
    if (selectedTargets.includes("venue")) parts.push("Venue Hours");
    const staffCount = selectedTargets.filter(id => id !== "venue").length;
    if (staffCount > 0) parts.push(`${staffCount} Practitioner${staffCount > 1 ? "s" : ""}`);
    
    return parts.join(" + ");
  };

  const getDayLabel = () => {
    if (selectedDays.length === 0) return "Select Day(s)";
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
            onClick={() => setIsTargetOpen(!isTargetOpen)}
            className="w-full flex items-center justify-between pl-10 pr-4 py-3 text-sm border-2 border-indigo-100/50 dark:border-indigo-900/50 focus:border-indigo-600 hover:border-indigo-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 rounded-2xl transition-all shadow-sm group min-h-[46px]"
          >
            <div className="flex items-center gap-3">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors">
                {selectedTargets.includes("venue") ? <Building className="h-4.5 w-4.5" /> : <User className="h-4.5 w-4.5" />}
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{getTargetLabel()}</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isTargetOpen ? "rotate-180 text-indigo-500" : ""}`} />
          </button>

          {isTargetOpen && (
            <div className="absolute left-0 mt-2 w-full bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-2xl border-2 border-slate-100 dark:border-slate-800 py-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-200 max-h-64 overflow-y-auto custom-scrollbar">
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
            onClick={() => setIsDayOpen(!isDayOpen)}
            className="w-full flex items-center justify-between pl-10 pr-4 py-3 text-sm border-2 border-indigo-100/50 dark:border-indigo-900/50 focus:border-indigo-600 hover:border-indigo-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 rounded-2xl transition-all shadow-sm group min-h-[46px]"
          >
            <div className="flex items-center gap-3">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors">
                <Calendar className="h-4.5 w-4.5" />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 capitalize">
                {getDayLabel()}
              </span>
            </div>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isDayOpen ? "rotate-180 text-indigo-500" : ""}`} />
          </button>

          {isDayOpen && (
            <div className="absolute left-0 mt-2 w-full bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-2xl border-2 border-slate-100 dark:border-slate-800 py-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-200 max-h-64 overflow-y-auto custom-scrollbar">
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
                <div className="flex-1 relative group">
                  <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors pointer-events-none" />
                  <input
                    type="time"
                    value={shift.start}
                    onChange={(e) => handleTimeChange(index, "start", e.target.value)}
                    className="w-full pl-10 pr-3 py-3 text-sm border-2 border-indigo-100/50 dark:border-indigo-900/50 focus:border-indigo-600 hover:border-indigo-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 rounded-2xl focus:outline-none focus:bg-white transition-all shadow-sm min-h-[46px]"
                  />
                </div>
                <span className="text-slate-400 dark:text-slate-600 font-bold text-xs uppercase shrink-0">to</span>
                <div className="flex-1 relative group">
                  <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors pointer-events-none" />
                  <input
                    type="time"
                    value={shift.end}
                    onChange={(e) => handleTimeChange(index, "end", e.target.value)}
                    className="w-full pl-10 pr-3 py-3 text-sm border-2 border-indigo-100/50 dark:border-indigo-900/50 focus:border-indigo-600 hover:border-indigo-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 rounded-2xl focus:outline-none focus:bg-white transition-all shadow-sm min-h-[46px]"
                  />
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
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-2xl p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-500 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <h4 className="text-base font-bold text-black dark:text-white">Confirm Overwrite</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Applying this schedule will override the existing recurring schedule for all selected targets on all selected days. Do you want to proceed?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all active:scale-95 shadow-md shadow-indigo-100 dark:shadow-none"
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
