"use client";

import { useState } from "react";
import { updateStaffAvailability, updateBusinessHours } from "@/app/actions/dashboard";
import { Clock, Save, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Prisma } from "@prisma/client";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

interface TimeRange {
  start: string;
  end: string;
}

interface MultiAvailability {
  [key: string]: TimeRange[];
}

export function AvailabilityEditor({ 
  initialAvailability, 
  staffId,
  isBusiness = false 
}: { 
  initialAvailability: any, 
  staffId?: string,
  isBusiness?: boolean
}) {
  const router = useRouter();
  
  // Initialize with support for both single and multiple ranges
  const [availability, setAvailability] = useState<MultiAvailability>(() => {
    try {
      const parsed = typeof initialAvailability === 'string' 
        ? JSON.parse(initialAvailability) 
        : initialAvailability;
      
      const normalized: MultiAvailability = {};
      DAYS.forEach(day => {
        const val = parsed?.[day] || parsed?.[day.charAt(0).toUpperCase() + day.slice(1)];
        if (Array.isArray(val)) {
          normalized[day] = val;
        } else if (val && val.start && val.end) {
          normalized[day] = [val];
        } else {
          normalized[day] = [];
        }
      });
      return normalized;
    } catch (e) {
      return DAYS.reduce((acc, day) => ({ ...acc, [day]: [] }), {});
    }
  });

  const [loading, setLoading] = useState(false);

  const handleAddShift = (day: string) => {
    setAvailability(prev => ({
      ...prev,
      [day]: [...(prev[day] || []), { start: "09:00", end: "17:00" }]
    }));
  };

  const handleRemoveShift = (day: string, index: number) => {
    setAvailability(prev => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index)
    }));
  };

  const handleTimeChange = (day: string, index: number, type: 'start' | 'end', value: string) => {
    setAvailability(prev => {
      const newShifts = [...prev[day]];
      newShifts[index] = { ...newShifts[index], [type]: value };
      return { ...prev, [day]: newShifts };
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let result;
      // Filter out empty days to keep DB clean
      const cleaned = Object.fromEntries(
        Object.entries(availability).filter(([_, shifts]) => shifts.length > 0)
      );

      if (isBusiness) {
        const { updateBusinessHours } = await import("@/app/actions/dashboard");
        result = await updateBusinessHours(cleaned);
      } else if (staffId) {
        const { updateStaffAvailability } = await import("@/app/actions/dashboard");
        result = await updateStaffAvailability(staffId, cleaned);
      } else {
        throw new Error("Missing ID");
      }

      if (result.success) {
        toast.success('Schedule saved successfully!');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to save');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {DAYS.map((day) => {
            const shifts = availability[day] || [];

            return (
              <div key={day} className="p-6 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-indigo-50/30 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-4 min-w-[140px] pt-2">
                   <div className={`h-2 w-2 rounded-full ${shifts.length > 0 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />
                   <span className="capitalize font-bold text-slate-700 dark:text-slate-200">{day}</span>
                </div>

                <div className="flex-1 space-y-3">
                  {shifts.length > 0 ? (
                    shifts.map((shift, index) => (
                      <div key={index} className="flex items-center gap-3 animate-in slide-in-from-left-2 duration-200">
                        <div className="relative group">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                          <input
                            type="time"
                            value={shift.start}
                            onChange={(e) => handleTimeChange(day, index, 'start', e.target.value)}
                            className="pl-9 pr-3 py-2 text-sm border-2 border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 dark:text-slate-200 rounded-2xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition-all hover:border-indigo-200 dark:hover:border-slate-700 focus:border-indigo-600 shadow-sm"
                          />
                        </div>
                        <span className="text-slate-400 dark:text-slate-600 font-bold text-xs uppercase">to</span>
                        <div className="relative group">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                          <input
                            type="time"
                            value={shift.end}
                            onChange={(e) => handleTimeChange(day, index, 'end', e.target.value)}
                            className="pl-9 pr-3 py-2 text-sm border-2 border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 dark:text-slate-200 rounded-2xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition-all hover:border-indigo-200 dark:hover:border-slate-700 focus:border-indigo-600 shadow-sm"
                          />
                        </div>
                        <button
                          onClick={() => handleRemoveShift(day, index)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="py-2">
                       <span className="text-xs font-medium text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-800/50">Closed / Unavailable</span>
                    </div>
                  )}
                  
                  <button
                    onClick={() => handleAddShift(day)}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 py-1 px-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                  >
                    <Plus className="h-3 w-3" />
                    Add Range
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-end gap-4">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-600 text-white px-10 py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-xl shadow-indigo-200 dark:shadow-none active:scale-95"
        >
          {loading ? (
            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Apply Schedule
        </button>
      </div>
    </div>
  );
}
