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
  RotateCcw
} from "lucide-react";
import { updateCustomer, toggleCustomerStatus } from "@/app/actions/customer";
import { format } from "date-fns";

export function CustomerList({ initialCustomers, userRole }: { initialCustomers: any[], userRole: string }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  // Admin starts with ACTIVE filter, Staff is locked to ACTIVE
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ACTIVE");
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

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

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await updateCustomer(editingCustomer.id, formData);
    
    if (result.success) {
      setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? { ...c, 
        name: formData.get('name'), 
        email: formData.get('email'),
        phone: formData.get('phone'),
        notes: formData.get('notes'),
        status: formData.get('status')
      } : c));
      setEditingCustomer(null);
    } else {
      alert(result.error);
    }
    setLoading(false);
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
      setProcessingId(id);
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const result = await toggleCustomerStatus(id, newStatus);
      
      if (result.success) {
          setCustomers(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
      } else {
          alert(result.error);
      }
      setProcessingId(null);
  };

  return (
    <div className="space-y-6 transition-colors">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input 
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none dark:text-white"
            />
        </div>

        {/* Filter Bar: ONLY visible to ADMIN */}
        {userRole === "ADMIN" && (
          <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                {(["ACTIVE", "INACTIVE", "ALL"] as const).map((s) => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${
                            statusFilter === s 
                            ? "bg-indigo-600 text-white shadow-md" 
                            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        }`}
                    >
                        {s}
                    </button>
                ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-8 py-5 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Customer</th>
                <th className="px-8 py-5 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Contact Details</th>
                {userRole === "ADMIN" && (
                  <th className="px-8 py-5 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Status</th>
                )}
                <th className="px-8 py-5 text-right text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Quick Actions</th>
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
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                        <Mail className="h-3.5 w-3.5 text-slate-400" /> {customer.email}
                      </div>
                      {customer.phone && (
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
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
                      
                      {/* Set INACTIVE Action: Both can do this for active clients */}
                      {customer.status === 'ACTIVE' ? (
                          <button 
                            onClick={() => handleToggleStatus(customer.id, 'ACTIVE')}
                            disabled={processingId === customer.id}
                            className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-100"
                            title="Set Inactive"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                      ) : (
                        /* Set ACTIVE Action: ONLY Admin can restore inactive clients */
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

      {/* Edit Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors">
              <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                 <h3 className="text-xl font-black text-slate-900 dark:text-white">Customer Profile</h3>
                 <button onClick={() => setEditingCustomer(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                   <X className="h-5 w-5 text-slate-400" />
                 </button>
              </div>
              <form onSubmit={handleUpdate} className="p-8 space-y-6">
                 <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Status</label>
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
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
                            <input name="name" defaultValue={editingCustomer.name} required className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-3 text-sm dark:text-white outline-none" />
                        </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                      <input name="email" type="email" defaultValue={editingCustomer.email} required className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-3 text-sm dark:text-white outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Phone Number</label>
                      <input name="phone" defaultValue={editingCustomer.phone || ""} placeholder="+1 234 567 890" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-3 text-sm dark:text-white outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Internal Notes</label>
                      <textarea name="notes" rows={3} defaultValue={editingCustomer.notes || ""} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-3 text-sm dark:text-white outline-none resize-none" />
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
      )}
    </div>
  );
}
