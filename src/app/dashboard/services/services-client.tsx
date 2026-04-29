"use client";

import { useState, useEffect } from "react";
import { Scissors, Clock, DollarSign, Palette, Plus, Pencil, Trash2, X, AlertCircle, Loader2, Check } from "lucide-react";
import { AddServiceForm } from "@/components/dashboard/add-service-form";
import { updateService, deleteService } from "@/app/actions/dashboard";
import { toast } from "sonner";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { Portal } from "@/components/ui/portal";

export function ServicesClient({ 
  initialServices, 
  userRole 
}: { 
  initialServices: any[], 
  userRole: string 
}) {
  const [services, setServices] = useState(initialServices);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Lock scroll when any modal is open
  useLockBodyScroll(isAddModalOpen || !!editingService);

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const result = await updateService(editingService.id, formData);
    if (result.success) {
      toast.success("Service updated successfully!");
      setEditingService(null);
      window.location.reload();
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleteLoading(true);
    const result = await deleteService(id);
    if (result.success) {
      toast.success("Service deleted");
      setEditingService(null);
      window.location.reload();
    } else {
      toast.error(result.error);
    }
    setDeleteLoading(false);
    setConfirmDelete(false);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Services</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Manage the services your business offers to clients.</p>
        </div>
        {userRole === "ADMIN" && (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black text-sm shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 hover:scale-[1.02] transition-all active:scale-95 border border-transparent dark:border-white/10"
          >
            <Plus className="h-5 w-5" />
            Add Service
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-2 -mr-2">
        {services.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-24 rounded-[2.5rem] border border-dashed border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center transition-colors">
            <Scissors className="h-16 w-16 text-slate-200 dark:text-slate-700 mb-6" />
            <p className="text-slate-500 dark:text-slate-200 font-medium max-w-sm">No services added yet. Create your first service to start taking bookings.</p>
            {userRole === "ADMIN" && (
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="mt-8 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none border border-transparent dark:border-white/10"
              >
                Add Your First Service
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services?.map((service) => (
              <div key={service.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm p-8 group hover:border-indigo-200 dark:hover:border-indigo-900 transition-all relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: service.color }}></div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{service.name}</h4>
                    <div className="flex items-center gap-3 mt-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> {service.durationMinutes} min
                      </p>
                      {service.bufferTime > 0 && (
                        <span className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">
                          +{service.bufferTime}m buffer
                        </span>
                      )}
                    </div>
                  </div>
                  {userRole === "ADMIN" && (
                    <button 
                      onClick={() => setEditingService(service)}
                      className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 rounded-2xl transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                     <div className="w-4 h-4 rounded-lg shadow-sm border border-white/20" style={{ backgroundColor: service.color }}></div>
                     <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Brand Color</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Price</p>
                    <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">${service.price.toString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Service Modal */}
      {isAddModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-sm animate-in fade-in duration-500" />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="p-5 px-8 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
                <h3 className="text-base font-black text-slate-900 dark:text-white">Add New Service</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>
              <div className="max-h-[80vh] overflow-y-auto">
                <AddServiceForm onSuccess={() => setIsAddModalOpen(false)} />
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Edit Service Modal */}
      {editingService && (
        <Portal>
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
             <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
                <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                   <h3 className="text-xl font-black text-slate-900 dark:text-white">Edit Service</h3>
                   <button onClick={() => { setEditingService(null); setConfirmDelete(false); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                     <X className="h-5 w-5 text-slate-400" />
                   </button>
                </div>
                
                <div className="p-8 overflow-y-auto max-h-[70vh]">
                  <form onSubmit={handleUpdate} className="space-y-6">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Service Name</label>
                      <input
                        name="name"
                        type="text"
                        required
                        defaultValue={editingService.name}
                        className="w-full rounded-2xl border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-600 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white bg-transparent"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Duration (min)</label>
                        <input
                          name="duration"
                          type="number"
                          required
                          defaultValue={editingService.durationMinutes}
                          className="w-full rounded-2xl border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-600 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white bg-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Buffer (min)</label>
                        <input
                          name="bufferTime"
                          type="number"
                          defaultValue={editingService.bufferTime}
                          className="w-full rounded-2xl border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-600 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white bg-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Price ($)</label>
                      <input
                        name="price"
                        type="number"
                        step="0.01"
                        required
                        defaultValue={editingService.price.toString()}
                        className="w-full rounded-2xl border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-600 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white bg-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-3">Brand Color</label>
                      <div className="flex flex-wrap gap-3">
                        {[
                          { name: 'Indigo', value: '#6366f1' },
                          { name: 'Emerald', value: '#10b981' },
                          { name: 'Sky', value: '#0ea5e9' },
                          { name: 'Amber', value: '#f59e0b' },
                          { name: 'Rose', value: '#f43f5e' },
                          { name: 'Violet', value: '#8b5cf6' },
                        ].map((color) => (
                          <label key={color.value} className="relative cursor-pointer group">
                            <input type="radio" name="color" value={color.value} className="peer sr-only" defaultChecked={editingService.color === color.value} />
                            <div className="w-8 h-8 rounded-xl border-2 border-transparent peer-checked:border-indigo-600 peer-checked:scale-110 transition-all shadow-sm group-hover:scale-110" style={{ backgroundColor: color.value }}></div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 space-y-4">
                      <button
                        type="submit"
                        disabled={loading || deleteLoading}
                        className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 dark:shadow-none disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                      >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Check className="h-5 w-5" /> Save Changes</>}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => handleDelete(editingService.id)}
                        disabled={loading || deleteLoading}
                        className={`w-full py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                          confirmDelete 
                          ? "bg-rose-600 text-white hover:bg-rose-700" 
                          : "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10"
                        }`}
                      >
                        {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                          <>
                            <Trash2 className="h-4 w-4" />
                            {confirmDelete ? "Click again to confirm delete" : "Delete Service"}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
             </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
