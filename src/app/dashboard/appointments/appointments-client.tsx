"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { format } from "date-fns";
import { 
  Calendar as CalendarIcon, 
  List, 
  Clock, 
  User, 
  Mail, 
  LayoutGrid, 
  Filter,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
  Users,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Ban,
  Scissors,
  Check
} from "lucide-react";
import { CalendarView } from "@/components/dashboard/calendar-view";
import { updateBookingStatus, deleteBooking } from "@/app/actions/booking";
import { toast } from "sonner";
import { 
  addMonths, 
  subMonths, 
  addWeeks, 
  subWeeks, 
  addDays, 
  subDays, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth
} from "date-fns";
import { AvailabilityEditor } from "@/components/dashboard/availability-editor";
import { Portal } from "@/components/ui/portal";
import { ManualBooking } from "@/components/dashboard/manual-booking";
import { QuickBlockForm } from "@/components/dashboard/quick-block-form";
import { useRouter } from "next/navigation";
import { getLabels } from "@/lib/labels";
import { Tooltip } from "@/components/ui/tooltip";

export function AppointmentsClient({ 
  bookings, 
  blockedSlots, 
  services, 
  staff, 
  tenantId,
  userRole,
  tenant
}: any) {
  const router = useRouter();
  const labels = getLabels(tenant?.businessType);
  const [viewMode, setViewMode] = useState<"month" | "week" | "day" | "team" | "list">("week");
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [slotDuration, setSlotDuration] = useState<15 | 30 | 60>(60);
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showHoursModal, setShowHoursModal] = useState(false);
  
  // Custom Staff Dropdown State
  const [isStaffFilterOpen, setIsStaffFilterOpen] = useState(false);
  const staffDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close staff dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (staffDropdownRef.current && !staffDropdownRef.current.contains(event.target as Node)) {
        setIsStaffFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helper to get current date at venue
  const getVenueDate = () => {
    try {
      const tz = tenant?.timezone || "UTC";
      const str = new Date().toLocaleString("en-US", { timeZone: tz });
      return new Date(str);
    } catch (e) {
      return new Date();
    }
  };

  // Slot Action State
  const [selectedSlotInfo, setSelectedSlotInfo] = useState<{ date: Date, staffId?: string } | null>(null);
  const [actionType, setActionType] = useState<"book" | "block" | null>(null);

  // Initialize date on client only to avoid hydration mismatch
  useEffect(() => {
    setCurrentDate(getVenueDate());
  }, []);

  const handleSlotClick = (date: Date, staffId?: string) => {
    setSelectedSlotInfo({ date, staffId });
    setActionType(null); // Show selection first
  };

  const nextDate = () => {
    if (!currentDate) return;
    if (viewMode === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const prevDate = () => {
    if (!currentDate) return;
    if (viewMode === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const getHeaderText = () => {
    if (viewMode === "list") return `All ${labels.appointment}s`;
    if (!currentDate) return "";
    if (viewMode === "month") return format(currentDate, "MMMM yyyy");
    if (viewMode === "day" || viewMode === "team") return format(currentDate, "d MMMM yyyy");
    
    const start = startOfWeek(currentDate);
    const end = endOfWeek(currentDate);
    
    if (isSameMonth(start, end)) {
      return `${format(start, "d")} - ${format(end, "d MMMM yyyy")}`;
    }
    return `${format(start, "d MMM")} - ${format(end, "d MMM yyyy")}`;
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    setProcessingId(id);
    const result = await updateBookingStatus(id, status);
    if (result.success) {
      toast.success(`Booking ${status.toLowerCase()}`);
    } else {
      toast.error(result.error);
    }
    setProcessingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this booking?")) return;
    
    setProcessingId(id);
    const result = await deleteBooking(id);
    if (result.success) {
      toast.success("Booking deleted");
    } else {
      toast.error(result.error);
    }
    setProcessingId(null);
  };

  // Filter events based on selected staff
  const filteredEvents = useMemo(() => {
    let filteredBookings = bookings;
    let filteredBlocked = blockedSlots;

    if (userRole === "ADMIN" && staffFilter !== "all") {
      filteredBookings = bookings.filter((b: any) => b.staffId === staffFilter);
      filteredBlocked = blockedSlots.filter((s: any) => s.staffId === staffFilter);
    }

    return [
      ...(filteredBookings?.map((b: any) => ({
        id: b.id,
        title: `${b.customerName} - ${b.service.name}`,
        start: new Date(b.startTime),
        end: new Date(b.endTime),
        type: "booking" as const,
        resourceName: b.staff.name,
        status: b.status,
        color: b.service.color
      })) || []),
      ...(filteredBlocked?.map((s: any) => ({
        id: s.id,
        title: s.reason || "Blocked",
        start: new Date(s.startTime),
        end: new Date(s.endTime),
        type: "blocked" as const,
        resourceName: s.staff.name,
        leaveType: s.type
      })) || [])
    ];
  }, [bookings, blockedSlots, staffFilter, userRole]);

  if (!currentDate) return null;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-900/50";
      case "CONFIRMED": return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/50";
      case "COMPLETED": return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900/50";
      case "CANCELLED": return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50";
      default: return "bg-slate-100 text-slate-700 border-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
    }
  };

  const selectedStaffName = staffFilter === "all" ? "All Staff Members" : staff.find((s: any) => s.id === staffFilter)?.name;

  return (
    <div className="flex-1 flex flex-col transition-colors px-4 md:px-6 lg:px-8 pt-4 md:pt-5 pb-8">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-5 px-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Booking Calendar</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <ManualBooking 
            tenantId={tenantId} 
            services={services} 
            staff={staff} 
            businessType={tenant?.businessType}
          />
          
          {userRole === "ADMIN" && (
            <button 
              onClick={() => setShowHoursModal(true)}
              className="flex items-center gap-2 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 font-medium text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
            >
              <Clock className="h-4 w-4" />
              Manage Hours
            </button>
          )}

          {userRole === "ADMIN" && (
            <div className="relative" ref={staffDropdownRef}>
              <button 
                onClick={() => setIsStaffFilterOpen(!isStaffFilterOpen)}
                className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 rounded-2xl border-2 border-transparent focus:border-indigo-600 hover:border-indigo-100 dark:hover:border-indigo-900/30 transition-all group shadow-sm min-w-[180px]"
              >
                <Filter className={`h-4 w-4 ${isStaffFilterOpen ? 'text-indigo-600' : 'text-slate-400'} group-hover:text-indigo-500 transition-colors`} />
                <span className="text-xs font-medium text-slate-900 dark:text-slate-100 flex-1 text-left">
                  {selectedStaffName}
                </span>
                <ChevronLeft className={`h-3 w-3 text-slate-400 transition-transform ${isStaffFilterOpen ? 'rotate-90' : '-rotate-90'}`} />
              </button>

              {isStaffFilterOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 py-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 mb-1">
                    <p className="text-[10px] font-medium text-slate-900 dark:text-white uppercase tracking-widest opacity-40">Select Team Member</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto scrollbar-hide">
                    <button
                      onClick={() => { setStaffFilter("all"); setIsStaffFilterOpen(false); }}
                      className={`w-full px-4 py-3 text-left flex items-center justify-between group transition-colors ${staffFilter === "all" ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                          <Users className="h-4 w-4" />
                        </div>
                        <span className={`text-xs font-medium ${staffFilter === "all" ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>All Staff Members</span>
                      </div>
                      {staffFilter === "all" && <Check className="h-4 w-4 text-indigo-600" />}
                    </button>

                    {staff.map((s: any) => (
                      <button
                        key={s.id}
                        onClick={() => { setStaffFilter(s.id); setIsStaffFilterOpen(false); }}
                        className={`w-full px-4 py-3 text-left flex items-center justify-between group transition-colors ${staffFilter === s.id ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-xl flex items-center justify-center text-white text-[10px] font-medium" style={{ backgroundColor: s.color }}>
                            {s.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className={`text-xs font-medium ${staffFilter === s.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>{s.name}</span>
                        </div>
                        {staffFilter === s.id && <Check className="h-4 w-4 text-indigo-600" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Business Hours Modal */}
      {showHoursModal && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4">
            <div 
              onClick={() => setShowHoursModal(false)}
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse cursor-pointer" 
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Business Hours</h3>
                    <p className="text-xs text-slate-900 dark:text-white font-normal opacity-60">Master availability for your venue.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowHoursModal(false)}
                  className="h-10 w-10 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-8 max-h-[70vh] overflow-y-auto">
                <AvailabilityEditor 
                  initialAvailability={tenant?.businessHoursJson} 
                  isBusiness={true} 
                />
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Slot Action Modal */}
      {selectedSlotInfo && (
        <Portal>
           <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4">
            <div 
              onClick={() => setSelectedSlotInfo(null)}
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse cursor-pointer" 
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
               {actionType === null ? (
                 <div className="p-10 space-y-8 text-center">
                    <div className="space-y-2">
                       <h3 className="text-2xl font-black text-slate-900 dark:text-white">Schedule Action</h3>
                       <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                          {format(selectedSlotInfo.date, "EEEE, MMMM do")} at {format(selectedSlotInfo.date, "h:mm a")}
                       </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <Tooltip content={`Schedule a new ${labels.appointment}`} position="top">
                         <button 
                          onClick={() => setActionType("book")}
                          className="flex flex-col items-center gap-4 p-8 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:border-indigo-600 hover:bg-white dark:hover:bg-slate-800 transition-all group w-full"
                         >
                            <div className="h-16 w-16 rounded-3xl bg-indigo-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                               <labels.serviceIcon className="h-8 w-8" />
                            </div>
                            <span className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs">Add</span>
                         </button>
                       </Tooltip>

                       <Tooltip content="Block specific time on calendar" position="top">
                         <button 
                          onClick={() => setActionType("block")}
                          className="flex flex-col items-center gap-4 p-8 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:border-rose-600 hover:bg-white dark:hover:bg-slate-800 transition-all group w-full"
                         >
                            <div className="h-16 w-16 rounded-3xl bg-rose-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                               <Ban className="h-8 w-8" />
                            </div>
                            <span className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs">Block Time</span>
                         </button>
                       </Tooltip>
                    </div>

                    <button 
                      onClick={() => setSelectedSlotInfo(null)}
                      className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600"
                    >
                      Cancel
                    </button>
                 </div>
               ) : actionType === "book" ? (
                 <div className="flex flex-col">
                    <ManualBooking 
                      tenantId={tenantId}
                      services={services}
                      staff={staff}
                      mode="create"
                      initialData={{
                        startTime: selectedSlotInfo.date,
                        staffId: selectedSlotInfo.staffId,
                        staff: staff.find((s: any) => s.id === selectedSlotInfo.staffId)
                      }}
                      onClose={() => setSelectedSlotInfo(null)}
                      inline={true}
                      businessType={tenant?.businessType}
                    />
                 </div>
               ) : (
                 <div className="p-10 space-y-6">
                    <div className="flex items-center justify-between mb-2">
                       <h3 className="text-xl font-black text-slate-900 dark:text-white">Quick Block</h3>
                       <button onClick={() => setActionType(null)} className="text-xs font-bold text-indigo-600">Back</button>
                    </div>
                    <QuickBlockForm 
                      staffId={selectedSlotInfo.staffId || staff[0]?.id} 
                      existingBlocks={[]} 
                      initialData={{
                        startTime: selectedSlotInfo.date,
                        endTime: addDays(selectedSlotInfo.date, 0) // Just a placeholder, format handled in QuickBlockForm component update needed
                      }}
                      onSuccess={() => setSelectedSlotInfo(null)}
                      inline={true}
                    />
                 </div>
               )}
            </div>
           </div>
        </Portal>
      )}

      {/* Toolbar & Content Card */}
      <div className="flex-1 flex flex-col">
        {/* Navigation & View Control Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-3 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-3 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
              <Tooltip content="Previous Period" position="bottom">
                <button onClick={prevDate} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all active:scale-95 group border border-transparent hover:border-slate-200 dark:hover:border-slate-600">
                  <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                </button>
              </Tooltip>
              <Tooltip content="Jump to Today" position="bottom">
                <button 
                  onClick={() => setCurrentDate(new Date())} 
                  className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors border-x border-slate-200 dark:border-slate-700"
                >
                  Today
                </button>
              </Tooltip>
              <Tooltip content="Next Period" position="bottom">
                <button onClick={nextDate} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all active:scale-95 group border border-transparent hover:border-slate-200 dark:hover:border-slate-600">
                  <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                </button>
              </Tooltip>
            </div>
            
            {viewMode !== "list" && (
              <h3 className="text-base font-black text-slate-900 dark:text-white whitespace-nowrap px-2 tracking-tight">
                {getHeaderText()}
              </h3>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Granularity Selector */}
            {viewMode !== "month" && viewMode !== "list" && (
              <div className="flex items-center bg-white dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                {([15, 30, 60] as const).map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setSlotDuration(mins)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      slotDuration === mins
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            )}

            {/* View Switcher */}
            <div className="bg-white dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center">
              {(["month", "week", "day", "team", "list"] as const).map((mode) => (
                <button 
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    viewMode === mode 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none" 
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="flex-1 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
          {viewMode === "list" ? (
            <div className="flex-1 overflow-auto">
              {bookings.length === 0 ? (
                <div className="p-12 text-center">
                  <CalendarIcon className="h-12 w-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-200 font-medium">No {labels.appointmentLower}s found yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-50/50 dark:bg-slate-900/50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-900 dark:text-white uppercase tracking-wider">Date & Time</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-900 dark:text-white uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-900 dark:text-white uppercase tracking-wider">Service</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-900 dark:text-white uppercase tracking-wider">Staff</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-900 dark:text-white uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-slate-900 dark:text-white uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {bookings.map((booking: any) => {
                        if (userRole === "ADMIN" && staffFilter !== "all" && booking.staffId !== staffFilter) return null;
                        
                        return (
                          <tr key={booking.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-bold text-slate-900 dark:text-white">{format(new Date(booking.startTime), "MMM d, yyyy")}</div>
                              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                                <Clock className="h-3 w-3" /> {format(new Date(booking.startTime), "hh:mm a")}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-slate-900 dark:text-white">{booking.customerName}</div>
                              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                                <Mail className="h-3 w-3" /> {booking.customerEmail}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-900/50">
                                <div className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: booking.service.color }}></div>
                                {booking.service.name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                  <User className="h-3 w-3 text-slate-500 dark:text-slate-300" />
                                </div>
                                {booking.staff.name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider border ${getStatusStyle(booking.status)}`}>
                                {booking.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {(booking.status === "PENDING" || booking.status === "CONFIRMED") && (
                                  <>
                                    <button 
                                      onClick={() => handleStatusUpdate(booking.id, "COMPLETED")}
                                      disabled={processingId === booking.id}
                                      className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                    </button>
                                    <button 
                                      onClick={() => handleDelete(booking.id)}
                                      disabled={processingId === booking.id}
                                      className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <CalendarView 
              initialEvents={filteredEvents} 
              userRole={userRole} 
              staffList={staff} 
              businessHours={tenant?.businessHoursJson}
              timezone={tenant?.timezone || "UTC"}
              onSlotClick={handleSlotClick}
              currentDate={currentDate}
              view={viewMode as any}
              slotDuration={slotDuration}
              onDateChange={setCurrentDate}
              onViewChange={setViewMode as any}
              onSlotDurationChange={setSlotDuration}
            />
          )}
        </div>
      </div>
    </div>
  );
}
