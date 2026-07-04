"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { CalendarView } from "@/components/dashboard/calendar-view";
import { toggleSlotStatus } from "@/app/actions/schedule";
import { toast } from "sonner";
import { addMinutes, format } from "date-fns";
import { 
  Clock, 
  Users, 
  Calendar as CalendarIcon,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  Filter,
  Check,
  Save,
  Loader2
} from "lucide-react";
import { StructuredAvailabilityEditor } from "@/components/dashboard/structured-availability-editor";
import { Portal } from "@/components/ui/portal";
import { useRouter } from "next/navigation";
import { getInTimezone } from "@/lib/timezone-utils";

export function ScheduleClient({ staff, tenant, userRole }: any) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<any>("week");
  const [slotDuration, setSlotDuration] = useState<any>(60);
  const [staffFilter, setStaffFilter] = useState(staff[0]?.id || "");
  const [showHoursModal, setShowHoursModal] = useState(false);
  
  // Custom Staff Dropdown State
  const [isStaffFilterOpen, setIsStaffFilterOpen] = useState(false);
  const staffDropdownRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const [showScheduleViewModal, setShowScheduleViewModal] = useState(false);
  const [viewStart, setViewStart] = useState(() => {
    try {
      const parsed = typeof tenant.businessHoursJson === 'string' ? JSON.parse(tenant.businessHoursJson) : tenant.businessHoursJson;
      return parsed?.monday?.[0]?.start || "09:00";
    } catch {
      return "09:00";
    }
  });
  const [viewEnd, setViewEnd] = useState(() => {
    try {
      const parsed = typeof tenant.businessHoursJson === 'string' ? JSON.parse(tenant.businessHoursJson) : tenant.businessHoursJson;
      return parsed?.monday?.[0]?.end || "17:00";
    } catch {
      return "17:00";
    }
  });
  const [saveViewLoading, setSaveViewLoading] = useState(false);

  const handleSaveScheduleView = async () => {
    setSaveViewLoading(true);
    try {
      const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      const cleaned = Object.fromEntries(
        DAYS.map(day => [day, [{ start: viewStart, end: viewEnd }]])
      );
      const { updateBusinessHours } = await import("@/app/actions/dashboard");
      const result = await updateBusinessHours(cleaned);
      if (result.success) {
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

  // Ensure staffFilter is correctly initialized if staff list loads late
  useEffect(() => {
    if (staff.length > 0 && !staffFilter) {
      setStaffFilter(staff[0].id);
    }
  }, [staff, staffFilter]);

  const selectedStaffName = staff.find((s: any) => s.id === staffFilter)?.name || "Select Team Member";

  const events = useMemo(() => {
    const allEvents: any[] = [];
    const tz = tenant?.timezone || "UTC";

    // If in team view, we want to see everyone. Otherwise use staffFilter.
    const effectiveFilter = view === "team" ? "all" : staffFilter;

    staff.forEach((s: any) => {
      // If we are filtering by staff, only show their items
      if (effectiveFilter !== "all" && s.id !== effectiveFilter) return;
      
      s.blockedSlots.forEach((block: any) => {
        allEvents.push({
          id: block.id,
          title: block.reason || "Scheduled Off",
          start: getInTimezone(new Date(block.startTime), tz),
          end: getInTimezone(new Date(block.endTime), tz),
          type: "blocked",
          staffId: s.id,
          resourceName: s.name,
          color: s.color
        });
      });

      s.availabilityOverrides?.forEach((override: any) => {
        allEvents.push({
          id: override.id,
          title: override.reason || "One-off Shift",
          start: getInTimezone(new Date(override.startTime), tz),
          end: getInTimezone(new Date(override.endTime), tz),
          type: "availability-override",
          staffId: s.id,
          resourceName: s.name,
          color: s.color
        });
      });
    });
    return allEvents;
  }, [staff, staffFilter, view, tenant?.timezone]);

  const handleScheduleToggle = async (date: Date, type: 'block' | 'override' | 'remove-block' | 'remove-override', specificStaffId?: string) => {
    const targetStaffId = specificStaffId || (staffFilter && staffFilter !== "all" ? staffFilter : null);
    
    if (!targetStaffId) {
      toast.error("Please select a practitioner to make grid-based changes.");
      return;
    }

    const endTime = addMinutes(date, slotDuration);
    const localStartStr = format(date, "yyyy-MM-dd'T'HH:mm:ss");
    const localEndStr = format(endTime, "yyyy-MM-dd'T'HH:mm:ss");
    const result = await toggleSlotStatus({
      staffId: targetStaffId,
      startTime: localStartStr as any,
      endTime: localEndStr as any,
      type
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      const messages = {
        'block': "Time blocked for today",
        'override': "Time opened for today",
        'remove-block': "Block removed",
        'remove-override': "One-off shift removed"
      };
      toast.success(messages[type as keyof typeof messages] || "Schedule updated");
      router.refresh();
    }
  };

  return (
    <div className="flex-1 flex flex-col transition-colors px-4 md:px-6 lg:px-8 pt-4 md:pt-5 pb-8">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-5 px-4">
        <div>
          <h2 className="text-xl font-bold text-black dark:text-white tracking-tight">Schedule Calendar</h2>
        </div>
        
        <div className="flex items-center gap-3">
          {userRole === "ADMIN" && (
            <>
              <button 
                onClick={() => setShowScheduleViewModal(true)}
                className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-6 py-2.5 rounded-2xl font-bold text-xs hover:bg-indigo-100/50 transition-all border border-indigo-100 dark:border-indigo-900/50 active:scale-95 shadow-sm"
              >
                <Clock className="h-4 w-4" />
                Schedule View
              </button>

              <button 
                onClick={() => setShowHoursModal(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-2xl font-bold text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none active:scale-95"
              >
                <CalendarIcon className="h-4 w-4" />
                Create Schedule
              </button>
            </>
          )}

          {userRole !== "STAFF" && (
            <div className="relative" ref={staffDropdownRef}>
              <button 
                onClick={() => setIsStaffFilterOpen(!isStaffFilterOpen)}
                className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border-2 border-indigo-100/50 dark:border-indigo-900/50 focus:border-indigo-600 hover:border-indigo-300 dark:hover:border-slate-700 transition-all group shadow-sm min-w-[200px]"
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
                    {staff.map((s: any) => (
                      <button
                        key={s.id}
                        onClick={() => { setStaffFilter(s.id); setIsStaffFilterOpen(false); }}
                        className={`w-full px-4 py-3 text-left flex items-center justify-between group transition-colors ${staffFilter === s.id ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-xl flex items-center justify-center text-white text-[10px] font-medium" style={{ backgroundColor: s.color }}>
                            {s.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className={`text-xs font-medium ${staffFilter === s.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-black dark:text-white'}`}>{s.name}</span>
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

      {/* Toolbar & Calendar Grid */}
      <div className="flex-1 flex flex-col">
        {/* Navigation & View Control Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-3 bg-white dark:bg-slate-900 backdrop-blur-xl p-3 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
           <div className="flex items-center gap-4">
              <div className="flex items-center bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <button 
                  onClick={() => {
                    const next = view === 'week' ? addMinutes(currentDate, -10080) : addMinutes(currentDate, -1440);
                    setCurrentDate(next);
                  }}
                  className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
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
                  onClick={() => {
                    const next = view === 'week' ? addMinutes(currentDate, 10080) : addMinutes(currentDate, 1440);
                    setCurrentDate(next);
                  }}
                  className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all text-black dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <span className="text-base font-normal text-black dark:text-white whitespace-nowrap px-2 tracking-tight hidden sm:inline-block">
                {format(currentDate, "MMMM yyyy")}
              </span>
           </div>

           <div className="flex items-center bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
             <button 
              onClick={() => setView('day')} 
              className={`px-5 py-2 rounded-xl text-xs font-normal uppercase tracking-widest transition-all ${view === 'day' ? 'bg-indigo-600 text-white shadow-md dark:shadow-none' : 'text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
             >
              Day
             </button>
             <button 
              onClick={() => setView('week')} 
              className={`px-5 py-2 rounded-xl text-xs font-normal uppercase tracking-widest transition-all ${view === 'week' ? 'bg-indigo-600 text-white shadow-md dark:shadow-none' : 'text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
             >
              Week
             </button>
             {userRole !== "STAFF" && (
               <button 
                onClick={() => setView('team')} 
                className={`px-5 py-2 rounded-xl text-xs font-normal uppercase tracking-widest transition-all ${view === 'team' ? 'bg-indigo-600 text-white shadow-md dark:shadow-none' : 'text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
               >
                Team
               </button>
             )}
           </div>
        </div>

        {/* Calendar Container */}
        <div className={`${(view === 'team' || view === 'day') ? 'w-full' : 'flex-1'} bg-white dark:bg-slate-900 backdrop-blur-xl rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden`}>

        <CalendarView 
          initialEvents={events}
          userRole={userRole}
          staffList={staff}
          businessHours={tenant.businessHoursJson}
          currentDate={currentDate}
          view={view}
          slotDuration={slotDuration}
          onDateChange={setCurrentDate}
          onViewChange={setView}
          onSlotDurationChange={setSlotDuration}
          staffFilter={view === "team" ? "all" : staffFilter}
          mode="schedule"
          onScheduleToggle={handleScheduleToggle}
        />
      </div>
      </div>

      {/* Master Schedule Modal */}
      {showHoursModal && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse"
              onClick={() => setShowHoursModal(false)}
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-visible animate-in fade-in zoom-in duration-300">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-6 bg-indigo-50/50 dark:bg-slate-950/50 rounded-t-[2.5rem]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
                      <CalendarIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-black dark:text-white">Create Schedule</h3>
                      <p className="text-xs text-black dark:text-white font-normal opacity-60">Set recurring weekly opening and closing hours for the venue.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowHoursModal(false)}
                    className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
                  >
                    <X className="h-5 w-5 text-slate-400" />
                  </button>
                </div>
              </div>
              
              <div className="p-8 overflow-visible">
                <StructuredAvailabilityEditor 
                  staffList={staff}
                  tenant={tenant}
                  onSuccess={() => setShowHoursModal(false)}
                />
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Schedule View Modal */}
      {showScheduleViewModal && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse"
              onClick={() => setShowScheduleViewModal(false)}
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-indigo-50/50 dark:bg-slate-950/50">
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
                  className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all animate-none"
                >
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>
              
              <div className="p-8 space-y-6 bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Start Time</label>
                    <div className="relative group">
                      <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                      <input 
                        type="time" 
                        value={viewStart}
                        onChange={(e) => setViewStart(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border-2 border-indigo-50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 dark:text-slate-200 rounded-2xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition-all hover:border-indigo-100 dark:hover:border-slate-700 focus:border-indigo-600 shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">End Time</label>
                    <div className="relative group">
                      <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                      <input 
                        type="time" 
                        value={viewEnd}
                        onChange={(e) => setViewEnd(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border-2 border-indigo-50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 dark:text-slate-200 rounded-2xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition-all hover:border-indigo-100 dark:hover:border-slate-700 focus:border-indigo-600 shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    onClick={() => setShowScheduleViewModal(false)}
                    className="px-6 py-3 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveScheduleView}
                    disabled={saveViewLoading}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold text-xs hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-md shadow-indigo-100 dark:shadow-none active:scale-95"
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
