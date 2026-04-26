"use client";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { AddStaffForm } from "./add-staff-form";

interface TeamHeaderProps {
  users: any[];
  services: any[];
}

export function TeamHeader({ users, services }: TeamHeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Lock scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen]);

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Team</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Manage your professional team members and their schedules.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 hover:scale-105 transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Add Member
        </button>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop (Soft Blur) */}
          <div 
            className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm animate-in fade-in duration-500"
          />

          {/* Modal Content - Fixed Center */}
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-300">
             <div className="p-5 px-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
                <h3 className="text-base font-black text-slate-900 dark:text-white">Add Team Member</h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <X className="h-4 w-4 text-slate-400" />
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
      )}
    </>
  );
}
