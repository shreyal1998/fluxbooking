"use client";

import { useState, useEffect } from "react";
import { Plus, X, Users } from "lucide-react";
import { AddStaffForm } from "./add-staff-form";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { Portal } from "@/components/ui/portal";

interface TeamHeaderProps {
  users: any[];
  services: any[];
  staffMembersCount: number;
  currentLimit: number;
}

export function TeamHeader({ users, services, staffMembersCount, currentLimit }: TeamHeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Lock scroll when modal is open
  useLockBodyScroll(isModalOpen);

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 px-4">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">Team Members</h2>
          <p className="font-normal mt-1 text-slate-500 dark:text-slate-400">Manage your team members and their access.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-medium text-sm shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 hover:scale-[1.02] transition-all active:scale-95 border border-transparent dark:border-white/10"
          >
            <Plus className="h-5 w-5" />
            Add Member
          </button>
          <div className="flex items-center gap-3 px-6 py-3 bg-white/70 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm self-start md:self-auto backdrop-blur-md">
            <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-[10px] font-medium text-slate-900 dark:text-white uppercase tracking-widest">{staffMembersCount} / {currentLimit} Members</span>
          </div>
        </div>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4 sm:p-6">
            {/* Full-Screen Backdrop (Blurs entire page including Sidebar/Header) */}
            <div 
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse cursor-pointer"
            />

            {/* Modal Content - Fixed Center */}
            <div className="relative bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in duration-300">
               <div className="p-5 px-8 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800 sticky top-0 z-10">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Add Team Member</h3>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                  >
                    <X className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  </button>
               </div>

               <div className="max-h-[80vh] overflow-y-auto">
                  <AddStaffForm 
                    users={users} 
                    services={services} 
                    onSuccess={() => setIsModalOpen(false)} 
                  />
               </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
