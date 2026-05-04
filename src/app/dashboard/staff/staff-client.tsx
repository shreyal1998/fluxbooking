"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Plus, 
  X, 
  Settings2, 
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
import { Portal } from "@/components/ui/portal";
import { Tooltip } from "@/components/ui/tooltip";
import { getLabels } from "@/lib/labels";
import { AddStaffForm } from "@/components/dashboard/add-staff-form";
import { EditStaffForm } from "@/components/dashboard/edit-staff-form";
import { AvailabilityEditor } from "@/components/dashboard/availability-editor";
import { LeaveRequestsManager } from "@/components/dashboard/leave-requests-manager";
import Link from "next/link";

interface StaffClientProps {
  initialStaff: any[];
  initialUsers: any[];
  initialServices: any[];
  pendingRequests: any[];
  currentLimit: number;
  businessType: any;
  userRole: string;
  plan: string;
}

export function StaffClient({ 
  initialStaff, 
  initialUsers, 
  initialServices, 
  pendingRequests,
  currentLimit, 
  businessType,
  userRole,
  plan
}: StaffClientProps) {
  const [staff, setStaff] = useState(initialStaff);
  const [users, setUsers] = useState(initialUsers);
  const [services, setServices] = useState(initialServices);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "availability">("profile");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const labels = getLabels(businessType);
  useLockBodyScroll(isAddModalOpen || !!editingStaff);

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
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredStaff.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / itemsPerPage));

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

  const isLimitExceeded = staff.length > currentLimit;

  return (
    <div className="flex-1 flex flex-col animate-fade-in p-4 md:p-6 lg:p-8">
      
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Main Section - List Wise handled with Pagination */}
        <div className="flex-1 w-full lg:min-w-0" id="staff-table-section">
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden h-full">
            
            {/* Unified Card Header */}
            <div className="px-10 py-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{labels.staff}s</h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`h-1.5 w-1.5 rounded-full ${isLimitExceeded ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {staff.length} / {currentLimit === 1000000 ? 'Unlimited' : currentLimit} Active
                  </p>
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
                    className="pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs dark:text-white focus:ring-2 focus:ring-indigo-600/20 transition-all outline-none w-48 lg:w-64"
                  />
                </div>
                {userRole === "ADMIN" && (
                  <Tooltip content={`Add New ${labels.staff}`} position="bottom">
                    <button 
                      onClick={() => setIsAddModalOpen(true)}
                      className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-2xl font-bold text-xs shadow-lg shadow-indigo-500/10 dark:shadow-none hover:bg-indigo-700 hover:scale-[1.02] transition-all active:scale-95 border border-transparent dark:border-white/10 uppercase tracking-widest"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </button>
                  </Tooltip>
                )}
              </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 p-0 overflow-hidden">
              {filteredStaff.length === 0 ? (
                <div className="p-24 flex flex-col items-center justify-center text-center">
                  <div className="h-20 w-20 rounded-[2rem] bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-6">
                    <labels.staffIcon className="h-10 w-10 text-slate-200 dark:text-slate-700" />
                  </div>
                  <p className="text-slate-900 dark:text-white font-bold text-lg">No {labels.staffLower}s found</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mt-2 font-medium">Try adjusting your search or add a new {labels.staffLower}.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                        <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{labels.staff}</th>
                        <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Details</th>
                        <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{labels.service}s</th>
                        <th className="px-10 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {currentItems.map((member, index) => {
                        const actualIndex = indexOfFirstItem + index;
                        const isLocked = actualIndex >= currentLimit;
                        
                        return (
                          <tr key={member.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group ${isLocked ? 'opacity-50 grayscale bg-slate-50/30 dark:bg-slate-900/20' : ''}`}>
                            <td className="px-10 py-6 whitespace-nowrap">
                              <div className="flex items-center gap-4">
                                <div 
                                  className="h-12 w-12 rounded-2xl flex items-center justify-center border-2 shrink-0 transition-transform group-hover:scale-110"
                                  style={{ 
                                    borderColor: isLocked ? 'transparent' : member.color, 
                                    backgroundColor: isLocked ? undefined : `${member.color}10` 
                                  }}
                                >
                                  {isLocked ? <Lock className="h-5 w-5 text-slate-400" /> : <labels.staffIcon className="h-6 w-6" style={{ color: member.color }} />}
                                </div>
                                <div>
                                  <p className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    {member.name}
                                    {isLocked && <span className="text-[8px] font-black uppercase bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded tracking-tighter">Locked</span>}
                                  </p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">{isLocked ? "Limit Reached" : (member.bio || `Active ${labels.staff}`)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-10 py-6 whitespace-nowrap">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                  <Mail className="h-3.5 w-3.5 text-indigo-500/50" /> {member.user?.email || "No email"}
                                </div>
                                {member.user?.phone && (
                                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                    <Phone className="h-3.5 w-3.5 text-indigo-500/50" /> {member.user.phone}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-10 py-6 whitespace-nowrap">
                              <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                                {member.services?.slice(0, 2).map((service: any) => (
                                  <span key={service.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50">
                                    {service.name}
                                  </span>
                                ))}
                                {member.services?.length > 2 && (
                                  <span className="text-[9px] font-black text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-700">+{member.services.length - 2}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-10 py-6 whitespace-nowrap text-right">
                              {userRole === "ADMIN" ? (
                                !isLocked ? (
                                  <Tooltip content={`Manage ${member.name}`} position="bottom">
                                    <button 
                                      onClick={() => {
                                        setEditingStaff(member);
                                        setActiveTab("profile");
                                      }}
                                      className="p-3 bg-white dark:bg-slate-700 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-2xl transition-all border border-slate-100 dark:border-slate-600 shadow-sm hover:shadow-md active:scale-95"
                                    >
                                      <Settings2 className="h-4.5 w-4.5" />
                                    </button>
                                  </Tooltip>
                                ) : (
                                  <Tooltip content="Upgrade Plan" position="bottom">
                                    <Link href="/dashboard/settings" className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl inline-block hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                      <Lock className="h-4.5 w-4.5" />
                                    </Link>
                                  </Tooltip>
                                )
                              ) : (
                                <div className="p-3 opacity-0 cursor-default">
                                  <Settings2 className="h-4.5 w-4.5" />
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
              <div className="px-10 py-8 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Showing <span className="text-slate-900 dark:text-white">{indexOfFirstItem + 1}</span> to <span className="text-slate-900 dark:text-white">{Math.min(indexOfLastItem, filteredStaff.length)}</span> of <span className="text-slate-900 dark:text-white">{filteredStaff.length}</span> {labels.staffLower}s
                </p>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div className="flex items-center gap-2 px-4">
                    <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tighter">PAGE {currentPage}</span>
                    <span className="text-[10px] font-black text-slate-400">/ {totalPages}</span>
                  </div>

                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Section - Sticky Sidebar for Leave Requests & Stats */}
        <div className="lg:w-96 flex flex-col gap-8 lg:sticky lg:top-8">
          
          {/* Plan Limit Card */}
          {isLimitExceeded && (
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-amber-200 dark:shadow-none animate-pulse-slow">
              <Shield className="h-10 w-10 mb-6 text-white/30" />
              <h4 className="text-lg font-black uppercase tracking-tight mb-2">Limit Exceeded</h4>
              <p className="text-xs font-medium text-amber-50 leading-relaxed mb-6">
                Your current {plan} plan is capped at {currentLimit} {labels.staffLower}s. Some members are locked.
              </p>
              <Link href="/dashboard/settings" className="block w-full text-center py-4 bg-white text-amber-600 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-amber-50 transition-all active:scale-95 shadow-lg">
                  Upgrade Now
              </Link>
            </div>
          )}

          {/* Leave Requests Section */}
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
               <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600 border border-rose-100 dark:border-rose-900/50">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Time Off</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{pendingRequests.length} Pending</p>
                  </div>
               </div>
            </div>
            <div className="p-8 overflow-y-auto max-h-[400px]">
              <LeaveRequestsManager initialRequests={pendingRequests} />
            </div>
          </div>

          {/* Quick Stats Card */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 border border-indigo-100 dark:border-indigo-900/50">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Team Overview</h3>
            </div>
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between border border-slate-100 dark:border-slate-700">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active {labels.staff}s</span>
                <span className="text-sm font-black text-slate-900 dark:text-white">{staff.length}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between border border-slate-100 dark:border-slate-700">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total {labels.service}s</span>
                <span className="text-sm font-black text-slate-900 dark:text-white">{initialServices.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Staff Modal */}
      {isAddModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4 sm:p-6">
            <div 
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse"
            />
            <div className="relative bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in duration-300">
               <div className="p-6 px-8 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800 sticky top-0 z-10">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Add New {labels.staff}</h3>
                  <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                    <X className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  </button>
               </div>
               <div className="max-h-[80vh] overflow-y-auto">
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
            <div className="relative bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in duration-300">
              <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-5">
                  <div 
                    className="h-14 w-14 rounded-2xl flex items-center justify-center border-2 shadow-sm"
                    style={{ borderColor: editingStaff.color, backgroundColor: `${editingStaff.color}10` }}
                  >
                    <labels.staffIcon className="h-7 w-7" style={{ color: editingStaff.color }} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Manage {labels.staff}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Configuring {editingStaff.name}</p>
                  </div>
                </div>
                <button onClick={() => setEditingStaff(null)} className="p-3 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all active:scale-95 shadow-sm border border-slate-200 dark:border-slate-600">
                  <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                </button>
              </div>

              {/* Enhanced Tab Navigation */}
              <div className="flex border-b border-slate-100 dark:border-slate-700 px-8 bg-white dark:bg-slate-800">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`px-8 py-5 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2.5 ${
                    activeTab === "profile" 
                    ? "border-indigo-600 text-indigo-600" 
                    : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Settings2 className="h-4 w-4" />
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab("availability")}
                  className={`px-8 py-5 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2.5 ${
                    activeTab === "availability" 
                    ? "border-indigo-600 text-indigo-600" 
                    : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Clock className="h-4 w-4" />
                  Availability
                </button>
              </div>

              <div className="p-8 overflow-y-auto bg-white dark:bg-slate-800 flex-1 scrollbar-hide">
                {activeTab === "profile" ? (
                  <EditStaffForm 
                    staff={editingStaff} 
                    isAdmin={userRole === "ADMIN"} 
                    onSuccess={() => setEditingStaff(null)} 
                    services={initialServices}
                    businessType={businessType}
                  />
                ) : (
                  <AvailabilityEditor 
                    staffId={editingStaff.id} 
                    initialAvailability={editingStaff.availabilityJson} 
                  />
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
