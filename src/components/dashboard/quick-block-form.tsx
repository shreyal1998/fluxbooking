"use client";

import { useState, useEffect } from "react";
import { blockTimeSlot, deleteBlockedSlot } from "@/app/actions/dashboard";
import { Clock, Ban, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, addHours } from "date-fns";

function InputError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1.5 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200 text-left">
      <AlertCircle className="h-3 w-3" />
      <span className="text-[10px] font-black uppercase tracking-wider">{message}</span>
    </div>
  );
}

export function QuickBlockForm({ 
  staffId, 
  existingBlocks = [], 
  initialData = null,
  onSuccess,
  inline = false
}: { 
  staffId: string, 
  existingBlocks?: any[], 
  initialData?: any,
  onSuccess?: () => void,
  inline?: boolean
}) {
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Reset errors when data changes
  useEffect(() => {
    setFieldErrors({});
  }, [staffId, initialData]);

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      const newErrors = { ...fieldErrors };
      delete newErrors[field];
      setFieldErrors(newErrors);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    formData.append("staffId", staffId);

    const startTimeStr = formData.get("startTime") as string;
    const endTimeStr = formData.get("endTime") as string;

    const errors: Record<string, string> = {};
    if (!startTimeStr) errors.startTime = "Start time is required";
    if (!endTimeStr) errors.endTime = "End time is required";

    if (startTimeStr && endTimeStr) {
      const start = new Date(startTimeStr);
      const end = new Date(endTimeStr);
      if (start >= end) {
        errors.endTime = "End time must be after start time";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    const result = await blockTimeSlot(formData);

    if (result.success) {
      toast.success("Time blocked successfully!");
      if (!inline) (e.target as HTMLFormElement).reset();
      setFieldErrors({});
      if (onSuccess) onSuccess();
    } else {
      toast.error(result.error || "Failed to block time");
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const result = await deleteBlockedSlot(id);
    if (result.success) {
      toast.success("Block removed");
      setFieldErrors({});
    } else {
      toast.error(result.error);
    }
    setDeletingId(null);
  };

  // Helper to format date for datetime-local input
  const formatForInput = (date: Date) => {
    const tzoffset = date.getTimezoneOffset() * 60000; //offset in milliseconds
    return (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
  };

  return (
    <div className="space-y-8">
      {/* Block Form */}
      <form onSubmit={handleSubmit} className={`${inline ? '' : 'bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700'} space-y-4`} noValidate>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Block Reason</label>
            <input
              name="reason"
              type="text"
              placeholder="e.g., Lunch Break, Errand"
              className="w-full rounded-2xl border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm focus:outline-none focus:border-indigo-600 transition-all dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">
                  Start Time <span className="text-rose-500">*</span>
                </label>
                <input
                  name="startTime"
                  type="datetime-local"
                  required
                  defaultValue={initialData?.startTime ? formatForInput(new Date(initialData.startTime)) : ""}
                  onChange={() => clearFieldError("startTime")}
                  className={`w-full rounded-2xl border-2 bg-white dark:bg-slate-900 px-4 py-3 text-xs focus:outline-none transition-all dark:text-white ${
                    fieldErrors.startTime ? "border-rose-100 focus:border-rose-500" : "border-slate-100 dark:border-slate-700 focus:border-indigo-600"
                  }`}
                />
                <InputError message={fieldErrors.startTime} />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">
                  End Time <span className="text-rose-500">*</span>
                </label>
                <input
                  name="endTime"
                  type="datetime-local"
                  required
                  defaultValue={initialData?.startTime ? formatForInput(addHours(new Date(initialData.startTime), 1)) : ""}
                  onChange={() => clearFieldError("endTime")}
                  className={`w-full rounded-2xl border-2 bg-white dark:bg-slate-900 px-4 py-3 text-xs focus:outline-none transition-all dark:text-white ${
                    fieldErrors.endTime ? "border-rose-100 focus:border-rose-500" : "border-slate-100 dark:border-slate-700 focus:border-indigo-600"
                  }`}
                />
                <InputError message={fieldErrors.endTime} />
              </div>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-slate-200 dark:shadow-none"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
          Confirm Time Block
        </button>
      </form>

      {/* Existing Blocks List - only show if not inline */}
      {!inline && (
        <div className="space-y-4">
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-600" />
            Active Blocks
            </h4>
            
            {existingBlocks.length === 0 ? (
            <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-700">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">No active blocks for today or future.</p>
            </div>
            ) : (
            <div className="grid gap-3">
                {existingBlocks.map((block) => (
                <div key={block.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl group hover:border-indigo-100 transition-all shadow-sm">
                    <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-600">
                        <Ban className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white">{block.reason || "Personal Block"}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                        {format(new Date(block.startTime), "MMM d, h:mm a")} - {format(new Date(block.endTime), "h:mm a")}
                        </p>
                    </div>
                    </div>
                    <button
                    onClick={() => handleDelete(block.id)}
                    disabled={deletingId === block.id}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                    {deletingId === block.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                </div>
                ))}
            </div>
            )}
        </div>
      )}
    </div>
  );
}
