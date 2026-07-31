"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Users, 
  Plus, 
  X, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  UserCircle,
  Mail,
  Phone,
  Archive,
  UserCheck,
  UserMinus,
  Pencil,
  FileText,
  AlertTriangle,
  Loader2,
  Check
} from "lucide-react";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { Portal } from "@/components/ui/portal";
import { Tooltip } from "@/components/ui/tooltip";
import { getLabels } from "@/lib/labels";
import { AddCustomerForm } from "@/components/dashboard/add-customer-form";
import { updateCustomer, toggleCustomerStatus } from "@/app/actions/customer";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function CustomersClient({ 
  initialCustomers, 
  tenantId,
  userRole,
  businessType 
}: { 
  initialCustomers: any[], 
  tenantId: string,
  userRole: string, 
  businessType?: any 
}) {
  const router = useRouter();
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ACTIVE");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [archivingCustomer, setArchivingCustomer] = useState<any>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const labels = getLabels(businessType);
  useLockBodyScroll(isAddModalOpen || !!editingCustomer || !!archivingCustomer);

  // Sync state when initialCustomers changes
  useEffect(() => {
    setCustomers(initialCustomers);
  }, [initialCustomers]);

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search));
    
    if (userRole !== "ADMIN") return matchesSearch && c.status === "ACTIVE";
    if (statusFilter === "ALL") return matchesSearch;
    return matchesSearch && c.status === statusFilter;
  });

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  // Pagination Calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    const tableElement = document.getElementById("customers-table");
    if (tableElement) {
      tableElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const pageNumbersRange = useMemo(() => {
    const pageNumbers: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      pageNumbers.push(1);

      if (currentPage > 3) {
        pageNumbers.push("...");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      let adjustedStart = start;
      let adjustedEnd = end;
      if (currentPage <= 3) {
        adjustedEnd = 4;
      } else if (currentPage >= totalPages - 2) {
        adjustedStart = totalPages - 3;
      }

      for (let i = adjustedStart; i <= adjustedEnd; i++) {
        pageNumbers.push(i);
      }

      if (currentPage < totalPages - 2) {
        pageNumbers.push("...");
      }

      pageNumbers.push(totalPages);
    }
    return pageNumbers;
  }, [totalPages, currentPage]);

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await updateCustomer(editingCustomer.id, formData);
    if (result.success) {
      toast.success(`${labels.customer} updated successfully!`);
      router.refresh();
      setEditingCustomer(null);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  const handleToggleStatus = async (id: string, currentStatus: string, reason?: string) => {
      setProcessingId(id);
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const result = await toggleCustomerStatus(id, newStatus, reason);
      if (result.success) {
          toast.success(newStatus === 'ACTIVE' ? `${labels.customer} activated!` : `${labels.customer} inactivated!`);
          router.refresh();
          setArchivingCustomer(null);
      } else {
          toast.error(result.error);
      }
      setProcessingId(null);
  };

  return (
    <div className="flex-1 flex flex-col animate-fade-in p-4 md:p-6 lg:p-8">
      
      <div className="flex-1 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
        
        {/* Unified Dashboard Header */}
        <div className="px-10 py-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{labels.customer}s</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{customers.length} Total {labels.customer}s</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input 
                type="text"
                placeholder={`Search ${labels.customerLower}s...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 focus:border-indigo-500/40 dark:focus:border-indigo-500/40 rounded-2xl text-xs dark:text-white focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none w-48 lg:w-64 shadow-sm"
              />
            </div>

            {userRole === "ADMIN" && (
              <div className="hidden sm:flex bg-slate-50 dark:bg-slate-900 p-1 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                {(["ACTIVE", "INACTIVE", "ALL"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      statusFilter === s 
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm" 
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-2xl font-bold text-xs shadow-lg shadow-indigo-500/10 dark:shadow-none hover:bg-indigo-700 hover:scale-[1.02] transition-all active:scale-95 border border-transparent dark:border-white/10 uppercase tracking-widest"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>

        <div className="flex-1 p-10 pt-8" id="customers-table">
          {filteredCustomers.length === 0 ? (
            <div className="bg-indigo-50/50 dark:bg-slate-950/50 p-24 rounded-[2rem] border-2 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
              <UserCircle className="h-16 w-16 text-slate-200 dark:text-slate-700 mb-6" />
              <h3 className="text-slate-900 dark:text-white font-bold text-lg">
                {search ? `No ${labels.customerLower}s found` : `No ${labels.customerLower}s added yet`}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mt-2 font-medium">
                {search ? "Try adjusting your search or add a new one." : `Add a new ${labels.customerLower} to get started.`}
              </p>
            </div>
          ) : (
            <div className="bg-white/50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                  <thead>
                    <tr className="bg-indigo-50/50 dark:bg-slate-900/50">
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{labels.customer}</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Contact Details</th>
                      {userRole === "ADMIN" && (
                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      )}
                      <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {currentItems.map((customer) => (
                      <tr key={customer.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 group">
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-xs transition-colors ${
                                customer.status === 'ACTIVE' 
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' 
                                : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
                            }`}>
                              {customer.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className={`text-sm font-bold transition-colors ${customer.status === 'ACTIVE' ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{customer.name}</p>
                              {customer.notes && (
                                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
                                  <FileText className="h-3 w-3" /> Note attached
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                              <Mail className="h-3 w-3 text-slate-400" /> {customer.email}
                            </div>
                            {customer.phone && (
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                <Phone className="h-3 w-3 text-slate-400" /> {customer.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        {userRole === "ADMIN" && (
                          <td className="px-8 py-5 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider border ${
                                customer.status === 'ACTIVE' 
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/50' 
                                : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:border-rose-900/50'
                            }`}>
                                {customer.status}
                            </span>
                          </td>
                        )}
                        <td className="px-8 py-5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2 transition-opacity">
                            <Tooltip content="Edit" position="bottom">
                              <button 
                                onClick={() => setEditingCustomer(customer)}
                                className="p-2.5 rounded-xl bg-transparent text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all border border-transparent active:scale-95 cursor-pointer"
                              >
                                <Pencil className="h-[18px] w-[18px]" />
                              </button>
                            </Tooltip>

                            {customer.status === 'ACTIVE' ? (
                              <Tooltip content="Inactivate" position="bottom">
                                <button 
                                  onClick={() => userRole === "ADMIN" ? handleToggleStatus(customer.id, 'ACTIVE') : setArchivingCustomer(customer)}
                                  disabled={processingId === customer.id}
                                  className="p-2.5 rounded-xl bg-transparent text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all border border-transparent active:scale-95 disabled:opacity-50 cursor-pointer"
                                >
                                  <UserMinus className="h-[18px] w-[18px]" />
                                </button>
                              </Tooltip>
                            ) : (
                              userRole === "ADMIN" && (
                                <Tooltip content="Activate" position="bottom">
                                  <button 
                                    onClick={() => handleToggleStatus(customer.id, 'INACTIVE')}
                                    disabled={processingId === customer.id}
                                    className="p-2.5 rounded-xl bg-transparent text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all border border-transparent active:scale-95 disabled:opacity-50 cursor-pointer"
                                  >
                                    <UserCheck className="h-[18px] w-[18px]" />
                                  </button>
                                </Tooltip>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {filteredCustomers.length > itemsPerPage && (
          <div className="px-8 py-4 bg-indigo-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="text-[10px] font-normal text-slate-400 uppercase tracking-widest">
              Showing <span className="text-black dark:text-white">{indexOfFirstItem + 1}</span> to <span className="text-black dark:text-white">{Math.min(indexOfLastItem, filteredCustomers.length)}</span> of <span className="text-black dark:text-white">{filteredCustomers.length}</span> {labels.customerLower}s
            </p>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1.5 px-2">
                {pageNumbersRange.map((pageNum, idx) => {
                  if (pageNum === "...") {
                    return (
                      <span 
                        key={`ellipsis-${idx}`} 
                        className="w-8 h-8 flex items-center justify-center text-xs font-bold text-slate-400 dark:text-slate-500 select-none"
                      >
                        ...
                      </span>
                    );
                  }
                  
                  const isActive = currentPage === pageNum;
                  return (
                    <button
                      key={`page-${pageNum}`}
                      onClick={() => paginate(pageNum as number)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
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
                        <UserCircle className="h-5 w-5" />
                     </div>
                     <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                           Add {labels.customer}
                        </h2>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">New Patient File</p>
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
                  <AddCustomerForm 
                    tenantId={tenantId} 
                    onSuccess={() => setIsAddModalOpen(false)} 
                    businessType={businessType}
                  />
               </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Edit Modal */}
      {/* Edit Modal */}
      {editingCustomer && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4 md:p-8">
            <div 
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse"
            />
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-indigo-100/50 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
               <div className="px-8 py-6 border-b border-indigo-100/50 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 rounded-t-[2.4rem] z-10">
                  <div className="flex items-center gap-3">
                     <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 dark:shadow-none border border-transparent dark:border-white/10">
                        <UserCircle className="h-5 w-5" />
                     </div>
                     <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                           Edit {labels.customer}
                        </h2>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Configuring {editingCustomer.name}</p>
                     </div>
                  </div>
                  <button 
                     onClick={() => setEditingCustomer(null)} 
                     className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                     <X className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                  </button>
               </div>
               
               <form onSubmit={handleUpdate} className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900" noValidate={false}>
                 <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 premium-scrollbar">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        name="name" 
                        defaultValue={editingCustomer.name} 
                        required 
                        placeholder={labels.customerPlaceholder}
                        className="w-full rounded-2xl border-2 border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-800 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white shadow-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        name="email" 
                        type="email" 
                        defaultValue={editingCustomer.email} 
                        required 
                        placeholder="customer@example.com"
                        className="w-full rounded-2xl border-2 border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-800 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white shadow-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Phone Number</label>
                      <input 
                        name="phone" 
                        type="tel"
                        defaultValue={editingCustomer.phone || ""} 
                        placeholder="+1 234 567 890" 
                        className="w-full rounded-2xl border-2 border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-800 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white shadow-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Internal Notes</label>
                      <textarea 
                        name="notes" 
                        rows={3} 
                        defaultValue={editingCustomer.notes || ""} 
                        placeholder="Any specific preferences or history..." 
                        className="w-full rounded-2xl border-2 border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-800 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white shadow-sm resize-none"
                      />
                    </div>
                 </div>

                 <div className="px-8 py-4 border-t border-indigo-100/30 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-[2.5rem] transition-colors flex flex-col gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md border border-transparent dark:border-white/10 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                        <>
                          <Check className="h-5 w-5" />
                          Save Changes
                        </>
                      )}
                    </button>
                 </div>
               </form>
            </div>
          </div>
        </Portal>
      )}

      {archivingCustomer && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse" 
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="p-8 text-center">
                <div className="mx-auto h-16 w-16 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center mb-6 border border-amber-100">
                  <AlertTriangle className="h-8 w-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Inactivate {labels.customer}?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-8">
                  Inactivating <span className="font-bold text-slate-900 dark:text-white">{archivingCustomer.name}</span> will hide them from your main list. Only an Administrator can restore them.
                </p>

                <div className="space-y-4 text-left">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason for Inactivating</label>
                  <select 
                    value={archiveReason}
                    onChange={(e) => setArchiveReason(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl px-5 py-4 text-sm dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="">Select a reason...</option>
                    <option value="Moved away">Moved away</option>
                    <option value="Duplicate entry">Duplicate entry</option>
                    <option value="Requested no contact">Requested no contact</option>
                    <option value="Business decision">Business decision</option>
                    <option value="Other">Other (Type below)</option>
                  </select>

                  {archiveReason === "Other" && (
                     <input 
                      type="text"
                      placeholder="Please specify..."
                      onChange={(e) => setArchiveReason(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl px-5 py-4 text-sm dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 animate-in fade-in"
                     />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8">
                  <button 
                    onClick={() => setArchivingCustomer(null)}
                    className="py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleToggleStatus(archivingCustomer.id, 'ACTIVE', archiveReason)}
                    disabled={!archiveReason || processingId === archivingCustomer.id}
                    className="bg-amber-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-amber-700 transition-all shadow-xl shadow-amber-100 dark:shadow-none disabled:opacity-50"
                  >
                    {processingId === archivingCustomer.id ? "Inactivating..." : "Inactivate"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
