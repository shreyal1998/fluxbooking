"use client";

import { useState, useEffect, useCallback } from "react";
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
  Hand,
  Lock,
  AlertTriangle
} from "lucide-react";
import { rescheduleBooking } from "@/app/actions/booking";
import { toast } from "sonner";

type ViewType = "month" | "week" | "day" | "team";

interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: "booking" | "blocked";
  leaveType?: string;
  color?: string;
  resourceName?: string;
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
  staffFilter = "all"
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
  staffFilter?: string
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
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayName = dayNames[getDay(date)];
    const currentMinutes = date.getHours() * 60 + date.getMinutes();
    
    const bizHours = parseAvailability(businessHours);
    if (bizHours) {
      const dayBizHours = bizHours[dayName] || bizHours[dayName.charAt(0).toUpperCase() + dayName.slice(1)];
      const isDayDefined = bizHours.hasOwnProperty(dayName) || bizHours.hasOwnProperty(dayName.charAt(0).toUpperCase() + dayName.slice(1));
      if (isDayDefined) {
        if (!dayBizHours || !dayBizHours.start || !dayBizHours.end) return true;
        const bizStart = timeToMinutes(dayBizHours.start);
        const bizEnd = dayBizHours.end === "00:00" ? 1440 : timeToMinutes(dayBizHours.end);
        if (currentMinutes < bizStart || currentMinutes >= bizEnd) return true;
      }
    }

    const targetStaffId = specificStaffId || (staffFilter !== "all" ? staffFilter : null);
    if (targetStaffId) {
      const staff = staffList.find(s => s.id === targetStaffId);
      const staffHours = staff ? parseAvailability(staff.availabilityJson) : null;
      if (staffHours) {
        const dayStaffHours = staffHours[dayName] || staffHours[dayName.charAt(0).toUpperCase() + dayName.slice(1)];
        const isStaffDayDefined = staffHours.hasOwnProperty(dayName) || staffHours.hasOwnProperty(dayName.charAt(0).toUpperCase() + dayName.slice(1));
        if (isStaffDayDefined) {
          if (!dayStaffHours || !dayStaffHours.start || !dayStaffHours.end) return true;
          const staffStart = timeToMinutes(dayStaffHours.start);
          const staffEnd = dayStaffHours.end === "00:00" ? 1440 : timeToMinutes(dayStaffHours.end);
          if (currentMinutes < staffStart || currentMinutes >= staffEnd) return true;
        }
      }
    }
    return false;
  }, [businessHours, staffFilter, staffList, parseAvailability]);

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
      return baseClass + "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700";
    }
    return {
      className: baseClass + "bg-white dark:bg-slate-800 text-black dark:text-white border-slate-200 dark:border-slate-700 shadow-sm border-l-4",
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
        <div className="grid grid-cols-7 border-b border-slate-300 dark:border-slate-700">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="py-4 text-center text-[10px] font-normal text-black dark:text-white uppercase tracking-widest bg-slate-50/30 dark:bg-slate-900/50 border-r border-slate-300 dark:border-slate-700 last:border-r-0">
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
                className={`p-3 border-r border-b border-slate-300 dark:border-slate-700 last:border-r-0 relative transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50 ${
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
    const totalSlots = (24 * 60) / slotDuration;
    const slots = Array.from({ length: totalSlots }, (_, i) => i);
    const nowTop = now ? (now.getHours() * 60 + now.getMinutes()) * pixelsPerMinute : 0;

    return (
      <div className="relative bg-white dark:bg-slate-950">
        <div className="relative p-0">
           {now && isSameDay(currentDate, now) && (
             <div className="absolute left-0 right-0 z-30 flex items-center pointer-events-none" style={{ top: `${nowTop}px` }}>
               <div className="w-[80px]"></div>
               <div className="h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse shadow-[0_0_10px_rgba(79,70,229,0.5)]"></div>
               <div className="flex-1 h-0.5 bg-indigo-600/40"></div>
             </div>
           )}

           <div className="flex flex-col">
              {slots.map(slotIdx => {
                  const totalMinutes = slotIdx * slotDuration;
                  const currentSlotTime = parse(`${Math.floor(totalMinutes / 60)}:${totalMinutes % 60}`, "H:m", refDate);

                  return (
                    <div 
                      key={slotIdx} 
                      className="flex border-b border-slate-300 dark:border-slate-700 transition-colors last:border-b-0"
                      style={{ height: `${slotHeight}px` }}
                    >
                        <span className="w-[80px] h-full p-2 text-xs flex items-center justify-center border-r border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 z-10 text-black dark:text-white">
                          {format(currentSlotTime, timeDisplayFormat)}
                        </span>
                        <div className="flex-1 h-full flex flex-col">
                          {Array.from({ length: slotDuration / 15 }).map((_, subIdx) => {
                            const subTime = addMinutes(currentSlotTime, subIdx * 15);
                            const isClosed = checkIsClosed(subTime);
                            const isPastSlot = isPast(subTime, 15);
                            return (
                              <div 
                                key={subIdx}
                                className={`flex-1 relative group/sub transition-colors ${isClosed ? 'bg-zebra bg-slate-100 dark:bg-slate-900/80 cursor-not-allowed' : 'bg-white dark:bg-slate-900 cursor-pointer'} ${isPastSlot ? 'grayscale-[0.5] opacity-60' : ''}`}
                                style={{ backgroundPositionY: isClosed ? `-${(slotIdx * slotHeight) + (subIdx * (slotHeight / (slotDuration / 15)))}px` : undefined }}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, subTime)}
                                onClick={() => !isClosed && onSlotClick?.(subTime)}
                              >
                                 <div className="absolute inset-0 opacity-0 group-hover/sub:opacity-100 flex items-center justify-center pointer-events-none gap-2 z-50 transition-all duration-200 scale-95 group-hover/sub:scale-100">
                                    {isClosed ? (
                                      <div className="flex items-center gap-1.5 bg-slate-900 dark:bg-slate-800 px-3 py-1 rounded-full shadow-2xl border border-slate-200 dark:border-slate-600 shadow-black/50">
                                        <Lock className="h-3.5 w-3.5 text-white" />
                                        <span className="text-[10px] font-bold text-white uppercase tracking-tight">Closed</span>
                                      </div>
                                    ) : isPastSlot ? (
                                      <div className="flex items-center gap-1.5 bg-slate-700 dark:bg-slate-800 px-3 py-1 rounded-full shadow-xl border border-slate-600 dark:border-slate-700">
                                         <span className="text-[10px] font-bold text-white uppercase tracking-tight"><span className="opacity-70">Past:</span> {format(subTime, timeDisplayFormat)}</span>
                                      </div>
                                    ) : (

                                      <div className="flex items-center gap-1.5 bg-indigo-600 px-3 py-1 rounded-full shadow-xl border border-indigo-500">
                                        <span className="text-[10px] font-bold text-white uppercase tracking-tight">{format(subTime, timeDisplayFormat)}</span>
                                      </div>
                                    )}
                                 </div>
                              </div>
                            );
                          })}
                        </div>
                    </div>
                  );
              })}
           </div>

           {dayEvents.map(event => {
             const startTotalMinutes = event.start.getHours() * 60 + event.start.getMinutes();
             const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60);
             const top = startTotalMinutes * pixelsPerMinute;
             const height = duration * pixelsPerMinute;
             const styleData = getEventStyle(event);
             const isPastEvent = isPast(event.end);

             return (
               <div key={event.id} draggable={event.type !== 'blocked'} onDragStart={(e) => handleDragStart(e, event.id)} onDragEnd={handleDragEnd} className={`absolute left-[80px] right-0 rounded-xl border p-2 shadow-sm overflow-hidden z-[5] cursor-move transition-all ${draggedEventId === event.id ? 'opacity-50 ring-2 ring-indigo-500' : ''} ${isPastEvent ? 'opacity-60 grayscale-[0.4]' : ''} ${typeof styleData === 'string' ? styleData : styleData.className}`} style={{ top: `${top}px`, height: `${height}px`, minHeight: '30px', ...(typeof styleData === 'object' ? styleData.style : {}) }}>
                 <h4 className="text-sm font-normal truncate">{event.title}</h4>
                 <p className="text-[10px] opacity-70">{format(event.start, timeDisplayFormat)}</p>
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
    const totalSlots = (24 * 60) / slotDuration;
    const slots = Array.from({ length: totalSlots }, (_, i) => i);
    const nowTop = now ? (now.getHours() * 60 + now.getMinutes()) * pixelsPerMinute : 0;

    return (
      <div className="flex-1 min-h-0 overflow-auto relative bg-white dark:bg-slate-950">
        <div className="grid" style={{ gridTemplateColumns: '80px repeat(7, 1fr)', minWidth: '800px' }}>
          <div className="sticky top-0 z-50 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-r border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center p-4">
            <p className="text-[10px] font-bold text-black dark:text-white uppercase tracking-widest mb-0.5">Week</p>
            <p className="text-base font-bold text-indigo-600 dark:text-indigo-400">{getWeek(startDate)}</p>
          </div>
          {weekDays.map((day, i) => (
            <div key={day.toString()} className={`sticky top-0 z-40 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-r border-slate-300 dark:border-slate-700 p-4 text-center ${i === 6 ? 'border-r-0' : ''} ${now && isSameDay(day, now) ? 'bg-indigo-50/30 dark:bg-indigo-900/20' : ''}`}>
               <p className="text-[10px] uppercase tracking-widest opacity-60 text-black dark:text-white">{format(day, "EEE")}</p>
               <p className={`text-lg font-bold ${now && isSameDay(day, now) ? "text-indigo-600 dark:text-indigo-400" : "text-black dark:text-white"}`}>{format(day, "d")}</p>
            </div>
          ))}

          <div className="sticky left-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-r border-slate-300 dark:border-slate-700">
             {slots.map(slotIdx => {
               const ref = startOfDay(new Date());
               const currentLabelTime = parse(`${Math.floor((slotIdx * slotDuration) / 60)}:${(slotIdx * slotDuration) % 60}`, "H:m", ref);
               return (
                <div key={slotIdx} className="border-b border-slate-300 dark:border-slate-800 p-2 text-xs flex items-center justify-center text-black dark:text-white" style={{ height: `${slotHeight}px` }}>
                  {format(currentLabelTime, timeDisplayFormat)}
                </div>
               );
             })}
          </div>

          {weekDays.map((day, dayIdx) => {
             const dayEvents = events.filter(e => isSameDay(e.start, day));
             const refDate = startOfDay(day);
             return (
               <div key={day.toString()} className={`relative border-r border-slate-300 dark:border-slate-700 ${dayIdx === 6 ? 'border-r-0' : ''}`}>
                  <div className="absolute inset-0 z-0">
                    {slots.map(slotIdx => {
                      const totalMinutes = slotIdx * slotDuration;
                      const currentSlotTime = parse(`${Math.floor(totalMinutes / 60)}:${totalMinutes % 60}`, "H:m", refDate);

                      return (
                        <div 
                          key={slotIdx} 
                          className="border-b border-slate-300 dark:border-slate-700 transition-colors flex flex-col bg-white dark:bg-slate-900" 
                          style={{ height: `${slotHeight}px` }} 
                        >
                           {Array.from({ length: slotDuration / 15 }).map((_, subIdx) => {
                             const subTime = addMinutes(currentSlotTime, subIdx * 15);
                             const isClosed = checkIsClosed(subTime);
                             const isPastSlot = isPast(subTime, 15);
                             return (
                                <div 
                                  key={subIdx}
                                  className={`flex-1 relative group/sub transition-colors ${isClosed ? 'bg-zebra bg-slate-100 dark:bg-slate-900 cursor-not-allowed' : 'cursor-pointer'} ${isPastSlot ? 'grayscale-[0.5] opacity-60' : ''}`}
                                  style={{ backgroundPositionY: isClosed ? `-${(slotIdx * slotHeight) + (subIdx * (slotHeight / (slotDuration / 15)))}px` : undefined }}
                                  onDragOver={handleDragOver}
                                  onDrop={(e) => handleDrop(e, subTime)}
                                  onClick={() => !isClosed && onSlotClick?.(subTime)}
                                >
                                   <div className="absolute inset-0 opacity-0 group-hover/sub:opacity-100 flex items-center justify-center pointer-events-none gap-2 z-50 transition-all duration-200 scale-95 group-hover/sub:scale-100">
                                      {isClosed ? (
                                        <div className="flex items-center gap-1.5 bg-slate-900 dark:bg-slate-800 px-2 py-1 rounded-full shadow-2xl border border-slate-200 dark:border-slate-600 shadow-black/50">
                                          <Lock className="h-2.5 w-2.5 text-white" />
                                          <span className="text-[9px] font-bold text-white uppercase tracking-tight">Closed</span>
                                        </div>
                                      ) : isPastSlot ? (
                                        <div className="flex items-center gap-1.5 bg-slate-700 dark:bg-slate-800 px-3 py-1 rounded-full shadow-xl border border-slate-600 dark:border-slate-700">
                                           <span className="text-[10px] font-bold text-white uppercase tracking-tight"><span className="opacity-70">Past:</span> {format(subTime, timeDisplayFormat)}</span>
                                        </div>
                                      ) : (

                                        <div className="flex items-center gap-1.5 bg-indigo-600 px-3 py-1 rounded-full shadow-xl border border-indigo-500">
                                          <span className="text-[10px] font-bold text-white uppercase tracking-tight">{format(subTime, timeDisplayFormat)}</span>
                                        </div>
                                      )}
                                   </div>
                                </div>
                             );
                           })}
                        </div>
                      );
                    })}
                  </div>
                  {now && isSameDay(day, now) && (
                    <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top: `${nowTop}px` }}>
                       <div className="h-0.5 bg-indigo-600 relative"><div className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse shadow-[0_0_10px_rgba(79,70,229,0.5)]" /></div>
                    </div>
                  )}
                  <div className="relative z-10 mx-1">
                    {dayEvents.map(event => {
                      const startTotalMinutes = event.start.getHours() * 60 + event.start.getMinutes();
                      const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60);
                      const top = startTotalMinutes * pixelsPerMinute;
                      const height = duration * pixelsPerMinute;
                      const styleData = getEventStyle(event);
                      const isPastEvent = isPast(event.end);

                      return (
                        <div key={event.id} draggable={event.type !== 'blocked'} onDragStart={(e) => handleDragStart(e, event.id)} onDragEnd={handleDragEnd} className={`absolute left-0 right-0 rounded-xl border p-2 shadow-sm overflow-hidden z-[5] cursor-move transition-all ${draggedEventId === event.id ? 'opacity-50 ring-2 ring-indigo-500' : ''} ${isPastEvent ? 'opacity-60 grayscale-[0.4]' : ''} ${typeof styleData === 'string' ? styleData : styleData.className}`} style={{ top: `${top}px`, height: `${height}px`, minHeight: '25px', ...(typeof styleData === 'object' ? styleData.style : {}) }}>
                          <p className="text-[9px] leading-tight font-medium truncate">{event.title}</p>
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
    const totalSlots = (24 * 60) / slotDuration;
    const slots = Array.from({ length: totalSlots }, (_, i) => i);
    const nowTop = now ? (now.getHours() * 60 + now.getMinutes()) * pixelsPerMinute : 0;

    return (
      <div className="flex-1 min-h-0 overflow-auto relative bg-white dark:bg-slate-950">
        <div className="grid" style={{ gridTemplateColumns: `80px repeat(${staffList.length}, 1fr)`, minWidth: `${Math.max(800, staffList.length * 200)}px` }}>
          <div className="sticky top-0 z-50 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-r border-slate-300 dark:border-slate-700 flex items-center justify-center p-4">
             <span className="text-[10px] font-bold uppercase tracking-widest text-black dark:text-white">Team</span>
          </div>
          {staffList.map((staff, i) => (
            <div key={staff.id} className={`sticky top-0 z-40 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-r border-slate-300 dark:border-slate-700 p-4 text-center ${i === staffList.length - 1 ? 'border-r-0' : ''}`}>
               <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: staff.color }}>
                    {staff.name.substring(0, 2).toUpperCase()}
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider truncate w-full text-black dark:text-white">{staff.name}</p>
               </div>
            </div>
          ))}

          <div className="sticky left-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-r border-slate-300 dark:border-slate-700">
             {slots.map(slotIdx => {
                const ref = startOfDay(new Date());
                const currentLabelTime = parse(`${Math.floor((slotIdx * slotDuration) / 60)}:${(slotIdx * slotDuration) % 60}`, "H:m", ref);
                return (
                 <div key={slotIdx} className="border-b border-slate-300 dark:border-slate-800 p-2 text-xs flex items-center justify-center text-black dark:text-white" style={{ height: `${slotHeight}px` }}>
                   {format(currentLabelTime, timeDisplayFormat)}
                 </div>
                );
             })}
          </div>

          {staffList.map((staff, staffIdx) => {
             const staffEvents = dayEvents.filter(e => e.resourceName === staff.name);
             return (
               <div key={staff.id} className={`relative border-r border-slate-300 dark:border-slate-700 ${staffIdx === staffList.length - 1 ? 'border-r-0' : ''}`}>
                  <div className="absolute inset-0 z-0">
                    {slots.map(slotIdx => {
                      const totalMinutes = slotIdx * slotDuration;
                      const currentSlotTime = parse(`${Math.floor(totalMinutes / 60)}:${totalMinutes % 60}`, "H:m", refDate);

                      return (
                        <div 
                          key={slotIdx} 
                          className="border-b border-slate-300 dark:border-slate-700 transition-colors flex flex-col bg-white dark:bg-slate-900" 
                          style={{ height: `${slotHeight}px` }} 
                        >
                           {Array.from({ length: slotDuration / 15 }).map((_, subIdx) => {
                             const subTime = addMinutes(currentSlotTime, subIdx * 15);
                             const isClosed = checkIsClosed(subTime, staff.id);
                             const isPastSlot = isPast(subTime, 15);
                             return (
                                <div 
                                  key={subIdx}
                                  className={`flex-1 relative group/sub transition-colors ${isClosed ? 'bg-zebra bg-slate-100 dark:bg-slate-900 cursor-not-allowed' : 'cursor-pointer'} ${isPastSlot ? 'grayscale-[0.5] opacity-60' : ''}`}
                                  style={{ backgroundPositionY: isClosed ? `-${(slotIdx * slotHeight) + (subIdx * (slotHeight / (slotDuration / 15)))}px` : undefined }}
                                  onDragOver={handleDragOver}
                                  onDrop={(e) => handleDrop(e, subTime, staff.id)}
                                  onClick={() => !isClosed && onSlotClick?.(subTime, staff.id)}
                                >
                                   <div className="absolute inset-0 opacity-0 group-hover/sub:opacity-100 flex items-center justify-center pointer-events-none gap-2 z-50 transition-all duration-200 scale-95 group-hover/sub:scale-100">
                                      {isClosed ? (
                                        <div className="flex items-center gap-1 bg-slate-900 dark:bg-slate-800 px-2 py-1 rounded-full shadow-xl border border-slate-200 dark:border-slate-600 shadow-black/50">
                                          <Lock className="h-2.5 w-2.5 text-white" />
                                          <span className="text-[8px] font-bold text-white">Closed</span>
                                        </div>
                                      ) : isPastSlot ? (
                                        <div className="flex items-center gap-1.5 bg-slate-700 dark:bg-slate-800 px-3 py-1 rounded-full shadow-xl border border-slate-600 dark:border-slate-700">
                                           <span className="text-[10px] font-bold text-white uppercase tracking-tight"><span className="opacity-70">Past:</span> {format(subTime, timeDisplayFormat)}</span>
                                        </div>
                                      ) : (

                                        <div className="flex items-center gap-1.5 bg-indigo-600 px-3 py-1 rounded-full shadow-xl border border-indigo-500">
                                          <span className="text-[10px] font-bold text-white uppercase tracking-tight">{format(subTime, timeDisplayFormat)}</span>
                                        </div>
                                      )}
                                   </div>
                                </div>
                             );
                           })}
                        </div>
                      );
                    })}
                  </div>
                  {now && isSameDay(currentDate, now) && (
                    <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top: `${nowTop}px` }}>
                       <div className="h-0.5 bg-indigo-600 relative">
                          {staffIdx === 0 && (
                            <div className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse shadow-[0_0_10px_rgba(79,70,229,0.5)]"></div>
                          )}
                       </div>
                    </div>
                  )}
                  <div className="relative z-10 mx-1">
                    {staffEvents.map(event => {
                      const startTotalMinutes = event.start.getHours() * 60 + event.start.getMinutes();
                      const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60);
                      const top = startTotalMinutes * pixelsPerMinute;
                      const height = duration * pixelsPerMinute;
                      const styleData = getEventStyle(event);
                      const isPastEvent = isPast(event.end);

                      return (
                        <div key={event.id} draggable={event.type !== 'blocked'} onDragStart={(e) => handleDragStart(e, event.id)} onDragEnd={handleDragEnd} className={`absolute left-0 right-0 rounded-xl border p-2 shadow-sm overflow-hidden z-[5] cursor-move transition-all ${draggedEventId === event.id ? 'opacity-50 ring-2 ring-indigo-500' : ''} ${isPastEvent ? 'opacity-60 grayscale-[0.4]' : ''} ${typeof styleData === 'string' ? styleData : styleData.className}`} style={{ top: `${top}px`, height: `${height}px`, minHeight: '20px', ...(typeof styleData === 'object' ? styleData.style : {}) }}>
                          <p className="text-[9px] leading-tight font-medium truncate">{event.title}</p>
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
    <div className={`${view === "day" ? "w-full" : "h-full min-h-0"} flex flex-col animate-fade-in`}>
      {view === "month" && renderMonthView()}
      {view === "week" && renderWeekView()}
      {view === "day" && renderDayView()}
      {view === "team" && renderTeamView()}
    </div>
  );
}
