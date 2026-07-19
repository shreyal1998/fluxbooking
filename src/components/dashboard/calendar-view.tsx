"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "next-themes";
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
  Sparkles,
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

interface PositionedEvent {
  event: Event;
  left: number;
  width: number;
}

function getPositionedEvents(columnEvents: Event[]): PositionedEvent[] {
  if (columnEvents.length === 0) return [];

  // Sort by start time, then duration descending
  const sorted = [...columnEvents].sort((a, b) => {
    const aStart = a.start.getTime();
    const bStart = b.start.getTime();
    if (aStart !== bStart) return aStart - bStart;
    return (b.end.getTime() - b.start.getTime()) - (a.end.getTime() - a.start.getTime());
  });

  const clusters: Event[][] = [];
  let currentCluster: Event[] = [];
  let clusterEnd = 0;

  for (const ev of sorted) {
    if (currentCluster.length === 0) {
      currentCluster.push(ev);
      clusterEnd = ev.end.getTime();
    } else if (ev.start.getTime() < clusterEnd) {
      currentCluster.push(ev);
      if (ev.end.getTime() > clusterEnd) {
        clusterEnd = ev.end.getTime();
      }
    } else {
      clusters.push(currentCluster);
      currentCluster = [ev];
      clusterEnd = ev.end.getTime();
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const result: PositionedEvent[] = [];

  for (const cluster of clusters) {
    const columns: Event[][] = [];

    for (const ev of cluster) {
      let placed = false;
      for (let colIdx = 0; colIdx < columns.length; colIdx++) {
        const colEvents = columns[colIdx];
        const lastEv = colEvents[colEvents.length - 1];
        if (ev.start.getTime() >= lastEv.end.getTime()) {
          colEvents.push(ev);
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([ev]);
      }
    }

    const colCount = columns.length;
    for (let colIdx = 0; colIdx < colCount; colIdx++) {
      for (const ev of columns[colIdx]) {
        result.push({
          event: ev,
          left: (colIdx / colCount) * 100,
          width: 100 / colCount
        });
      }
    }
  }

  return result;
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
  onScheduleToggle,
  scheduleViewStart,
  scheduleViewEnd
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
  staffFilter?: string | string[],
  mode?: "booking" | "schedule",
  onScheduleToggle?: (date: Date, type: 'block' | 'override' | 'remove-block' | 'remove-override', staffId?: string) => void,
  scheduleViewStart?: string,
  scheduleViewEnd?: string
}) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const [tooltipInfo, setTooltipInfo] = useState<{ event: Event; x: number; cardRight: number; y: number } | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const closeTimeoutRef = useRef<any>(null);

  const showTooltip = useCallback((event: Event, x: number, cardRight: number, y: number) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setTooltipInfo({ event, x, cardRight, y });
  }, []);

  const hideTooltip = useCallback(() => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setTooltipInfo(null);
    }, 150);
  }, []);

  const cancelTooltipHide = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const timeDisplayFormat = timeFormat === "24h" ? "HH:mm" : "h:mm a";

  // Sync state when props change
  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  // Close tooltip on scroll to prevent alignment issues
  useEffect(() => {
    if (!tooltipInfo) return;
    const handleScroll = () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      setTooltipInfo(null);
    };
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [tooltipInfo]);

  // Clean up closeTimeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

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
  const checkIsClosed = useCallback((date: Date, specificStaffId?: string | string[]) => {
    const isAll = !staffFilter || 
                  staffFilter === "all" || 
                  (Array.isArray(staffFilter) && (staffFilter.includes("all") || staffFilter.length === 0));
    const targetStaffId = specificStaffId || (isAll ? null : staffFilter);
    const currentMinutes = date.getHours() * 60 + date.getMinutes();

    const targetIds = targetStaffId 
      ? (Array.isArray(targetStaffId) ? targetStaffId : [targetStaffId])
      : (staffList.map(s => s.id));

    // If no staff list, fallback to business hours
    if (targetIds.length === 0) {
      // Check business hours only
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
            const bizEnd = (shift.end.startsWith("00:00") || shift.end === "24:00") ? 1440 : timeToMinutes(shift.end);
            return currentMinutes >= bizStart && currentMinutes < bizEnd;
          });
          return !isOpen;
        }
      }
      return false;
    }

    // Check availability per staff member.
    // The slot is open if AT LEAST ONE staff member in targetIds:
    // 1. Is scheduled to work (or has override) AND
    // 2. Is not explicitly blocked.
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayName = dayNames[getDay(date)];
    
    // First, check business hours. If the business is closed, everyone is closed!
    const bizHours = parseAvailability(businessHours);
    if (bizHours) {
      const val = bizHours[dayName] || bizHours[dayName.charAt(0).toUpperCase() + dayName.slice(1)];
      const isDayDefined = bizHours.hasOwnProperty(dayName) || bizHours.hasOwnProperty(dayName.charAt(0).toUpperCase() + dayName.slice(1));
      
      if (isDayDefined) {
        if (!val) return true;
        const shifts = Array.isArray(val) ? val : [val];
        if (shifts.length === 0) return true;

        const isBizOpen = shifts.some((shift: any) => {
          if (!shift.start || !shift.end) return false;
          const bizStart = timeToMinutes(shift.start);
          const bizEnd = (shift.end.startsWith("00:00") || shift.end === "24:00") ? 1440 : timeToMinutes(shift.end);
          return currentMinutes >= bizStart && currentMinutes < bizEnd;
        });

        if (!isBizOpen) return true;
      }
    }

    let isAnyStaffAvailable = false;

    for (const id of targetIds) {
      // A. Check if explicitly blocked for this staff
      const isBlocked = events.some(e => {
        if (e.type !== "blocked") return false;
        if (e.staffId !== id) return false;
        return date >= e.start && date < e.end;
      });

      if (isBlocked) continue; // Blocked, so this staff is not available

      // B. Check if has override for this staff
      const hasOverride = events.some(e => {
        if ((e.type as any) !== "availability-override") return false;
        if (e.staffId !== id) return false;
        return date >= e.start && date < e.end;
      });

      if (hasOverride) {
        isAnyStaffAvailable = true;
        break; // Override makes this staff available, so the slot is open!
      }

      // C. Check recurring schedule for this staff
      const staff = staffList.find(s => s.id === id);
      const staffHours = staff ? parseAvailability(staff.availabilityJson) : null;
      if (!staffHours) continue; // No schedule, so not available

      const val = staffHours[dayName] || staffHours[dayName.charAt(0).toUpperCase() + dayName.slice(1)];
      const isStaffDayDefined = staffHours.hasOwnProperty(dayName) || staffHours.hasOwnProperty(dayName.charAt(0).toUpperCase() + dayName.slice(1));
      
      if (!isStaffDayDefined || !val) continue; // Not working today
      
      const shifts = Array.isArray(val) ? val : [val];
      if (shifts.length === 0) continue;

      const isStaffOpen = shifts.some((shift: any) => {
        if (!shift.start || !shift.end) return false;
        const staffStart = timeToMinutes(shift.start);
        const staffEnd = (shift.end.startsWith("00:00") || shift.end === "24:00") ? 1440 : timeToMinutes(shift.end);
        return currentMinutes >= staffStart && currentMinutes < staffEnd;
      });

      if (isStaffOpen) {
        isAnyStaffAvailable = true;
        break; // Open and working, so slot is open!
      }
    }

    return !isAnyStaffAvailable;
  }, [businessHours, staffFilter, staffList, parseAvailability, events]);

  // Calculate the display range based on business hours or scheduleView overrides
  const displayRange = useMemo(() => {
    if (scheduleViewStart && scheduleViewEnd) {
      return {
        start: timeToMinutes(scheduleViewStart),
        end: scheduleViewEnd === "24:00" ? 1440 : timeToMinutes(scheduleViewEnd)
      };
    }

    const bizHours = parseAvailability(businessHours);
    if (!bizHours) return { start: 0, end: 1440 };

    let minMinutes = 1440;
    let maxMinutes = 0;

    Object.entries(bizHours).forEach(([key, val]: [string, any]) => {
      if (key === "scheduleView") return;
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

    // Expand range to include any loaded booking events that fall outside business hours
    if (Array.isArray(events)) {
      events.forEach((e) => {
        if (e && e.type === "booking" && e.start && e.end) {
          try {
            const start = e.start instanceof Date ? e.start : new Date(e.start);
            const end = e.end instanceof Date ? e.end : new Date(e.end);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              const startMin = start.getHours() * 60 + start.getMinutes();
              const endMin = end.getHours() * 60 + end.getMinutes();
              if (startMin < minMinutes) minMinutes = startMin;
              if (endMin > maxMinutes) maxMinutes = endMin;
            }
          } catch (err) {
            console.error("Error parsing event in displayRange:", err);
          }
        }
      });
    }

    // Fallback if no hours are defined
    if (maxMinutes <= minMinutes) return { start: 0, end: 1440 }; // 24 hours (12 AM to 12 AM)

    // EXACT HOURS - NO PADDING
    const finalStart = Math.max(0, minMinutes);
    const finalEnd = Math.min(1440, maxMinutes);

    return { start: finalStart, end: finalEnd };
  }, [businessHours, parseAvailability, scheduleViewStart, scheduleViewEnd, events]);

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
    const isPastEvent = isPast(event.end);
    
    if (event.type === "blocked") {
      return baseClass + "bg-zebra bg-slate-100 dark:bg-slate-900/50 text-transparent border-slate-300 dark:border-slate-600 shadow-none";
    }

    if (event.type === "availability-override") {
      return {
        className: baseClass + "bg-white dark:bg-slate-900 text-transparent border-none shadow-none",
        style: {}
      };
    }

    if (isPastEvent) {
      return {
        className: baseClass + "bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700 shadow-sm border-l-4",
        style: { borderLeftColor: event.color || "#6366f1" }
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
      <div className={`flex flex-col border border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-950 overflow-hidden shadow-sm ${mode === 'booking' ? '' : 'flex-1 min-h-0'}`}>
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="py-4 text-center text-[10px] font-bold text-black dark:text-white uppercase tracking-widest bg-slate-50/50 dark:bg-slate-900/50 border-r border-slate-200 dark:border-slate-800 last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        <div className={`grid grid-cols-7 ${mode === 'booking' ? '' : 'flex-1 overflow-y-auto'} auto-rows-[120px] premium-scrollbar`}>
          {calendarDays.map((day, idx) => {
            const dayEvents = events.filter(e => isSameDay(e.start, day) && e.type === 'booking');
            return (
              <div
                key={idx}
                className={`flex flex-col p-2 relative overflow-hidden transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20 ${
                  (idx + 1) % 7 === 0 ? "" : "border-r border-slate-200 dark:border-slate-800"
                } ${
                  idx >= calendarDays.length - 7 ? "" : "border-b border-slate-200 dark:border-slate-800"
                } ${
                  !isSameMonth(day, monthStart) ? "bg-slate-50/30 dark:bg-slate-950/20 opacity-40" : ""
                }`}
              >
                <div className="flex justify-between items-start mb-1 flex-shrink-0">
                  <span className={`text-sm font-normal ${
                    now && isSameDay(day, now)
                      ? "h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none"
                      : "text-black dark:text-white"
                  }`}>
                    {format(day, "d")}
                  </span>
                </div>
                <div className="flex flex-col gap-1 min-h-0 overflow-hidden flex-1">
                  {dayEvents.slice(0, 2).map((event) => {
                    const styleData = getEventStyle(event);
                    return (
                      <div
                        key={event.id}
                        className={`text-[10px] px-2 py-0.5 rounded-md border truncate font-normal flex-shrink-0 ${typeof styleData === 'string' ? styleData : styleData.className}`}
                        style={typeof styleData === 'object' ? styleData.style : {}}
                      >
                        {format(event.start, timeDisplayFormat)} {event.title.split(" - ")[0]}
                      </div>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 pl-1 flex-shrink-0 mt-0.5">
                      +{dayEvents.length - 2}
                    </span>
                  )}
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

    const isStaffFiltered = Array.isArray(staffFilter)
      ? (!staffFilter.includes("all") && staffFilter.length > 0)
      : (staffFilter !== "all");

    const getStaffFilterParam = () => {
      if (Array.isArray(staffFilter)) {
        return staffFilter.includes("all") ? undefined : staffFilter;
      }
      return staffFilter !== "all" ? staffFilter : undefined;
    };
    const staffFilterParam = getStaffFilterParam();

    const getSingleStaffParam = () => {
      if (Array.isArray(staffFilter)) {
        return staffFilter.length === 1 ? staffFilter[0] : undefined;
      }
      return staffFilter !== "all" ? staffFilter : undefined;
    };
    const singleStaffParam = getSingleStaffParam();

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

            <div className="flex flex-col relative z-0">
              {visibleSlots.map((slot, slotIdx) => {
                  const currentSlotTime = slot.time;

                  return (
                    <div 
                      key={slotIdx} 
                      className={`flex border-slate-300 dark:border-slate-600 transition-colors ${slotIdx === visibleSlots.length - 1 ? 'border-b-0' : 'border-b'}`}
                      style={{ height: `${slotHeight}px` }}
                    >
                        <span className="w-[80px] h-full p-2 pl-4 text-xs flex items-center justify-start border-r border-slate-300 dark:border-slate-600 bg-slate-100/95 dark:bg-slate-800/95 z-10 text-black dark:text-white">
                          {format(currentSlotTime, timeDisplayFormat)}
                        </span>
                        <div className="flex-1 h-full flex flex-col">
                           {(() => {
                            const subSlotsCount = mode === "booking" ? slotDuration / 15 : 1;
                            
                            return Array.from({ length: subSlotsCount }).map((_, subIdx) => {
                              const subSlotTime = addMinutes(currentSlotTime, subIdx * 15);
                              const existing = mode === "schedule" ? events.find(e => {
                                 if (e.type !== 'blocked' && (e.type as any) !== 'availability-override') return false;
                                 const isTimeMatch = subSlotTime >= e.start && subSlotTime < e.end;
                                 const isStaffMatch = isStaffFiltered
                                    ? (Array.isArray(staffFilter) ? staffFilter.includes(e.staffId || "") : e.staffId === staffFilter)
                                    : true;
                                 return isTimeMatch && isStaffMatch;
                              }) : null;

                               const isClosed = mode === "schedule" && existing
                                 ? existing.type === 'blocked'
                                 : checkIsClosed(subSlotTime, staffFilterParam);
                              const isPastSlot = isPast(subSlotTime, mode === "booking" ? 0 : slotDuration);

                              return (
                                 <div 
                                   key={subIdx}
                                   className={`flex-1 relative group transition-colors hover:z-40 ${isClosed ? 'bg-zebra bg-slate-100 dark:bg-slate-900 cursor-pointer' : isPastSlot ? `bg-slate-50 dark:bg-slate-900/80 cursor-pointer` : 'bg-white dark:bg-slate-900 cursor-pointer'} ${isPastSlot ? 'grayscale-[0.5]' : ''}`}
                                   style={{ backgroundPositionY: isClosed ? `-${((slot.minutes - displayRange.start) / slotDuration) * slotHeight + (subIdx * (slotHeight / subSlotsCount))}px` : undefined }}
                                   onDragOver={handleDragOver}
                                   onDrop={(e) => handleDrop(e, subSlotTime, singleStaffParam)}
                                   onClick={() => {
                                     if (mode === "schedule") {
                                       if (existing?.type === 'blocked') {
                                         onScheduleToggle?.(subSlotTime, 'remove-block', singleStaffParam);
                                       } else if ((existing?.type as any) === 'availability-override') {
                                         onScheduleToggle?.(subSlotTime, 'remove-override', singleStaffParam);
                                       } else if (isClosed) {
                                         onScheduleToggle?.(subSlotTime, 'override', singleStaffParam);
                                       } else {
                                         onScheduleToggle?.(subSlotTime, 'block', singleStaffParam);
                                       }
                                     } else if (!isPastSlot) {
                                       onSlotClick?.(subSlotTime, singleStaffParam);
                                     }
                                   }}
                                 >
                                    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none gap-2 z-50 transition-all duration-200 ${mode === 'booking' ? 'hidden' : 'opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100'}`}>
                                       {mode === "schedule" ? (
                                         (() => {
                                           const willMakeAvailable = (existing?.type === 'blocked') || (!existing && isClosed);
                                              return (
                                                <>
                                                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full shadow-xl border ${willMakeAvailable ? 'bg-emerald-600 border-emerald-500' : 'bg-rose-600 border-rose-500'}`}>
                                                    {willMakeAvailable ? <Plus className="h-3.5 w-3.5 text-white" /> : <Minus className="h-3.5 w-3.5 text-white" />}
                                                    <span className="text-[10px] font-bold text-white uppercase tracking-tight">
                                                      {willMakeAvailable ? "Make Available" : "Make Unavailable"}
                                                    </span>
                                                  </div>
                                                  {existing?.type === 'blocked' && (
                                                    <span className="text-[9px] font-black text-rose-600 dark:text-rose-450 bg-white/90 dark:bg-slate-900/90 px-2 py-0.5 rounded shadow-sm border border-rose-200/50 dark:border-rose-900/30">
                                                      Blocked: {existing.title}
                                                    </span>
                                                  )}
                                                </>
                                              );
                                         })()
                                       ) : isClosed ? (
                                          (() => {
                                            const blockEvent = events.find(e => 
                                              e.type === 'blocked' && 
                                              subSlotTime >= e.start && 
                                              subSlotTime < e.end &&
                                              (isStaffFiltered 
                                                ? (Array.isArray(staffFilter) ? staffFilter.includes(e.staffId || "") : e.staffId === staffFilter)
                                                : true)
                                            );
                                            const label = blockEvent?.title?.toLowerCase().includes("leave") ? "Leave" : "Closed";
                                            return (
                                              <div className="flex items-center justify-center h-6 px-3 py-0.5 bg-slate-800 dark:bg-slate-900 rounded-full shadow-md border border-slate-700 dark:border-slate-800 max-w-[150px] truncate">
                                                <span className="text-[10px] font-bold text-white uppercase tracking-tight truncate">{label}</span>
                                              </div>
                                            );
                                          })()
                                        ) : isPastSlot ? (
                                         <div className="flex items-center justify-center h-6 px-2.5 py-0.5 bg-slate-600 dark:bg-slate-800 rounded-full shadow-md border border-slate-500 dark:border-slate-700">
                                           <span className="text-[11px] font-bold text-white uppercase tracking-tight">{format(subSlotTime, timeDisplayFormat)}</span>
                                         </div>
                                       ) : (
                                         <div className="flex items-center justify-center h-6 px-2.5 py-0.5 bg-indigo-600 rounded-full shadow-md border border-indigo-500">
                                           <span className="text-[11px] font-bold text-white uppercase tracking-tight">{format(subSlotTime, timeDisplayFormat)}</span>
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

            <div className="absolute inset-0 z-10 pointer-events-none">
              {getPositionedEvents(dayEvents.filter(e => e.type === 'booking')).map(({ event, left, width }) => {
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
                    className={`absolute pointer-events-auto ${mode === 'booking' ? 'rounded-md overflow-hidden' : 'rounded-xl overflow-hidden hover:z-[60]'} border ${mode === 'booking' ? 'py-0.5 px-2' : 'p-2'} shadow-sm z-[5] transition-all ${mode === 'booking' || event.type === 'blocked' ? 'cursor-pointer' : 'cursor-move'} ${draggedEventId === event.id ? 'opacity-50 ring-2 ring-indigo-500' : ''} ${typeof styleData === 'string' ? styleData : styleData.className}`} 
                    style={{ 
                      top: `${top}px`, 
                      height: `${height}px`, 
                    minHeight: '20px', 
                      left: `calc(80px + (100% - 80px) * ${left / 100})`,
                      width: `calc((100% - 80px) * ${width / 100})`,
                      ...(typeof styleData === 'object' ? styleData.style : {}) 
                    }}
                    onMouseEnter={mode === 'booking' ? (e) => { const r = e.currentTarget.getBoundingClientRect(); showTooltip(event, r.left, r.right, r.top); } : undefined}
                    onMouseLeave={mode === 'booking' ? hideTooltip : undefined}
                  >
                    {event.type !== 'blocked' && (
                      duration >= 60 ? (
                        <div className="flex flex-col justify-center h-full w-full py-0.5 leading-tight">
                          <span className="text-sm font-semibold truncate block w-full">{event.title.split(" - ")[0]}</span>
                          <span className="text-xs font-normal opacity-75 block w-full">{format(event.start, timeDisplayFormat)}</span>
                        </div>
                      ) : (
                        <div className="flex items-center truncate h-full w-full">
                          <span className="text-sm font-semibold truncate shrink-0">{event.title.split(" - ")[0]}</span>
                          <span className="text-xs font-normal opacity-75 shrink">, {format(event.start, timeDisplayFormat)}</span>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
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

    const isStaffFiltered = Array.isArray(staffFilter)
      ? (!staffFilter.includes("all") && staffFilter.length > 0)
      : (staffFilter !== "all");

    const getStaffFilterParam = () => {
      if (Array.isArray(staffFilter)) {
        return staffFilter.includes("all") ? undefined : staffFilter;
      }
      return staffFilter !== "all" ? staffFilter : undefined;
    };
    const staffFilterParam = getStaffFilterParam();

    const selectedIds = staffFilter 
      ? (Array.isArray(staffFilter) ? staffFilter : [staffFilter])
      : [];
    const isFiltered = selectedIds.length > 0 && !selectedIds.includes("all");
    const activeStaffList = isFiltered 
      ? (selectedIds.includes("none") ? [] : staffList.filter(s => selectedIds.includes(s.id)))
      : staffList;

    const N = activeStaffList.length;
    const isSplit = N > 1;

    const gridCols = isSplit ? `repeat(${7 * N}, 1fr)` : `repeat(7, 1fr)`;
    const gridMinWidth = (isSplit && N > 2) ? `${7 * N * 100}px` : '100%';
    const headerHeight = isSplit ? 111 : 76;

    const getSingleStaffParam = () => {
      if (Array.isArray(staffFilter)) {
        return staffFilter.length === 1 ? staffFilter[0] : undefined;
      }
      return staffFilter !== "all" ? staffFilter : undefined;
    };
    const singleStaffParam = getSingleStaffParam();

    return (
      <div className="flex bg-white dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Left Side: Fixed Time Column */}
        <div className="w-[80px] shrink-0 border-r border-slate-300 dark:border-slate-600 bg-slate-50/95 dark:bg-slate-900/95 z-20 flex flex-col">
          {/* Corner Header */}
          <div 
            className="sticky top-0 z-40 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md border-b border-slate-300 dark:border-slate-600 flex flex-col items-start justify-center p-4 pl-4 shrink-0"
            style={{ height: `${headerHeight}px` }}
          >
            <p className="text-[10px] font-bold text-black dark:text-white uppercase tracking-widest mb-0.5">Week</p>
            <p className="text-base font-bold text-indigo-600 dark:text-indigo-400">{getWeek(startDate)}</p>
          </div>
          {/* Time Labels */}
          <div className="bg-white/95 dark:bg-slate-950/95">
             {visibleSlots.map((slot, slotIdx) => (
                <div key={slotIdx} className={`border-slate-300 dark:border-slate-600 p-2 pl-4 text-xs flex items-center justify-start text-black dark:text-white ${slotIdx === visibleSlots.length - 1 ? 'border-b-0' : 'border-b'}`} style={{ height: `${slotHeight}px` }}>
                 {format(slot.time, timeDisplayFormat)}
               </div>
             ))}
          </div>
        </div>

        {/* Right Side: Horizontal Scrollable Wrapper */}
        <div className={`flex-1 ${mode === 'booking' ? 'overflow-y-hidden' : 'overflow-y-hidden premium-scrollbar'} relative pb-0 ${(isSplit && N > 2) ? 'overflow-x-auto' : 'overflow-x-hidden'}`}>
          <div className="grid" style={{ gridTemplateColumns: gridCols, minWidth: gridMinWidth }}>
            
            {/* Day Headers (Row 1) */}
            {weekDays.map((day, dayIdx) => {
              const colStart = isSplit ? 1 + dayIdx * N : 1 + dayIdx;
              const colEnd = isSplit ? colStart + N : colStart + 1;
              return (
                <div 
                  key={day.toString()} 
                  className={`sticky top-0 z-30 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md border-b border-r border-slate-300 dark:border-slate-600 p-4 text-center h-[76px] flex flex-col items-center justify-center ${dayIdx === 6 ? 'border-r-0' : ''} ${now && isSameDay(day, now) ? 'bg-indigo-50/30 dark:bg-indigo-900/20' : ''}`}
                  style={{
                    gridColumnStart: colStart,
                    gridColumnEnd: colEnd,
                    gridRowStart: 1,
                    gridRowEnd: 2
                  }}
                >
                  <p className="text-[10px] uppercase tracking-widest opacity-60 text-black dark:text-white">{format(day, "EEE")}</p>
                  <p className={`text-lg font-bold ${now && isSameDay(day, now) ? "text-indigo-600 dark:text-indigo-400" : "text-black dark:text-white"}`}>{format(day, "d")}</p>
                </div>
              );
            })}

            {/* Practitioner Sub-headers (Row 2) */}
            {isSplit && weekDays.map((day, dayIdx) => {
              return activeStaffList.map((staff, staffIdx) => {
                const colStart = 1 + dayIdx * N + staffIdx;
                const isLastCell = dayIdx === 6 && staffIdx === N - 1;

                const getInitials = (n: string) => {
                  const parts = n.trim().split(/\s+/);
                  if (parts.length >= 2) {
                    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                  }
                  return n.substring(0, 2).toUpperCase();
                };

                return (
                  <div 
                    key={`${day.toString()}-${staff.id}`} 
                    className={`sticky z-30 bg-slate-50/95 dark:bg-slate-900/95 border-b border-r border-slate-300 dark:border-slate-600 p-1 flex items-center justify-center h-[35px] ${isLastCell ? 'border-r-0' : ''}`}
                    style={{
                      gridColumnStart: colStart,
                      gridRowStart: 2,
                      gridRowEnd: 3,
                      top: '76px'
                    }}
                    title={staff.name}
                  >
                    <div className="h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-sm transition-transform hover:scale-110" style={{ backgroundColor: staff.color }}>
                      {getInitials(staff.name)}
                    </div>
                  </div>
                );
              });
            })}

            {/* Columns and Cells (Row 3 / Row 2) */}
            {weekDays.map((day, dayIdx) => {
              const dayRefDate = startOfDay(day);

              const renderColumn = (staffMember?: Staff, staffIdx: number = 0) => {
                const staffEvents = events.filter(e => isSameDay(e.start, day) && (!staffMember || e.staffId === staffMember.id));
                const colStart = isSplit ? 1 + dayIdx * N + staffIdx : 1 + dayIdx;
                const isLastColumn = dayIdx === 6 && (!isSplit || staffIdx === N - 1);

                return (
                  <div 
                    key={staffMember ? `${day.toString()}-${staffMember.id}` : day.toString()} 
                    className="relative"
                    style={{
                      gridColumnStart: colStart,
                      gridRowStart: isSplit ? 3 : 2,
                      height: `${visibleSlots.length * slotHeight}px`
                    }}
                  >
                    <div className={`absolute inset-0 z-0 border-slate-300 dark:border-slate-600 ${isLastColumn ? 'border-r-0' : 'border-r'}`}>
                      {visibleSlots.map((slot, slotIdx) => {
                        const currentSlotTime = parse(`${Math.floor(slot.minutes / 60)}:${slot.minutes % 60}`, "H:m", dayRefDate);

                        return (
                          <div 
                            key={slotIdx} 
                            className={`border-b border-slate-300 dark:border-slate-600 transition-colors flex flex-col bg-white dark:bg-slate-900 ${slotIdx === visibleSlots.length - 1 ? 'border-b-0' : 'border-b'}`} 
                            style={{ height: `${slotHeight}px` }} 
                          >
                             {(() => {
                               const subSlotsCount = mode === "booking" ? slotDuration / 15 : 1;

                               return Array.from({ length: subSlotsCount }).map((_, subIdx) => {
                                 const subSlotTime = addMinutes(currentSlotTime, subIdx * 15);
                                 const existing = mode === "schedule" ? events.find(e => {
                                    if (e.type !== 'blocked' && (e.type as any) !== 'availability-override') return false;
                                    const isTimeMatch = subSlotTime >= e.start && subSlotTime < e.end;
                                    const isStaffMatch = staffMember ? e.staffId === staffMember.id : true;
                                    return isTimeMatch && isStaffMatch;
                                  }) : null;

                                 const isClosed = mode === "schedule" && existing
                                   ? existing.type === 'blocked'
                                   : checkIsClosed(subSlotTime, staffMember ? [staffMember.id] : staffFilterParam);
                                 const isPastSlot = isPast(subSlotTime, mode === "booking" ? 0 : slotDuration);

                                 const activeStaffParam = staffMember ? staffMember.id : singleStaffParam;

                                 return (
                                    <div 
                                      key={subIdx}
                                      className={`flex-1 relative group transition-colors hover:z-40 ${isClosed ? 'bg-zebra bg-slate-100 dark:bg-slate-900 cursor-pointer' : isPastSlot ? `bg-slate-50 dark:bg-slate-900/80 cursor-pointer` : 'bg-white dark:bg-slate-900 cursor-pointer'} ${isPastSlot ? 'grayscale-[0.5]' : ''}`}
                                      style={{ backgroundPositionY: isClosed ? `-${((slot.minutes - displayRange.start) / slotDuration) * slotHeight + (subIdx * (slotHeight / subSlotsCount))}px` : undefined }}
                                      onDragOver={handleDragOver}
                                      onDrop={(e) => handleDrop(e, subSlotTime, activeStaffParam)}
                                      onClick={() => {
                                        if (mode === "schedule") {
                                          if (existing?.type === 'blocked') {
                                            onScheduleToggle?.(subSlotTime, 'remove-block', activeStaffParam);
                                          } else if ((existing?.type as any) === 'availability-override') {
                                            onScheduleToggle?.(subSlotTime, 'remove-override', activeStaffParam);
                                          } else if (isClosed) {
                                            onScheduleToggle?.(subSlotTime, 'override', activeStaffParam);
                                          } else {
                                            onScheduleToggle?.(subSlotTime, 'block', activeStaffParam);
                                          }
                                        } else if (!isPastSlot) {
                                          onSlotClick?.(subSlotTime, activeStaffParam);
                                        }
                                      }}
                                    >
                                       <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center pointer-events-none gap-1 z-50 transition-all duration-200 scale-95 group-hover:scale-100">
                                          {mode === "schedule" ? (
                                            (() => {
                                              const willMakeAvailable = (existing?.type === 'blocked') || (!existing && isClosed);
                                              return (
                                                <>
                                                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full shadow-xl border ${willMakeAvailable ? 'bg-emerald-600 border-emerald-500' : 'bg-rose-600 border-rose-500'}`}>
                                                    {willMakeAvailable ? <Plus className="h-3.5 w-3.5 text-white" /> : <Minus className="h-3.5 w-3.5 text-white" />}
                                                    <span className="text-[10px] font-bold text-white uppercase tracking-tight">
                                                      {willMakeAvailable ? "Make Available" : "Make Unavailable"}
                                                    </span>
                                                  </div>
                                                  {existing?.type === 'blocked' && (
                                                    <span className="text-[9px] font-black text-rose-600 dark:text-rose-450 bg-white/90 dark:bg-slate-900/90 px-2 py-0.5 rounded shadow-sm border border-rose-200/50 dark:border-rose-900/30">
                                                      Blocked: {existing.title}
                                                    </span>
                                                  )}
                                                </>
                                              );
                                            })()
                                          ) : (isClosed && mode !== "booking") ? (
                                            (() => {
                                              const blockEvent = events.find(e => 
                                                e.type === 'blocked' && 
                                                subSlotTime >= e.start && 
                                                subSlotTime < e.end &&
                                                (staffMember ? e.staffId === staffMember.id : true)
                                              );
                                              const label = blockEvent?.title?.toLowerCase().includes("leave") ? "Leave" : "Closed";
                                              return (
                                                <div className="flex items-center justify-center h-6 px-3 py-0.5 bg-slate-800 dark:bg-slate-900 rounded-full shadow-md border border-slate-700 dark:border-slate-800 max-w-[150px] truncate">
                                                  <span className="text-[10px] font-bold text-white uppercase tracking-tight truncate">{label}</span>
                                                </div>
                                              );
                                            })()
                                          ) : isPastSlot ? (
                                            <div className="flex items-center justify-center h-6 px-2.5 py-0.5 bg-slate-600 dark:bg-slate-800 rounded-full shadow-md border border-slate-500 dark:border-slate-700">
                                              <span className="text-[11px] font-bold text-white uppercase tracking-tight">{format(subSlotTime, timeDisplayFormat)}</span>
                                            </div>
                                          ) : (
                                            <div className="flex items-center justify-center h-6 px-2.5 py-0.5 bg-indigo-600 rounded-full shadow-md border border-indigo-500">
                                              <span className="text-[11px] font-bold text-white uppercase tracking-tight">{format(subSlotTime, timeDisplayFormat)}</span>
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
                         <div className="h-0.5 bg-indigo-600 relative">
                            {(!isSplit || staffIdx === 0) && (
                              <div className="absolute left-0 -top-1 h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse shadow-indigo-500" />
                            )}
                         </div>
                      </div>
                    )}
                    <div className={`relative z-10 ${mode === 'booking' ? '' : 'mx-1'}`}>
                      {getPositionedEvents(staffEvents.filter(e => e.type === 'booking')).map(({ event, left, width }) => {
                        const startTotalMinutes = event.start.getHours() * 60 + event.start.getMinutes();
                        if (startTotalMinutes < displayRange.start || startTotalMinutes >= displayRange.end) return null;

                        const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60);
                        const top = (startTotalMinutes - displayRange.start) * pixelsPerMinute;
                        const height = duration * pixelsPerMinute;
                        const styleData = getEventStyle(event);
                        const isPastEvent = isPast(event.end);

                        return (
                          <div key={event.id} draggable={event.type !== 'blocked'} onDragStart={(e) => handleDragStart(e, event.id)} onDragEnd={handleDragEnd}
                            className={`absolute ${mode === 'booking' ? 'rounded-md overflow-hidden' : 'rounded-xl overflow-hidden'} border ${mode === 'booking' ? 'py-0.5 px-1.5' : 'p-2'} shadow-sm z-[5] ${mode === 'booking' ? 'cursor-pointer' : 'cursor-move'} transition-all ${draggedEventId === event.id ? 'opacity-50 ring-2 ring-indigo-500' : ''} ${typeof styleData === 'string' ? styleData : styleData.className}`}
                            style={{ 
                              top: `${top}px`, 
                              height: `${height}px`, 
                              minHeight: '20px', 
                              left: `${left}%`,
                              width: `${width}%`,
                              ...(typeof styleData === 'object' ? styleData.style : {}) 
                            }}
                            onMouseEnter={mode === 'booking' ? (e) => { const r = e.currentTarget.getBoundingClientRect(); showTooltip(event, r.left, r.right, r.top); } : undefined}
                            onMouseLeave={mode === 'booking' ? hideTooltip : undefined}
                          >
                             {event.type !== 'blocked' && (
                               duration >= 60 ? (
                                 <div className="flex flex-col justify-center h-full w-full py-0.5 leading-tight">
                                   <span className="text-[10px] font-semibold truncate block w-full">{event.title.split(" - ")[0]}</span>
                                   <span className="text-[9px] font-normal opacity-75 block w-full">{format(event.start, timeDisplayFormat)}</span>
                                 </div>
                               ) : (
                                 <div className="flex items-center truncate h-full w-full">
                                   <span className="text-[10px] font-semibold truncate shrink-0">{event.title.split(" - ")[0]}</span>
                                   <span className="text-[9px] font-normal opacity-75 shrink">, {format(event.start, timeDisplayFormat)}</span>
                                 </div>
                               )
                             )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              };

              if (isSplit) {
                return activeStaffList.map((staffMember, staffIdx) => renderColumn(staffMember, staffIdx));
              } else {
                return renderColumn();
              }
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderTeamView = () => {
    const dayEvents = events.filter(e => isSameDay(e.start, currentDate));
    const refDate = startOfDay(currentDate);
    const visibleSlots = getVisibleSlots(refDate);
    const nowTop = now ? (now.getHours() * 60 + now.getMinutes()) * pixelsPerMinute : 0;

    const selectedIds = staffFilter 
      ? (Array.isArray(staffFilter) ? staffFilter : [staffFilter])
      : [];
    const isFiltered = selectedIds.length > 0 && !selectedIds.includes("all");
    const activeStaffList = isFiltered 
      ? (selectedIds.includes("none") ? [] : staffList.filter(s => selectedIds.includes(s.id)))
      : staffList;

    return (
      <div className="flex bg-white dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Left Side: Fixed Time Column */}
        <div className="w-[80px] shrink-0 border-r border-slate-300 dark:border-slate-600 bg-slate-50/95 dark:bg-slate-900/95 z-20 flex flex-col">
          {/* Team Corner Header */}
          <div className="sticky top-0 z-40 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md border-b border-slate-300 dark:border-slate-600 flex items-center justify-start p-4 pl-4 h-[76px] shrink-0">
             <span className="text-[10px] font-bold uppercase tracking-widest text-black dark:text-white">Team</span>
          </div>
          {/* Time Labels */}
          <div className="bg-white/95 dark:bg-slate-950/95">
             {visibleSlots.map((slot, slotIdx) => (
                <div key={slotIdx} className={`border-slate-300 dark:border-slate-600 p-2 pl-4 text-xs flex items-center justify-start text-black dark:text-white ${slotIdx === visibleSlots.length - 1 ? 'border-b-0' : 'border-b'}`} style={{ height: `${slotHeight}px` }}>
                 {format(slot.time, timeDisplayFormat)}
               </div>
             ))}
          </div>
        </div>

        {/* Right Side: Horizontal Scrollable Columns */}
        <div className={`flex-1 ${mode === 'booking' ? 'overflow-y-hidden' : 'overflow-y-hidden premium-scrollbar'} relative pb-0 ${activeStaffList.length > 2 ? 'overflow-x-auto' : 'overflow-x-hidden'}`}>
          <div className="grid" style={{ 
            gridTemplateColumns: activeStaffList.length > 0 ? `repeat(${activeStaffList.length}, 1fr)` : "1fr", 
            minWidth: activeStaffList.length > 2 ? `${activeStaffList.length * 200}px` : "100%" 
          }}>
            {/* Staff Headers (Row 1) */}
            {activeStaffList.map((staff, staffIdx) => (
              <div 
                key={staff.id} 
                className={`sticky top-0 z-30 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md border-b border-r border-slate-300 dark:border-slate-600 p-4 text-center h-[76px] flex flex-col items-center justify-center ${staffIdx === activeStaffList.length - 1 ? 'border-r-0' : ''}`}
                style={{
                  gridColumnStart: staffIdx + 1,
                  gridRowStart: 1,
                  gridRowEnd: 2
                }}
              >
                 <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: staff.color }}>
                      {staff.name.substring(0, 2).toUpperCase()}
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider truncate w-full text-black dark:text-white">{staff.name}</p>
                 </div>
              </div>
            ))}
            {activeStaffList.length === 0 && (
              <div className="sticky top-0 z-30 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md border-b border-slate-300 dark:border-slate-600 p-4 h-[76px]">
                 &nbsp;
              </div>
            )}

            {/* Empty Slots Body when no staff (Row 2) */}
            {activeStaffList.length === 0 && (
              <div className="relative bg-white dark:bg-slate-900 col-start-1 row-start-2">
                 <div className="absolute inset-0 z-0">
                   {visibleSlots.map((slot, slotIdx) => (
                     <div 
                       key={slotIdx} 
                       className={`border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 ${slotIdx === visibleSlots.length - 1 ? 'border-b-0' : 'border-b'}`} 
                       style={{ height: `${slotHeight}px` }} 
                     />
                   ))}
                 </div>
              </div>
            )}

            {/* Practitioner Columns (Row 2) */}
            {activeStaffList.map((staff, staffIdx) => {
               const staffEvents = dayEvents.filter(e => e.staffId === staff.id || e.resourceName === staff.name);
               const isLastColumn = staffIdx === activeStaffList.length - 1;
               return (
                 <div 
                   key={staff.id} 
                   className="relative"
                   style={{
                     gridColumnStart: staffIdx + 1,
                     gridRowStart: 2,
                     gridRowEnd: 3,
                     height: `${visibleSlots.length * slotHeight}px`
                   }}
                 >
                    <div className={`absolute inset-0 z-0 border-slate-300 dark:border-slate-600 ${isLastColumn ? 'border-r-0' : 'border-r'}`}>
                     {visibleSlots.map((slot, slotIdx) => {
                       const currentSlotTime = parse(`${Math.floor(slot.minutes / 60)}:${slot.minutes % 60}`, "H:m", refDate);

                       return (
                         <div 
                           key={slotIdx} 
                           className={`border-slate-300 dark:border-slate-600 transition-colors flex flex-col bg-white dark:bg-slate-900 ${slotIdx === visibleSlots.length - 1 ? 'border-b-0' : 'border-b'}`} 
                           style={{ height: `${slotHeight}px` }} 
                         >
                            {(() => {
                               const subSlotsCount = mode === "booking" ? slotDuration / 15 : 1;

                               return Array.from({ length: subSlotsCount }).map((_, subIdx) => {
                                 const subSlotTime = addMinutes(currentSlotTime, subIdx * 15);
                                 const existing = mode === "schedule" ? events.find(e => {
                                    if (e.type !== 'blocked' && (e.type as any) !== 'availability-override') return false;
                                    const isTimeMatch = subSlotTime >= e.start && subSlotTime < e.end;
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
                                       className={`flex-1 relative group transition-colors hover:z-40 ${isClosed ? 'bg-zebra bg-slate-100 dark:bg-slate-900 cursor-pointer' : isPastSlot ? `bg-slate-50 dark:bg-slate-900/80 cursor-pointer` : 'bg-white dark:bg-slate-900 cursor-pointer'} ${isPastSlot ? 'grayscale-[0.5]' : ''}`}
                                     style={{ backgroundPositionY: isClosed ? `-${((slot.minutes - displayRange.start) / slotDuration) * slotHeight + (subIdx * (slotHeight / subSlotsCount))}px` : undefined }}
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
                                       } else if (!isPastSlot) {
                                         onSlotClick?.(subSlotTime, staff.id);
                                       }
                                     }}
                                   >
                                      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none gap-2 z-50 transition-all duration-200 ${mode === 'booking' ? 'hidden' : 'opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100'}`}>
                                         {mode === "schedule" ? (
                                           (() => {
                                             const willMakeAvailable = (existing?.type === 'blocked') || (!existing && isClosed);
                                              return (
                                                <>
                                                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full shadow-xl border ${willMakeAvailable ? 'bg-emerald-600 border-emerald-500' : 'bg-rose-600 border-rose-500'}`}>
                                                    {willMakeAvailable ? <Plus className="h-3.5 w-3.5 text-white" /> : <Minus className="h-3.5 w-3.5 text-white" />}
                                                    <span className="text-[10px] font-bold text-white uppercase tracking-tight">
                                                      {willMakeAvailable ? "Make Available" : "Make Unavailable"}
                                                    </span>
                                                  </div>
                                                  {existing?.type === 'blocked' && (
                                                    <span className="text-[9px] font-black text-rose-600 dark:text-rose-450 bg-white/90 dark:bg-slate-900/90 px-2 py-0.5 rounded shadow-sm border border-rose-200/50 dark:border-rose-900/30">
                                                      Blocked: {existing.title}
                                                    </span>
                                                  )}
                                                </>
                                              );
                                           })()
                                         ) : (isClosed && mode !== "booking") ? (
                                             (() => {
                                               const blockEvent = events.find(e => 
                                                 e.type === 'blocked' && 
                                                 subSlotTime >= e.start && 
                                                 subSlotTime < e.end &&
                                                 (staff ? e.staffId === staff.id : true)
                                               );
                                               const label = blockEvent?.title?.toLowerCase().includes("leave") ? "Leave" : "Closed";
                                               return (
                                                 <div className="flex items-center justify-center h-6 px-3 py-0.5 bg-slate-800 dark:bg-slate-900 rounded-full shadow-md border border-slate-700 dark:border-slate-800 max-w-[150px] truncate">
                                                   <span className="text-[10px] font-bold text-white uppercase tracking-tight truncate">{label}</span>
                                                 </div>
                                               );
                                             })()
                                           ) : isPastSlot ? (
                                           <div className="flex items-center justify-center h-6 px-2.5 py-0.5 bg-slate-600 dark:bg-slate-800 rounded-full shadow-md border border-slate-500 dark:border-slate-700">
                                             <span className="text-[11px] font-bold text-white uppercase tracking-tight">{format(subSlotTime, timeDisplayFormat)}</span>
                                           </div>
                                         ) : (
                                           <div className="flex items-center justify-center h-6 px-2.5 py-0.5 bg-indigo-600 rounded-full shadow-md border border-indigo-500">
                                             <span className="text-[11px] font-bold text-white uppercase tracking-tight">{format(subSlotTime, timeDisplayFormat)}</span>
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
                              <div className="absolute left-0 -top-1 h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse shadow-indigo-500"></div>
                           )}
                        </div>
                     </div>
                   )}
                   <div className={`relative z-10 ${mode === 'booking' ? '' : 'mx-1'}`}>
                      {getPositionedEvents(staffEvents.filter(e => e.type === 'booking')).map(({ event, left, width }) => {
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
                            className={`absolute ${mode === 'booking' ? 'rounded-md overflow-hidden' : 'rounded-xl overflow-hidden hover:z-[60]'} border ${mode === 'booking' ? 'py-0.5 px-2' : 'p-2'} shadow-sm z-[5] transition-all ${mode === 'booking' || event.type === 'blocked' ? 'cursor-pointer' : 'cursor-move'} ${draggedEventId === event.id ? 'opacity-50 ring-2 ring-indigo-500' : ''} ${typeof styleData === 'string' ? styleData : styleData.className}`} 
                            style={{ 
                              top: `${top}px`, 
                              height: `${height}px`, 
                              minHeight: '20px', 
                              left: `${left}%`,
                              width: `${width}%`,
                              ...(typeof styleData === 'object' ? styleData.style : {}) 
                            }}
                            onMouseEnter={mode === 'booking' ? (e) => { const r = e.currentTarget.getBoundingClientRect(); showTooltip(event, r.left, r.right, r.top); } : undefined}
                            onMouseLeave={mode === 'booking' ? hideTooltip : undefined}
                          >
                            {event.type !== 'blocked' && (
                              duration >= 60 ? (
                                <div className="flex flex-col justify-center h-full w-full py-0.5 leading-tight">
                                  <span className="text-sm font-semibold truncate block w-full">{event.title.split(" - ")[0]}</span>
                                  <span className="text-xs font-normal opacity-75 block w-full">{format(event.start, timeDisplayFormat)}</span>
                                </div>
                              ) : (
                                <div className="flex items-center truncate h-full w-full">
                                  <span className="text-sm font-semibold truncate shrink-0">{event.title.split(" - ")[0]}</span>
                                  <span className="text-xs font-normal opacity-75 shrink">, {format(event.start, timeDisplayFormat)}</span>
                                </div>
                              )
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
      </div>
    );
  };

  const tooltipEl = tooltipInfo && mode === 'booking' ? (() => {
    const TOOLTIP_WIDTH = 220;
    const TOOLTIP_GAP = 8;
    const rawXPos = tooltipInfo.x - TOOLTIP_WIDTH - TOOLTIP_GAP;
    const xPos = Math.max(8, rawXPos);
    const treatmentColor = tooltipInfo.event.color || '#6366f1';
    
    // Detect dark mode reactively using next-themes
    const isDark = resolvedTheme === 'dark';
    const baseBg = isDark ? '#0f172a' : '#ffffff';
    const textColorClass = isDark ? 'text-white/80' : 'text-black';
    const boldTextColorClass = isDark ? 'text-white' : 'text-black';
    const iconColorClass = isDark ? 'text-white' : 'text-black';

    // Blend helper to blend treatment color with background (white for light, slate-900 for dark)
    const blendColors = (colorHex: string, bgHex: string, opacity: number): string => {
      try {
        const cHex = colorHex.replace('#', '');
        const bHex = bgHex.replace('#', '');
        
        const r = parseInt(cHex.substring(0, 2), 16);
        const g = parseInt(cHex.substring(2, 4), 16);
        const b = parseInt(cHex.substring(4, 6), 16);
        
        const br = parseInt(bHex.substring(0, 2), 16);
        const bg = parseInt(bHex.substring(2, 4), 16);
        const bb = parseInt(bHex.substring(4, 6), 16);
        
        const blendR = Math.round(r * opacity + br * (1 - opacity));
        const blendG = Math.round(g * opacity + bg * (1 - opacity));
        const blendB = Math.round(b * opacity + bb * (1 - opacity));
        
        return `#${blendR.toString(16).padStart(2, '0')}${blendG.toString(16).padStart(2, '0')}${blendB.toString(16).padStart(2, '0')}`;
      } catch (e) {
        return colorHex;
      }
    };

    const lightBg = blendColors(treatmentColor, baseBg, isDark ? 0.25 : 0.15);
    const borderBg = blendColors(treatmentColor, baseBg, isDark ? 0.55 : 0.45);

    const TOOLTIP_HEIGHT_ESTIMATE = 130; // generous estimate for max tooltip height
    const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
    const rawYPos = tooltipInfo.y;
    const yPos = Math.min(Math.max(8, rawYPos), viewportH - TOOLTIP_HEIGHT_ESTIMATE - 8);

    return (
      <div
        className="fixed z-[200000] flex flex-col p-3 rounded-xl text-xs shadow-2xl backdrop-blur-sm pointer-events-auto border"
        style={{ 
          top: yPos, 
          left: xPos, 
          width: TOOLTIP_WIDTH,
          backgroundColor: lightBg,
          borderColor: borderBg
        }}
        onMouseEnter={cancelTooltipHide}
        onMouseLeave={hideTooltip}
      >

        <p className={`font-bold truncate text-sm mb-0.5 ${boldTextColorClass}`}>
          {tooltipInfo.event.title.split(" - ")[0]}
        </p>
        {tooltipInfo.event.title.split(" - ")[1] && (
          <div className={`flex items-center gap-1.5 text-[11px] mb-2 ${textColorClass}`}>
            <Sparkles className={`h-3.5 w-3.5 ${iconColorClass} shrink-0`} />
            <span className="font-normal">{tooltipInfo.event.title.split(" - ")[1]}</span>
          </div>
        )}
        <div className={`flex flex-col gap-1 text-[10px] ${textColorClass}`}>
          <div className="flex items-center gap-1.5">
            <Clock className={`h-3.5 w-3.5 ${iconColorClass} shrink-0`} />
            <span>{format(tooltipInfo.event.start, "EEEE, MMMM d")}</span>
          </div>
          <div className="flex items-center gap-1.5 font-normal">
            <span>{format(tooltipInfo.event.start, timeDisplayFormat)} – {format(tooltipInfo.event.end, timeDisplayFormat)}</span>
          </div>
          {tooltipInfo.event.resourceName && (
            <div className="flex items-center gap-1.5">
              <User className={`h-3.5 w-3.5 ${iconColorClass} shrink-0`} />
              <span>{tooltipInfo.event.resourceName}</span>
            </div>
          )}
        </div>
      </div>
    );
  })() : null;

  return (
    <>
      <div className={`${(view === "month" && mode !== "booking") ? "h-full min-h-0" : "w-full"} flex flex-col animate-fade-in`}>
        {view === "month" && renderMonthView()}
        {view === "week" && renderWeekView()}
        {view === "day" && (() => {
          const isMultipleOrAll = !staffFilter || 
            (Array.isArray(staffFilter) 
              ? (staffFilter.includes("all") || staffFilter.length === 0 || staffFilter.length > 1)
              : (staffFilter === "all")
            );
          if (isMultipleOrAll) {
            return renderTeamView();
          }
          return renderDayView();
        })()}
        {view === "team" && renderTeamView()}
      </div>
      {/* Portal renders tooltip directly into document.body — outside any CSS transform context */}
      {tooltipEl && typeof document !== 'undefined' && createPortal(tooltipEl, document.body)}
    </>
  );
}
