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
  Calendar,
  ChevronDown,
  Info,
  Save,
  Loader2,
  Building,
  Undo
} from "lucide-react";
import { CalendarView } from "@/components/dashboard/calendar-view";
import { updateBookingStatus, deleteBooking } from "@/app/actions/booking";
import { saveCalendarViewMode, saveCalendarSlotDuration } from "@/app/actions/schedule";
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

interface BookingsClientProps {
  bookings: SerializedBooking[];
  blockedSlots: BlockedSlotWithRelations[];
  availabilityOverrides: any[];
  services: SerializedService[];
  staff: Staff[];
  tenantId: string;
  userRole: UserRole;
  tenant: Tenant | null;
  defaultViewMode?: string;
  serverDateIso?: string;
  defaultSlotDuration?: number;
}

const startTimes = (() => {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (const m of ["00", "30"]) {
      const hourStr = h.toString().padStart(2, "0");
      const timeStr = `${hourStr}:${m}`;
      const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const displayHourStr = displayHour.toString().padStart(2, "0");
      const label = `${displayHourStr}:${m}${h === 0 && m === "00" ? " (Midnight)" : h === 12 && m === "00" ? " (Noon)" : ""}`;
      options.push({ value: timeStr, label });
    }
  }
  return options;
})();

const endTimes = (() => {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (const m of ["00", "30"]) {
      const hourStr = h.toString().padStart(2, "0");
      const timeStr = `${hourStr}:${m}`;
      const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const displayHourStr = displayHour.toString().padStart(2, "0");
      const label = `${displayHourStr}:${m}${h === 0 && m === "00" ? " (Midnight)" : h === 12 && m === "00" ? " (Noon)" : ""}`;
      options.push({ value: timeStr, label });
    }
  }
  return options;
})();

function formatBusinessHours(hoursJson: any, timeFormat: string = "12h") {
  if (!hoursJson) return [];
  let hours: any = hoursJson;
  if (typeof hours === "string") {
    try { hours = JSON.parse(hours); } catch { return []; }
  }
  if (!hours || typeof hours !== "object" || Array.isArray(hours)) return [];

  const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  
  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    if (timeStr === "24:00" || timeStr === "24:00:00") {
      return timeFormat === "24h" ? "00:00" : "12:00 AM";
    }
    const [hStr, mStr] = timeStr.split(":");
    const h = parseInt(hStr, 10);
    if (isNaN(h)) return timeStr;
    if (timeFormat === "24h") return timeStr;
    const displayHour = h === 0 || h === 24 ? 12 : h > 12 ? h - 12 : h;
    const displayHourStr = displayHour.toString().padStart(2, "0");
    const period = h >= 12 && h < 24 ? "PM" : "AM";
    return `${displayHourStr}:${mStr} ${period}`;
  };

  const dayLabels = {
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun"
  };

  const formattedDays: string[] = [];
  
  DAYS.forEach(day => {
    const val = hours[day] || hours[day.charAt(0).toUpperCase() + day.slice(1)];
    const shifts = Array.isArray(val) ? val : (val ? [val] : []);
    if (shifts.length === 0) {
      formattedDays.push(`${dayLabels[day as keyof typeof dayLabels]}: Closed`);
    } else {
      const shiftStrings = shifts.map((s: any) => {
        if (!s.start || !s.end) return "Closed";
        return `${formatTime(s.start)} - ${formatTime(s.end)}`;
      });
      formattedDays.push(`${dayLabels[day as keyof typeof dayLabels]}: ${shiftStrings.join(", ")}`);
    }
  });

  return formattedDays;
}

