"use client";

import { useState } from "react";
import { Plus, X, Users } from "lucide-react";
import { AddCustomerForm } from "./add-customer-form";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { Portal } from "@/components/ui/portal";
import { Tooltip } from "@/components/ui/tooltip";
import { getLabels } from "@/lib/labels";

export function CustomerHeader({ 
  tenantId, 
  customerCount, 
  businessType 
}: { 
  tenantId: string, 
  customerCount: number, 
  businessType?: any 
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const labels = getLabels(businessType);

  useLockBodyScroll(isModalOpen);

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 px-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{labels.customer}s</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <Tooltip content={`Add New ${labels.customer}`} position="bottom">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-2xl font-bold text-xs shadow-lg shadow-indigo-500/10 dark:shadow-none hover:bg-indigo-700 hover:scale-[1.02] transition-all active:scale-95 border border-transparent dark:border-white/10 uppercase tracking-widest"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </Tooltip>
          
          <div className="flex items-center gap-3 px-6 py-3 bg-white/70 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm self-start md:self-auto backdrop-blur-md">
            <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-[10px] font-medium text-slate-900 dark:text-white uppercase tracking-widest">{customerCount} Total {labels.customer}s</span>
          </div>
        </div>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4 sm:p-6">
            <div 
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse cursor-pointer"
            />

            <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in duration-300">
               <div className="p-5 px-8 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Add {labels.customer}</h3>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                  >
                    <X className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  </button>
               </div>

               <div className="max-h-[80vh] overflow-y-auto">
                  <AddCustomerForm 
                    tenantId={tenantId} 
                    onSuccess={() => setIsModalOpen(false)} 
                    businessType={businessType}
                  />
               </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
