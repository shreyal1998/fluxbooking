"use client";

import { useState } from "react";
import { submitLeaveRequest } from "@/app/actions/dashboard";
import { Calendar, Clock, Send, AlertCircle, Minus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const InputError = ({ message }: { message?: string }) => {
  if (!message) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1.5 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200">
      <AlertCircle className="h-3 w-3" />
      <span className="text-[10px] font-black uppercase tracking-wider">{message}</span>
    </div>
  );
};

export function LeaveRequestForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isAllDay, setIsAllDay] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      const newErrors = { ...fieldErrors };
      delete newErrors[field];
      setFieldErrors(newErrors);
    }
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    let startTimeStr = "";
    let endTimeStr = "";

    if (isAllDay) {
      const startDate = formData.get("startDate") as string;
      const endDate = formData.get("endDate") as string;
      if (startDate) startTimeStr = `${startDate}T00:00`;
      if (endDate) endTimeStr = `${endDate}T23:59`;
    } else {
      startTimeStr = formData.get("startTime") as string;
      endTimeStr = formData.get("endTime") as string;
    }

    const errors: Record<string, string> = {};
    if (isAllDay) {
      if (!formData.get("startDate")) errors.startDate = "Start date is required";
      if (!formData.get("endDate")) errors.endDate = "End date is required";
      if (formData.get("startDate") && formData.get("endDate")) {
        const start = new Date(formData.get("startDate") as string);
        const end = new Date(formData.get("endDate") as string);
        if (start > end) {
          errors.endDate = "End date must be on or after start date";
        }
      }
    } else {
      if (!startTimeStr) errors.startTime = "Start time is required";
      if (!endTimeStr) errors.endTime = "End time is required";
      if (startTimeStr && endTimeStr) {
        const start = new Date(startTimeStr);
        const end = new Date(endTimeStr);
        if (start >= end) {
          errors.endTime = "End time must be after start time";
        }
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
    submitData.append("startTime", startTimeStr);
    submitData.append("endTime", endTimeStr);

    const result = await submitLeaveRequest(submitData);

    if (result.success) {
      toast.success("Leave request submitted successfully!");
      setMessage({ type: 'success', text: "Request submitted! Waiting for Admin approval." });
      (e.target as HTMLFormElement).reset();
      setIsAllDay(true);
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
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
            Leave Type <span className="text-rose-500">*</span>
          </label>
          <select 
            name="type" 
            required
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-slate-200 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 transition-all"
          >
            <option value="SICK">Sick Leave</option>
            <option value="EMERGENCY">Emergency / Urgent Personal</option>
            <option value="VACATION">Vacation (Planned)</option>
            <option value="PERSONAL">Personal Day (Planned)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Reason (Optional)</label>
          <input 
            name="reason" 
            type="text" 
            placeholder="e.g., Family event"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-slate-200 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 transition-all"
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
          onClick={() => {
            setIsAllDay(!isAllDay);
            setFieldErrors({});
          }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
            isAllDay ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isAllDay ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {isAllDay ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              Start Date <span className="text-rose-500">*</span>
            </label>
            <input 
              name="startDate" 
              type="date" 
              required
              onChange={() => clearFieldError("startDate")}
              className={`w-full rounded-xl border-2 px-4 py-2 text-sm focus:outline-none transition-all ${
                fieldErrors.startDate ? "border-rose-200 bg-rose-50/30 focus:border-rose-500" : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 text-slate-800 dark:text-slate-200"
              }`}
            />
            <InputError message={fieldErrors.startDate} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              End Date <span className="text-rose-500">*</span>
            </label>
            <input 
              name="endDate" 
              type="date" 
              required
              onChange={() => clearFieldError("endDate")}
              className={`w-full rounded-xl border-2 px-4 py-2 text-sm focus:outline-none transition-all ${
                fieldErrors.endDate ? "border-rose-200 bg-rose-50/30 focus:border-rose-500" : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 text-slate-800 dark:text-slate-200"
              }`}
            />
            <InputError message={fieldErrors.endDate} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              Start Time <span className="text-rose-500">*</span>
            </label>
            <input 
              name="startTime" 
              type="datetime-local" 
              required
              onChange={() => clearFieldError("startTime")}
              className={`w-full rounded-xl border-2 px-4 py-2 text-sm focus:outline-none transition-all ${
                fieldErrors.startTime ? "border-rose-200 bg-rose-50/30 focus:border-rose-500" : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 text-slate-800 dark:text-slate-200"
              }`}
            />
            <InputError message={fieldErrors.startTime} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              End Time <span className="text-rose-500">*</span>
            </label>
            <input 
              name="endTime" 
              type="datetime-local" 
              required
              onChange={() => clearFieldError("endTime")}
              className={`w-full rounded-xl border-2 px-4 py-2 text-sm focus:outline-none transition-all ${
                fieldErrors.endTime ? "border-rose-200 bg-rose-50/30 focus:border-rose-500" : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 text-slate-800 dark:text-slate-200"
              }`}
            />
            <InputError message={fieldErrors.endTime} />
          </div>
        </div>
      )}

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-2 text-sm font-medium ${
          message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'
        }`}>
          {message.type === 'success' ? <Send className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-glow-indigo border border-transparent dark:border-indigo-400/20 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
      >
        {loading ? "Submitting..." : (
          <>
            <Send className="h-4 w-4" />
            Submit Request for Approval
          </>
        )}
      </button>
    </form>
  );
}
