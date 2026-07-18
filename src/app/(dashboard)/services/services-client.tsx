"use client";

import { useState, useEffect } from "react";
import { Scissors, Clock, DollarSign, Palette, Plus, Pencil, Trash2, X, AlertCircle, Loader2, Check, LayoutGrid, List, ChevronLeft, ChevronRight, Search, Landmark } from "lucide-react";
import { AddServiceForm } from "@/components/dashboard/add-service-form";
import { updateService, deleteService } from "@/app/actions/dashboard";
import { toast } from "sonner";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { Portal } from "@/components/ui/portal";
import { getLabels } from "@/lib/labels";
import { useRouter } from "next/navigation";
import { Tooltip } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/currency-utils";

export function ServicesClient({ 
  initialServices, 
  userRole,
  businessType,
  currency = "USD"
}: { 
  initialServices: any[], 
  userRole: string,
  businessType?: any,
  currency?: string
}) {
  const router = useRouter();
  const [services, setServices] = useState(initialServices);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Sync state when initialServices changes (e.g. after router.refresh())
  useEffect(() => {
    setServices(initialServices);
  }, [initialServices]);

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  // Reset to page 1 if search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Reset to page 1 if filtered services change (e.g. after a delete)
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredServices.length / itemsPerPage));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [filteredServices.length]);

  const labels = getLabels(businessType);
  
  // Pagination Calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredServices.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);

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

  const [deletingService, setDeletingService] = useState<any | null>(null);

  // Lock scroll when any modal is open
  useLockBodyScroll(isAddModalOpen || !!editingService || !!deletingService);

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
      <div className="flex-1 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
        
        {/* Unified Dashboard Header */}
        <div className="px-10 py-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{labels.service}s</h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input 
                type="text"
                placeholder={`Search ${labels.serviceLower}s...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 focus:border-indigo-500/40 dark:focus:border-indigo-500/40 rounded-2xl text-xs dark:text-white focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none w-48 lg:w-64 shadow-sm"
              />
            </div>
            {userRole === "ADMIN" && (
              <button 
                onClick={() => {
                  setFieldErrors({});
                  setIsAddModalOpen(true);
                }}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-2xl font-bold text-xs shadow-lg shadow-indigo-500/10 dark:shadow-none hover:bg-indigo-700 hover:scale-[1.02] transition-all active:scale-95 border border-transparent dark:border-white/10 uppercase tracking-widest"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 p-10 pt-8" id="services-table">
          {filteredServices.length === 0 ? (
            <div className="bg-indigo-50/50 dark:bg-slate-950/50 p-24 rounded-[2rem] border-2 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center transition-colors">
              <labels.serviceIcon className="h-16 w-16 text-slate-200 dark:text-slate-700 mb-6" />
              <p className="text-slate-900 dark:text-white font-medium max-w-sm opacity-60">
                {search ? `No ${labels.serviceLower}s found matching "${search}"` : `No ${labels.serviceLower}s added yet. Create your first ${labels.serviceLower} to start taking bookings.`}
              </p>
              {userRole === "ADMIN" && !search && (
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
            <div className="bg-white/50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                   <thead>
                     <tr className="bg-indigo-50/50 dark:bg-slate-900/50">
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
                            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(service.price, currency)}</span>
                         </td>
                         <td className="px-8 py-5 whitespace-nowrap text-right">
                            {userRole === "ADMIN" && (
                              <div className="flex items-center justify-end gap-2">
                                <Tooltip content="Delete" position="bottom">
                                  <button 
                                    onClick={() => setDeletingService(service)}
                                    className="p-2.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-100 rounded-xl"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </Tooltip>

                                <Tooltip content="Edit" position="bottom">
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
                  className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
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
                  className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
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
          <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4 md:p-8">
            <div 
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse"
            />
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-indigo-100/50 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
               <div className="px-8 py-6 border-b border-indigo-100/50 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 rounded-t-[2.4rem] z-10">
                  <div className="flex items-center gap-3">
                     <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 dark:shadow-none border border-transparent dark:border-white/10">
                        <Palette className="h-5 w-5" />
                     </div>
                     <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                           Add {labels.service}
                        </h2>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">New Service Profile</p>
                     </div>
                  </div>
                  <button 
                     onClick={() => setIsAddModalOpen(false)} 
                     className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                     <X className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                  </button>
               </div>
               <div className="flex-1 flex flex-col min-h-0">
                  <AddServiceForm onSuccess={() => setIsAddModalOpen(false)} businessType={businessType} currency={currency} />
               </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingService && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse" 
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="p-8 text-center">
                <div className="mx-auto h-16 w-16 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center mb-6 border border-rose-100 dark:border-rose-900/50">
                  <AlertCircle className="h-8 w-8 text-rose-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Delete {labels.service}?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-8">
                  Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-white">{deletingService.name}</span>? This action cannot be undone and may affect existing bookings.
                </p>

                <div className="grid grid-cols-2 gap-4 mt-8">
                  <button 
                    onClick={() => setDeletingService(null)}
                    className="py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={async () => {
                      setDeleteLoading(true);
                      const result = await deleteService(deletingService.id);
                      if (result.success) {
                        toast.success(`${labels.service} deleted`);
                        setDeletingService(null);
                        router.refresh();
                      } else {
                        toast.error(result.error);
                      }
                      setDeleteLoading(false);
                    }}
                    disabled={deleteLoading}
                    className="bg-rose-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-rose-700 transition-all shadow-xl shadow-rose-100 dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Delete"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Edit Service Modal */}
      {editingService && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4 md:p-8">
            <div 
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse"
            />
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-indigo-100/50 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
               <div className="px-8 py-6 border-b border-indigo-100/50 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 rounded-t-[2.4rem] z-10">
                  <div className="flex items-center gap-3">
                     <div 
                        className="h-10 w-10 rounded-2xl flex items-center justify-center border shadow-md"
                        style={{ borderColor: editingService.color, backgroundColor: `${editingService.color}10` }}
                     >
                        <Palette className="h-5 w-5" style={{ color: editingService.color }} />
                     </div>
                     <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                           Edit {labels.service}
                        </h2>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Configuring {editingService.name}</p>
                     </div>
                  </div>
                  <button 
                     onClick={closeEditModal} 
                     className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                     <X className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                  </button>
               </div>
               
               <form onSubmit={handleUpdate} className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900" noValidate>
                 <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 premium-scrollbar">
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
                        className={`w-full rounded-2xl border-2 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white shadow-sm ${
                          fieldErrors.name 
                            ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" 
                            : "border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-800 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900"
                        }`}
                      />
                      <InputError message={fieldErrors.name} />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                            className={`w-full pl-11 rounded-2xl border-2 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white shadow-sm ${
                              fieldErrors.duration 
                                ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" 
                                : "border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-800 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900"
                            }`}
                          />
                        </div>
                        <InputError message={fieldErrors.duration} />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Buffer Time (min)</label>
                        <div className="relative">
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            name="bufferTime"
                            type="number"
                            min="0"
                            defaultValue={editingService.bufferTime || 0}
                            placeholder="10"
                            className="w-full pl-11 rounded-2xl border-2 border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white shadow-sm hover:border-indigo-200 dark:hover:border-slate-800 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                        Price ({currency}) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          name="price"
                          type="number"
                          step="0.01"
                          required
                          defaultValue={editingService.price.toString()}
                          onChange={() => clearFieldError("price")}
                          placeholder="50.00"
                          className={`w-full pl-11 rounded-2xl border-2 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white shadow-sm ${
                            fieldErrors.price 
                              ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" 
                              : "border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-800 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900"
                          }`}
                        />
                      </div>
                      <InputError message={fieldErrors.price} />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-3 flex items-center gap-2">
                        <Palette className="h-4 w-4 text-slate-400" />
                        Brand Color
                      </label>
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
                 </div>

                 <div className="px-8 py-4 border-t border-indigo-100/30 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-[2.5rem] transition-colors flex flex-col gap-3">
                    <button
                      type="submit"
                      disabled={loading || deleteLoading}
                      className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md border border-transparent dark:border-white/10 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Check className="h-5 w-5" /> Save Changes</>}
                    </button>
                 </div>
               </form>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
