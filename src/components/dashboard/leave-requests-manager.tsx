"use client";

import { useState } from "react";
import { approveLeaveRequest, rejectLeaveRequest } from "@/app/actions/dashboard";
import { Check, X, Clock, Calendar, User, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export function LeaveRequestsManager({ initialRequests }: { initialRequests: any[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [processing, setProcessing] = useState<string | null>(null);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setProcessing(id);
    const result = action === 'approve' ? await approveLeaveRequest(id) : await rejectLeaveRequest(id);
    
    if (result.success) {
      setRequests(prev => prev.filter(r => r.id !== id));
    } else {
      alert(result.error);
    }
    setProcessing(null);
  };

  if (requests.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 p-12 rounded-[2rem] text-center transition-colors">
        <Clock className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-bold">No pending leave requests</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">New requests from your team will appear here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 transition-colors">
      {requests.map((request) => (
        <div key={request.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-soft group hover:shadow-xl hover:shadow-indigo-500/5 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">{request.staff.name}</p>
                <div className="inline-flex items-center px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-[10px] font-black tracking-wider uppercase mt-1">
                  {request.type}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleAction(request.id, 'reject')}
                disabled={processing === request.id}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-900/40 hover:text-rose-600 dark:hover:text-rose-400 transition-all border border-transparent hover:border-rose-100 dark:hover:border-rose-900"
              >
                <X className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleAction(request.id, 'approve')}
                disabled={processing === request.id}
                className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 dark:shadow-none"
              >
                <Check className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="space-y-3 pt-4 border-t border-slate-50 dark:border-slate-800">
            {request.hasConflicts && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-2xl border border-amber-100 dark:border-amber-900/30 text-[10px] font-black uppercase mb-2">
                <AlertCircle className="h-3.5 w-3.5" />
                Existing Appointments Conflict
              </div>
            )}
            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
              <Calendar className="h-4 w-4" />
              <p className="text-xs font-bold">
                {format(new Date(request.startTime), "EEEE, MMM d, yyyy")}
              </p>
            </div>
            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
              <Clock className="h-4 w-4" />
              <p className="text-xs font-bold">
                {format(new Date(request.startTime), "h:mm a")} - {format(new Date(request.endTime), "h:mm a")}
              </p>
            </div>
            {request.reason && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                "{request.reason}"
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
