"use client";

import { useState } from "react";
import { Clock, Ban, Loader2, X, Calendar, Search } from "lucide-react";
import { format } from "date-fns";
import { deleteBlockedSlot } from "@/app/actions/dashboard";
import { Tooltip } from "@/components/ui/tooltip";
import { Portal } from "@/components/ui/portal";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface BlockedSlot {
  id: string;
  reason: string | null;
  startTime: Date | string;
  endTime: Date | string;
}

interface ActiveBlocksListProps {
  existingBlocks: BlockedSlot[];
  timeFormat?: string;
}

export function ActiveBlocksList({ existingBlocks = [], timeFormat = "12h" }: ActiveBlocksListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const result = await deleteBlockedSlot(id);
    if (result.success) {
      toast.success("Block removed");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to remove block");
    }
    setDeletingId(null);
  };

  const filteredBlocks = existingBlocks.filter((block) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const reason = (block.reason || "Personal Block").toLowerCase();
    const dateStr = format(new Date(block.startTime), "MMM d, yyyy").toLowerCase();
    return reason.includes(query) || dateStr.includes(query);
  });

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative z-15">
      <div className="py-5 px-8 border-b border-slate-200 dark:border-slate-800 bg-transparent flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <Ban className="h-4 w-4" />
        </div>
        <span className="text-sm font-medium text-slate-900 dark:text-slate-200 tracking-wide">Active Blocks</span>
      </div>

      <div className="p-6">
        {existingBlocks.length > 5 && (
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search blocks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50/50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-9 pr-10 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-all shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-350 dark:hover:bg-slate-800/60 transition-all active:scale-90"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {existingBlocks.length === 0 ? (
          <div className="text-center py-10 bg-slate-50/30 dark:bg-slate-950/20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800/60">
            <p className="text-xs text-slate-400">No active blocks for today or future.</p>
          </div>
        ) : filteredBlocks.length === 0 ? (
          <div className="text-center py-10 bg-slate-50/30 dark:bg-slate-950/20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800/60">
            <p className="text-xs text-slate-400">No matching results found.</p>
          </div>
        ) : (
          <div className={`grid gap-3 ${existingBlocks.length > 5 ? "max-h-[360px] overflow-y-auto pr-1 premium-scrollbar" : ""}`}>
            {filteredBlocks.map((block) => (
              <div 
                key={block.id} 
                className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-955/45 border border-slate-200 dark:border-slate-800/80 rounded-2xl group hover:border-indigo-300 dark:hover:border-slate-700 transition-all shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-600">
                    <Ban className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{block.reason || "Personal Block"}</p>
                    <p className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                      {(() => {
                        const start = new Date(block.startTime);
                        const end = new Date(block.endTime);
                        const endAdjustedForDay = new Date(end.getTime() - 60000);
                        const isSameDayVal = format(start, "yyyy-MM-dd") === format(endAdjustedForDay, "yyyy-MM-dd");
                        
                        const timePattern = timeFormat === "24h" ? "HH:mm" : "h:mm a";
                        
                        const startMin = format(start, "HH:mm");
                        const endMinActual = format(end, "HH:mm");
                        const endMinAdjusted = format(endAdjustedForDay, "HH:mm");
                        const isAllDay = startMin === "00:00" && (endMinActual === "23:59" || endMinAdjusted === "23:59" || endMinActual === "00:00");

                        if (isAllDay) {
                          return isSameDayVal 
                            ? format(start, "MMM d, yyyy")
                            : `${format(start, "MMM d")} - ${format(endAdjustedForDay, "MMM d, yyyy")}`;
                        } else {
                          return isSameDayVal
                            ? `${format(start, "MMM d, yyyy")} • ${format(start, timePattern)} - ${format(end, timePattern)}`
                            : `${format(start, `MMM d, ${timePattern}`)} - ${format(end, `MMM d, yyyy, ${timePattern}`)}`;
                        }
                      })()}
                    </p>
                  </div>
                </div>
                <Tooltip content="Cancel" position="bottom">
                  <button
                    onClick={() => setConfirmId(block.id)}
                    disabled={deletingId === block.id}
                    className="p-1.5 rounded-lg bg-transparent text-rose-600 dark:text-rose-455 hover:bg-rose-50 dark:hover:bg-slate-800 transition-all border border-transparent active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {deletingId === block.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  </button>
                </Tooltip>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmId && (() => {
        const block = existingBlocks.find(b => b.id === confirmId);
        if (!block) return null;

        const reasonLower = (block.reason || "").toLowerCase();
        const isLeave = reasonLower.startsWith("leave:");

        const title = isLeave ? "Cancel Approved Leave?" : "Cancel Time Block?";
        const description = isLeave 
          ? "Are you sure you want to cancel this approved leave? This will make your blocked time slots available for booking again."
          : "Are you sure you want to remove this blocked time? This will make this time slot available again.";

        return (
          <Portal>
            <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4">
              <div 
                className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse" 
              />
              <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-8 space-y-6 text-center">
                  <div className="mx-auto h-16 w-16 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-600 dark:text-rose-455 animate-bounce">
                    <Calendar className="h-8 w-8" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">{title}</h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      {description}
                    </p>
                  </div>

                  <div className="flex gap-4 pt-2">
                    <button 
                      onClick={() => setConfirmId(null)}
                      className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      No, Keep
                    </button>
                    <button 
                      onClick={() => {
                        const id = confirmId;
                        setConfirmId(null);
                        if (id) handleDelete(id);
                      }}
                      className="flex-1 py-3 px-4 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      Yes, Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Portal>
        );
      })()}
    </div>
  );
}
