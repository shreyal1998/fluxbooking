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
  isToday,
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
  externalViewMode = "calendar",
  onSlotClick,
  // New props for lifted state
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

  // Update "Now" line every minute and avoid hydration mismatch
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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
      className: baseClass + "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700 shadow-sm border-l-4",
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
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="py-4 text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-50/30 dark:bg-slate-900/50">
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
                className={`p-3 border-r border-b border-slate-100 dark:border-slate-800 last:border-r-0 relative transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50 ${
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
    const isTodayShowNow = isToday(currentDate) && now;
    const nowHour = now ? now.getHours() : 0;
    const nowMin = now ? now.getMinutes() : 0;
    const nowTop = (nowHour * 60 + nowMin) * pixelsPerMinute;

    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        <div className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-40 p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
               <CalendarIcon className="h-5 w-5" />
             </div>
             <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{format(currentDate, "EEEE, MMMM do")}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{dayEvents.length} active events</p>
             </div>
          </div>
        </div>
        <div className="flex-1 relative p-0 overflow-y-auto bg-zebra">
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
                  className={`flex border-b border-slate-100 dark:border-slate-800 group relative ${isClosed ? '' : 'bg-white dark:bg-slate-900 cursor-crosshair hover:bg-slate-50/50 dark:hover:bg-slate-800/30'}`}
                  style={{ height: `${slotHeight}px` }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, currentSlotTime)}
                  onClick={() => !isClosed && onSlotClick?.(currentSlotTime)}
                >
                    <span className={`w-[80px] p-2 text-[10px] whitespace-nowrap uppercase tracking-tight text-left pl-4 border-r border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 ${isMainHour ? 'font-black text-slate-600 dark:text-slate-300' : 'font-bold text-slate-400 dark:text-slate-500'}`}>
                      {format(currentSlotTime, "h:mm a")}
                    </span>
                    <div className="flex-1 relative">
                       {!isClosed && (
                         <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none">
                            <Plus className="h-4 w-4 text-indigo-400" />
                         </div>
                       )}
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

    // Parse business hours if it's a JSON string
    const parsedBizHours = typeof businessHours === 'string' ? JSON.parse(businessHours) : businessHours;

    // Calculate Now Line position
    const isThisWeek = now && isWithinInterval(now, { start: startDate, end: addDays(startDate, 6) });
    const nowHour = now ? now.getHours() : 0;
    const nowMin = now ? now.getMinutes() : 0;
    const nowTop = (nowHour * 60 + nowMin) * pixelsPerMinute;

    // Calculate total slots based on duration
    const totalSlots = (24 * 60) / slotDuration;
    const slots = Array.from({ length: totalSlots }, (_, i) => i);

    return (
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="grid border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50 sticky top-0 z-40" style={{ gridTemplateColumns: '80px repeat(7, 1fr)' }}>
          <div className="p-4 border-r border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex flex-col items-center justify-center">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Week</p>
            <p className="text-lg font-black text-slate-900 dark:text-slate-200">{format(startDate, "w")}</p>
          </div>
          {weekDays.map(day => (
            <div key={day.toString()} className={`p-4 text-center border-r border-slate-100 dark:border-slate-800 last:border-r-0 ${isToday(day) ? 'bg-indigo-50/30 dark:bg-indigo-900/20' : 'bg-white/50 dark:bg-slate-900/50'}`}>
               <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{format(day, "EEE")}</p>
               <p className={`text-lg font-black ${isToday(day) ? "text-indigo-600 dark:text-indigo-400" : "text-slate-900 dark:text-slate-200"}`}>{format(day, "d")}</p>
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto relative" style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)' }}>
           <div className="border-r border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 sticky left-0 z-20">
             {slots.map(slotIdx => {
               const totalMinutes = slotIdx * slotDuration;
               const minute = totalMinutes % 60;
               const isMainHour = minute === 0;
               const currentSlotTime = parse(`${Math.floor(totalMinutes / 60)}:${minute}`, "H:m", new Date());

               return (
                <div key={slotIdx} className={`border-b border-slate-100 dark:border-slate-800 p-2 text-[10px] whitespace-nowrap uppercase tracking-tight text-left pl-3 ${isMainHour ? 'font-black text-slate-600 dark:text-slate-300' : 'font-bold text-slate-400 dark:text-slate-500'}`} style={{ height: `${slotHeight}px` }}>
                  {format(currentSlotTime, "h:mm a")}
                </div>
               );
             })}
           </div>

           {isThisWeek && now && (
             <div 
               className="absolute left-0 right-0 z-30 flex items-center pointer-events-none" 
               style={{ top: `${nowTop}px` }}
             >
               <div className="w-[80px]"></div> {/* Exact match for 80px time column */}
               <div className="h-2.5 w-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400 -ml-1.5 shadow-[0_0_10px_rgba(79,70,229,0.5)] animate-pulse"></div>
               <div className="flex-1 h-0.5 bg-indigo-600/50 dark:bg-indigo-400/40 shadow-[0_0_8px_rgba(79,70,229,0.2)]"></div>
             </div>
           )}
           {weekDays.map(day => {
             const dayEvents = events.filter(e => isSameDay(e.start, day));
             const dayName = format(day, "EEEE").toLowerCase();
             const bizHours = parsedBizHours?.[dayName];

             return (
               <div key={day.toString()} className="col-span-1 border-r border-slate-100 dark:border-slate-800 last:border-r-0 relative bg-zebra">
                  {slots.map(slotIdx => {
                    const totalMinutes = slotIdx * slotDuration;
                    const hour = Math.floor(totalMinutes / 60);
                    const minute = totalMinutes % 60;
                    const currentSlotTime = parse(`${hour}:${minute}`, "H:m", day);
                    
                    const isClosed = businessHours && (!bizHours || !bizHours.start || !bizHours.end || (
                      isBefore(currentSlotTime, parse(bizHours.start, "HH:mm", day)) ||
                      !isBefore(currentSlotTime, parse(bizHours.end === "00:00" ? "23:59" : bizHours.end, "HH:mm", day))
                    ));
                    return (
                      <div 
                        key={slotIdx} 
                        className={`border-b border-slate-100 dark:border-slate-700 group relative ${isClosed ? '' : 'bg-white dark:bg-slate-900 cursor-crosshair hover:bg-slate-50/50 dark:hover:bg-slate-800/30'}`}
                        style={{ height: `${slotHeight}px` }}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, currentSlotTime)}
                        onClick={() => !isClosed && onSlotClick?.(currentSlotTime)}
                      >
                         {!isClosed && (
                           <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none">
                              <Plus className="h-3 w-3 text-indigo-400" />
                           </div>
                         )}
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
                        className={`absolute left-1 right-1 rounded-xl border p-2 shadow-sm overflow-hidden z-[5] cursor-move transition-all hover:z-30 hover:scale-105 ${draggedEventId === event.id ? 'opacity-50 ring-2 ring-indigo-500 ring-offset-1' : ''} ${typeof styleData === 'string' ? styleData : styleData.className}`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          minHeight: '25px',
                          ...(typeof styleData === 'object' ? styleData.style : {})
                        }}
                        title={`${event.title} (${format(event.start, "h:mm a")} - ${format(event.end, "h:mm a")})`}
                      >
                        <p className="text-[9px] font-black leading-tight line-clamp-2">{event.title}</p>    
                        {height > 30 && <p className="text-[8px] font-bold opacity-70 mt-0.5">{format(event.start, "H:mm")}</p>}
                      </div>
                    );
                  })}
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

    // Parse business hours if it's a JSON string
    const parsedBizHours = typeof businessHours === 'string' ? JSON.parse(businessHours) : businessHours;
    const bizHours = parsedBizHours?.[dayName];

    // Calculate total slots based on duration
    const totalSlots = (24 * 60) / slotDuration;
    const slots = Array.from({ length: totalSlots }, (_, i) => i);

    // Calculate Now Line position
    const isTodayShowNow = isToday(currentDate) && now;
    const nowHour = now ? now.getHours() : 0;
    const nowMin = now ? now.getMinutes() : 0;
    const nowTop = (nowHour * 60 + nowMin) * pixelsPerMinute;

    return (
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
        <div className="flex-1 overflow-x-auto scrollbar-hide">
          <div className="min-w-[800px] h-full flex flex-col">
            <div className="grid border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50 sticky top-0 z-40" style={{ gridTemplateColumns: `80px repeat(${staffList.length}, 1fr)` }}>
              <div className="p-4 border-r border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 sticky left-0 z-50 flex flex-col items-center justify-center">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Team</p>
                <p className="text-lg font-black text-slate-900 dark:text-slate-200">{staffList.length}</p>
              </div>
              {staffList.map(staff => (
                <div key={staff.id} className="p-4 text-center border-r border-slate-100 dark:border-slate-800 last:border-r-0 bg-white/50 dark:bg-slate-900/50">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[10px] font-black" style={{ backgroundColor: staff.color }}>
                      {staff.name.substring(0, 2).toUpperCase()}
                    </div>
                    <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider truncate w-full">{staff.name}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex-1 overflow-y-auto relative" style={{ display: 'grid', gridTemplateColumns: `80px repeat(${staffList.length}, 1fr)` }}>
              {isTodayShowNow && now && (
                <div 
                  className="absolute left-0 right-0 z-30 flex items-center pointer-events-none" 
                  style={{ top: `${nowTop}px` }}
                >
                  <div className="w-[80px]"></div> {/* Spacer for fixed time column */}
                  <div className="h-2.5 w-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400 -ml-1.5 shadow-[0_0_10px_rgba(79,70,229,0.5)] animate-pulse"></div>
                  <div className="flex-1 h-0.5 bg-indigo-600/50 dark:bg-indigo-400/40 shadow-[0_0_8px_rgba(79,70,229,0.2)]"></div>
                </div>
              )}

              <div className="border-r border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 sticky left-0 z-10">
                {slots.map(slotIdx => {
                  const totalMinutes = slotIdx * slotDuration;
                  const minute = totalMinutes % 60;
                  const isMainHour = minute === 0;
                  const currentSlotTime = parse(`${Math.floor(totalMinutes / 60)}:${minute}`, "H:m", currentDate);

                  return (
                    <div key={slotIdx} className={`border-b border-slate-100 dark:border-slate-800 p-2 text-[10px] whitespace-nowrap uppercase tracking-tight text-left pl-3 ${isMainHour ? 'font-black text-slate-600 dark:text-slate-300' : 'font-bold text-slate-400 dark:text-slate-500'}`} style={{ height: `${slotHeight}px` }}>
                      {format(currentSlotTime, "h:mm a")}
                    </div>
                  );
                })}
              </div>

              {staffList.map((staff, staffIdx) => {
                const staffEvents = dayEvents.filter(e => e.resourceName === staff.name);
                const staffAvailability = typeof staff.availabilityJson === 'string' ? JSON.parse(staff.availabilityJson) : staff.availabilityJson;
                const staffDaySchedule = staffAvailability?.[dayName];

                return (
                  <div key={staff.id} className="border-r border-slate-100 dark:border-slate-800 last:border-r-0 relative">
                      {slots.map(slotIdx => {
                        const totalMinutes = slotIdx * slotDuration;
                        const hour = Math.floor(totalMinutes / 60);
                        const minute = totalMinutes % 60;
                        const currentSlotTime = parse(`${hour}:${minute}`, "H:m", currentDate);
                        
                        // Business closure check
                        const isBizClosed = businessHours && (!bizHours || !bizHours.start || !bizHours.end || (
                          isBefore(currentSlotTime, parse(bizHours.start, "HH:mm", currentDate)) ||
                          !isBefore(currentSlotTime, parse(bizHours.end === "00:00" ? "23:59" : bizHours.end, "HH:mm", currentDate))
                        ));

                        // Staff availability check
                        const isStaffOff = !staffDaySchedule || !staffDaySchedule.start || !staffDaySchedule.end || (
                          isBefore(currentSlotTime, parse(staffDaySchedule.start, "HH:mm", currentDate)) ||
                          !isBefore(currentSlotTime, parse(staffDaySchedule.end === "00:00" ? "23:59" : staffDaySchedule.end, "HH:mm", currentDate))
                        );

                        const isDisabled = isBizClosed || isStaffOff;

                        return (
                          <div 
                            key={slotIdx} 
                            className={`border-b border-slate-100 dark:border-slate-700 group relative ${isDisabled ? '' : 'bg-white dark:bg-slate-900 cursor-crosshair hover:bg-slate-50/50 dark:hover:bg-slate-800/30'}`}
                            style={{ height: `${slotHeight}px` }}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, currentSlotTime, staff.id)}
                            onClick={() => !isDisabled && onSlotClick?.(currentSlotTime, staff.id)}
                          >
                            {!isDisabled && (
                              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none">
                                  <Plus className="h-3 w-3 text-indigo-400" />
                              </div>
                            )}
                          </div>
                        );
                      })}

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
                            className={`absolute left-1 right-1 rounded-xl border p-2 shadow-sm overflow-hidden z-[5] cursor-move transition-all hover:z-30 hover:scale-[1.02] ${draggedEventId === event.id ? 'opacity-50 ring-2 ring-indigo-500 ring-offset-1' : ''} ${typeof styleData === 'string' ? styleData : styleData.className}`}
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
                );
              })}
            </div>
          </div>
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