export function BookingsClient({ 
  bookings: initialBookings, 
  blockedSlots: initialBlockedSlots, 
  availabilityOverrides,
  services, 
  staff, 
  tenantId,
  userRole,
  tenant,
  defaultViewMode = "week",
  serverDateIso,
  defaultSlotDuration = 60
}: BookingsClientProps) {
  const router = useRouter();
  const labels = getLabels(tenant?.businessType);
  const [viewMode, setViewMode] = useState<"month" | "week" | "day" | "team" | "list">(defaultViewMode as any);

  // Save view mode to database whenever it changes
  useEffect(() => {
    if (viewMode && viewMode !== defaultViewMode) {
      saveCalendarViewMode(viewMode);
    }
  }, [viewMode, defaultViewMode]);

  const [currentDate, setCurrentDate] = useState<Date>(() => serverDateIso ? new Date(serverDateIso) : new Date());
  const [slotDuration, setSlotDuration] = useState<15 | 30 | 60>((defaultSlotDuration || 60) as any);

  // Save slot duration to database whenever it changes
  useEffect(() => {
    if (slotDuration && slotDuration !== defaultSlotDuration) {
      saveCalendarSlotDuration(slotDuration);
    }
  }, [slotDuration, defaultSlotDuration]);
  const [currentStaffFilter, setCurrentStaffFilter] = useState<string[]>(["all"]);
  const [isFilterLoaded, setIsFilterLoaded] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Pagination State for List View
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Custom Staff Dropdown State
  const [isStaffFilterOpen, setIsStaffFilterOpen] = useState(false);
  const staffDropdownRef = useRef<HTMLDivElement>(null);

  // Schedule view visible hours range
  const [showScheduleViewModal, setShowScheduleViewModal] = useState(false);
  const [viewStart, setViewStart] = useState(() => {
    try {
      const parsed = typeof tenant?.businessHoursJson === 'string' ? JSON.parse(tenant.businessHoursJson) : tenant?.businessHoursJson;
      return parsed?.scheduleView?.start || parsed?.monday?.[0]?.start || "09:00";
    } catch {
      return "09:00";
    }
  });
  const [viewEnd, setViewEnd] = useState(() => {
    try {
      const parsed = typeof tenant?.businessHoursJson === 'string' ? JSON.parse(tenant.businessHoursJson) : tenant?.businessHoursJson;
      const val = parsed?.scheduleView?.end || parsed?.monday?.[0]?.end || "17:00";
      return val === "00:00" ? "24:00" : val;
    } catch {
      return "17:00";
    }
  });
  const [tempViewStart, setTempViewStart] = useState(viewStart);
  const [tempViewEnd, setTempViewEnd] = useState(viewEnd);
  const [saveViewLoading, setSaveViewLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const formatOptionLabel = (timeVal: string) => {
    if (!timeVal) return "";
    let normalized = timeVal;
    if (timeVal.includes(":")) {
      const parts = timeVal.split(":");
      normalized = `${parts[0].padStart(2, "0")}:${parts[1]}`;
    }
    const is12h = tenant?.timeFormat === "12h" || !tenant?.timeFormat;
    const matched = startTimes.find(t => t.value === normalized) || endTimes.find(t => t.value === normalized);
    if (is12h) {
      return matched ? matched.label : normalized;
    }
    if (normalized === "24:00") return "00:00";
    return normalized;
  };

  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const startDropdownRef = useRef<HTMLDivElement>(null);
  const endDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const parsed = typeof tenant?.businessHoursJson === 'string' ? JSON.parse(tenant.businessHoursJson) : tenant?.businessHoursJson;
      const start = parsed?.scheduleView?.start || parsed?.monday?.[0]?.start || "09:00";
      const endVal = parsed?.scheduleView?.end || parsed?.monday?.[0]?.end || "17:00";
      setViewStart(start);
      setViewEnd(endVal === "00:00" ? "24:00" : endVal);
      setTempViewStart(start);
      setTempViewEnd(endVal === "00:00" ? "24:00" : endVal);
    } catch {
      setViewStart("09:00");
      setViewEnd("17:00");
      setTempViewStart("09:00");
      setTempViewEnd("17:00");
    }
  }, [tenant?.businessHoursJson]);

  useEffect(() => {
    if (showScheduleViewModal) {
      setTempViewStart(viewStart);
      setTempViewEnd(viewEnd);
      setErrorMsg(null);
    }
  }, [showScheduleViewModal, viewStart, viewEnd]);

  // Click outside to close staff/start/end dropdowns
  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (staffDropdownRef.current && !staffDropdownRef.current.contains(event.target as Node)) {
        setIsStaffFilterOpen(false);
      }
      if (startDropdownRef.current && !startDropdownRef.current.contains(event.target as Node)) {
        setIsStartOpen(false);
      }
      if (endDropdownRef.current && !endDropdownRef.current.contains(event.target as Node)) {
        setIsEndOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const handleSaveScheduleView = async () => {
    const startMins = (() => {
      const [h, m] = tempViewStart.split(":").map(Number);
      return h * 60 + m;
    })();
    const endMins = (() => {
      if (tempViewEnd === "24:00") return 1440;
      const [h, m] = tempViewEnd.split(":").map(Number);
      return h * 60 + m;
    })();

    if (endMins - startMins < 120) {
      setErrorMsg("Invalid range: Visible schedule view must span at least 2 hours.");
      return;
    }
    setErrorMsg(null);

    setSaveViewLoading(true);
    try {
      const parsed = typeof tenant?.businessHoursJson === 'string' ? JSON.parse(tenant.businessHoursJson) : (tenant?.businessHoursJson || {});
      const updated = {
        ...parsed,
        scheduleView: {
          start: tempViewStart,
          end: tempViewEnd === "24:00" ? "00:00" : tempViewEnd
        }
      };
      const { updateBusinessHours } = await import("@/app/actions/dashboard");
      const result = await updateBusinessHours(updated);
      if (result.success) {
        setViewStart(tempViewStart);
        setViewEnd(tempViewEnd);
        toast.success("Schedule view updated successfully!");
        setShowScheduleViewModal(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to save schedule view");
      }
    } catch (e) {
      toast.error("An unexpected error occurred");
    } finally {
      setSaveViewLoading(false);
    }
  };

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("lastSelectedStaffFilter");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const validIds = parsed.filter(id => id === "all" || id === "none" || staff.some(s => s.id === id));
          if (validIds.length > 0) {
            setCurrentStaffFilter(validIds);
          }
        }
      } catch (e) {
        // ignore parsing errors
      }
    }
    setIsFilterLoaded(true);
  }, [staff]);

  // Save to localStorage when changed
  useEffect(() => {
    if (isFilterLoaded) {
      localStorage.setItem("lastSelectedStaffFilter", JSON.stringify(currentStaffFilter));
    }
  }, [currentStaffFilter, isFilterLoaded]);

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

  // Lock body scroll when modal views are active
  useEffect(() => {
    if (showHoursModal || selectedSlotInfo || showScheduleViewModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showHoursModal, selectedSlotInfo, showScheduleViewModal]);

  const handleSlotClick = (date: Date, staffId?: string) => {
    setSelectedSlotInfo({ date, staffId });
    setActionType("book"); // Open manual booking directly
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
    if (userRole !== "ADMIN" || currentStaffFilter.includes("all") || currentStaffFilter.length === 0) return initialBookings;
    return initialBookings.filter((b) => currentStaffFilter.includes(b.staffId));
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

  // Filter events based on selected staff
  const filteredEvents = useMemo(() => {
    let filteredBookings = initialBookings;
    let filteredBlocked = initialBlockedSlots;
    let filteredOverrides = availabilityOverrides;

    const isFiltered = userRole === "ADMIN" && !currentStaffFilter.includes("all") && currentStaffFilter.length > 0;

    if (isFiltered) {
      filteredBookings = initialBookings.filter((b) => currentStaffFilter.includes(b.staffId));
      filteredBlocked = initialBlockedSlots.filter((s) => currentStaffFilter.includes(s.staffId));
      filteredOverrides = availabilityOverrides.filter((o) => currentStaffFilter.includes(o.staffId));
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
        color: b.service.color,
        serviceDuration: b.service.durationMinutes
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
        title: "Override",
        start: getInTimezone(new Date(o.startTime), tenant?.timezone || "UTC"),
        end: getInTimezone(new Date(o.endTime), tenant?.timezone || "UTC"),
        type: "availability-override" as const,
        staffId: o.staffId,
        resourceName: o.staff.name
      })) || [])
    ];
  }, [initialBookings, initialBlockedSlots, availabilityOverrides, currentStaffFilter, userRole, tenant?.timezone]);

  const scheduleView = useMemo(() => {
    try {
      if (!tenant?.businessHoursJson) return null;
      const parsed = typeof tenant.businessHoursJson === 'string' 
        ? JSON.parse(tenant.businessHoursJson) 
        : tenant.businessHoursJson as any;
      const start = parsed?.scheduleView?.start || parsed?.monday?.[0]?.start || "09:00";
      const endVal = parsed?.scheduleView?.end || parsed?.monday?.[0]?.end || "17:00";
      return {
        start,
        end: endVal === "00:00" ? "24:00" : endVal
      };
    } catch {
      return null;
    }
  }, [tenant?.businessHoursJson]);

  const getStatusStyle = (status: BookingStatus) => {
    switch (status) {
      case "PENDING": return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-900/50";
      case "CONFIRMED": return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/50";
      case "COMPLETED": return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900/50";
      case "CANCELLED": return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50";
      default: return "bg-slate-100 text-slate-700 border-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-800";
    }
  };

  const handleToggleAll = () => {
    setCurrentPage(1);
    const isAllSelected = currentStaffFilter.includes("all") || currentStaffFilter.length === 0;
    if (isAllSelected) {
      setCurrentStaffFilter(["none"]);
    } else {
      setCurrentStaffFilter(["all"]);
    }
  };

  const handleToggleStaff = (staffId: string) => {
    setCurrentPage(1);
    if (currentStaffFilter.includes("all") || currentStaffFilter.length === 0) {
      const nextFilter = staff.map(s => s.id).filter(id => id !== staffId);
      setCurrentStaffFilter(nextFilter.length === 0 ? ["none"] : nextFilter);
    } else if (currentStaffFilter.includes("none")) {
      setCurrentStaffFilter([staffId]);
    } else {
      if (currentStaffFilter.includes(staffId)) {
        const nextFilter = currentStaffFilter.filter(id => id !== staffId);
        setCurrentStaffFilter(nextFilter.length === 0 ? ["none"] : nextFilter);
      } else {
        const nextFilter = [...currentStaffFilter, staffId];
        setCurrentStaffFilter(nextFilter);
      }
    }
  };

  const selectedStaffName = currentStaffFilter.includes("all") || currentStaffFilter.length === 0
    ? "All Staff Members"
    : (currentStaffFilter.includes("none")
       ? "No Staff Selected"
       : (currentStaffFilter.length === 1
          ? (staff.find((s) => s.id === currentStaffFilter[0])?.name || "Select Staff")
          : `${currentStaffFilter.length} Staff Selected`));

  const timeDisplayFormat = tenant?.timeFormat === "24h" ? "HH:mm" : "hh:mm a";
  const listTimeFormat = tenant?.timeFormat === "24h" ? "HH:mm" : "hh:mm a";



  return (
    <div className="w-full flex flex-col transition-colors px-4 md:px-6 lg:px-8 pt-4 md:pt-5 pb-8">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-5 px-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-black dark:text-white tracking-tight">Booking Calendar</h2>
            {(() => {
              const formattedHours = formatBusinessHours(tenant?.businessHoursJson, tenant?.timeFormat || "12h");
              if (formattedHours.length === 0) return null;
              return (
                <div className="relative group cursor-pointer bg-slate-100/80 dark:bg-slate-800 px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 select-none border border-slate-200/50 dark:border-slate-700">
                  <Building className="h-3.5 w-3.5 text-indigo-500" />
                  <span className="group-hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Venue Hours</span>
                  <div className="absolute left-0 top-full pt-3 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="w-52 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl p-5 text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-3">Venue Hours</p>
                      <div className="space-y-2">
                        {formattedHours.map((fh, idx) => {
                          const [day, hoursText] = fh.split(": ");
                          return (
                            <div key={idx} className="flex justify-between text-[11px] font-bold">
                              <span className="text-slate-400">{day}</span>
                              <span className="text-slate-700 dark:text-slate-200 tabular-nums">{hoursText}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {userRole === "ADMIN" && (
            <button 
              onClick={() => setShowScheduleViewModal(true)}
              className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-6 py-2.5 rounded-2xl font-bold text-xs hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30 transition-all border border-indigo-100 dark:border-indigo-900/50 active:scale-95 shadow-sm cursor-pointer"
            >
              <Clock className="h-4 w-4" />
              Schedule View
            </button>
          )}

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
                      onClick={handleToggleAll}
                      className="w-full px-4 py-3 text-left flex items-center justify-between group transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                          <Users className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-medium text-black dark:text-white">All Staff Members</span>
                      </div>
                      <div className={`h-[18px] w-[18px] rounded-md border flex items-center justify-center transition-all ${
                        (currentStaffFilter.includes("all") || currentStaffFilter.length === 0)
                          ? 'bg-indigo-600 border-indigo-600 text-white' 
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 group-hover:border-indigo-400'
                      }`}>
                        {(currentStaffFilter.includes("all") || currentStaffFilter.length === 0) && <Check className="h-3 w-3 stroke-[3] text-white" />}
                      </div>
                    </button>

                    {staff.map((s) => {
                      const isSelected = currentStaffFilter.includes(s.id) || (!currentStaffFilter.includes("none") && (currentStaffFilter.includes("all") || currentStaffFilter.length === 0));
                      return (
                        <button
                          key={s.id}
                          onClick={() => handleToggleStaff(s.id)}
                          className="w-full px-4 py-3 text-left flex items-center justify-between group transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-xl flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: s.color }}>
                              {s.name.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-xs font-medium text-black dark:text-white">{s.name}</span>
                          </div>
                          <div className={`h-[18px] w-[18px] rounded-md border flex items-center justify-center transition-all ${
                            isSelected 
                              ? 'bg-indigo-600 border-indigo-600 text-white' 
                              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 group-hover:border-indigo-400'
                          }`}>
                            {isSelected && <Check className="h-3 w-3 stroke-[3] text-white" />}
                          </div>
                        </button>
                      );
                    })}
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
                         <button 
                          onClick={() => setActionType("book")}
                          className="flex flex-col items-center gap-4 p-8 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:border-indigo-600 hover:bg-white dark:hover:bg-slate-800 transition-all group w-full"
                         >
                            <div className="h-16 w-16 rounded-3xl bg-indigo-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                               <labels.serviceIcon className="h-8 w-8" />
                            </div>
                            <span className="font-black text-black dark:text-white uppercase tracking-widest text-xs">Add</span>
                         </button>

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
                      timeFormat={tenant?.timeFormat || "12h"}
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse" 
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="p-8 space-y-6 text-center">
                <div className="mx-auto h-16 w-16 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-600 dark:text-rose-450 animate-bounce">
                  <Trash2 className="h-8 w-8" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Delete Booking?</h3>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Are you sure you want to permanently delete this booking? This action cannot be undone.
                  </p>
                </div>

                <div className="flex gap-4 pt-2">
                  <button 
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={async () => {
                      const id = deleteConfirmId;
                      setDeleteConfirmId(null);
                      if (id) await handleDelete(id);
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Toolbar & Content Card */}
      <div className="w-full flex flex-col">
        {/* Navigation & View Control Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-3 bg-white dark:bg-slate-900 backdrop-blur-xl p-3 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 p-1.5 shadow-sm">
              <button 
                onClick={prevDate} 
                className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all active:scale-95 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setCurrentDate(new Date())} 
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-black dark:text-white hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all mx-1"
              >
                Today
              </button>
              <button 
                onClick={nextDate} 
                className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all active:scale-95 text-black dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
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
        <div className="w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
          {viewMode === "list" ? (
            <div className="w-full flex flex-col" id="bookings-table-top">
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
                          <th className="px-4 py-5 text-right text-[10px] font-normal text-black dark:text-white uppercase tracking-widest whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {currentListItems.map((booking) => (
                           <tr 
                             key={booking.id} 
                             onClick={() => router.push(`/${labels.appointmentSlug}/${booking.id}`)}
                             className="hover:bg-indigo-50/50 dark:hover:bg-slate-800/30 transition-all group cursor-pointer"
                           >
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
                              <span className={`px-3 py-1 rounded-full text-[10px] font-normal tracking-wider border ${getStatusStyle(booking.status === "CONFIRMED" ? "PENDING" : booking.status)}`}>
                                {booking.status === "CONFIRMED" ? "PENDING" : booking.status}
                              </span>
                            </td>
                            <td className="px-4 py-6 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-1 transition-all">
                                {(booking.status === "PENDING" || booking.status === "CONFIRMED" || booking.status === "COMPLETED" || booking.status === "CANCELLED") && (
                                  <>
                                    {/* Restore to Pending: CANCELLED or COMPLETED */}
                                    {(booking.status === "CANCELLED" || booking.status === "COMPLETED") && (
                                      <Tooltip content="Restore to Pending" position="bottom">
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleStatusUpdate(booking.id, "PENDING");
                                          }}
                                          disabled={processingId === booking.id}
                                          className="p-1.5 rounded-lg bg-transparent text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all border border-transparent active:scale-95 disabled:opacity-50 cursor-pointer"
                                        >
                                          <Undo className="h-4 w-4" />
                                        </button>
                                      </Tooltip>
                                    )}

                                    {/* Edit Booking: PENDING, CONFIRMED, COMPLETED */}
                                    {booking.status !== "CANCELLED" && (
                                      <Tooltip content="Edit Booking" position="bottom">
                                        <div onClick={(e) => e.stopPropagation()}>
                                          <ManualBooking 
                                            tenantId={tenant?.id || ""} 
                                            services={services} 
                                            staff={staff} 
                                            mode="edit"
                                            initialData={booking}
                                            businessType={tenant?.businessType}
                                            currency={tenant?.currency}
                                            timeFormat={tenant?.timeFormat || "12h"}
                                            timezone={tenant?.timezone || "UTC"}
                                            triggerIconOnly={true}
                                            triggerClassName="p-1.5 rounded-lg bg-transparent text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all border border-transparent active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center"
                                          />
                                        </div>
                                      </Tooltip>
                                    )}

                                    {/* Complete Booking: PENDING, CONFIRMED */}
                                    {booking.status !== "COMPLETED" && booking.status !== "CANCELLED" && (
                                      <Tooltip content="Complete Booking" position="bottom">
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleStatusUpdate(booking.id, "COMPLETED");
                                          }}
                                          disabled={processingId === booking.id}
                                          className="p-1.5 rounded-lg bg-transparent text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all border border-transparent active:scale-95 disabled:opacity-50 cursor-pointer"
                                        >
                                          <CheckCircle2 className="h-4 w-4" />
                                        </button>
                                      </Tooltip>
                                    )}

                                    {/* Cancel Booking: PENDING, CONFIRMED, COMPLETED */}
                                    {booking.status !== "CANCELLED" && (
                                      <Tooltip content="Cancel Booking" position="bottom">
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleStatusUpdate(booking.id, "CANCELLED");
                                          }}
                                          disabled={processingId === booking.id}
                                          className="p-1.5 rounded-lg bg-transparent text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 transition-all border border-transparent active:scale-95 disabled:opacity-50 cursor-pointer"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      </Tooltip>
                                    )}

                                    {/* Delete Booking: Always */}
                                    <Tooltip content="Delete" position="bottom">
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteConfirmId(booking.id);
                                        }}
                                        disabled={processingId === booking.id}
                                        className="p-1.5 rounded-lg bg-transparent text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all border border-transparent active:scale-95 disabled:opacity-50 cursor-pointer"
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
                    <div className="px-8 py-4 bg-indigo-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
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
                                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all active:scale-95 ${
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
              scheduleViewStart={viewStart}
              scheduleViewEnd={viewEnd}
              onEventClick={(event) => {
                if (event.type === 'booking') {
                  router.push(`/${labels.appointmentSlug}/${event.id}`);
                }
              }}
              onStatusUpdate={handleStatusUpdate}
            />
          )}
        </div>
      </div>

      {/* Schedule View Modal */}
      {showScheduleViewModal && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse animate-none"
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-visible animate-in fade-in zoom-in duration-300">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-indigo-50/50 dark:bg-slate-950/50 rounded-t-[2.5rem]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-black dark:text-white">Schedule View</h3>
                    <p className="text-xs text-black dark:text-white font-normal opacity-60">Sets the visible hours on all calendars.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowScheduleViewModal(false)}
                  className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all cursor-pointer animate-none"
                >
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>
              
              <div className="p-8 space-y-6 bg-white dark:bg-slate-900 rounded-b-[2.5rem]">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2" ref={startDropdownRef}>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Start Time</label>
                    <div className="relative group">
                      <button 
                        type="button"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const spaceBelow = window.innerHeight - rect.bottom;
                          setOpenUpward(spaceBelow < 250);
                          setIsStartOpen(!isStartOpen);
                        }}
                        className="w-full flex items-center justify-between pl-10 pr-8 py-3 text-xs font-bold border-2 border-indigo-50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 dark:text-slate-200 rounded-2xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition-all hover:border-indigo-100 dark:hover:border-slate-700 focus:border-indigo-600 shadow-sm text-left min-h-[46px] relative group cursor-pointer animate-none"
                      >
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors">
                          <Clock className="h-4 w-4" />
                        </div>
                        <span className="truncate w-full pr-2">
                          {formatOptionLabel(tempViewStart)}
                        </span>
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isStartOpen ? "rotate-180 text-indigo-500" : ""}`} />
                        </div>
                      </button>

                      {isStartOpen && (
                        <div className={`absolute left-0 w-full bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-2xl border-2 border-slate-100 dark:border-slate-800 z-[100] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden py-1 ${openUpward ? "bottom-full mb-2" : "mt-2"}`}>
                          <div className="max-h-60 overflow-y-auto pr-1 premium-scrollbar">
                            {startTimes.map((t) => (
                              <button
                                key={t.value}
                                type="button"
                                onClick={() => {
                                  setTempViewStart(t.value);
                                  setIsStartOpen(false);
                                }}
                                className={`w-full px-4 py-2.5 text-left text-xs font-bold transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer animate-none ${tempViewStart === t.value ? "bg-indigo-600 hover:bg-indigo-600 text-white dark:text-white" : "text-black dark:text-slate-200"}`}
                              >
                                {formatOptionLabel(t.value)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 space-y-2" ref={endDropdownRef}>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">End Time</label>
                    <div className="relative group">
                      <button 
                        type="button"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const spaceBelow = window.innerHeight - rect.bottom;
                          setOpenUpward(spaceBelow < 250);
                          setIsEndOpen(!isEndOpen);
                        }}
                        className="w-full flex items-center justify-between pl-10 pr-8 py-3 text-xs font-bold border-2 border-indigo-50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 dark:text-slate-200 rounded-2xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition-all hover:border-indigo-100 dark:hover:border-slate-700 focus:border-indigo-600 shadow-sm text-left min-h-[46px] relative group cursor-pointer animate-none"
                      >
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors">
                          <Clock className="h-4 w-4" />
                        </div>
                        <span className="truncate w-full pr-2">
                          {formatOptionLabel(tempViewEnd)}
                        </span>
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isEndOpen ? "rotate-180 text-indigo-500" : ""}`} />
                        </div>
                      </button>

                      {isEndOpen && (
                        <div className={`absolute left-0 w-full bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-2xl border-2 border-slate-100 dark:border-slate-800 z-[100] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden py-1 ${openUpward ? "bottom-full mb-2" : "mt-2"}`}>
                          <div className="max-h-60 overflow-y-auto pr-1 premium-scrollbar">
                            {endTimes.map((t) => (
                              <button
                                key={t.value}
                                type="button"
                                onClick={() => {
                                  setTempViewEnd(t.value);
                                  setIsEndOpen(false);
                                }}
                                className={`w-full px-4 py-2.5 text-left text-xs font-bold transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer animate-none ${tempViewEnd === t.value ? "bg-indigo-600 hover:bg-indigo-600 text-white dark:text-white" : "text-black dark:text-slate-200"}`}
                              >
                                {formatOptionLabel(t.value)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-2xl flex items-center gap-2 border border-rose-100 dark:border-rose-950/50 animate-fade-in animate-none">
                    <Info className="h-4 w-4 shrink-0 animate-pulse" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    onClick={() => setShowScheduleViewModal(false)}
                    className="px-6 py-3 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer animate-none"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveScheduleView}
                    disabled={saveViewLoading}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold text-xs hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-md shadow-indigo-100 dark:shadow-none active:scale-95 cursor-pointer animate-none"
                  >
                    {saveViewLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save View
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
