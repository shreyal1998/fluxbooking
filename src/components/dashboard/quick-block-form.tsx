"use client";

import { useState } from "react";
import { blockTimeSlot, deleteBlockedSlot } from "@/app/actions/dashboard";
import { Clock, Ban, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export function QuickBlockForm({ staffId, existingBlocks }: { staffId: string, existingBlocks: any[] }) {
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append("staffId", staffId);

    const start = new Date(formData.get("startTime") as string);
    const end = new Date(formData.get("endTime") as string);

    if (start >= end) {
      toast.error("End time must be after start time");
      setLoading(false);
      return;
    }

    const result = await blockTimeSlot(formData);

    if (result.success) {
      toast.success("Time blocked successfully!");
      (e.target as HTMLFormElement).reset();
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
    } else {
      toast.error(result.error);
    }
    setDeletingId(null);
  };

  return (
    <div className="space-y-8">
      {/* Block Form */}
      <form onSubmit={handleSubmit} className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Block Reason</label>
            <input
              name="reason"
              type="text"
              placeholder="e.g., Lunch Break, Errand"
              className="w-full rounded-2xl border-2 border-white dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition-all dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Duration</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                name="startTime"
                type="datetime-local"
                required
                className="w-full rounded-2xl border-2 border-white dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5 text-xs focus:outline-none focus:border-indigo-600 transition-all dark:text-white"
              />
              <input
                name="endTime"
                type="datetime-local"
                required
                className="w-full rounded-2xl border-2 border-white dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5 text-xs focus:outline-none focus:border-indigo-600 transition-all dark:text-white"
              />
            </div>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-3 rounded-2xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
          Block Selected Time
        </button>
      </form>

      {/* Existing Blocks List */}
      <div className="space-y-4">
        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
          <Clock className="h-4 w-4 text-indigo-600" />
          Active Blocks
        </h4>
        
        {existingBlocks.length === 0 ? (
          <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800">
             <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">No active blocks for today or future.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {existingBlocks.map((block) => (
              <div key={block.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl group hover:border-indigo-100 transition-all shadow-sm">
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
    </div>
  );
}
