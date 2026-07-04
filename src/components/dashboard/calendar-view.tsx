"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  parse,
  startOfDay,
  addMinutes,
  getDay,
  getWeek,
  isWithinInterval,
  isBefore,
  isAfter
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  Plus,
  Minus,
  Hand,
  Lock,
  AlertTriangle
} from "lucide-react";
import { rescheduleBooking } from "@/app/actions/booking";
import { toast } from "sonner";
import { getInTimezone, formatInTimezone } from "@/lib/timezone-utils";

type ViewType = "month" | "week" | "day" | "team";

interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: "booking" | "blocked" | "availability-override";
  leaveType?: string;
  color?: string;
  resourceName?: string;
  staffId?: string;
  status?: string;
}

interface DaySchedule {
  start: string;
  end: string;
}

interface BusinessHours {
  [key: string]: DaySchedule | null | undefined;
}

interface Staff {
  id: string;
  name: string;
  color: string;
  availabilityJson: BusinessHours | string | null;
}

export function CalendarView({
  initialEvents,
  userRole,
  staffList,
  businessHours,
  timezone = "UTC",
  timeFormat = "12h",
  onSlotClick,
  currentDate,
  view,
  slotDuration = 60,
  onDateChange,
  onViewChange,
  onSlotDurationChange,
  staffFilter = "all",
  mode = "booking",
  onScheduleToggle
}: {
  initialEvents: Event[],
  userRole: string,
  staffList: Staff[],
  businessHours?: BusinessHours | string,
  timezone?: string,
  timeFormat?: string,
  onSlotClick?: (date: Date, staffId?: string) => void,
  currentDate: Date,
  view: ViewType,
  slotDuration?: 15 | 30 | 60,
  onDateChange: (date: Date) => void,
  onViewChange: (view: ViewType) => void,
  onSlotDurationChange?: (duration: 15 | 30 | 60) => void,
  staffFilter?: string,
  mode?: "booking" | "schedule",
  onScheduleToggle?: (date: Date, type: 'block' | 'override' | 'remove-block' | 'remove-override', staffId?: string) => void
}) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  const timeDisplayFormat = timeFormat === "24h" ? "HH:mm" : "h:mm a";

  // Sync state when props change
  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  const slotHeight = slotDuration === 15 ? 40 : slotDuration === 30 ? 60 : 80;
  const pixelsPerMinute = slotHeight / slotDuration;

  const getVenueTime = useCallback(() => {
    try {
        if (!timezone || timezone === "UTC") return new Date();
        const str = new Date().toLocaleString("en-US", { timeZone: timezone });
        return new Date(str);
    } catch (e) {
        return new Date();
    }
  }, [timezone]);

  useEffect(() => {
    setNow(getVenueTime());
    const timer = setInterval(() => setNow(getVenueTime()), 60000);
    return () => clearInterval(timer);
  }, [getVenueTime]);

  // Convert HH:mm to minutes from midnight
  const timeToMinutes = (timeStr: string) => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.split(':');
    if (parts.length < 2) return 0;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    return (isNaN(hours) ? 0 : hours) * 60 + (isNaN(minutes) ? 0 : minutes);
  };

  // Robust Data Parser
  const parseAvailability = useCallback((data: any) => {
    if (!data) return null;
    let parsed = data;
    for (let i = 0; i < 3; i++) {
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch { break; }
      } else { break; }
    }
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.keys(parsed).length > 0 ? parsed : null;
    }
    return null;
  }, []);

  // Unified Availability Check
  const checkIsClosed = useCallback((date: Date, specificStaffId?: string) => {
    const targetStaffId = specificStaffId || (staffFilter !== "all" ? staffFilter : null);
    const currentMinutes = date.getHours() * 60 + date.getMinutes();

    const isExplicitlyBlocked = events.some(e => {
      if (e.type !== "blocked") return false;
      const isDateMatch = isSameDay(date, e.start);
      if (!isDateMatch) return false;
      const eStartMin = e.start.getHours() * 60 + e.start.getMinutes();
      const eEndMin = e.end.getHours() * 60 + e.end.getMinutes();
      const isTimeMatch = currentMinutes >= eStartMin && currentMinutes < eEndMin;
      const isStaffMatch = !targetStaffId || e.staffId === targetStaffId;
      return isTimeMatch && isStaffMatch;
    });

    if (isExplicitlyBlocked) return true;

    // 1. Check if there is an explicit availability override for this slot
    const hasOverride = events.some(e => {
      if ((e.type as any) !== "availability-override") return false;
      const isDateMatch = isSameDay(date, e.start);
      if (!isDateMatch) return false;
      const eStartMin = e.start.getHours() * 60 + e.start.getMinutes();
      const eEndMin = e.end.getHours() * 60 + e.end.getMinutes();
      const isTimeMatch = currentMinutes >= eStartMin && currentMinutes < eEndMin;
      const isStaffMatch = !targetStaffId || e.staffId === targetStaffId;
      return isTimeMatch && isStaffMatch;
    });

    if (hasOverride) return false; // Force open if override exists

    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayName = dayNames[getDay(date)];
    
    const bizHours = parseAvailability(businessHours);
    if (bizHours) {
      const val = bizHours[dayName] || bizHours[dayName.charAt(0).toUpperCase() + dayName.slice(1)];
      const isDayDefined = bizHours.hasOwnProperty(dayName) || bizHours.hasOwnProperty(dayName.charAt(0).toUpperCase() + dayName.slice(1));
      
      if (isDayDefined) {
        if (!val) return true;
        const shifts = Array.isArray(val) ? val : [val];
        if (shifts.length === 0) return true;

        const isOpen = shifts.some((shift: any) => {
          if (!shift.start || !shift.end) return false;
          const bizStart = timeToMinutes(shift.start);
          const bizEnd = shift.end === "00:00" ? 1440 : timeToMinutes(shift.end);
          return currentMinutes >= bizStart && currentMinutes < bizEnd;
        });

        if (!isOpen) return true;
      }
    }

    if (targetStaffId) {
      const staff = staffList.find(s => s.id === targetStaffId);
      const staffHours = staff ? parseAvailability(staff.availabilityJson) : null;
      if (!staffHours) return true;

      const val = staffHours[dayName] || staffHours[dayName.charAt(0).toUpperCase() + dayName.slice(1)];
      const isStaffDayDefined = staffHours.hasOwnProperty(dayName) || staffHours.hasOwnProperty(dayName.charAt(0).toUpperCase() + dayName.slice(1));
      
      if (!isStaffDayDefined || !val) return true;
      
      const shifts = Array.isArray(val) ? val : [val];
      if (shifts.length === 0) return true;

      const isStaffOpen = shifts.some((shift: any) => {
        if (!shift.start || !shift.end) return false;
        const staffStart = timeToMinutes(shift.start);
        const staffEnd = shift.end === "00:00" ? 1440 : timeToMinutes(shift.end);
        return currentMinutes >= staffStart && currentMinutes < staffEnd;
      });

      if (!isStaffOpen) return true;
    }
    return false;
  }, [businessHours, staffFilter, staffList, parseAvailability, events]);

  // Calculate the display range based on business hours
  const displayRange = useMemo(() => {
    const bizHours = parseAvailability(businessHours);
    if (!bizHours) return { start: 0, end: 1440 };

    let minMinutes = 1440;
    let maxMinutes = 0;

    Object.values(bizHours).forEach((val: any) => {
      if (!val) return;
      const shifts = Array.isArray(val) ? val : [val];
      shifts.forEach((shift: any) => {
        if (shift && shift.start && shift.end) {
          const start = timeToMinutes(shift.start);
          const end = shift.end === "00:00" ? 1440 : timeToMinutes(shift.end);
          if (start < minMinutes) minMinutes = start;
          if (end > maxMinutes) maxMinutes = end;
        }
      });
    });

    // Fallback if no hours are defined
    if (maxMinutes <= minMinutes) return { start: 480, end: 1200 }; // 8 AM to 8 PM

    // EXACT HOURS - NO PADDING
    const finalStart = Math.max(0, minMinutes);
    const finalEnd = Math.min(1440, maxMinutes);

    return { start: finalStart, end: finalEnd };
  }, [businessHours, parseAvailability]);

  const getVisibleSlots = useCallback((refDate: Date) => {
    const startMinutes = displayRange.start;
    const endMinutes = displayRange.end;
    const slots = [];
    
    for (let m = startMinutes; m < endMinutes; m += slotDuration) {
      const currentSlotTime = parse(`${Math.floor(m / 60)}:${m % 60}`, "H:m", refDate);
      slots.push({
        time: currentSlotTime,
        minutes: m
      });
    }
    return slots;
  }, [displayRange, slotDuration]);

  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    const eventToMove = events.find(ev => ev.id === eventId);
    if (!eventToMove || eventToMove.type === "blocked") { e.preventDefault(); return; }
    setDraggedEventId(eventId);
    e.dataTransfer.setData("text/plain", eventId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => setDraggedEventId(null);
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };

  const handleDrop = async (e: React.DragEvent, dropDate: Date, dropStaffId?: string) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData("text/plain");
    if (!eventId) return;
    const eventToMove = events.find(ev => ev.id === eventId);
    if (!eventToMove || eventToMove.type === "blocked") return;
    const originalEvents = [...events];
    const duration = eventToMove.end.getTime() - eventToMove.start.getTime();
    const newEnd = new Date(dropDate.getTime() + duration);
    let newResourceName = eventToMove.resourceName;
    if (dropStaffId) {
      const staff = staffList.find(s => s.id === dropStaffId);
      if (staff) newResourceName = staff.name;
    }
    setEvents(events.map(ev => ev.id === eventId ? { ...ev, start: dropDate, end: newEnd, resourceName: newResourceName } : ev));
    toast.info("Rescheduling...");
    const result = await rescheduleBooking(eventId, dropDate, dropStaffId);
    if (result.error) { setEvents(originalEvents); toast.error(result.error); }
    else { toast.success("Rescheduled"); }
  };

  const getEventStyle = (event: Event) => {
    const hasConflict = events.some(other =>
      other.id !== event.id && other.type !== event.type &&
      event.start < other.end && event.end > other.start
    );
    const baseClass = hasConflict ? "conflict-pulse " : "";
    
    if (event.type === "blocked") {
      return baseClass + "bg-zebra bg-slate-100 dark:bg-slate-900/50 text-transparent border-slate-300 dark:border-slate-600 shadow-none";
    }

    if (event.type === "availability-override") {
      return {
        className: baseClass + "bg-white dark:bg-slate-900 text-transparent border-none shadow-none",
        style: {}
      };
    }

    return {
      className: baseClass + "bg-white dark:bg-slate-800 text-black dark:text-white border-slate-300 dark:border-slate-600 shadow-sm border-l-4",
      style: { borderLeftColor: event.color || "#6366f1" }
    };
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-300 dark:border-slate-600">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="py-4 text-center text-[10px] font-bold text-black dark:text-white uppercase tracking-widest bg-slate-100/80 dark:bg-slate-900/80 border-r border-slate-300 dark:border-slate-600 last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 flex-1 overflow-y-auto auto-rows-[120px]">
          {calendarDays.map((day, idx) => {
            const dayEvents = events.filter(e => isSameDay(e.start, day));
            return (
              <div
                key={idx}
                className={`p-3 relative transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50 ${
                  (idx + 1) % 7 === 0 ? "" : "border-r border-slate-300 dark:border-slate-600"
                } ${
                  idx >= calendarDays.length - 7 ? "" : "border-b border-slate-300 dark:border-slate-600"
                } ${
                  !isSameMonth(day, monthStart) ? "bg-slate-50/30 dark:bg-slate-950/30 opacity-40" : ""      
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-normal ${
                    now && isSameDay(day, now)
                      ? "h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none"
                      : "text-black dark:text-white"
                  }`}>
                    {format(day, "d")}
                  </span>
                </div>
                <div className="space-y-1 overflow-hidden">
                  {dayEvents.slice(0, 3).map((event) => {
                    const styleData = getEventStyle(event);
                    return (
                      <div
                        key={event.id}
                        className={`text-[10px] px-2 py-1 rounded-lg border truncate font-normal ${typeof styleData === 'string' ? styleData : styleData.className}`}
                        style={typeof styleData === 'object' ? styleData.style : {}}
                      >
                        {format(event.start, timeDisplayFormat)} {event.title}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const isPast = useCallback((date: Date, durationMinutes: number = 0) => {
    if (!now) return false;
    const checkTime = durationMinutes > 0 ? addMinutes(date, durationMinutes) : date;
    return isBefore(checkTime, now);
  }, [now]);

  const renderDayView = () => {
    const dayEvents = events.filter(e => isSameDay(e.start, currentDate));
    const refDate = startOfDay(currentDate);
    const visibleSlots = getVisibleSlots(refDate);
    const nowTop = now ? (now.getHours() * 60 + now.getMinutes()) * pixelsPerMinute : 0;

    return (
      <div className="relative bg-white dark:bg-slate-950">
        <div className="relative p-0 overflow-hidden" style={{ minHeight: `${(displayRange.end - displayRange.start) * pixelsPerMinute}px` }}>
           {now && isSameDay(currentDate, now) && now.getHours() * 60 + now.getMinutes() >= displayRange.start && now.getHours() * 60 + now.getMinutes() <= displayRange.end && (
             <div className="absolute left-0 right-0 z-30 flex items-center pointer-events-none" style={{ top: `${(now.getHours() * 60 + now.getMinutes() - displayRange.start) * pixelsPerMinute}px` }}>
               <div className="w-[80px]"></div>
               <div className="h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse shadow-indigo-500"></div>
               <div className="flex-1 h-0.5 bg-indigo-600"></div>
             </div>
           )}

           <div className="flex flex-col">
              {visibleSlots.map((slot, slotIdx) => {
                  const currentSlotTime = slot.time;

                  return (
                    <div 
                      key={slotIdx} 
                      className="flex border-b border-slate-300 dark:border-slate-600 transition-colors last:border-b-0"
                      style={{ height: `${slotHeight}px` }}
                    >
                        <span className="w-[80px] h-full p-2 text-xs flex items-center justify-center border-r border-slate-300 dark:border-slate-600 bg-slate-100/95 dark:bg-slate-800/95 z-10 text-black dark:text-white">
                          {format(currentSlotTime, timeDisplayFormat)}
                        </span>
                        <div className="flex-1 h-full flex flex-col">
                           {(() => {
                            const subSlotsCount = mode === "booking" ? slotDuration / 15 : 1;
                            
                            return Array.from({ length: subSlotsCount }).map((_, subIdx) => {
                              const subSlotTime = addMinutes(currentSlotTime, subIdx * 15);
                              const existing = mode === "schedule" ? events.find(e => {
                                 if (e.type !== 'blocked' && (e.type as any) !== 'availability-override') return false;
                                 if (!isSameDay(subSlotTime, e.start)) return false;
                                 const subMin = subSlotTime.getHours() * 60 + subSlotTime.getMinutes();
                                 const eStartMin = e.start.getHours() * 60 + e.start.getMinutes();
                                 const eEndMin = e.end.getHours() * 60 + e.end.getMinutes();
                                 const isTimeMatch = subMin >= eStartMin && subMin < eEndMin;
                                 const isStaffMatch = staffFilter !== "all" ? e.staffId === staffFilter : true;
                                 return isTimeMatch && isStaffMatch;
                              }) : null;

                               const isClosed = mode === "schedule" && existing
                                 ? existing.type === 'blocked'
                                 : checkIsClosed(subSlotTime, staffFilter !== "all" ? staffFilter : undefined);
                              const isPastSlot = isPast(subSlotTime, mode === "booking" ? 0 : slotDuration);

                              return (
                                <div 
                                  key={subIdx}
                                  className={`flex-1 relative group transition-colors ${isClosed ? 'bg-zebra bg-slate-100 dark:bg-slate-900 cursor-not-allowed' : 'bg-white dark:bg-slate-900 cursor-pointer'} ${isPastSlot ? 'grayscale-[0.5] opacity-60' : ''}`}
                                  style={{ backgroundPositionY: isClosed ? `-${(slot.minutes / 15 + subIdx) * (slotHeight / subSlotsCount)}px` : undefined }}
                                  onDragOver={handleDragOver}
                                  onDrop={(e) => handleDrop(e, subSlotTime, staffFilter !== "all" ? staffFilter : undefined)}
                                  onClick={() => {
                                    if (mode === "schedule") {
                                      if (existing?.type === 'blocked') {
                                        onScheduleToggle?.(subSlotTime, 'remove-block', staffFilter !== "all" ? staffFilter : undefined);
                                      } else if ((existing?.type as any) === 'availability-override') {
                                        onScheduleToggle?.(subSlotTime, 'remove-override', staffFilter !== "all" ? staffFilter : undefined);
                                      } else if (isClosed) {
                                        onScheduleToggle?.(subSlotTime, 'override', staffFilter !== "all" ? staffFilter : undefined);
                                      } else {
                                        onScheduleToggle?.(subSlotTime, 'block', staffFilter !== "all" ? staffFilter : undefined);
                                      }
                                    } else if (!isClosed && !isPastSlot) {
                                      onSlotClick?.(subSlotTime, staffFilter !== "all" ? staffFilter : undefined);
                                    }
                                  }}
                                >
                                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none gap-2 z-50 transition-all duration-200 scale-95 group-hover:scale-100">
                                      {mode === "schedule" ? (
                                        (() => {
                                          const willMakeAvailable = (existing?.type === 'blocked') || (!existing && isClosed);
                                          return (
                                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full shadow-xl border ${willMakeAvailable ? 'bg-emerald-600 border-emerald-500' : 'bg-rose-600 border-rose-500'}`}>
                                              {willMakeAvailable ? <Plus className="h-3.5 w-3.5 text-white" /> : <Minus className="h-3.5 w-3.5 text-white" />}
                                              <span className="text-[10px] font-bold text-white uppercase tracking-tight">
                                                {willMakeAvailable ? "Make Available (+)" : "Make Unavailable (-)"}
                                              </span>
                                            </div>
                                          );
                                        })()
                                      ) : isClosed ? (
                                        <div className="flex items-center gap-1.5 bg-slate-900 dark:bg-slate-800 px-3 py-1 rounded-full shadow-2xl border border-slate-100 dark:border-slate-600 shadow-black">
                                          <Lock className="h-3.5 w-3.5 text-white" />
                                          <span className="text-[10px] font-bold text-white uppercase tracking-tight">Closed</span>
                                        </div>
                                      ) : isPastSlot ? (
                                        <div className="flex items-center gap-1.5 bg-slate-700 dark:bg-slate-800 px-3 py-1 rounded-full shadow-xl border border-slate-600 dark:border-slate-800">
                                          <span className="text-[10px] font-bold text-white uppercase tracking-tight"><span className="opacity-70">Past:</span> {format(subSlotTime, timeDisplayFormat)}</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1.5 bg-indigo-600 px-3 py-1 rounded-full shadow-xl border border-indigo-500">
                                          <span className="text-[10px] font-bold text-white uppercase tracking-tight">{format(subSlotTime, timeDisplayFormat)}</span>
                                        </div>
                                      )}
                                  </div>
                                </div>
                              );
                            });
                           })()}
                        </div>
                    </div>
                  );
              })}
           </div>

           {dayEvents.filter(e => e.type === 'booking').map(event => {
             const startTotalMinutes = event.start.getHours() * 60 + event.start.getMinutes();
             if (startTotalMinutes < displayRange.start || startTotalMinutes >= displayRange.end) return null;

             const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60);
             const top = (startTotalMinutes - displayRange.start) * pixelsPerMinute;
             const height = duration * pixelsPerMinute;
             const styleData = getEventStyle(event);
             const isPastEvent = isPast(event.end);

             return (
               <div 
                 key={event.id} 
                 draggable={event.type !== 'blocked'} 
                 onDragStart={(e) => handleDragStart(e, event.id)} 
                 onDragEnd={handleDragEnd} 
                 onClick={() => {
                   if (mode === "schedule" && event.type === 'blocked') {
                     onScheduleToggle?.(event.start, 'remove-block');
                   }
                 }}
                 className={`absolute left-[80px] right-0 rounded-xl border p-2 shadow-sm overflow-hidden z-[5] transition-all ${event.type === 'blocked' ? 'cursor-pointer' : 'cursor-move'} ${draggedEventId === event.id ? 'opacity-50 ring-2 ring-indigo-500' : ''} ${isPastEvent ? 'opacity-60 grayscale-[0.4]' : ''} ${typeof styleData === 'string' ? styleData : styleData.className}`} 
                 style={{ top: `${top}px`, height: `${height}px`, minHeight: '30px', ...(typeof styleData === 'object' ? styleData.style : {}) }}
               >
                 {event.type !== 'blocked' && (
                   <>
                     <h4 className="text-sm font-normal truncate">{event.title}</h4>
                     <p className="text-[10px] opacity-70">{format(event.start, timeDisplayFormat)}</p>
                   </>
                 )}
               </div>
             );
           })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startDate = startOfWeek(currentDate);
    const weekDays = eachDayOfInterval({ start: startDate, end: addDays(startDate, 6) });
    const refDate = startOfDay(currentDate);
    const visibleSlots = getVisibleSlots(refDate);
    const nowTop = now ? (now.getHours() * 60 + now.getMinutes()) * pixelsPerMinute : 0;

    return (
      <div className="relative bg-white dark:bg-slate-950 scrollbar-hide">
        <div className="grid" style={{ gridTemplateColumns: '80px repeat(7, 1fr)', minWidth: '800px' }}>
          <div className="sticky top-0 z-50 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md border-b border-r border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center p-4">
            <p className="text-[10px] font-bold text-black dark:text-white uppercase tracking-widest mb-0.5">Week</p>
            <p className="text-base font-bold text-indigo-600 dark:text-indigo-400">{getWeek(startDate)}</p>
          </div>
          {weekDays.map((day, i) => (
            <div key={day.toString()} className={`sticky top-0 z-40 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md border-b border-r border-slate-300 dark:border-slate-600 p-4 text-center ${i === 6 ? 'border-r-0' : ''} ${now && isSameDay(day, now) ? 'bg-indigo-50/30 dark:bg-indigo-900/20' : ''}`}>
               <p className="text-[10px] uppercase tracking-widest opacity-60 text-black dark:text-white">{format(day, "EEE")}</p>
               <p className={`text-lg font-bold ${now && isSameDay(day, now) ? "text-indigo-600 dark:text-indigo-400" : "text-black dark:text-white"}`}>{format(day, "d")}</p>
            </div>
          ))}

          <div className="sticky left-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-r border-slate-300 dark:border-slate-600">
             {visibleSlots.map((slot, slotIdx) => {
               return (
                <div key={slotIdx} className="border-b border-slate-300 dark:border-slate-600 p-2 text-xs flex items-center justify-center text-black dark:text-white last:border-b-0" style={{ height: `${slotHeight}px` }}>
                  {format(slot.time, timeDisplayFormat)}
                </div>
               );
             })}
          </div>

          {weekDays.map((day, dayIdx) => {
             const dayEvents = events.filter(e => isSameDay(e.start, day));
             const dayRefDate = startOfDay(day);
             return (
               <div key={day.toString()} className={`relative border-r border-slate-300 dark:border-slate-600 ${dayIdx === 6 ? 'border-r-0' : ''}`}>
                  <div className="absolute inset-0 z-0">
                    {visibleSlots.map((slot, slotIdx) => {
                      const currentSlotTime = parse(`${Math.floor(slot.minutes / 60)}:${slot.minutes % 60}`, "H:m", dayRefDate);

                      return (
                        <div 
                          key={slotIdx} 
                          className="border-b border-slate-300 dark:border-slate-600 transition-colors flex flex-col bg-white dark:bg-slate-900 last:border-b-0" 
                          style={{ height: `${slotHeight}px` }} 
                        >
                           {(() => {
                             const subSlotsCount = mode === "booking" ? slotDuration / 15 : 1;

                             return Array.from({ length: subSlotsCount }).map((_, subIdx) => {
                               const subSlotTime = addMinutes(currentSlotTime, subIdx * 15);
                               const existing = mode === "schedule" ? events.find(e => {
                                  if (e.type !== 'blocked' && (e.type as any) !== 'availability-override') return false;
                                  if (!isSameDay(subSlotTime, e.start)) return false;
                                  const subMin = subSlotTime.getHours() * 60 + subSlotTime.getMinutes();
                                  const eStartMin = e.start.getHours() * 60 + e.start.getMinutes();
                                  const eEndMin = e.end.getHours() * 60 + e.end.getMinutes();
                                  const isTimeMatch = subMin >= eStartMin && subMin < eEndMin;
                                  const isStaffMatch = staffFilter !== "all" ? e.staffId === staffFilter : true;
                                  return isTimeMatch && isStaffMatch;
                               }) : null;

                               const isClosed = mode === "schedule" && existing
                                 ? existing.type === 'blocked'
                                 : checkIsClosed(subSlotTime, staffFilter !== "all" ? staffFilter : undefined);
                               const isPastSlot = isPast(subSlotTime, mode === "booking" ? 0 : slotDuration);

                               return (
                                  <div 
                                    key={subIdx}
                                    className={`flex-1 relative group transition-colors ${isClosed ? 'bg-zebra bg-slate-100 dark:bg-slate-900 cursor-not-allowed' : 'bg-white dark:bg-slate-900 cursor-pointer'} ${isPastSlot ? 'grayscale-[0.5] opacity-60' : ''}`}
                                    style={{ backgroundPositionY: isClosed ? `-${(slot.minutes / 15 + subIdx) * (slotHeight / subSlotsCount)}px` : undefined }}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, subSlotTime, staffFilter !== "all" ? staffFilter : undefined)}
                                    onClick={() => {
                                      if (mode === "schedule") {
                                        if (existing?.type === 'blocked') {
                                          onScheduleToggle?.(subSlotTime, 'remove-block', staffFilter !== "all" ? staffFilter : undefined);
                                        } else if ((existing?.type as any) === 'availability-override') {
                                          onScheduleToggle?.(subSlotTime, 'remove-override', staffFilter !== "all" ? staffFilter : undefined);
                                        } else if (isClosed) {
                                          onScheduleToggle?.(subSlotTime, 'override', staffFilter !== "all" ? staffFilter : undefined);
                                        } else {
                                          onScheduleToggle?.(subSlotTime, 'block', staffFilter !== "all" ? staffFilter : undefined);
                                        }
                                      } else if (!isClosed && !isPastSlot) {
                                        onSlotClick?.(subSlotTime, staffFilter !== "all" ? staffFilter : undefined);
                                      }
                                    }}
                                  >
                                     <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none gap-2 z-50 transition-all duration-200 scale-95 group-hover:scale-100">
                                        {mode === "schedule" ? (
                                          (() => {
                                            const willMakeAvailable = (existing?.type === 'blocked') || (!existing && isClosed);
                                            return (
                                              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full shadow-xl border ${willMakeAvailable ? 'bg-emerald-600 border-emerald-500' : 'bg-rose-600 border-rose-500'}`}>
                                                {willMakeAvailable ? <Plus className="h-3.5 w-3.5 text-white" /> : <Minus className="h-3.5 w-3.5 text-white" />}
                                                <span className="text-[10px] font-bold text-white uppercase tracking-tight">
                                                  {willMakeAvailable ? "Make Available (+)" : "Make Unavailable (-)"}
                                                </span>
                                              </div>
                                            );
                                          })()
                                        ) : isClosed ? (
                                          <div className="flex items-center gap-1.5 bg-slate-900 dark:bg-slate-800 px-2 py-1 rounded-full shadow-2xl border border-slate-100 dark:border-slate-600 shadow-black">
                                            <Lock className="h-2.5 w-2.5 text-white" />
                                            <span className="text-[9px] font-bold text-white uppercase tracking-tight">Closed</span>
                                          </div>
                                        ) : isPastSlot ? (
                                          <div className="flex items-center gap-1.5 bg-slate-700 dark:bg-slate-800 px-3 py-1 rounded-full shadow-xl border border-slate-600 dark:border-slate-800">
                                             <span className="text-[10px] font-bold text-white uppercase tracking-tight"><span className="opacity-70">Past:</span> {format(subSlotTime, timeDisplayFormat)}</span>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-1.5 bg-indigo-600 px-3 py-1 rounded-full shadow-xl border border-indigo-500">
                                            <span className="text-[10px] font-bold text-white uppercase tracking-tight">{format(subSlotTime, timeDisplayFormat)}</span>
                                          </div>
                                        )}
                                     </div>
                                  </div>
                               );
                             });
                           })()}
                        </div>
                      );
                    })}
                  </div>
                  {now && isSameDay(day, now) && now.getHours() * 60 + now.getMinutes() >= displayRange.start && now.getHours() * 60 + now.getMinutes() <= displayRange.end && (
                    <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top: `${(now.getHours() * 60 + now.getMinutes() - displayRange.start) * pixelsPerMinute}px` }}>
                       <div className="h-0.5 bg-indigo-600 relative"><div className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse shadow-indigo-500" /></div>
                    </div>
                  )}
                  <div className="relative z-10 mx-1">
                    {dayEvents.filter(e => e.type === 'booking').map(event => {
                      const startTotalMinutes = event.start.getHours() * 60 + event.start.getMinutes();
                      if (startTotalMinutes < displayRange.start || startTotalMinutes >= displayRange.end) return null;

                      const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60);
                      const top = (startTotalMinutes - displayRange.start) * pixelsPerMinute;
                      const height = duration * pixelsPerMinute;
                      const styleData = getEventStyle(event);
                      const isPastEvent = isPast(event.end);

                      return (
                        <div key={event.id} draggable={event.type !== 'blocked'} onDragStart={(e) => handleDragStart(e, event.id)} onDragEnd={handleDragEnd} className={`absolute left-0 right-0 rounded-xl border p-2 shadow-sm overflow-hidden z-[5] cursor-move transition-all ${draggedEventId === event.id ? 'opacity-50 ring-2 ring-indigo-500' : ''} ${isPastEvent ? 'opacity-60 grayscale-[0.4]' : ''} ${typeof styleData === 'string' ? styleData : styleData.className}`} style={{ top: `${top}px`, height: `${height}px`, minHeight: '25px', ...(typeof styleData === 'object' ? styleData.style : {}) }}>
                          {event.type !== 'blocked' && (
                            <p className="text-[9px] leading-tight font-medium truncate">{event.title}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
               </div>
             );
           })}
        </div>
      </div>
    );
  };

  const renderTeamView = () => {
    const dayEvents = events.filter(e => isSameDay(e.start, currentDate));
    const refDate = startOfDay(currentDate);
    const visibleSlots = getVisibleSlots(refDate);
    const nowTop = now ? (now.getHours() * 60 + now.getMinutes()) * pixelsPerMinute : 0;

    return (
      <div className="relative bg-white dark:bg-slate-950">
        <div className="grid" style={{ gridTemplateColumns: `80px repeat(${staffList.length}, 1fr)`, minWidth: `${Math.max(800, staffList.length * 200)}px` }}>
          <div className="sticky top-0 z-50 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md border-b border-r border-slate-300 dark:border-slate-600 flex items-center justify-center p-4">
             <span className="text-[10px] font-bold uppercase tracking-widest text-black dark:text-white">Team</span>
          </div>
          {staffList.map((staff, i) => (
            <div key={staff.id} className={`sticky top-0 z-40 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md border-b border-r border-slate-300 dark:border-slate-600 p-4 text-center ${i === staffList.length - 1 ? 'border-r-0' : ''}`}>
               <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: staff.color }}>
                    {staff.name.substring(0, 2).toUpperCase()}
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider truncate w-full text-black dark:text-white">{staff.name}</p>
               </div>
            </div>
          ))}

          <div className="sticky left-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-r border-slate-300 dark:border-slate-600">
             {visibleSlots.map((slot, slotIdx) => {
                return (
                 <div key={slotIdx} className="border-b border-slate-300 dark:border-slate-600 p-2 text-xs flex items-center justify-center text-black dark:text-white last:border-b-0" style={{ height: `${slotHeight}px` }}>
                   {format(slot.time, timeDisplayFormat)}
                 </div>
                );
             })}
          </div>

          {staffList.map((staff, staffIdx) => {
             const staffEvents = dayEvents.filter(e => e.resourceName === staff.name);
             return (
               <div key={staff.id} className={`relative border-r border-slate-300 dark:border-slate-600 ${staffIdx === staffList.length - 1 ? 'border-r-0' : ''}`}>
                  <div className="absolute inset-0 z-0">
                    {visibleSlots.map((slot, slotIdx) => {
                      const currentSlotTime = parse(`${Math.floor(slot.minutes / 60)}:${slot.minutes % 60}`, "H:m", refDate);

                      return (
                        <div 
                          key={slotIdx} 
                          className="border-b border-slate-300 dark:border-slate-600 transition-colors flex flex-col bg-white dark:bg-slate-900 last:border-b-0" 
                          style={{ height: `${slotHeight}px` }} 
                        >
                           {(() => {
                             const subSlotsCount = mode === "booking" ? slotDuration / 15 : 1;

                             return Array.from({ length: subSlotsCount }).map((_, subIdx) => {
                               const subSlotTime = addMinutes(currentSlotTime, subIdx * 15);
                               const existing = mode === "schedule" ? events.find(e => {
                                  if (e.type !== 'blocked' && (e.type as any) !== 'availability-override') return false;
                                  if (!isSameDay(subSlotTime, e.start)) return false;
                                  const subMin = subSlotTime.getHours() * 60 + subSlotTime.getMinutes();
                                  const eStartMin = e.start.getHours() * 60 + e.start.getMinutes();
                                  const eEndMin = e.end.getHours() * 60 + e.end.getMinutes();
                                  const isTimeMatch = subMin >= eStartMin && subMin < eEndMin;
                                  const isStaffMatch = e.staffId === staff.id;
                                  return isTimeMatch && isStaffMatch;
                               }) : null;

                               const isClosed = mode === "schedule" && existing
                                 ? existing.type === 'blocked'
                                 : checkIsClosed(subSlotTime, staff.id);
                               const isPastSlot = isPast(subSlotTime, mode === "booking" ? 0 : slotDuration);

                               return (
                                  <div 
                                    key={subIdx}
                                    className={`flex-1 relative group transition-colors ${isClosed ? 'bg-zebra bg-slate-100 dark:bg-slate-900 cursor-not-allowed' : 'bg-white dark:bg-slate-900 cursor-pointer'} ${isPastSlot ? 'grayscale-[0.5] opacity-60' : ''}`}
                                    style={{ backgroundPositionY: isClosed ? `-${(slot.minutes / 15 + subIdx) * (slotHeight / subSlotsCount)}px` : undefined }}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, subSlotTime, staff.id)}
                                    onClick={() => {
                                      if (mode === "schedule") {
                                        if (existing?.type === 'blocked') {
                                          onScheduleToggle?.(subSlotTime, 'remove-block', staff.id);
                                        } else if ((existing?.type as any) === 'availability-override') {
                                          onScheduleToggle?.(subSlotTime, 'remove-override', staff.id);
                                        } else if (isClosed) {
                                          onScheduleToggle?.(subSlotTime, 'override', staff.id);
                                        } else {
                                          onScheduleToggle?.(subSlotTime, 'block', staff.id);
                                        }
                                      } else if (!isClosed && !isPastSlot) {
                                        onSlotClick?.(subSlotTime, staff.id);
                                      }                                    }}
                                  >
                                     <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none gap-2 z-50 transition-all duration-200 scale-95 group-hover:scale-100">
                                        {mode === "schedule" ? (
                                          (() => {
                                            const willMakeAvailable = (existing?.type === 'blocked') || (!existing && isClosed);
                                            return (
                                              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full shadow-xl border ${willMakeAvailable ? 'bg-emerald-600 border-emerald-500' : 'bg-rose-600 border-rose-500'}`}>
                                                {willMakeAvailable ? <Plus className="h-3.5 w-3.5 text-white" /> : <Minus className="h-3.5 w-3.5 text-white" />}
                                                <span className="text-[10px] font-bold text-white uppercase tracking-tight">
                                                  {willMakeAvailable ? "Make Available (+)" : "Make Unavailable (-)"}
                                                </span>
                                              </div>
                                            );
                                          })()
                                        ) : isClosed ? (
                                          <div className="flex items-center gap-1.5 bg-slate-900 dark:bg-slate-800 px-3 py-1 rounded-full shadow-2xl border border-slate-100 dark:border-slate-600 shadow-black">
                                            <Lock className="h-3.5 w-3.5 text-white" />
                                            <span className="text-[10px] font-bold text-white uppercase tracking-tight">Closed</span>
                                          </div>
                                        ) : isPastSlot ? (
                                          <div className="flex items-center gap-1.5 bg-slate-700 dark:bg-slate-800 px-3 py-1 rounded-full shadow-xl border border-slate-600 dark:border-slate-800">
                                             <span className="text-[10px] font-bold text-white uppercase tracking-tight"><span className="opacity-70">Past:</span> {format(subSlotTime, timeDisplayFormat)}</span>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-1.5 bg-indigo-600 px-3 py-1 rounded-full shadow-xl border border-indigo-500">
                                            <span className="text-[10px] font-bold text-white uppercase tracking-tight">{format(subSlotTime, timeDisplayFormat)}</span>
                                          </div>
                                        )}
                                     </div>
                                  </div>
                               );
                             });
                           })()}
                        </div>
                      );
                    })}
                  </div>
                  {now && isSameDay(currentDate, now) && now.getHours() * 60 + now.getMinutes() >= displayRange.start && now.getHours() * 60 + now.getMinutes() <= displayRange.end && (
                    <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top: `${(now.getHours() * 60 + now.getMinutes() - displayRange.start) * pixelsPerMinute}px` }}>
                       <div className="h-0.5 bg-indigo-600 relative">
                          {staffIdx === 0 && (
                            <div className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse shadow-indigo-500"></div>
                          )}
                       </div>
                    </div>
                  )}
                  <div className="relative z-10 mx-1">
                    {staffEvents.filter(e => e.type === 'booking').map(event => {
                      const startTotalMinutes = event.start.getHours() * 60 + event.start.getMinutes();
                      if (startTotalMinutes < displayRange.start || startTotalMinutes >= displayRange.end) return null;

                      const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60);
                      const top = (startTotalMinutes - displayRange.start) * pixelsPerMinute;
                      const height = duration * pixelsPerMinute;
                      const styleData = getEventStyle(event);
                      const isPastEvent = isPast(event.end);

                      return (
                        <div key={event.id} draggable={event.type !== 'blocked'} onDragStart={(e) => handleDragStart(e, event.id)} onDragEnd={handleDragEnd} className={`absolute left-0 right-0 rounded-xl border p-2 shadow-sm overflow-hidden z-[5] cursor-move transition-all ${draggedEventId === event.id ? 'opacity-50 ring-2 ring-indigo-500' : ''} ${isPastEvent ? 'opacity-60 grayscale-[0.4]' : ''} ${typeof styleData === 'string' ? styleData : styleData.className}`} style={{ top: `${top}px`, height: `${height}px`, minHeight: '20px', ...(typeof styleData === 'object' ? styleData.style : {}) }}>
                          {event.type !== 'blocked' && (
                            <p className="text-[9px] leading-tight font-medium truncate">{event.title}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
               </div>
             );
           })}
        </div>
      </div>
    );
  };

  return (
    <div className={`${(view === "day" || view === "team") ? "w-full" : "h-full min-h-0"} flex flex-col animate-fade-in`}>
      {view === "month" && renderMonthView()}
      {view === "week" && renderWeekView()}
      {view === "day" && renderDayView()}
      {view === "team" && renderTeamView()}
    </div>
  );
}
