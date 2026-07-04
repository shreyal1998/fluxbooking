"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { format } from "date-fns";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Mail, 
  Filter,
  CheckCircle2,
  Trash2,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
  Ban,
  Check,
  Calendar
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
import { Booking, Service, Staff, Tenant, UserRole, BlockedSlot, BookingStatus } from "@prisma/client";
import { getInTimezone, formatInTimezone } from "@/lib/timezone-utils";

type BookingWithRelations = Booking & {
  service: Service;
  staff: Staff;
};

type BlockedSlotWithRelations = BlockedSlot & {
  staff: Staff;
};

type SerializedService = Omit<Service, "price"> & { price: string };

type SerializedBooking = Omit<Booking, "service"> & {
  service: SerializedService;
  staff: Staff;
};

interface AppointmentsClientProps {
  bookings: SerializedBooking[];
  blockedSlots: BlockedSlotWithRelations[];
  availabilityOverrides: any[];
  services: SerializedService[];
  staff: Staff[];
  tenantId: string;
  userRole: UserRole;
  tenant: Tenant | null;
}

export function AppointmentsClient({ 
  bookings: initialBookings, 
  blockedSlots: initialBlockedSlots, 
  availabilityOverrides,
  services, 
  staff, 
  tenantId,
  userRole,
  tenant
}: AppointmentsClientProps) {
  const router = useRouter();
  const labels = getLabels(tenant?.businessType);
  const [viewMode, setViewMode] = useState<"month" | "week" | "day" | "team" | "list">("week");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [slotDuration, setSlotDuration] = useState<15 | 30 | 60>(60);
  const [currentStaffFilter, setCurrentStaffFilter] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showHoursModal, setShowHoursModal] = useState(false);

  // Pagination State for List View
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
  const getVenueDate = useCallback(() => {
    try {
      const tz = tenant?.timezone || "UTC";
      if (tz === "UTC") return new Date();
      const str = new Date().toLocaleString("en-US", { timeZone: tz });
      return new Date(str);
    } catch {
      return new Date();
    }
  }, [tenant]);

  // Slot Action State
  const [selectedSlotInfo, setSelectedSlotInfo] = useState<{ date: Date, staffId?: string } | null>(null);
  const [actionType, setActionType] = useState<"book" | "block" | null>(null);

  // Initialize date on client only to avoid hydration mismatch
  useEffect(() => {
    const venueDate = getVenueDate();
    setCurrentDate(venueDate);
  }, [getVenueDate]);

  const handleSlotClick = (date: Date, staffId?: string) => {
    setSelectedSlotInfo({ date, staffId });
    setActionType(null); // Show selection first
  };

  const nextDate = () => {
    setCurrentDate((prev) => {
      if (viewMode === "month") return addMonths(prev, 1);
      if (viewMode === "week") return addWeeks(prev, 1);
      return addDays(prev, 1);
    });
  };

  const prevDate = () => {
    setCurrentDate((prev) => {
      if (viewMode === "month") return subMonths(prev, 1);
      if (viewMode === "week") return subWeeks(prev, 1);
      return subDays(prev, 1);
    });
  };

  const getHeaderText = () => {
    if (viewMode === "list") return `All ${labels.appointment}s`;
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
      router.refresh();
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
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setProcessingId(null);
  };

  // Filtered Bookings for List View
  const listFilteredBookings = useMemo(() => {
    if (userRole !== "ADMIN" || currentStaffFilter === "all") return initialBookings;
    return initialBookings.filter((b) => b.staffId === currentStaffFilter);
  }, [initialBookings, currentStaffFilter, userRole]);

  // Pagination Calculations for List View
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentListItems = listFilteredBookings.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.max(1, Math.ceil(listFilteredBookings.length / itemsPerPage));

  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    const tableElement = document.getElementById("bookings-table-top");
    if (tableElement) {
      tableElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Filter events based on selected staff
  const filteredEvents = useMemo(() => {
    let filteredBookings = initialBookings;
    let filteredBlocked = initialBlockedSlots;
    let filteredOverrides = availabilityOverrides;

    if (userRole === "ADMIN" && currentStaffFilter !== "all") {
      filteredBookings = initialBookings.filter((b) => b.staffId === currentStaffFilter);
      filteredBlocked = initialBlockedSlots.filter((s) => s.staffId === currentStaffFilter);
      filteredOverrides = availabilityOverrides.filter((o) => o.staffId === currentStaffFilter);
    }

    return [
      ...(filteredBookings?.map((b) => ({
        id: b.id,
        title: `${b.customerName} - ${b.service.name}`,
        start: getInTimezone(new Date(b.startTime), tenant?.timezone || "UTC"),
        end: getInTimezone(new Date(b.endTime), tenant?.timezone || "UTC"),
        type: "booking" as const,
        staffId: b.staffId,
        resourceName: b.staff.name,
        status: b.status,
        color: b.service.color
      })) || []),
      ...(filteredBlocked?.map((s) => ({
        id: s.id,
        title: s.reason || "Blocked",
        start: getInTimezone(new Date(s.startTime), tenant?.timezone || "UTC"),
        end: getInTimezone(new Date(s.endTime), tenant?.timezone || "UTC"),
        type: "blocked" as const,
        staffId: s.staffId,
        resourceName: s.staff.name,
        leaveType: (s as any).type
      })) || []),
      ...(filteredOverrides?.map((o) => ({
        id: o.id,
        title: "One-off Shift",
        start: getInTimezone(new Date(o.startTime), tenant?.timezone || "UTC"),
        end: getInTimezone(new Date(o.endTime), tenant?.timezone || "UTC"),
        type: "availability-override" as const,
        staffId: o.staffId,
        resourceName: o.staff.name,
        color: "#6366f1"
      })) || [])
    ];
  }, [initialBookings, initialBlockedSlots, availabilityOverrides, currentStaffFilter, userRole, tenant?.timezone]);

  const getStatusStyle = (status: BookingStatus) => {
    switch (status) {
      case "PENDING": return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-900/50";
      case "CONFIRMED": return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/50";
      case "COMPLETED": return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900/50";
      case "CANCELLED": return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50";
      default: return "bg-slate-100 text-slate-700 border-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-800";
    }
  };

  const selectedStaffName = currentStaffFilter === "all" ? "All Staff Members" : staff.find((s) => s.id === currentStaffFilter)?.name;

  const timeDisplayFormat = tenant?.timeFormat === "24h" ? "HH:mm" : "h:mm a";
  const listTimeFormat = tenant?.timeFormat === "24h" ? "HH:mm" : "hh:mm a";

  return (
    <div className="flex-1 flex flex-col transition-colors px-4 md:px-6 lg:px-8 pt-4 md:pt-5 pb-8">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-5 px-4">
        <div>
          <h2 className="text-xl font-bold text-black dark:text-white tracking-tight">Booking Calendar</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <ManualBooking 
            tenantId={tenant?.id || ""} 
            services={services} 
            staff={staff} 
            businessType={tenant?.businessType}
            currency={tenant?.currency}
            timeFormat={tenant?.timeFormat || "12h"}
            timezone={tenant?.timezone || "UTC"}
          />

          {userRole === "ADMIN" && (
            <div className="relative" ref={staffDropdownRef}>
              <button 
                onClick={() => setIsStaffFilterOpen(!isStaffFilterOpen)}
                className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 focus:border-indigo-600 hover:border-indigo-300 dark:hover:border-slate-700 transition-all group shadow-sm min-w-[200px]"
              >
                <Filter className={`h-4 w-4 ${isStaffFilterOpen ? 'text-indigo-600' : 'text-slate-400'} group-hover:text-indigo-500 transition-colors`} />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex-1 text-left">
                  {selectedStaffName}
                </span>
                <ChevronLeft className={`h-3 w-3 text-slate-400 transition-transform ${isStaffFilterOpen ? 'rotate-90' : '-rotate-90'}`} />
              </button>

              {isStaffFilterOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-2xl border-2 border-slate-100 dark:border-slate-800 py-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-2 border-b-2 border-slate-100 dark:border-slate-800 mb-1">
                    <p className="text-[10px] font-medium text-black dark:text-white uppercase tracking-widest opacity-40">Select Team Member</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto scrollbar-hide">
                    <button
                      onClick={() => { setCurrentStaffFilter("all"); setCurrentPage(1); setIsStaffFilterOpen(false); }}
                      className={`w-full px-4 py-3 text-left flex items-center justify-between group transition-colors ${currentStaffFilter === "all" ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500">
                          <Users className="h-4 w-4" />
                        </div>
                        <span className={`text-xs font-medium ${currentStaffFilter === "all" ? 'text-indigo-600 dark:text-indigo-400' : 'text-black dark:text-white'}`}>All Staff Members</span>
                      </div>
                      {currentStaffFilter === "all" && <Check className="h-4 w-4 text-indigo-600" />}
                    </button>

                    {staff.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => { setCurrentStaffFilter(s.id); setCurrentPage(1); setIsStaffFilterOpen(false); }}
                        className={`w-full px-4 py-3 text-left flex items-center justify-between group transition-colors ${currentStaffFilter === s.id ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-xl flex items-center justify-center text-white text-[10px] font-medium" style={{ backgroundColor: s.color }}>
                            {s.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className={`text-xs font-medium ${currentStaffFilter === s.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-black dark:text-white'}`}>{s.name}</span>
                        </div>
                        {currentStaffFilter === s.id && <Check className="h-4 w-4 text-indigo-600" />}
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
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse" 
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-indigo-50/50 dark:bg-slate-950/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-black dark:text-white">Business Hours</h3>
                    <p className="text-xs text-black dark:text-white font-normal opacity-60">Master availability for your venue.</p>
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
                  initialAvailability={tenant?.businessHoursJson as any} 
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
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse" 
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
               {actionType === null ? (
                 <div className="p-10 space-y-8 text-center">
                    <div className="space-y-2">
                       <h3 className="text-2xl font-black text-black dark:text-white">Schedule Action</h3>
                       <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                          {format(selectedSlotInfo.date, "EEEE, MMMM do")} at {format(selectedSlotInfo.date, timeDisplayFormat)}
                       </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <Tooltip content={`Schedule a new ${labels.appointment}`} position="top">
                         <button 
                          onClick={() => setActionType("book")}
                          className="flex flex-col items-center gap-4 p-8 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:border-indigo-600 hover:bg-white dark:hover:bg-slate-800 transition-all group w-full"
                         >
                            <div className="h-16 w-16 rounded-3xl bg-indigo-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                               <labels.serviceIcon className="h-8 w-8" />
                            </div>
                            <span className="font-black text-black dark:text-white uppercase tracking-widest text-xs">Add</span>
                         </button>
                       </Tooltip>

                       <Tooltip content="Block specific time on calendar" position="top">
                         <button 
                          onClick={() => setActionType("block")}
                          className="flex flex-col items-center gap-4 p-8 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:border-rose-600 hover:bg-white dark:hover:bg-slate-800 transition-all group w-full"
                         >
                            <div className="h-16 w-16 rounded-3xl bg-rose-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                               <Ban className="h-8 w-8" />
                            </div>
                            <span className="font-black text-black dark:text-white uppercase tracking-widest text-xs">Block Time</span>
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
                        staff: staff.find((s) => s.id === selectedSlotInfo.staffId)
                      }}
                      onClose={() => setSelectedSlotInfo(null)}
                      inline={true}
                      businessType={tenant?.businessType}
                      currency={tenant?.currency || "USD"}
                      timezone={tenant?.timezone || "UTC"}
                    />
                 </div>
               ) : (
                 <div className="p-10 space-y-6">
                    <div className="flex items-center justify-between mb-2">
                       <h3 className="text-xl font-black text-black dark:text-white">Quick Block</h3>
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
                      timeFormat={tenant?.timeFormat || "12h"}
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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-3 bg-white dark:bg-slate-900 backdrop-blur-xl p-3 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 p-1.5 shadow-sm">
              <Tooltip content="Previous Period" position="bottom">
                <button 
                  onClick={prevDate} 
                  className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all active:scale-95 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </Tooltip>
              <Tooltip content="Jump to Today" position="bottom">
                <button 
                  onClick={() => setCurrentDate(new Date())} 
                  className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-black dark:text-white hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all mx-1"
                >
                  Today
                </button>
              </Tooltip>
              <Tooltip content="Next Period" position="bottom">
                <button 
                  onClick={nextDate} 
                  className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all active:scale-95 text-black dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </Tooltip>
            </div>
            
            {viewMode !== "list" && (
              <h3 className="text-base font-normal text-black dark:text-white whitespace-nowrap px-2 tracking-tight">
                {getHeaderText()}
              </h3>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Granularity Selector */}
            {viewMode !== "month" && viewMode !== "list" && (
              <div className="flex items-center bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                {([15, 30, 60] as const).map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setSlotDuration(mins)}
                    className={`px-4 py-2 rounded-xl text-xs font-normal uppercase tracking-widest transition-all ${
                      slotDuration === mins
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none"
                        : "text-black dark:text-white"
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            )}

            {/* View Switcher */}
            <div className="bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center">
              {(["month", "week", "day", "team", "list"] as const).map((mode) => (
                <button 
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-5 py-2 rounded-xl text-xs font-normal uppercase tracking-widest transition-all ${
                    viewMode === mode 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none" 
                      : "text-black dark:text-white"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="flex-1 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
          {viewMode === "list" ? (
            <div className="flex-1 flex flex-col overflow-hidden" id="bookings-table-top">
              {listFilteredBookings.length === 0 ? (
                <div className="flex-1 p-24 flex flex-col items-center justify-center text-center">
                  <div className="h-20 w-20 rounded-[2rem] bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-6">
                    <CalendarIcon className="h-10 w-10 text-slate-200 dark:text-slate-700" />
                  </div>
                  <p className="text-black dark:text-white font-bold text-lg">No {labels.appointmentLower}s found</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mt-2 font-medium">Try adjusting your filters or schedule a new {labels.appointmentLower}.</p>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                      <thead>
                        <tr className="bg-indigo-50/50 dark:bg-slate-900/50">
                          <th className="px-10 py-5 text-left text-[10px] font-normal text-black dark:text-white uppercase tracking-widest whitespace-nowrap">Date & Time</th>
                          <th className="px-10 py-5 text-left text-[10px] font-normal text-black dark:text-white uppercase tracking-widest whitespace-nowrap">Customer</th>
                          <th className="px-10 py-5 text-left text-[10px] font-normal text-black dark:text-white uppercase tracking-widest whitespace-nowrap">{labels.service}</th>
                          <th className="px-10 py-5 text-left text-[10px] font-normal text-black dark:text-white uppercase tracking-widest whitespace-nowrap">{labels.staff}</th>
                          <th className="px-10 py-5 text-left text-[10px] font-normal text-black dark:text-white uppercase tracking-widest whitespace-nowrap">Status</th>
                          <th className="px-10 py-5 text-right text-[10px] font-normal text-black dark:text-white uppercase tracking-widest whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {currentListItems.map((booking) => (
                          <tr key={booking.id} className="hover:bg-indigo-50/50 dark:hover:bg-slate-800/30 transition-all group">
                            <td className="px-10 py-6 whitespace-nowrap">
                              <div className="text-sm font-normal text-black dark:text-white">{formatInTimezone(new Date(booking.startTime), tenant?.timezone || "UTC", "MMM d, yyyy")}</div>
                              <div className="text-[10px] font-normal text-black dark:text-white uppercase tracking-tight flex items-center gap-1.5 mt-1">
                                <Clock className="h-3.5 w-3.5 text-indigo-500/50" /> {formatInTimezone(new Date(booking.startTime), tenant?.timezone || "UTC", listTimeFormat)}
                              </div>
                            </td>
                            <td className="px-10 py-6 whitespace-nowrap">
                              <div className="text-sm font-normal text-black dark:text-white">{booking.customerName}</div>
                              <div className="text-[10px] font-normal text-black dark:text-white uppercase tracking-tight flex items-center gap-1.5 mt-1">
                                <Mail className="h-3.5 w-3.5 text-indigo-500/50" /> {booking.customerEmail}
                              </div>
                            </td>
                            <td className="px-10 py-6 whitespace-nowrap">
                              <div className="inline-flex items-center px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-[9px] font-normal uppercase text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50">
                                <div className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: booking.service.color }}></div>
                                {booking.service.name}
                              </div>
                            </td>
                            <td className="px-10 py-6 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="h-8 w-8 rounded-xl flex items-center justify-center text-[10px] font-normal text-white"
                                  style={{ backgroundColor: booking.staff.color }}
                                >
                                  {booking.staff.name.substring(0, 2).toUpperCase()}
                                </div>
                                <span className="text-[11px] font-normal text-black dark:text-white uppercase tracking-tight">{booking.staff.name}</span>
                              </div>
                            </td>
                            <td className="px-10 py-6 whitespace-nowrap">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-normal tracking-wider border ${getStatusStyle(booking.status)}`}>
                                {booking.status}
                              </span>
                            </td>
                            <td className="px-10 py-6 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2 transition-all">
                                {(booking.status === "PENDING" || booking.status === "CONFIRMED") && (
                                  <>
                                    <Tooltip content="Complete Booking" position="bottom">
                                      <button 
                                        onClick={() => handleStatusUpdate(booking.id, "COMPLETED")}
                                        disabled={processingId === booking.id}
                                        className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100"
                                      >
                                        <CheckCircle2 className="h-4 w-4" />
                                      </button>
                                    </Tooltip>
                                    <Tooltip content="Delete Booking" position="bottom">
                                      <button 
                                        onClick={() => handleDelete(booking.id)}
                                        disabled={processingId === booking.id}
                                        className="p-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-100"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </Tooltip>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Integrated Pagination Footer */}
                  {listFilteredBookings.length > itemsPerPage && (
                    <div className="px-10 py-8 bg-indigo-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <p className="text-[10px] font-normal text-slate-400 uppercase tracking-widest">
                        Showing <span className="text-black dark:text-white">{indexOfFirstItem + 1}</span> to <span className="text-black dark:text-white">{Math.min(indexOfLastItem, listFilteredBookings.length)}</span> of <span className="text-black dark:text-white">{listFilteredBookings.length}</span> {labels.appointmentLower}s
                      </p>
                      
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => paginate(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>

                        <div className="flex items-center gap-2 px-4">
                          <span className="text-[10px] font-normal text-black dark:text-white uppercase tracking-tighter">PAGE {currentPage}</span>
                          <span className="text-[10px] font-normal text-slate-400">/ {totalPages}</span>
                        </div>

                        <button
                          onClick={() => paginate(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <CalendarView 
              initialEvents={filteredEvents} 
              userRole={userRole} 
              staffList={staff as any} 
              businessHours={tenant?.businessHoursJson as any}
              timezone={tenant?.timezone || "UTC"}
              timeFormat={tenant?.timeFormat || "12h"}
              onSlotClick={handleSlotClick}
              currentDate={currentDate}
              view={viewMode as any}
              slotDuration={slotDuration}
              onDateChange={setCurrentDate}
              onViewChange={setViewMode as any}
              onSlotDurationChange={setSlotDuration}
              staffFilter={currentStaffFilter}
            />
          )}
        </div>
      </div>
    </div>
  );
}
