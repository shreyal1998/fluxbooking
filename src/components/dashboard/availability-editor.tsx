"use client";

import { useState } from "react";
import { updateStaffAvailability, updateBusinessHours } from "@/app/actions/dashboard";
import { Clock, Save, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

interface DaySchedule {
  start: string;
  end: string;
}

interface Availability {
  [key: string]: DaySchedule | null;
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
  const [availability, setAvailability] = useState<Availability>(() => {
    try {
      const parsed = typeof initialAvailability === 'string' 
        ? JSON.parse(initialAvailability) 
        : initialAvailability;
      return parsed || {};
    } catch (e) {
      return {};
    }
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleToggleDay = (day: string) => {
    setAvailability(prev => ({
      ...prev,
      [day]: prev[day] ? null : { start: "09:00", end: "17:00" }
    }));
  };

  const handleTimeChange = (day: string, type: 'start' | 'end', value: string) => {
    setAvailability(prev => ({
      ...prev,
      [day]: { ...prev[day]!, [type]: value }
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      let result;
      if (isBusiness) {
        result = await updateBusinessHours(availability);
      } else if (staffId) {
        result = await updateStaffAvailability(staffId, availability);
      } else {
        throw new Error("Missing ID");
      }

      if (result.success) {
        toast.success('Schedule saved successfully!');
        setMessage({ type: 'success', text: 'Schedule saved successfully!' });
      } else {
        toast.error(result.error || 'Failed to save');
        setMessage({ type: 'error', text: result.error || 'Failed to save' });
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 transition-colors">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {DAYS.map((day) => {
            const schedule = availability[day];
            const isActive = !!schedule;

            return (
              <div key={day} className="p-4 px-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleToggleDay(day)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${isActive ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isActive ? 'left-7' : 'left-1'}`} />
                  </button>
                  <span className="capitalize font-medium text-slate-700 dark:text-slate-300 w-24">{day}</span>
                </div>

                {isActive ? (
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                      <input
                        type="time"
                        value={schedule.start}
                        onChange={(e) => handleTimeChange(day, 'start', e.target.value)}
                        className="pl-8 pr-2 py-1.5 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <span className="text-slate-400 dark:text-slate-600 font-bold">to</span>
                    <div className="relative">
                      <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                      <input
                        type="time"
                        value={schedule.end}
                        onChange={(e) => handleTimeChange(day, 'end', e.target.value)}
                        className="pl-8 pr-2 py-1.5 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-slate-400 dark:text-slate-600 italic">Closed / Unavailable</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between">
        {message && (
          <p className={`text-sm font-medium ${message.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {message.text}
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={loading}
          className="ml-auto flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-200 dark:shadow-none"
        >
          {loading ? (
            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Schedule
        </button>
      </div>
    </div>
  );
}
