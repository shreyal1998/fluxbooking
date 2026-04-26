"use client";

import { useState, useMemo } from "react";
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
  XCircle,
  AlertCircle,
  MoreVertical,
  Pencil,
  Trash2,
  Users
} from "lucide-react";
import { CalendarView } from "@/components/dashboard/calendar-view";
import { ManualBooking } from "@/components/dashboard/manual-booking";
import { updateBookingStatus, deleteBooking } from "@/app/actions/booking";
import { toast } from "sonner";

export function AppointmentsClient({ 
  bookings, 
  blockedSlots, 
  services, 
  staff, 
  tenantId,
  userRole,
  tenant
}: any) {
  const [viewMode, setViewMode] = useState<"list" | "calendar" | "team">("calendar");
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingBooking, setEditingBooking] = useState<any>(null);

  // Time grid for calendar (08:00 to 22:00)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let i = 8; i <= 22; i++) {
      slots.push(`${i.toString().padStart(2, '0')}:00`);
    }
    return slots;
  }, []);

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
    if (!confirm("Are you sure you want to permanently delete this booking? This action cannot be undone.")) return;
    
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

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-900/50";
      case "CONFIRMED": return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/50";
      case "COMPLETED": return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900/50";
      case "CANCELLED": return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50";
      case "NOSHOW": return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
      default: return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
    }
  };

  return (
    <div className="space-y-8 animate-fade-in transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Appointments</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
            {userRole === "ADMIN" ? "Manage the entire team's schedule." : "Manage your personal bookings and schedule."}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Admin Staff Filter */}
          {userRole === "ADMIN" && (
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <Filter className="h-4 w-4 text-slate-400" />
              <select 
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">All Team Members</option>
                {staff.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center">
            <button 
              onClick={() => setViewMode("calendar")}
              className={`p-2 rounded-lg transition-all ${viewMode === 'calendar' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              title="Calendar View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setViewMode("team")}
              className={`p-2 rounded-lg transition-all ${viewMode === 'team' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              title="Team View"
            >
              <Users className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              title="List View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          
          <ManualBooking 
            tenantId={tenantId} 
            services={services} 
            staff={staff} 
          />
        </div>
      </div>

      {viewMode === "calendar" ? (
        <CalendarView 
          initialEvents={filteredEvents} 
          userRole={userRole} 
          staffList={staff} 
          businessHours={tenant?.businessHoursJson}
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-soft overflow-hidden transition-colors">
          {bookings.length === 0 ? (
            <div className="p-12 text-center">
              <CalendarIcon className="h-12 w-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">No bookings found yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date & Time</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Service</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Staff</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                  {bookings.map((booking: any) => {
                    if (userRole === "ADMIN" && staffFilter !== "all" && booking.staffId !== staffFilter) return null;
                    
                    return (
                      <tr key={booking.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-slate-900 dark:text-white">{format(new Date(booking.startTime), "MMM d, yyyy")}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" /> {format(new Date(booking.startTime), "hh:mm a")}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">{booking.customerName}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                            <Mail className="h-3 w-3" /> {booking.customerEmail}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50">
                             <div className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: booking.service.color }}></div>
                            {booking.service.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                              <User className="h-3 w-3 text-slate-500 dark:text-slate-400" />
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
                                    title="Mark as Completed"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </button>
                                  <button 
                                    onClick={() => setEditingBooking(booking)}
                                    className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                    title="Edit Booking"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDelete(booking.id)}
                                    disabled={processingId === booking.id}
                                    className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                    title="Delete Booking"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleStatusUpdate(booking.id, "NOSHOW")}
                                    disabled={processingId === booking.id}
                                    className="p-2 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-600 hover:text-white transition-all shadow-sm"
                                    title="Mark as No-Show"
                                  >
                                    <AlertCircle className="h-4 w-4" />
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
      )}

      {/* Edit Booking Modal */}
      {editingBooking && (
        <ManualBooking 
          tenantId={tenantId}
          services={services}
          staff={staff}
          mode="edit"
          initialData={editingBooking}
          onClose={() => setEditingBooking(null)}
        />
      )}
    </div>
  );
}
