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
  startOfDay,
  endOfDay,
  addWeeks,
  subWeeks,
  isToday,
  parse,
  isWithinInterval,
  isBefore,
  isAfter,
  isEqual
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  MoreVertical,
  Plus,
  Lock,
  AlertTriangle,
  Info
} from "lucide-react";

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

export function CalendarView({
  initialEvents,
  userRole,
  staffList,
  businessHours,
  externalViewMode = "calendar"
}: {
  initialEvents: Event[],
  userRole: string,
  staffList: any[],
  businessHours?: any,
  externalViewMode?: "calendar" | "team" | "list"
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>(externalViewMode === "team" ? "team" : "week");
  const [events, setEvents] = useState<Event[]>(initialEvents);

  // Sync with external view mode changes
  useEffect(() => {
    if (externalViewMode === "team") setView("team");
    else if (externalViewMode === "calendar" && view === "team") setView("week");
  }, [externalViewMode]);

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

  const next = () => {
    if (view === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const prev = () => {
    if (view === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const renderHeader = () => (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-4">
        <h3 className="text-2xl font-black text-slate-900 dark:text-white min-w-[200px]">
          {format(currentDate, view === "day" || view === "team" ? "MMMM d, yyyy" : "MMMM yyyy")}
        </h3>
        <div className="flex items-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-1 shadow-sm">
          <button onClick={prev} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors border-x border-slate-100 dark:border-slate-800">
            Today
          </button>
          <button onClick={next} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-900/50 p-1.5 rounded-[1.25rem] border border-slate-200/50 dark:border-slate-800">
        {(["month", "week", "day", "team"] as ViewType[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-6 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
              view === v
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700"
                : "text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"        
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-soft overflow-hidden transition-colors">
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="py-4 text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-50/50 dark:bg-slate-900/50">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-[120px]">
          {calendarDays.map((day, idx) => {
            const dayEvents = events.filter(e => isSameDay(e.start, day));
            return (
              <div
                key={idx}
                className={`p-3 border-r border-b border-slate-100 dark:border-slate-800 relative transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50 ${
                  !isSameMonth(day, monthStart) ? "bg-slate-50/30 dark:bg-slate-950/30 opacity-40" : ""      
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-bold ${
                    isToday(day)
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
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayEvents = events.filter(e => isSameDay(e.start, currentDate));
    const dayName = format(currentDate, "EEEE").toLowerCase();
    const bizHours = businessHours?.[dayName];

    return (
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-soft overflow-hidden flex flex-col h-[600px] overflow-y-auto transition-colors">
        <div className="sticky top-0 bg-white dark:bg-slate-900 z-20 p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
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
        <div className="flex-1 relative p-0">
           {hours.map(hour => {
              const currentHourTime = parse(`${hour}:00`, "H:mm", currentDate);
              const isClosed = bizHours && (
                isBefore(currentHourTime, parse(bizHours.start, "HH:mm", currentDate)) ||
                isAfter(addDays(currentHourTime, 0), parse(bizHours.end, "HH:mm", currentDate))
              );

              return (
                <div key={hour} className={`flex border-b border-slate-50 dark:border-slate-800 h-20 group relative ${isClosed ? 'bg-zebra dark:bg-zebra' : ''}`}>
                    <span className="w-20 text-[10px] font-black text-slate-300 dark:text-slate-600 p-4 uppercase tracking-tighter border-r border-slate-50 dark:border-slate-800">
                      {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                    </span>
                    <div className="flex-1 relative">
                       {isClosed && hour % 4 === 0 && (
                         <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest pointer-events-none">Business Closed</span>
                       )}
                    </div>
                </div>
              );
           })}

           {dayEvents.map(event => {
             const startHour = event.start.getHours();
             const startMin = event.start.getMinutes();
             const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60);
             const top = (startHour * 80) + (startMin * 1.33);
             const height = duration * 1.33;

             const styleData = getEventStyle(event);

             return (
               <div
                 key={event.id}
                 className={`absolute left-24 right-8 rounded-2xl border p-4 shadow-md overflow-hidden transition-transform hover:scale-[1.01] z-10 ${typeof styleData === 'string' ? styleData : styleData.className}`}  
                 style={{
                   top: `${top}px`,
                   height: `${height}px`,
                   minHeight: '50px',
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

    return (
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-soft overflow-hidden flex flex-col transition-colors">
        <div className="grid grid-cols-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 sticky top-0 z-20">
          <div className="p-4 border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"></div>
          {weekDays.map(day => (
            <div key={day.toString()} className={`p-4 text-center border-r border-slate-100 dark:border-slate-800 last:border-r-0 ${isToday(day) ? 'bg-indigo-50/30 dark:bg-indigo-900/20' : 'bg-white dark:bg-slate-900'}`}>
               <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{format(day, "EEE")}</p>
               <p className={`text-lg font-black ${isToday(day) ? "text-indigo-600 dark:text-indigo-400" : "text-slate-900 dark:text-slate-200"}`}>{format(day, "d")}</p>
            </div>
          ))}
        </div>
        <div className="h-[600px] overflow-y-auto grid grid-cols-8 relative">
           <div className="col-span-1 border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky left-0 z-10">
             {Array.from({ length: 24 }).map((_, i) => (
               <div key={i} className="h-20 border-b border-slate-50 dark:border-slate-800 p-2 text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase text-right pr-4">
                 {i === 0 ? "12 AM" : i < 12 ? `${i} AM` : i === 12 ? "12 PM" : `${i - 12} PM`}
               </div>
             ))}
           </div>
           {weekDays.map(day => {
             const dayEvents = events.filter(e => isSameDay(e.start, day));
             const dayName = format(day, "EEEE").toLowerCase();
             const bizHours = businessHours?.[dayName];

             return (
               <div key={day.toString()} className="col-span-1 border-r border-slate-100 dark:border-slate-800 last:border-r-0 relative">
                  {Array.from({ length: 24 }).map((_, hour) => {
                    const currentHourTime = parse(`${hour}:00`, "H:mm", day);
                    const isClosed = bizHours && (
                      isBefore(currentHourTime, parse(bizHours.start, "HH:mm", day)) ||
                      isAfter(addDays(currentHourTime, 0), parse(bizHours.end, "HH:mm", day))
                    );
                    return <div key={hour} className={`h-20 border-b border-slate-50 dark:border-slate-800 ${isClosed ? 'bg-zebra dark:bg-zebra' : ''}`}></div>
                  })}

                  {dayEvents.map(event => {
                    const startHour = event.start.getHours();
                    const startMin = event.start.getMinutes();
                    const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60);
                    const top = (startHour * 80) + (startMin * 1.33);
                    const height = duration * 1.33;

                    const styleData = getEventStyle(event);

                    return (
                      <div
                        key={event.id}
                        className={`absolute left-1 right-1 rounded-xl border p-2 shadow-sm overflow-hidden z-[5] cursor-pointer transition-all hover:z-30 hover:scale-105 ${typeof styleData === 'string' ? styleData : styleData.className}`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          minHeight: '35px',
                          ...(typeof styleData === 'object' ? styleData.style : {})
                        }}
                        title={`${event.title} (${format(event.start, "h:mm a")} - ${format(event.end, "h:mm a")})`}
                      >
                        <p className="text-[9px] font-black leading-tight line-clamp-2">{event.title}</p>    
                        {height > 40 && <p className="text-[8px] font-bold opacity-70 mt-0.5">{format(event.start, "H:mm")}</p>}
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
    const bizHours = businessHours?.[dayName];

    return (
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-soft overflow-hidden flex flex-col transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 sticky top-0 z-20" style={{ gridTemplateColumns: `80px repeat(${staffList.length}, 1fr)` }}>
          <div className="p-4 border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"></div>
          {staffList.map(staff => (
            <div key={staff.id} className="p-4 text-center border-r border-slate-100 dark:border-slate-800 last:border-r-0 bg-white dark:bg-slate-900">
               <div className="flex flex-col items-center gap-2">
                 <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[10px] font-black" style={{ backgroundColor: staff.color }}>
                   {staff.name.substring(0, 2).toUpperCase()}
                 </div>
                 <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider truncate w-full">{staff.name}</p>
               </div>
            </div>
          ))}
        </div>
        
        <div className="h-[600px] overflow-y-auto relative" style={{ display: 'grid', gridTemplateColumns: `80px repeat(${staffList.length}, 1fr)` }}>
           <div className="border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky left-0 z-10">
             {Array.from({ length: 24 }).map((_, i) => (
               <div key={i} className="h-20 border-b border-slate-50 dark:border-slate-800 p-2 text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase text-right pr-4">
                 {i === 0 ? "12 AM" : i < 12 ? `${i} AM` : i === 12 ? "12 PM" : `${i - 12} PM`}
               </div>
             ))}
           </div>

           {staffList.map((staff, staffIdx) => {
             const staffEvents = dayEvents.filter(e => e.resourceName === staff.name);
             const staffAvailability = typeof staff.availabilityJson === 'string' ? JSON.parse(staff.availabilityJson) : staff.availabilityJson;
             const staffDaySchedule = staffAvailability?.[dayName];

             return (
               <div key={staff.id} className="border-r border-slate-100 dark:border-slate-800 last:border-r-0 relative">
                  {Array.from({ length: 24 }).map((_, hour) => {
                    const currentHourTime = parse(`${hour}:00`, "H:mm", currentDate);
                    
                    // Business closure check
                    const isBizClosed = bizHours && (
                      isBefore(currentHourTime, parse(bizHours.start, "HH:mm", currentDate)) ||
                      isAfter(addDays(currentHourTime, 0), parse(bizHours.end, "HH:mm", currentDate))
                    );

                    // Staff availability check
                    const isStaffOff = !staffDaySchedule || (
                      isBefore(currentHourTime, parse(staffDaySchedule.start, "HH:mm", currentDate)) ||
                      isAfter(addDays(currentHourTime, 0), parse(staffDaySchedule.end, "HH:mm", currentDate))
                    );

                    return <div key={hour} className={`h-20 border-b border-slate-50 dark:border-slate-800 ${isBizClosed || isStaffOff ? 'bg-zebra dark:bg-zebra' : ''}`}></div>
                  })}

                  {staffEvents.map(event => {
                    const startHour = event.start.getHours();
                    const startMin = event.start.getMinutes();
                    const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60);
                    const top = (startHour * 80) + (startMin * 1.33);
                    const height = duration * 1.33;

                    const styleData = getEventStyle(event);

                    return (
                      <div 
                        key={event.id}
                        className={`absolute left-1 right-1 rounded-xl border p-2 shadow-sm overflow-hidden z-[5] cursor-pointer transition-all hover:z-30 hover:scale-[1.02] ${typeof styleData === 'string' ? styleData : styleData.className}`}
                        style={{ 
                          top: `${top}px`, 
                          height: `${height}px`, 
                          minHeight: '35px',
                          ...(typeof styleData === 'object' ? styleData.style : {})
                        }}
                      >
                        <p className="text-[9px] font-black leading-tight">{event.title}</p>
                        {height > 40 && <p className="text-[8px] font-bold opacity-70 mt-0.5">{format(event.start, "h:mm a")}</p>}
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

  return (
    <div className="animate-fade-in pb-20">
      {renderHeader()}
      {view === "month" && renderMonthView()}
      {view === "week" && renderWeekView()}
      {view === "day" && renderDayView()}
      {view === "team" && renderTeamView()}
    </div>
  );
}