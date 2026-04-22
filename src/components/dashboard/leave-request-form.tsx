"use client";

import { useState } from "react";
import { submitLeaveRequest } from "@/app/actions/dashboard";
import { Calendar, Clock, Send, AlertCircle } from "lucide-react";

export function LeaveRequestForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await submitLeaveRequest(formData);

    if (result.success) {
      setMessage({ type: 'success', text: "Request submitted! Waiting for Admin approval." });
      (e.target as HTMLFormElement).reset();
    } else {
      setMessage({ type: 'error', text: result.error || "Failed to submit request" });
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 transition-colors">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Leave Type</label>
          <select 
            name="type" 
            required
            className="w-full rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500"
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
            className="w-full rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Start Time</label>
          <input 
            name="startTime" 
            type="datetime-local" 
            required
            className="w-full rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">End Time</label>
          <input 
            name="endTime" 
            type="datetime-local" 
            required
            className="w-full rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 text-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
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
        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-2"
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
