"use client";

import { useState, useMemo, useEffect } from "react";
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
  Plus
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

export function AppointmentsClient({ 
  bookings, 
  blockedSlots, 
  services, 
  staff, 
  tenantId,
  userRole,
  tenant
}: any) {
  const [viewMode, setViewMode] = useState<"month" | "week" | "day" | "team" | "list">("week");
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [slotDuration, setSlotDuration] = useState<15 | 30 | 60>(60);
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Initialize date on client only to avoid hydration mismatch
  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  const handleSlotClick = (date: Date, staffId?: string) => {
    toast.info("Slot clicked: " + format(date, "PPP p"));
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
    if (viewMode === "list") return "All Appointments";
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
      default: return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
    }
  };

  return (
    <div className="h-full flex flex-col transition-colors p-4 md:p-6 lg:p-8 overflow-y-auto">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Appointments</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mt-1">Manage your schedule and bookings</p>
        </div>
        
        <div className="flex items-center gap-3">
          {userRole === "ADMIN" && (
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <Filter className="h-4 w-4 text-slate-400" />
              <select 
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-700 dark:text-slate-200 focus:outline-none min-w-[140px] appearance-none cursor-pointer"
              >
                <option value="all">All Staff Members</option>
                {staff.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar & Content Card */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Navigation & View Control Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1 shadow-sm">
              <button onClick={prevDate} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-all active:scale-95 group">
                <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              </button>
              <button 
                onClick={() => setCurrentDate(new Date())} 
                className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors border-x border-slate-200 dark:border-slate-700"
              >
                Today
              </button>
              <button onClick={nextDate} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-all active:scale-95 group">
                <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              </button>
            </div>
            
            {viewMode !== "list" && (
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-50 whitespace-nowrap bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-xl text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/30">
                {getHeaderText()}
              </h3>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Granularity Selector */}
            {viewMode !== "month" && viewMode !== "list" && (
              <div className="flex items-center bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                {([15, 30, 60] as const).map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setSlotDuration(mins)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
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
            <div className="bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center">
              {(["month", "week", "day", "team", "list"] as const).map((mode) => (
                <button 
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    viewMode === mode 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none" 
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="flex-1 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-soft overflow-hidden flex flex-col min-h-[600px]">
          {viewMode === "list" ? (
            <div className="flex-1 overflow-auto">
              {bookings.length === 0 ? (
                <div className="p-12 text-center">
                  <CalendarIcon className="h-12 w-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-200 font-medium">No bookings found yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-50/50 dark:bg-slate-900/50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Date & Time</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Service</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Staff</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {bookings.map((booking: any) => {
                        if (userRole === "ADMIN" && staffFilter !== "all" && booking.staffId !== staffFilter) return null;
                        
                        return (
                          <tr key={booking.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-bold text-slate-900 dark:text-white">{format(new Date(booking.startTime), "MMM d, yyyy")}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-300 flex items-center gap-1 mt-1">
                                <Clock className="h-3 w-3" /> {format(new Date(booking.startTime), "hh:mm a")}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-slate-900 dark:text-white">{booking.customerName}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-300 flex items-center gap-1 mt-1">
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
