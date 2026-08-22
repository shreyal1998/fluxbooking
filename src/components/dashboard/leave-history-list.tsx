"use client";

import { useState } from "react";
import { X, History, Loader2, Calendar, Search } from "lucide-react";
import { format } from "date-fns";
import { cancelLeaveRequest } from "@/app/actions/dashboard";
import { Tooltip } from "@/components/ui/tooltip";
import { Portal } from "@/components/ui/portal";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface LeaveRequest {
  id: string;
  type: string;
  status: string;
  startTime: Date | string;
  endTime: Date | string;
  reason: string | null;
}

interface LeaveHistoryListProps {
  leaveRequests: LeaveRequest[];
  timeFormat?: string;
}

export function LeaveHistoryList({ leaveRequests, timeFormat = "12h" }: LeaveHistoryListProps) {
  const router = useRouter();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleCancel = async (id: string) => {
    setProcessingId(id);
    const result = await cancelLeaveRequest(id);
    if (result.success) {
      toast.success("Leave cancelled successfully");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to cancel leave request");
    }
    setProcessingId(null);
  };

  const filteredRequests = leaveRequests.filter((request) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const type = request.type.toLowerCase();
    const status = request.status.toLowerCase();
    const reason = (request.reason || "").toLowerCase();
    const dateStr = format(new Date(request.startTime), "MMM d, yyyy").toLowerCase();
    return type.includes(query) || status.includes(query) || reason.includes(query) || dateStr.includes(query);
  });

  return (
    <div className="space-y-4">
      {leaveRequests.length > 5 && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search leaves..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50/50 dark:bg-slate-955/30 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-9 pr-10 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-all shadow-sm"
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

      {leaveRequests.length === 0 ? (
        <p className="text-center text-slate-400 dark:text-slate-500 text-xs py-4 italic">No recent requests.</p>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-6 bg-slate-50/30 dark:bg-slate-950/20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800/60">
          <p className="text-xs text-slate-400">No matching results found.</p>
        </div>
      ) : (
        <div className={`space-y-3 ${leaveRequests.length > 5 ? "max-h-[420px] overflow-y-auto pr-1 premium-scrollbar" : ""}`}>
          {filteredRequests.map((request) => (
            <div key={request.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-950/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">{request.type}</p>
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black tracking-wider border ${
                  request.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                  request.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                  'bg-amber-50 text-amber-600 border-amber-200'
                }`}>
                  {request.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                  {(() => {
                    const start = new Date(request.startTime);
                    const end = new Date(request.endTime);
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
                {request.status !== "REJECTED" && new Date(request.endTime) >= new Date() && (
                  <Tooltip content="Cancel" position="bottom">
                    <button 
                      onClick={() => setConfirmId(request.id)}
                      disabled={processingId === request.id}
                      className="p-1.5 rounded-lg bg-transparent text-rose-600 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-slate-800 transition-all border border-transparent active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {processingId === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </button>
                  </Tooltip>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmId && (() => {
        const req = leaveRequests.find(r => r.id === confirmId);
        if (!req) return null;

        const isApproved = req.status === "APPROVED";
        const title = isApproved ? "Cancel Approved Leave?" : "Cancel Pending Leave?";
        const description = isApproved 
          ? "Are you sure you want to cancel this approved leave? This will make your blocked time slots available for booking again."
          : "Are you sure you want to cancel this pending leave request?";

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
                        if (id) handleCancel(id);
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
