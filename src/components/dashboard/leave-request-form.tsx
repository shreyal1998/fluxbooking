"use client";

import { useState } from "react";
import { submitLeaveRequest } from "@/app/actions/dashboard";
import { Calendar, Clock, Send, AlertCircle } from "lucide-react";
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
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;

    const errors: Record<string, string> = {};
    if (!startTime) errors.startTime = "Start time is required";
    if (!endTime) errors.endTime = "End time is required";
    
    if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
      errors.endTime = "End time must be after start time";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    const result = await submitLeaveRequest(formData);

    if (result.success) {
      toast.success("Leave request submitted successfully!");
      setMessage({ type: 'success', text: "Request submitted! Waiting for Admin approval." });
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } else {
      toast.error(result.error || "Failed to submit request");
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
            className="w-full rounded-xl border-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500"
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
            className="w-full rounded-xl border-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

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
              fieldErrors.startTime ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" : "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-indigo-500"
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
              fieldErrors.endTime ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" : "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-indigo-500"
            }`}
          />
          <InputError message={fieldErrors.endTime} />
        </div>
      </div>

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
