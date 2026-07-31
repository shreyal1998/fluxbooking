"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Users, 
  Plus, 
  X, 
  Settings2, 
  Pencil,
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Shield,
  Search,
  Lock,
  Mail,
  Phone,
  BarChart3,
  Calendar
} from "lucide-react";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { toast } from "sonner";
import { Portal } from "@/components/ui/portal";
import { Tooltip } from "@/components/ui/tooltip";
import { getLabels } from "@/lib/labels";
import { AddStaffForm } from "@/components/dashboard/add-staff-form";
import { EditStaffForm } from "@/components/dashboard/edit-staff-form";
import { LeaveRequestsManager } from "@/components/dashboard/leave-requests-manager";
import { deleteStaff } from "@/app/actions/dashboard";
import Link from "next/link";
import { Trash2, AlertCircle, Loader2 } from "lucide-react";

interface StaffClientProps {
  initialStaff: any[];
  initialUsers: any[];
  initialServices: any[];
  pendingRequests: any[];
  currentLimit: number;
  businessType: any;
  userRole: string;
  plan: string;
  timeFormat?: string;
  trialEndsAt?: Date | string | null;
}

export function StaffClient({ 
  initialStaff, 
  initialUsers, 
  initialServices, 
  pendingRequests,
  currentLimit, 
  businessType,
  userRole,
  plan,
  timeFormat = "12h",
  trialEndsAt
}: StaffClientProps) {
  const [staff, setStaff] = useState(initialStaff);
  const [users, setUsers] = useState(initialUsers);
  const [services, setServices] = useState(initialServices);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [showTrialExpiredBanner, setShowTrialExpiredBanner] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem("dismissed_free_reversion_banner");
    if (!isDismissed && plan === "FREE" && trialEndsAt && new Date(trialEndsAt) < new Date()) {
      setShowTrialExpiredBanner(true);
    }
  }, [plan, trialEndsAt]);
  
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "availability">("profile");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingStaff, setDeletingStaff] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const labels = getLabels(businessType);
  useLockBodyScroll(isAddModalOpen || !!editingStaff || !!deletingStaff);

  // Sync state when props change (after router.refresh())
  useEffect(() => {
    setStaff(initialStaff);
  }, [initialStaff]);

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  useEffect(() => {
    setServices(initialServices);
  }, [initialServices]);

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.user?.email?.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / itemsPerPage));
  const activePage = currentPage > totalPages ? totalPages : currentPage;

  const indexOfLastItem = activePage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredStaff.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages]);

  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    const tableElement = document.getElementById("staff-table-section");
    if (tableElement) {
      tableElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

      if (activePage > 3) {
        pageNumbers.push("...");
      }

      const start = Math.max(2, activePage - 1);
      const end = Math.min(totalPages - 1, activePage + 1);

      let adjustedStart = start;
      let adjustedEnd = end;
      if (activePage <= 3) {
        adjustedEnd = 4;
      } else if (activePage >= totalPages - 2) {
        adjustedStart = totalPages - 3;
      }

      for (let i = adjustedStart; i <= adjustedEnd; i++) {
        pageNumbers.push(i);
      }

      if (activePage < totalPages - 2) {
        pageNumbers.push("...");
      }

      pageNumbers.push(totalPages);
    }
    return pageNumbers;
  }, [totalPages, activePage]);

  const isLimitExceeded = staff.length > currentLimit;

  return (
    <div className="flex-1 flex flex-col w-full max-w-full min-w-0 animate-fade-in p-4 md:p-6 lg:p-8">
      
      <div className="flex flex-col lg:flex-row gap-8 items-start w-full max-w-full min-w-0">
        
        {/* Main Section - List Wise handled with Pagination */}
        <div className="flex-1 w-full lg:min-w-0" id="staff-table-section">
          <div className="w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden h-full min-h-[600px]">
            
            {/* Unified Card Header */}
            <div className="px-10 py-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{labels.staff}s</h2>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <div className="flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${isLimitExceeded ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {staff.length} / {currentLimit === 1000000 ? 'Unlimited' : currentLimit} Active
                    </p>
                  </div>
                  {isLimitExceeded && (
                    <Link 
                      href="/settings/billing" 
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40 transition-all hover:scale-105 active:scale-95 shrink-0"
                    >
                      <AlertCircle className="h-3 w-3 text-amber-500" />
                      <span>Limit Exceeded - Upgrade</span>
                    </Link>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input 
                    type="text"
                    placeholder={`Search ${labels.staffLower}s...`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 focus:border-indigo-500/40 dark:focus:border-indigo-500/40 rounded-2xl text-xs dark:text-white focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none w-48 lg:w-64 shadow-sm"
                  />
                </div>
            {userRole === "ADMIN" && (
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-2xl font-bold text-xs shadow-lg shadow-indigo-500/10 dark:shadow-none hover:bg-indigo-700 hover:scale-[1.02] transition-all active:scale-95 border border-transparent dark:border-white/10 uppercase tracking-widest"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            )}
              </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 p-0 overflow-hidden">
              {filteredStaff.length === 0 ? (
                <div className="flex-1 p-24 flex flex-col items-center justify-center text-center w-full">
                  <div className="h-20 w-20 rounded-[2rem] bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-6">
                    <labels.staffIcon className="h-10 w-10 text-slate-200 dark:text-slate-700" />
                  </div>
                  <p className="text-slate-900 dark:text-white font-bold text-lg">No {labels.staffLower}s found</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mt-2 font-medium">Try adjusting your search or add a new {labels.staffLower}.</p>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <table className="w-full table-fixed">
                    <thead>
                      <tr className="bg-indigo-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                        <th className="w-[30%] px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{labels.staff}</th>
                        <th className="w-[30%] px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Details</th>
                        <th className="w-[25%] px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{labels.service}s</th>
                        <th className="w-[15%] px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.map((member, index) => {
                        const actualIndex = staff.indexOf(member);
                        const isLocked = actualIndex >= currentLimit;
                        
                        return (
                          <tr key={member.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 group ${isLocked ? 'opacity-80 dark:opacity-75 grayscale bg-slate-50/30 dark:bg-slate-900/20' : ''} ${index < currentItems.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-4 min-w-0">
                                {isLocked ? (
                                  <Link
                                    href="/settings/billing"
                                    title="Upgrade Plan"
                                    className="h-12 w-12 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0 transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-sm text-slate-400 hover:text-amber-500 hover:border-amber-500/50"
                                  >
                                    <Lock className="h-5 w-5" />
                                  </Link>
                                ) : (
                                  <div 
                                    className="h-12 w-12 rounded-2xl flex items-center justify-center border-2 shrink-0 transition-transform group-hover:scale-110"
                                    style={{ 
                                      borderColor: member.color, 
                                      backgroundColor: `${member.color}10` 
                                    }}
                                  >
                                    <labels.staffIcon className="h-6 w-6" style={{ color: member.color }} />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 truncate">
                                    <span className="truncate">{member.name}</span>
                                    {isLocked && <span className="text-[8px] font-black uppercase bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded tracking-tighter shrink-0">Locked</span>}
                                  </p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5 truncate">
                                    {isLocked ? "Limit Reached" : (member.bio || `Active ${labels.staff}`)}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="space-y-1.5 min-w-0">
                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">
                                  <Mail className="h-3.5 w-3.5 text-indigo-500/50 shrink-0" />
                                  <span className="truncate">{member.user?.email || "No email"}</span>
                                </div>
                                {member.user?.phone && (
                                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">
                                    <Phone className="h-3.5 w-3.5 text-indigo-500/50 shrink-0" />
                                    <span className="truncate">{member.user.phone}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-wrap gap-1.5 max-w-full">
                                {member.services?.slice(0, 2).map((service: any) => (
                                  <span key={service.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 truncate max-w-full">
                                    <span className="truncate">{service.name}</span>
                                  </span>
                                ))}
                                {member.services?.length > 2 && (
                                  <span className="text-[9px] font-black text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-800 shrink-0">+{member.services.length - 2}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap text-right">
                              {userRole === "ADMIN" ? (
                                !isLocked ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <Tooltip content="Edit" position="bottom">
                                      <button 
                                        onClick={() => {
                                          setEditingStaff(member);
                                          setActiveTab("profile");
                                        }}
                                        className="p-2.5 rounded-xl bg-transparent text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all border border-transparent active:scale-95 cursor-pointer"
                                      >
                                        <Pencil className="h-[18px] w-[18px]" />
                                      </button>
                                    </Tooltip>

                                    <Tooltip content="Delete" position="bottom">
                                      <button 
                                        onClick={() => setDeletingStaff(member)}
                                        className="p-2.5 rounded-xl bg-transparent text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all border border-transparent active:scale-95 cursor-pointer"
                                      >
                                        <Trash2 className="h-[18px] w-[18px]" />
                                      </button>
                                    </Tooltip>
                                  </div>
                                ) : (
                                   <Tooltip content="Upgrade Plan" position="bottom">
                                     <Link 
                                       href="/settings/billing" 
                                       className="p-2.5 rounded-xl bg-transparent text-amber-600 dark:text-amber-400 hover:bg-amber-100/80 dark:hover:bg-slate-800 transition-all border border-transparent active:scale-95 inline-flex items-center justify-center cursor-pointer"
                                     >
                                       <Lock className="h-[18px] w-[18px]" />
                                     </Link>
                                   </Tooltip>
                                )
                              ) : (
                                <div className="p-3 opacity-0 cursor-default">
                                  <Pencil className="h-4.5 w-4.5" />
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination Footer - Integrated inside the main card */}
            {filteredStaff.length > itemsPerPage && (
              <div className="px-8 py-4 bg-indigo-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <p className="text-[10px] font-normal text-slate-400 uppercase tracking-widest">
                  Showing <span className="text-black dark:text-white">{indexOfFirstItem + 1}</span> to <span className="text-black dark:text-white">{Math.min(indexOfLastItem, filteredStaff.length)}</span> of <span className="text-black dark:text-white">{filteredStaff.length}</span> {labels.staffLower}s
                </p>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => paginate(activePage - 1)}
                    disabled={activePage === 1}
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
                      
                      const isActive = activePage === pageNum;
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
                    onClick={() => paginate(activePage + 1)}
                    disabled={activePage === totalPages}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Section - Sticky Sidebar for Leave Requests & Stats */}
        <div className="lg:w-96 w-full shrink-0 flex flex-col gap-8 lg:sticky lg:top-8">

          {/* Leave Requests Section */}
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2.5rem] border border-indigo-100/80 dark:border-slate-800 shadow-sm flex flex-col">
            <div className="p-8 border-b border-indigo-100/80 dark:border-slate-800 flex items-center justify-between rounded-t-[2.35rem]">
               <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600 border border-rose-200/50 dark:border-rose-900/50">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Time Off</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{pendingRequests.length} Pending</p>
                  </div>
               </div>
            </div>
            <div className="p-8 overflow-y-auto max-h-[400px]">
              <LeaveRequestsManager initialRequests={pendingRequests} timeFormat={timeFormat} />
            </div>
          </div>

          {/* Quick Stats Card */}
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2.5rem] border border-indigo-100/80 dark:border-slate-800 shadow-sm flex flex-col">
            <div className="p-8 border-b border-indigo-100/80 dark:border-slate-800 flex items-center justify-between rounded-t-[2.35rem]">
               <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 border border-indigo-200/50 dark:border-indigo-900/50">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Team Overview</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Stats</p>
                  </div>
               </div>
            </div>
            <div className="p-8 space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/30 dark:bg-slate-800/50 flex items-center justify-between border border-indigo-100/30 dark:border-slate-800/50">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Active {labels.staff}s</span>
                <span className="text-sm font-black text-slate-900 dark:text-white">{currentLimit === 1000000 ? staff.length : Math.min(staff.length, currentLimit)}</span>
              </div>
              <div className="p-4 rounded-2xl bg-indigo-50/30 dark:bg-slate-800/50 flex items-center justify-between border border-indigo-100/30 dark:border-slate-800/50">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Total {labels.service}s</span>
                <span className="text-sm font-black text-slate-900 dark:text-white">{initialServices.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Staff Modal */}
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
                        <labels.staffIcon className="h-5 w-5" />
                     </div>
                     <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                           Add {labels.staff}
                        </h2>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">New Profile Registration</p>
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
                  <AddStaffForm 
                    users={initialUsers} 
                    services={initialServices} 
                    onSuccess={() => setIsAddModalOpen(false)} 
                    businessType={businessType}
                  />
               </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Manage Staff Modal */}
      {editingStaff && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4 md:p-8">
            <div 
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse"
            />
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-indigo-100/50 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
               <div className="px-8 py-6 border-b border-indigo-100/50 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 rounded-t-[2.4rem] z-10">
                  <div className="flex items-center gap-3">
                     <div 
                        className="h-10 w-10 rounded-2xl flex items-center justify-center border shadow-sm"
                        style={{ borderColor: editingStaff.color, backgroundColor: `${editingStaff.color}10` }}
                     >
                        <labels.staffIcon className="h-5 w-5" style={{ color: editingStaff.color }} />
                     </div>
                     <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                           Edit {labels.staff}
                        </h2>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Configuring {editingStaff.name}</p>
                     </div>
                  </div>
                  <button 
                     onClick={() => setEditingStaff(null)} 
                     className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                     <X className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                  </button>
               </div>
               <div className="flex-1 flex flex-col min-h-0">
                  <EditStaffForm 
                    staff={editingStaff} 
                    isAdmin={userRole === "ADMIN"} 
                    onSuccess={() => setEditingStaff(null)} 
                    services={initialServices}
                    businessType={businessType}
                  />
               </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingStaff && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse" 
            />
            <div className="relative bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="p-8 text-center">
                <div className="mx-auto h-16 w-16 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center mb-6 border border-rose-100 dark:border-rose-900/50">
                  <AlertCircle className="h-8 w-8 text-rose-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Remove {labels.staff}?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-8">
                  Are you sure you want to remove <span className="font-bold text-slate-900 dark:text-white">{deletingStaff.name}</span>? This will permanently delete their profile and associated user account.
                </p>

                <div className="grid grid-cols-2 gap-4 mt-8">
                  <button 
                    onClick={() => setDeletingStaff(null)}
                    className="py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={async () => {
                      setDeleteLoading(true);
                      const result = await deleteStaff(deletingStaff.id);
                      if (result.success) {
                        toast.success(`${labels.staff} removed`);
                        setDeletingStaff(null);
                        setStaff(staff.filter(s => s.id !== deletingStaff.id));
                      } else {
                        toast.error(result.error);
                      }
                      setDeleteLoading(false);
                    }}
                    disabled={deleteLoading}
                    className="bg-rose-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-rose-700 transition-all shadow-xl shadow-rose-100 dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Remove"}
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
