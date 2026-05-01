"use client";

import { useState } from "react";
import { 
  UserCircle, 
  Mail, 
  Phone, 
  Search, 
  MoreVertical, 
  Pencil, 
  X,
  FileText,
  UserX,
  UserCheck,
  RotateCcw,
  Archive,
  AlertTriangle,
  AlertCircle
} from "lucide-react";
import { updateCustomer, toggleCustomerStatus } from "@/app/actions/customer";
import { format } from "date-fns";
import { toast } from "sonner";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { Portal } from "@/components/ui/portal";

const InputError = ({ message }: { message?: string }) => {
  if (!message) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1.5 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200 text-left">
      <AlertCircle className="h-3 w-3" />
      <span className="text-[10px] font-black uppercase tracking-wider">{message}</span>
    </div>
  );
};

export function CustomerList({ initialCustomers, userRole }: { initialCustomers: any[], userRole: string }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  // Admin starts with ACTIVE filter, Staff is locked to ACTIVE
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ACTIVE");
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [archivingCustomer, setArchivingCustomer] = useState<any>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useLockBodyScroll(!!editingCustomer || !!archivingCustomer);

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search));
    
    // STAFF: Force visibility to only ACTIVE clients
    if (userRole !== "ADMIN") return matchesSearch && c.status === "ACTIVE";
    
    // ADMIN: Use the selected filter
    if (statusFilter === "ALL") return matchesSearch;
    return matchesSearch && c.status === statusFilter;
  });

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
    const email = formData.get("email") as string;

    const errors: Record<string, string> = {};
    if (!name) errors.name = "Customer name is required";
    if (!email) errors.email = "Email is required";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    const result = await updateCustomer(editingCustomer.id, formData);
    
    if (result.success) {
      toast.success("Customer updated successfully!");
      setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? { ...c, 
        name: formData.get('name'), 
        email: formData.get('email'),
        phone: formData.get('phone'),
        notes: formData.get('notes'),
        status: formData.get('status')
      } : c));
      setEditingCustomer(null);
    } else {
      if (result.error?.includes("email")) {
        setFieldErrors({ email: "This email is already in use" });
      } else {
        toast.error(result.error);
      }
    }
    setLoading(false);
  };

  const handleToggleStatus = async (id: string, currentStatus: string, reason?: string) => {
      setProcessingId(id);
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const result = await toggleCustomerStatus(id, newStatus, reason);
      
      if (result.success) {
          toast.success(newStatus === 'ACTIVE' ? "Customer restored successfully!" : "Customer archived successfully!");
          setCustomers(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
          setArchivingCustomer(null);
          setArchiveReason("");
      } else {
          toast.error(result.error);
      }
      setProcessingId(null);
  };

  const handleArchiveRequest = (customer: any) => {
    if (userRole === "ADMIN") {
      handleToggleStatus(customer.id, 'ACTIVE');
    } else {
      setArchivingCustomer(customer);
    }
  };

  return (
    <div className="space-y-6 transition-colors">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-2">
        <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input 
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none dark:text-white"
            />
        </div>

        {userRole === "ADMIN" && (
          <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                {(["ACTIVE", "INACTIVE", "ALL"] as const).map((s) => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                            statusFilter === s 
                            ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" 
                            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        }`}
                    >
                        {s}
                    </button>
                ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-8 py-5 text-left text-xs font-medium text-slate-900 dark:text-white uppercase tracking-widest">Customer</th>
                <th className="px-8 py-5 text-left text-xs font-medium text-slate-900 dark:text-white uppercase tracking-widest">Contact Details</th>
                {userRole === "ADMIN" && (
                  <th className="px-8 py-5 text-left text-xs font-medium text-slate-900 dark:text-white uppercase tracking-widest">Status</th>
                )}
                <th className="px-8 py-5 text-right text-xs font-medium text-slate-900 dark:text-white uppercase tracking-widest">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-8 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-sm transition-colors ${
                          customer.status === 'ACTIVE' 
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' 
                          : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
                      }`}>
                        {customer.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className={`text-sm font-bold transition-colors ${customer.status === 'ACTIVE' ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{customer.name}</p>
                        {customer.notes && (
                           <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                             <FileText className="h-3 w-3" /> Note attached
                           </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                        <Mail className="h-3.5 w-3.5 text-slate-400" /> {customer.email}
                      </div>
                      {customer.phone && (
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                          <Phone className="h-3.5 w-3.5 text-slate-400" /> {customer.phone}
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
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      
                      {customer.status === 'ACTIVE' ? (
                          <button 
                            onClick={() => handleArchiveRequest(customer)}
                            disabled={processingId === customer.id}
                            className="p-2 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white transition-all shadow-sm border border-amber-100"
                            title="Archive Customer"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                      ) : (
                        userRole === "ADMIN" && (
                          <button 
                            onClick={() => handleToggleStatus(customer.id, 'INACTIVE')}
                            disabled={processingId === customer.id}
                            className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100"
                            title="Set Active"
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>
                        )
                      )}

                      <button 
                        onClick={() => setEditingCustomer(customer)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                        title="Edit Profile"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingCustomer && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4">
             <div 
               onClick={() => setEditingCustomer(null)}
               className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse cursor-pointer" 
             />
             <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors animate-in fade-in zoom-in duration-300">
                <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                   <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Customer Profile</h3>
                   <button onClick={() => setEditingCustomer(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                     <X className="h-5 w-5 text-slate-400" />
                   </button>
                </div>
                <form onSubmit={handleUpdate} className="p-8 space-y-6" noValidate>
                   <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-medium text-slate-900 dark:text-white uppercase tracking-widest mb-2 opacity-40">Status</label>
                              <select 
                                  name="status" 
                                  defaultValue={editingCustomer.status} 
                                  disabled={userRole !== "ADMIN" && editingCustomer.status === "INACTIVE"}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-3 text-sm dark:text-white outline-none disabled:opacity-50"
                              >
                                  <option value="ACTIVE">ACTIVE</option>
                                  <option value="INACTIVE">INACTIVE</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-medium text-slate-900 dark:text-white uppercase tracking-widest mb-2 opacity-40">Full Name</label>
                              <input 
                                name="name" 
                                defaultValue={editingCustomer.name} 
                                required 
                                onChange={() => clearFieldError("name")}
                                className={`w-full rounded-2xl border-2 px-5 py-3 text-sm focus:outline-none transition-all ${
                                  fieldErrors.name ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" : "border-transparent bg-slate-50 dark:bg-slate-800 dark:text-white focus:border-indigo-600"
                                }`}
                              />
                              <InputError message={fieldErrors.name} />
                          </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-900 dark:text-white uppercase tracking-widest mb-2 opacity-40">Email Address</label>
                        <input 
                          name="email" 
                          type="email" 
                          defaultValue={editingCustomer.email} 
                          required 
                          onChange={() => clearFieldError("email")}
                          className={`w-full rounded-2xl border-2 px-5 py-3 text-sm focus:outline-none transition-all ${
                            fieldErrors.email ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" : "border-transparent bg-slate-50 dark:bg-slate-800 dark:text-white focus:border-indigo-600"
                          }`}
                        />
                        <InputError message={fieldErrors.email} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-900 dark:text-white uppercase tracking-widest mb-2 opacity-40">Phone Number</label>
                        <input name="phone" defaultValue={editingCustomer.phone || ""} placeholder="+1 234 567 890" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-600 rounded-2xl px-5 py-3 text-sm dark:text-white outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-900 dark:text-white uppercase tracking-widest mb-2 opacity-40">Internal Notes</label>
                        <textarea name="notes" rows={3} defaultValue={editingCustomer.notes || ""} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-600 rounded-2xl px-5 py-3 text-sm dark:text-white outline-none resize-none transition-all" />
                      </div>
                   </div>
                   <button 
                     type="submit" 
                     disabled={loading}
                     className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
                   >
                     {loading ? "Saving..." : "Save Changes"}
                   </button>
                </form>
             </div>
          </div>
        </Portal>
      )}

      {archivingCustomer && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4">
            <div 
              onClick={() => setArchivingCustomer(null)}
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse cursor-pointer" 
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="p-8 text-center">
                <div className="mx-auto h-16 w-16 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center mb-6">
                  <AlertTriangle className="h-8 w-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Archive Customer?</h3>
                <p className="text-sm text-slate-900 dark:text-white font-normal opacity-60 mb-8">
                  Warning: You are moving <span className="font-semibold text-slate-900 dark:text-white">{archivingCustomer.name}</span> to the Archive. 
                  They will be hidden from your list. Only an Administrator can restore them.
                </p>

                <div className="space-y-4 text-left">
                  <label className="block text-xs font-medium text-slate-900 dark:text-white uppercase tracking-widest ml-1 opacity-40">Reason for Archiving</label>
                  <select 
                    value={archiveReason}
                    onChange={(e) => setArchiveReason(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20"
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
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20"
                     />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8">
                  <button 
                    onClick={() => setArchivingCustomer(null)}
                    className="py-4 rounded-2xl font-medium text-slate-900 dark:text-white opacity-40 hover:opacity-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleToggleStatus(archivingCustomer.id, 'ACTIVE', archiveReason)}
                    disabled={!archiveReason || processingId === archivingCustomer.id}
                    className="bg-amber-600 text-white py-4 rounded-2xl font-black hover:bg-amber-700 transition-all shadow-xl shadow-amber-100 dark:shadow-none disabled:opacity-50"
                  >
                    {processingId === archivingCustomer.id ? "Archiving..." : "Confirm Archive"}
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
