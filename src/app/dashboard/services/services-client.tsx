"use client";

import { useState, useEffect } from "react";
import { Scissors, Clock, DollarSign, Palette, Plus, Pencil, Trash2, X, AlertCircle, Loader2, Check, LayoutGrid, List, ChevronLeft, ChevronRight } from "lucide-react";
import { AddServiceForm } from "@/components/dashboard/add-service-form";
import { updateService, deleteService } from "@/app/actions/dashboard";
import { toast } from "sonner";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { Portal } from "@/components/ui/portal";
import { getLabels } from "@/lib/labels";
import { useRouter } from "next/navigation";
import { Tooltip } from "@/components/ui/tooltip";

export function ServicesClient({ 
  initialServices, 
  userRole,
  businessType
}: { 
  initialServices: any[], 
  userRole: string,
  businessType?: any
}) {
  const router = useRouter();
  const [services, setServices] = useState(initialServices);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Sync state when initialServices changes (e.g. after router.refresh())
  useEffect(() => {
    setServices(initialServices);
  }, [initialServices]);

  // Reset to page 1 if services change (e.g. after a delete)
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(services.length / itemsPerPage));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [services.length]);

  const labels = getLabels(businessType);
  
  // Pagination Calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = services.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(services.length / itemsPerPage);

  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    const tableElement = document.getElementById("services-table");
    if (tableElement) {
      tableElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const [editingService, setEditingService] = useState<any | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Lock scroll when any modal is open
  useLockBodyScroll(isAddModalOpen || !!editingService);

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      const newErrors = { ...fieldErrors };
      delete newErrors[field];
      setFieldErrors(newErrors);
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const duration = formData.get("duration") as string;
    const price = formData.get("price") as string;

    const errors: Record<string, string> = {};
    if (!name) errors.name = "Service name is required";
    if (!duration) errors.duration = "Duration is required";
    if (!price) errors.price = "Price is required";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }
    
    const result = await updateService(editingService.id, formData);
    if (result.success) {
      toast.success("Service updated successfully!");
      setEditingService(null);
      router.refresh();
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
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setDeleteLoading(false);
    setConfirmDelete(false);
  };

  const InputError = ({ message }: { message?: string }) => {
    if (!message) return null;
    return (
      <div className="flex items-center gap-1.5 mt-1.5 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200">
        <AlertCircle className="h-3 w-3" />
        <span className="text-[10px] font-black uppercase tracking-wider">{message}</span>
      </div>
    );
  };

  const closeEditModal = () => {
    setEditingService(null);
    setConfirmDelete(false);
    setFieldErrors({});
  };

  return (
    <div className="flex-1 flex flex-col animate-fade-in">
      <div className="flex-1 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
        
        {/* Unified Dashboard Header */}
        <div className="px-10 py-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{labels.service}s</h2>
          </div>
          
          <div className="flex items-center gap-4">
            {userRole === "ADMIN" && (
              <Tooltip content={`Add New ${labels.service}`} position="bottom">
                <button 
                  onClick={() => {
                    setFieldErrors({});
                    setIsAddModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-2xl font-bold text-xs shadow-lg shadow-indigo-500/10 dark:shadow-none hover:bg-indigo-700 hover:scale-[1.02] transition-all active:scale-95 border border-transparent dark:border-white/10 uppercase tracking-widest"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        <div className="flex-1 p-10 pt-8" id="services-table">
          {services.length === 0 ? (
            <div className="bg-slate-50/50 dark:bg-slate-950/50 p-24 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center transition-colors">
              <labels.serviceIcon className="h-16 w-16 text-slate-200 dark:text-slate-700 mb-6" />
              <p className="text-slate-900 dark:text-white font-medium max-w-sm opacity-60">No {labels.serviceLower}s added yet. Create your first {labels.serviceLower} to start taking bookings.</p>
              {userRole === "ADMIN" && (
                <button 
                  onClick={() => {
                    setFieldErrors({});
                    setIsAddModalOpen(true);
                  }}
                  className="mt-8 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-medium text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none border border-transparent dark:border-white/10"
                >
                  Add Your First {labels.service}
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white/50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                   <thead>
                     <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                       <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{labels.service} Name</th>
                       <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Duration & Buffer</th>
                       <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Price</th>
                       <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                     {currentItems?.map((service) => (
                       <tr key={service.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                         <td className="px-8 py-5 whitespace-nowrap">
                           <div className="flex items-center gap-4">
                             <div className="w-2 h-10 rounded-full shrink-0" style={{ backgroundColor: service.color }}></div>
                             <p className="text-sm font-bold text-slate-900 dark:text-white">{service.name}</p>
                           </div>
                         </td>
                         <td className="px-8 py-5 whitespace-nowrap">
                           <div className="flex items-center gap-3">
                             <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                               <Clock className="h-3.5 w-3.5" />
                               {service.durationMinutes}m
                             </div>
                             {service.bufferTime > 0 && (
                               <span className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-tight border border-indigo-100 dark:border-indigo-800/50">
                                 +{service.bufferTime}m buffer
                               </span>
                             )}
                           </div>
                         </td>
                         <td className="px-8 py-5 whitespace-nowrap">
                            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">${service.price.toString()}</span>
                         </td>
                         <td className="px-8 py-5 whitespace-nowrap text-right">
                            {userRole === "ADMIN" && (
                              <div className="flex items-center justify-end gap-2">
                                <Tooltip content={`Edit ${labels.service}`} position="bottom">
                                  <button 
                                    onClick={() => {
                                      setFieldErrors({});
                                      setEditingService(service);
                                    }}
                                    className="p-2.5 bg-white dark:bg-slate-700 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-all border border-slate-100 dark:border-slate-600 shadow-sm"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                </Tooltip>
                              </div>
                            )}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}
        </div>

        {/* Pagination Footer - At bottom of main card */}
        {services.length > itemsPerPage && (
          <div className="px-10 py-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Showing <span className="text-slate-900 dark:text-white">{indexOfFirstItem + 1}</span> to <span className="text-slate-900 dark:text-white">{Math.min(indexOfLastItem, services.length)}</span> of <span className="text-slate-900 dark:text-white">{services.length}</span> {labels.serviceLower}s
            </p>
            
            <div className="flex items-center gap-2">
              <Tooltip content="Previous Page" position="top">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </Tooltip>

              <div className="flex items-center gap-1 px-3">
                <span className="text-[10px] font-black text-slate-900 dark:text-white">PAGE {currentPage}</span>
                <span className="text-[10px] font-black text-slate-400">/ {totalPages}</span>
              </div>

              <Tooltip content="Next Page" position="top">
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </Tooltip>
            </div>
          </div>
        )}
      </div>

      {/* Add Service Modal */}
      {isAddModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4">
            <div 
              onClick={() => setIsAddModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse cursor-pointer" 
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="p-5 px-8 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
                <h3 className="text-base font-black text-slate-900 dark:text-white">Add New {labels.service}</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>
              <div className="max-h-[80vh] overflow-y-auto">
                <AddServiceForm onSuccess={() => setIsAddModalOpen(false)} businessType={businessType} />
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Edit Service Modal */}
      {editingService && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4">
             <div 
               onClick={closeEditModal}
               className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse cursor-pointer" 
             />
             <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors animate-in fade-in zoom-in duration-300">
                <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                   <h3 className="text-xl font-black text-slate-900 dark:text-white">Edit {labels.service}</h3>
                   <button onClick={closeEditModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                     <X className="h-5 w-5 text-slate-400" />
                   </button>
                </div>
                
                <div className="p-8 overflow-y-auto max-h-[70vh]">
                  <form onSubmit={handleUpdate} className="space-y-6" noValidate>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                        {labels.service} Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        name="name"
                        type="text"
                        required
                        defaultValue={editingService.name}
                        onChange={() => clearFieldError("name")}
                        placeholder={labels.servicePlaceholder}
                        className={`w-full rounded-2xl border-2 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white bg-transparent ${
                          fieldErrors.name ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" : "border-slate-100 dark:border-slate-700 focus:border-indigo-600"
                        }`}
                      />
                      <InputError message={fieldErrors.name} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                          Duration (min) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            name="duration"
                            type="number"
                            required
                            defaultValue={editingService.durationMinutes}
                            onChange={() => clearFieldError("duration")}
                            placeholder="30"
                            className={`w-full pl-11 rounded-2xl border-2 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white bg-transparent ${
                              fieldErrors.duration ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" : "border-slate-100 dark:border-slate-700 focus:border-indigo-600"
                            }`}
                          />
                        </div>
                        <InputError message={fieldErrors.duration} />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Buffer (min)</label>
                        <div className="relative">
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            name="bufferTime"
                            type="number"
                            defaultValue={editingService.bufferTime}
                            placeholder="10"
                            className="w-full pl-11 rounded-2xl border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-600 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white bg-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                        Price ($) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          name="price"
                          type="number"
                          step="0.01"
                          required
                          defaultValue={editingService.price.toString()}
                          onChange={() => clearFieldError("price")}
                          placeholder="50.00"
                          className={`w-full pl-11 rounded-2xl border-2 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white bg-transparent ${
                            fieldErrors.price ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" : "border-slate-100 dark:border-slate-700 focus:border-indigo-600"
                          }`}
                        />
                      </div>
                      <InputError message={fieldErrors.price} />
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
                            {confirmDelete ? "Click again to confirm delete" : `Delete ${labels.service}`}
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
