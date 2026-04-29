"use client";

import { useState, useEffect } from "react";
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
  [key: string]: DaySchedule | null;
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
  externalViewMode = "calendar",
  onSlotClick,
  currentDate,
  view,
  slotDuration = 60,
  onDateChange,
  onViewChange,
  onSlotDurationChange
}: {
  initialEvents: Event[],
  userRole: string,
  staffList: Staff[],
  businessHours?: BusinessHours | string,
  timezone?: string,
  externalViewMode?: "calendar" | "team" | "list",
  onSlotClick?: (date: Date, staffId?: string) => void,
  currentDate: Date,
  view: ViewType,
  slotDuration?: 15 | 30 | 60,
  onDateChange: (date: Date) => void,
  onViewChange: (view: ViewType) => void,
  onSlotDurationChange?: (duration: 15 | 30 | 60) => void
}) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  // Dynamic height configuration
  const slotHeight = slotDuration === 15 ? 40 : slotDuration === 30 ? 60 : 80;
  const pixelsPerMinute = slotHeight / slotDuration;

  // Helper to get time at venue
  const getVenueTime = () => {
    try {
        const str = new Date().toLocaleString("en-US", { timeZone: timezone });
        return new Date(str);
    } catch (e) {
        return new Date();
    }
  };

  // Update "Now" line every minute and avoid hydration mismatch
  useEffect(() => {
    setNow(getVenueTime());
    const timer = setInterval(() => setNow(getVenueTime()), 60000);
    return () => clearInterval(timer);
  }, [timezone]);

  // Sync initial events if they change
  useEffect(() => {
    if (JSON.stringify(events) !== JSON.stringify(initialEvents)) {
      setEvents(initialEvents);
    }
  }, [initialEvents, events]);

  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    const eventToMove = events.find(ev => ev.id === eventId);
    if (!eventToMove || eventToMove.type === "blocked") {
      e.preventDefault();
      return;
    }

    setDraggedEventId(eventId);
    e.dataTransfer.setData("text/plain", eventId);
    e.dataTransfer.effectAllowed = "move";
    
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = "0.5";
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedEventId(null);
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = "1";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, dropDate: Date, dropStaffId?: string) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData("text/plain");
    if (!eventId) return;

    const eventToMove = events.find(ev => ev.id === eventId);
    if (!eventToMove || eventToMove.type === "blocked") return;

    // Optimistic UI Update
    const originalEvents = [...events];
    const duration = eventToMove.end.getTime() - eventToMove.start.getTime();
    const newEnd = new Date(dropDate.getTime() + duration);
    
    let newResourceName = eventToMove.resourceName;
    if (dropStaffId) {
      const staff = staffList.find(s => s.id === dropStaffId);
      if (staff) newResourceName = staff.name;
    }

    const updatedEvents = events.map(ev => 
      ev.id === eventId 
        ? { ...ev, start: dropDate, end: newEnd, resourceName: newResourceName } 
        : ev
    );

    setEvents(updatedEvents);
    toast.info("Rescheduling appointment...");

    // Server Action
    const result = await rescheduleBooking(eventId, dropDate, dropStaffId);

    if (result.error) {
      setEvents(originalEvents);
      toast.error(result.error);
    } else {
      toast.success("Appointment rescheduled successfully");
    }
  };

  // Advanced Event Styling
  const getEventStyle = (event: Event) => {
    const hasConflict = events.some(other =>
      other.id !== event.id &&
      other.type !== event.type &&
      event.start < other.end && event.end > other.start
    );

    const baseClass = hasConflict ? "conflict-pulse " : "";

    if (event.type === "blocked") {
      switch (event.leaveType) {
        case "SICK":
        case "EMERGENCY":
          return baseClass + "bg-emergency dark:bg-emergency text-rose-700 dark:text-rose-200 border-rose-200 dark:border-rose-900";
        case "VACATION":
          return baseClass + "bg-vacation dark:bg-vacation text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-900";
        default:
          return baseClass + "bg-personal dark:bg-personal text-sky-700 dark:text-sky-200 border-sky-200 dark:border-sky-900";
      }
    }

    return {
      className: baseClass + "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-100 dark:border-slate-700 shadow-sm border-l-4",
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
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="py-4 text-center text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest bg-slate-50/30 dark:bg-slate-900/50">
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
                className={`p-3 border-r border-b border-slate-100 dark:border-slate-700 last:border-r-0 relative transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50 ${
                  !isSameMonth(day, monthStart) ? "bg-slate-50/30 dark:bg-slate-950/30 opacity-40" : ""      
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-bold ${
                    now && isSameDay(day, now)
                      ? "h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none"
                      : "text-slate-900 dark:text-slate-200"
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
                        className={`text-[10px] px-2 py-1 rounded-lg border truncate font-bold ${typeof styleData === 'string' ? styleData : styleData.className}`}
                        style={typeof styleData === 'object' ? styleData.style : {}}
                      >
                        {event.leaveType === 'SICK' ? <AlertTriangle className="h-2 w-2 inline mr-1" /> : event.type === 'blocked' ? <Lock className="h-2 w-2 inline mr-1" /> : null}
                        {format(event.start, "HH:mm")} {event.title}
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

  const renderDayView = () => {
    const dayEvents = events.filter(e => isSameDay(e.start, currentDate));
    const dayName = format(currentDate, "EEEE").toLowerCase();
    
    // Parse business hours if it's a JSON string
    const parsedBizHours = typeof businessHours === 'string' ? JSON.parse(businessHours) : businessHours;
    const bizHours = parsedBizHours?.[dayName];

    // Calculate total slots based on duration
    const totalSlots = (24 * 60) / slotDuration;
    const slots = Array.from({ length: totalSlots }, (_, i) => i);

    // Calculate Now Line position
    const isTodayShowNow = now && isSameDay(currentDate, now);
    const nowHour = now ? now.getHours() : 0;
    const nowMin = now ? now.getMinutes() : 0;
    const nowTop = (nowHour * 60 + nowMin) * pixelsPerMinute;

    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        <div className="flex-1 relative p-0 overflow-y-auto bg-white dark:bg-slate-950">
           {isTodayShowNow && now && (
             <div 
               className="absolute left-0 right-0 z-30 flex items-center pointer-events-none" 
               style={{ top: `${nowTop}px` }}
             >
               <div className="w-[80px]"></div> {/* Spacer for time column */}
               <div className="h-2.5 w-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400 -ml-1.5 shadow-[0_0_10px_rgba(79,70,229,0.5)] animate-pulse"></div>
               <div className="flex-1 h-0.5 bg-indigo-600/40 dark:bg-indigo-400/30 shadow-[0_0_8px_rgba(79,70,229,0.2)]"></div>
             </div>
           )}

           {slots.map(slotIdx => {
              const totalMinutes = slotIdx * slotDuration;
              const hour = Math.floor(totalMinutes / 60);
              const minute = totalMinutes % 60;
              const currentSlotTime = parse(`${hour}:${minute}`, "H:m", currentDate);
              
              const isClosed = businessHours && (!bizHours || !bizHours.start || !bizHours.end || (
                isBefore(currentSlotTime, parse(bizHours.start, "HH:mm", currentDate)) ||
                !isBefore(currentSlotTime, parse(bizHours.end === "00:00" ? "23:59" : bizHours.end, "HH:mm", currentDate))
              ));

              // Visual hierarchy: show all labels but dim the sub-slots
              const isMainHour = minute === 0;

              return (
                <div 
                  key={slotIdx} 
                  className={`flex border-b border-slate-100 dark:border-slate-700 group relative transition-colors ${isClosed ? 'bg-zebra cursor-not-allowed' : 'bg-white dark:bg-slate-900 cursor-crosshair hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10'}`}
                  style={{ 
                    height: `${slotHeight}px`,
                    backgroundPositionY: isClosed ? `-${slotIdx * slotHeight}px` : undefined
                  }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, currentSlotTime)}
                  onClick={() => !isClosed && onSlotClick?.(currentSlotTime)}
                >
                    <span className={`w-[80px] p-2 text-[10px] whitespace-nowrap uppercase tracking-tight text-left pl-4 border-r border-slate-100 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 ${isMainHour ? 'font-black text-slate-600 dark:text-slate-300' : 'font-bold text-slate-400 dark:text-slate-500'}`}>
                      {format(currentSlotTime, "h:mm a")}
                    </span>
                    <div className="flex-1 relative">
                       <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none gap-2">
                          {isClosed ? (
                            <>
                              <Lock className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                              <span className="text-[10px] font-medium text-slate-900 dark:text-white bg-white dark:bg-slate-900/80 px-2 py-0.5 rounded-full shadow-md border border-slate-400 dark:border-indigo-500/50 animate-in fade-in zoom-in duration-150">
                                Closed ({format(currentSlotTime, "h:mm a")})
                              </span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3 text-indigo-400" />
                              <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-300 bg-white dark:bg-indigo-950/50 px-2 py-0.5 rounded-full shadow-sm border border-indigo-100 dark:border-indigo-500/30 animate-in fade-in zoom-in duration-150">
                                {format(currentSlotTime, "h:mm a")}
                              </span>
                            </>
                          )}
                       </div>
                    </div>
                </div>
              );
           })}

           {dayEvents.map(event => {
             const startTotalMinutes = event.start.getHours() * 60 + event.start.getMinutes();
             const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60);
             const top = startTotalMinutes * pixelsPerMinute;
             const height = duration * pixelsPerMinute;

             const styleData = getEventStyle(event);

             return (
               <div
                 key={event.id}
                 draggable={event.type !== 'blocked'}
                 onDragStart={(e) => handleDragStart(e, event.id)}
                 onDragEnd={handleDragEnd}
                 className={`absolute left-[90px] right-8 rounded-2xl border p-4 shadow-sm overflow-hidden transition-all hover:scale-[1.01] z-10 cursor-move ${draggedEventId === event.id ? 'opacity-50 ring-2 ring-indigo-500 ring-offset-2' : ''} ${typeof styleData === 'string' ? styleData : styleData.className}`}  
                 style={{
                   top: `${top}px`,
                   height: `${height}px`,
                   minHeight: '30px',
                   ...(typeof styleData === 'object' ? styleData.style : {})
                 }}
               >
                 <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                       {event.leaveType === 'SICK' || event.leaveType === 'EMERGENCY' ? <AlertTriangle className="h-3.5 w-3.5" /> : event.type === 'blocked' ? <Lock className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                       <span className="text-[10px] font-black uppercase tracking-tight opacity-80">
                         {format(event.start, "h:mm a")} - {format(event.end, "h:mm a")}
                       </span>
                    </div>
                    {event.status === 'PENDING' && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[8px] font-black">PENDING</span>
                    )}
                 </div>
                 <h4 className="text-sm font-black mt-1 leading-tight">{event.title}</h4>
                 <div className="flex items-center gap-4 mt-2">
                    {event.resourceName && (
                      <p className="text-[9px] font-bold flex items-center gap-1 opacity-70">
                        <User className="h-2.5 w-2.5" /> {event.resourceName}
                      </p>
                    )}
                 </div>
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
    const parsedBizHours = typeof businessHours === 'string' ? JSON.parse(businessHours) : businessHours;
    const totalSlots = (24 * 60) / slotDuration;
    const slots = Array.from({ length: totalSlots }, (_, i) => i);
    const isThisWeek = now && isWithinInterval(now, { start: startDate, end: addDays(startDate, 6) });
    const nowTop = now ? (now.getHours() * 60 + now.getMinutes()) * pixelsPerMinute : 0;

    return (
      <div className="flex-1 min-h-0 overflow-auto relative bg-white dark:bg-slate-950">
        <div className="grid" style={{ gridTemplateColumns: '80px repeat(7, 1fr)', minWidth: '800px' }}>
          
          {/* Header Row - Sticky Top */}
          <div className="sticky top-0 z-50 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center p-4 border-r dark:border-slate-700">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Week</p>
            <p className="text-lg font-black text-slate-900 dark:text-slate-200">{format(startDate, "w")}</p>
          </div>
          {weekDays.map((day, i) => (
            <div key={day.toString()} className={`sticky top-0 z-40 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-r border-slate-100 dark:border-slate-700 p-4 text-center ${i === 6 ? 'border-r-0' : ''} ${now && isSameDay(day, now) ? 'bg-indigo-50/30 dark:bg-indigo-900/20' : ''}`}>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{format(day, "EEE")}</p>
               <p className={`text-lg font-black ${now && isSameDay(day, now) ? "text-indigo-600 dark:text-indigo-400" : "text-slate-900 dark:text-slate-200"}`}>{format(day, "d")}</p>
            </div>
          ))}

          {/* Time Labels Column - Sticky Left */}
          <div className="sticky left-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-r border-slate-100 dark:border-slate-700">
             {slots.map(slotIdx => {
               const totalMinutes = slotIdx * slotDuration;
               const minute = totalMinutes % 60;
               const isMainHour = minute === 0;
               const currentSlotTime = parse(`${Math.floor(totalMinutes / 60)}:${minute}`, "H:m", new Date());
               return (
                <div key={slotIdx} className={`border-b border-slate-100 dark:border-slate-700 p-2 text-[10px] whitespace-nowrap uppercase tracking-tight text-left pl-3 flex items-center ${isMainHour ? 'font-black text-slate-600 dark:text-slate-300' : 'font-bold text-slate-400 dark:text-slate-500'}`} style={{ height: `${slotHeight}px` }}>
                  {format(currentSlotTime, "h:mm a")}
                </div>
               );
             })}
          </div>

          {/* Day Columns */}
          {weekDays.map((day, dayIdx) => {
             const dayEvents = events.filter(e => isSameDay(e.start, day));
             const dayName = format(day, "EEEE").toLowerCase();
             const bizHours = parsedBizHours?.[dayName];

             return (
               <div key={day.toString()} className={`relative border-r border-slate-100 dark:border-slate-700 ${dayIdx === 6 ? 'border-r-0' : ''}`}>
                  
                  {/* Grid Lines & Background */}
                  <div className="absolute inset-0 z-0">
                    {slots.map(slotIdx => {
                      const totalMinutes = slotIdx * slotDuration;
                      const currentSlotTime = parse(`${Math.floor(totalMinutes / 60)}:${totalMinutes % 60}`, "H:m", day);
                      const isClosed = businessHours && (!bizHours || !bizHours.start || !bizHours.end || (
                        isBefore(currentSlotTime, parse(bizHours.start, "HH:mm", day)) ||
                        !isBefore(currentSlotTime, parse(bizHours.end === "00:00" ? "23:59" : bizHours.end, "HH:mm", day))
                      ));

                      const isMainHour = (totalMinutes % 60) === 0;

                      return (
                        <div 
                          key={slotIdx} 
                          className={`border-b border-slate-100 dark:border-slate-700 transition-colors group relative ${isClosed ? 'bg-zebra cursor-not-allowed' : 'hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 cursor-crosshair'}`}
                          style={{ 
                            height: `${slotHeight}px`,
                            backgroundPositionY: isClosed ? `-${slotIdx * slotHeight}px` : undefined
                          }}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, currentSlotTime)}
                          onClick={() => !isClosed && onSlotClick?.(currentSlotTime)}
                        >
                           <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none gap-2">
                              {isClosed ? (
                                <>
                                  <Lock className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                                  <span className="text-[10px] font-medium text-slate-900 dark:text-white bg-white dark:bg-slate-900/80 px-2 py-0.5 rounded-full shadow-md border border-slate-400 dark:border-indigo-500/50 animate-in fade-in zoom-in duration-150">
                                    Closed ({format(currentSlotTime, "h:mm a")})
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Plus className="h-3 w-3 text-indigo-400" />
                                  <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-300 bg-white dark:bg-indigo-950/50 px-2 py-0.5 rounded-full shadow-sm border border-indigo-100 dark:border-indigo-900/50 animate-in fade-in zoom-in duration-150">
                                    {format(currentSlotTime, "h:mm a")}
                                  </span>
                                </>
                              )}
                           </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Now Line (Only if today) */}
                  {now && isSameDay(day, now) && (
                    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${nowTop}px` }}>
                       <div className="h-0.5 bg-indigo-600 dark:bg-indigo-400 relative">
                          <div className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse shadow-[0_0_10px_rgba(79,70,229,0.5)]"></div>
                       </div>
                    </div>
                  )}

                  {/* Events Overlay */}
                  <div className="relative z-10 mx-1">
                    {dayEvents.map(event => {
                      const startTotalMinutes = event.start.getHours() * 60 + event.start.getMinutes();
                      const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60);
                      const top = startTotalMinutes * pixelsPerMinute;
                      const height = duration * pixelsPerMinute;
                      const styleData = getEventStyle(event);

                      return (
                        <div
                          key={event.id}
                          draggable={event.type !== 'blocked'}
                          onDragStart={(e) => handleDragStart(e, event.id)}
                          onDragEnd={handleDragEnd}
                          className={`absolute left-0 right-0 rounded-xl border p-2 shadow-sm overflow-hidden cursor-move transition-all hover:z-30 hover:scale-[1.02] ${draggedEventId === event.id ? 'opacity-50 ring-2 ring-indigo-500' : ''} ${typeof styleData === 'string' ? styleData : styleData.className}`}
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            minHeight: '25px',
                            ...(typeof styleData === 'object' ? styleData.style : {})
                          }}
                        >
                          <p className="text-[9px] font-black leading-tight line-clamp-2">{event.title}</p>    
                          {height > 30 && <p className="text-[8px] font-bold opacity-70 mt-0.5">{format(event.start, "H:mm")}</p>}
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
    const dayName = format(currentDate, "EEEE").toLowerCase();
    const parsedBizHours = typeof businessHours === 'string' ? JSON.parse(businessHours) : businessHours;
    const bizHours = parsedBizHours?.[dayName];
    const totalSlots = (24 * 60) / slotDuration;
    const slots = Array.from({ length: totalSlots }, (_, i) => i);
    const isTodayShowNow = now && isSameDay(currentDate, now);
    const nowTop = now ? (now.getHours() * 60 + now.getMinutes()) * pixelsPerMinute : 0;

    return (
      <div className="flex-1 min-h-0 overflow-auto relative bg-white dark:bg-slate-950">
        <div className="grid" style={{ gridTemplateColumns: `80px repeat(${staffList.length}, 1fr)`, minWidth: `${Math.max(800, staffList.length * 200)}px` }}>
          
          {/* Header Row */}
          <div className="sticky top-0 z-50 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center p-4 border-r dark:border-slate-700">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Team</p>
            <p className="text-lg font-black text-slate-900 dark:text-slate-200">{staffList.length}</p>
          </div>
          {staffList.map((staff, i) => (
            <div key={staff.id} className={`sticky top-0 z-40 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-r border-slate-100 dark:border-slate-700 p-4 text-center ${i === staffList.length - 1 ? 'border-r-0' : ''}`}>
               <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[10px] font-black" style={{ backgroundColor: staff.color }}>
                    {staff.name.substring(0, 2).toUpperCase()}
                  </div>
                  <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider truncate w-full">{staff.name}</p>
               </div>
            </div>
          ))}

          {/* Time Column */}
          <div className="sticky left-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-r border-slate-100 dark:border-slate-700">
             {slots.map(slotIdx => {
               const totalMinutes = slotIdx * slotDuration;
               const minute = totalMinutes % 60;
               const isMainHour = minute === 0;
               const currentSlotTime = parse(`${Math.floor(totalMinutes / 60)}:${minute}`, "H:m", currentDate);
               return (
                <div key={slotIdx} className={`border-b border-slate-100 dark:border-slate-700 p-2 text-[10px] whitespace-nowrap uppercase tracking-tight text-left pl-3 flex items-center ${isMainHour ? 'font-black text-slate-600 dark:text-slate-300' : 'font-bold text-slate-400 dark:text-slate-500'}`} style={{ height: `${slotHeight}px` }}>
                  {format(currentSlotTime, "h:mm a")}
                </div>
               );
             })}
          </div>

          {/* Staff Columns */}
          {staffList.map((staff, staffIdx) => {
             const staffEvents = dayEvents.filter(e => e.resourceName === staff.name);
             const staffAvailability = typeof staff.availabilityJson === 'string' ? JSON.parse(staff.availabilityJson) : staff.availabilityJson;
             const staffDaySchedule = staffAvailability?.[dayName];

             return (
               <div key={staff.id} className={`relative border-r border-slate-100 dark:border-slate-700 ${staffIdx === staffList.length - 1 ? 'border-r-0' : ''}`}>
                  
                  {/* Grid Lines */}
                  <div className="absolute inset-0 z-0">
                    {slots.map(slotIdx => {
                      const totalMinutes = slotIdx * slotDuration;
                      const hour = Math.floor(totalMinutes / 60);
                      const minute = totalMinutes % 60;
                      const currentSlotTime = parse(`${hour}:${minute}`, "H:m", currentDate);
                      
                      const isBizClosed = businessHours && (!bizHours || !bizHours.start || !bizHours.end || (
                        isBefore(currentSlotTime, parse(bizHours.start, "HH:mm", currentDate)) ||
                        !isBefore(currentSlotTime, parse(bizHours.end === "00:00" ? "23:59" : bizHours.end, "HH:mm", currentDate))
                      ));

                      const isStaffOff = !staffDaySchedule || !staffDaySchedule.start || !staffDaySchedule.end || (
                        isBefore(currentSlotTime, parse(staffDaySchedule.start, "HH:mm", currentDate)) ||
                        !isBefore(currentSlotTime, parse(staffDaySchedule.end === "00:00" ? "23:59" : staffDaySchedule.end, "HH:mm", currentDate))
                      );

                      const isDisabled = isBizClosed || isStaffOff;

                      const isMainHour = minute === 0;

                      return (
                        <div 
                          key={slotIdx} 
                          className={`border-b border-slate-100 dark:border-slate-700 transition-colors group relative ${isDisabled ? 'bg-zebra cursor-not-allowed' : 'hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 cursor-crosshair'}`}
                          style={{ 
                            height: `${slotHeight}px`,
                            backgroundPositionY: isDisabled ? `-${slotIdx * slotHeight}px` : undefined
                          }}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, currentSlotTime, staff.id)}
                          onClick={() => !isDisabled && onSlotClick?.(currentSlotTime, staff.id)}
                        >
                           <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none gap-2">
                              {isDisabled ? (
                                <>
                                  <Lock className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                                  <span className="text-[10px] font-medium text-slate-900 dark:text-white bg-white dark:bg-slate-900/80 px-2 py-0.5 rounded-full shadow-md border border-slate-400 dark:border-indigo-500/50 animate-in fade-in zoom-in duration-150">
                                    Closed ({format(currentSlotTime, "h:mm a")})
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Plus className="h-3 w-3 text-indigo-400" />
                                  <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-300 bg-white dark:bg-indigo-950/50 px-2 py-0.5 rounded-full shadow-sm border border-indigo-100 dark:border-indigo-900/50 animate-in fade-in zoom-in duration-150">
                                    {format(currentSlotTime, "h:mm a")}
                                  </span>
                                </>
                              )}
                           </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Now Line */}
                  {isTodayShowNow && (
                    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${nowTop}px` }}>
                       <div className="h-0.5 bg-indigo-600 dark:bg-indigo-400" />
                    </div>
                  )}

                  {/* Events */}
                  <div className="relative z-10 mx-1">
                    {staffEvents.map(event => {
                      const startTotalMinutes = event.start.getHours() * 60 + event.start.getMinutes();
                      const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60);
                      const top = startTotalMinutes * pixelsPerMinute;
                      const height = duration * pixelsPerMinute;
                      const styleData = getEventStyle(event);

                      return (
                        <div 
                          key={event.id}
                          draggable={event.type !== 'blocked'}
                          onDragStart={(e) => handleDragStart(e, event.id)}
                          onDragEnd={handleDragEnd}
                          className={`absolute left-0 right-0 rounded-xl border p-2 shadow-sm overflow-hidden z-[5] cursor-move transition-all hover:z-30 hover:scale-[1.02] ${draggedEventId === event.id ? 'opacity-50 ring-2 ring-indigo-500' : ''} ${typeof styleData === 'string' ? styleData : styleData.className}`}
                          style={{ 
                            top: `${top}px`, 
                            height: `${height}px`, 
                            minHeight: '25px',
                            ...(typeof styleData === 'object' ? styleData.style : {})
                          }}
                        >
                          <p className="text-[9px] font-black leading-tight">{event.title}</p>
                          {height > 30 && <p className="text-[8px] font-bold opacity-70 mt-0.5">{format(event.start, "h:mm a")}</p>}
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
    <div className="h-full flex flex-col min-h-0 animate-fade-in">
      {view === "month" && renderMonthView()}
      {view === "week" && renderWeekView()}
      {view === "day" && renderDayView()}
      {view === "team" && renderTeamView()}
    </div>
  );
}
