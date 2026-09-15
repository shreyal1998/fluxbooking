"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Mail, 
  Phone, 
  Clock, 
  Calendar, 
  Pencil, 
  Trash2, 
  MapPin, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  X, 
  Loader2, 
  ExternalLink,
  Shield,
  Briefcase,
  UserCheck,
  User,
  ChevronLeft,
  ChevronRight,
  Search,
  Info
} from "lucide-react";
import { Portal } from "@/components/ui/portal";
import { Tooltip } from "@/components/ui/tooltip";
import { getLabels } from "@/lib/labels";
import { COUNTRIES } from "@/config/countries";
import { getInTimezone } from "@/lib/timezone-utils";
import { format } from "date-fns";
import { EditStaffForm } from "@/components/dashboard/edit-staff-form";
import { deleteStaff } from "@/app/actions/dashboard";
import { toast } from "sonner";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";

interface StaffDetailClientProps {
  staff: any;
  allServices: any[];
  allLocations: any[];
  isLocked: boolean;
  userRole: string;
  currentUserId?: string;
  tenant: any;
  country?: string;
  timeFormat?: string;
  timezone?: string;
  currency?: string;
}

function ExpandableReason({ text, colorClass }: { text: string; colorClass: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = Boolean(text && text.length > 32);

  if (!text) return null;

  if (!isLong) {
    return <p className={`text-[10px] ${colorClass} font-normal`}>{text}</p>;
  }

  return (
    <div className={`text-[10px] ${colorClass} font-normal`}>
      <p className={isExpanded ? "break-words leading-relaxed" : "truncate"}>
        {text}
      </p>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className="text-[9px] font-medium underline opacity-80 hover:opacity-100 mt-0.5 cursor-pointer inline-block"
      >
        {isExpanded ? "Show less" : "...more"}
      </button>
    </div>
  );
}

export function StaffDetailClient({
  staff: initialStaff,
  allServices,
  allLocations,
  isLocked,
  userRole,
  currentUserId,
  tenant,
  country,
  timeFormat = "12h",
  timezone = "UTC",
  currency = "USD"
}: StaffDetailClientProps) {
  const router = useRouter();
  const [staff, setStaff] = useState(initialStaff);

  useEffect(() => {
    setStaff(initialStaff);
  }, [initialStaff]);

  const [activeTab, setActiveTab] = useState<"profile" | "schedule" | "bookings" | "leave">("profile");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [leaveSearchQuery, setLeaveSearchQuery] = useState("");
  const itemsPerPage = 10;

  useLockBodyScroll(isEditModalOpen || isDeleteModalOpen);

  const labels = getLabels(tenant?.businessType);
  const staffSlug = labels.staffSlug;
  const appointmentSlug = labels.appointmentSlug;
  const ServiceIcon = labels.serviceIcon;

  const isAdmin = userRole === "ADMIN";
  const canEdit = isAdmin || staff.userId === currentUserId;
  const canDelete = isAdmin && staff.userId !== currentUserId;

  const countryData = COUNTRIES.find(c => c.code === (country || "US"));
  const currencySymbol = countryData?.symbol || "$";
  const dialCode = countryData?.phoneCode ? `+${countryData.phoneCode} ` : "";

  const formatPhone = (phone?: string | null) => {
    if (!phone) return null;
    return phone.startsWith("+") ? phone : `${dialCode}${phone}`;
  };

  const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  const timeToMins = (t: string) => {
    if (!t) return 0;
    const normalized = t.trim();
    if (normalized.toLowerCase().includes("am") || normalized.toLowerCase().includes("pm")) {
      const isPM = normalized.toLowerCase().includes("pm");
      const clean = normalized.replace(/(am|pm)/i, "").trim();
      const parts = clean.split(":");
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1] || "0", 10) || 0;
      let hours = h;
      if (isPM && hours < 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
      return hours * 60 + m;
    }
    const parts = normalized.split(":");
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1] || "0", 10) || 0;
    return h * 60 + m;
  };

  const minsToTimeStr = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const mergeTimeSlots = (slots: { start: string; end: string }[]) => {
    if (!slots || slots.length <= 1) return slots;
    const parsed = slots
      .filter(s => s && s.start && s.end)
      .map(s => ({
        startMins: timeToMins(s.start),
        endMins: timeToMins(s.end) === 0 ? 1440 : timeToMins(s.end),
        raw: s
      }))
      .sort((a, b) => a.startMins - b.startMins);

    if (parsed.length === 0) return [];

    const merged: { start: string; end: string }[] = [];
    let current = parsed[0];

    for (let i = 1; i < parsed.length; i++) {
      const next = parsed[i];
      if (next.startMins <= current.endMins) {
        current = {
          startMins: current.startMins,
          endMins: Math.max(current.endMins, next.endMins),
          raw: current.raw
        };
      } else {
        merged.push({
          start: minsToTimeStr(current.startMins),
          end: minsToTimeStr(current.endMins)
        });
        current = next;
      }
    }
    merged.push({
      start: minsToTimeStr(current.startMins),
      end: minsToTimeStr(current.endMins)
    });
    return merged;
  };

  const mergeDateRanges = (items: any[]) => {
    if (!items || items.length === 0) return [];
    const sorted = [...items].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    const merged: any[] = [];
    let current: any = null;

    for (const item of sorted) {
      const itemStart = new Date(item.startTime).getTime();
      const itemEnd = new Date(item.endTime).getTime();

      if (!current) {
        current = { ...item };
        continue;
      }

      const currentEnd = new Date(current.endTime).getTime();
      const currentDateStr = new Date(current.startTime).toDateString();
      const itemDateStr = new Date(item.startTime).toDateString();

      if (currentDateStr === itemDateStr && itemStart <= currentEnd) {
        current.endTime = new Date(Math.max(currentEnd, itemEnd));
      } else {
        merged.push(current);
        current = { ...item };
      }
    }
    if (current) {
      merged.push(current);
    }
    return merged;
  };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

  const getUpcomingDayOverrides = (dayName: string) => {
    if (!staff?.availabilityOverrides || staff.availabilityOverrides.length === 0) return [];
    const active = staff.availabilityOverrides.filter((ov: any) => {
      try {
        const eDate = new Date(ov.endTime);
        if (eDate < todayStart) return false;
        const ovDate = getInTimezone(new Date(ov.startTime), timezone);
        const ovDayName = format(ovDate, "EEEE").toLowerCase();
        return ovDayName === dayName.toLowerCase();
      } catch {
        return false;
      }
    });
    return mergeDateRanges(active);
  };

  const getStaffDaySchedule = (day: string) => {
    try {
      const avail = typeof staff?.availabilityJson === "string"
        ? JSON.parse(staff.availabilityJson)
        : staff?.availabilityJson || {};
      
      const dayKey = day.toLowerCase();
      const capitalized = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
      const shortKey = day.slice(0, 3).toLowerCase();
      const rawSlots = avail[dayKey] ?? avail[capitalized] ?? avail[day] ?? avail[shortKey];
      
      if (!rawSlots) return null;
      if (typeof rawSlots === "string" && (rawSlots.toLowerCase() === "closed" || rawSlots.toLowerCase() === "off")) {
        return null;
      }
      
      if (Array.isArray(rawSlots)) {
        if (rawSlots.length === 0) return null;
        const normalizedList = rawSlots.map((s: any) => {
          if (typeof s === "string") {
            if (s.toLowerCase() === "closed" || s.toLowerCase() === "off") return null;
            const [start, end] = s.split(/[-–—]/).map(t => t.trim());
            return { start, end };
          }
          return s;
        }).filter(s => s && s.start && s.end);
        const merged = mergeTimeSlots(normalizedList);
        return merged.length > 0 ? merged : null;
      }
      
      if (typeof rawSlots === "object" && rawSlots.start && rawSlots.end) {
        return [rawSlots];
      }
      
      if (typeof rawSlots === "string" && rawSlots.includes("-")) {
        const [start, end] = rawSlots.split(/[-–—]/).map(t => t.trim());
        return [{ start, end }];
      }

      return null;
    } catch {
      return null;
    }
  };

  const formatTimeStr = (timeVal: string) => {
    if (!timeVal) return "";
    let normalized = timeVal.trim();
    if (normalized.includes(":")) {
      const parts = normalized.split(":");
      normalized = `${parts[0].padStart(2, "0")}:${parts[1]}`;
    }
    const is12h = timeFormat === "12h";
    if (!is12h) return normalized === "24:00" ? "00:00" : normalized;
    
    if (normalized.toLowerCase().includes("am") || normalized.toLowerCase().includes("pm")) {
      return normalized;
    }

    const [hStr, mStr = "00"] = normalized.split(":");
    const h = parseInt(hStr, 10);
    if (isNaN(h)) return normalized;
    const ampm = h >= 12 ? "PM" : "AM";
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayHour}:${mStr.padStart(2, "0")} ${ampm}`;
  };

  const getInitials = (n: string) => {
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return n.substring(0, 2).toUpperCase();
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50";
      case "COMPLETED":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/50";
      case "PENDING":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-400/15 dark:text-amber-200 dark:border-amber-400/30";
      case "CANCELLED":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/20 dark:text-slate-400 dark:border-slate-800";
    }
  };

  const workingDaysCount = DAYS_OF_WEEK.filter(day => {
    const slots = getStaffDaySchedule(day);
    return slots && slots.length > 0;
  }).length;

  const specialDaysCount = DAYS_OF_WEEK.filter(day => {
    const slots = getStaffDaySchedule(day);
    const isOffDay = !slots || slots.length === 0;
    if (!isOffDay) return false;
    const overrides = getUpcomingDayOverrides(day);
    return overrides && overrides.length > 0;
  }).length;

  const allBookings = staff.bookings || [];
  const totalBookings = allBookings.length;
  const totalPages = Math.ceil(totalBookings / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBookings = allBookings.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const pageNumbersRange = useMemo(() => {
    const range: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) range.push(i);
    } else {
      range.push(1);
      if (currentPage > 3) {
        range.push("...");
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      if (currentPage <= 3) {
        range.push(2, 3, 4);
      } else if (currentPage >= totalPages - 2) {
        range.push(totalPages - 3, totalPages - 2, totalPages - 1);
      } else {
        for (let i = start; i <= end; i++) {
          range.push(i);
        }
      }
      if (currentPage < totalPages - 2) {
        range.push("...");
      }
      range.push(totalPages);
    }
    return range;
  }, [totalPages, currentPage]);

  const allLeaveRequests = staff.leaveRequests || [];
  const filteredLeaveRequests = useMemo(() => {
    if (!leaveSearchQuery.trim()) return allLeaveRequests;
    const query = leaveSearchQuery.toLowerCase().trim();
    return allLeaveRequests.filter((lr: any) => {
      const type = (lr.type || "").toLowerCase();
      const status = (lr.status || "").toLowerCase();
      const reason = (lr.reason || "").toLowerCase();
      const sDate = getInTimezone(new Date(lr.startTime), timezone);
      const eDate = getInTimezone(new Date(lr.endTime), timezone);
      const sDateStr = format(sDate, "MMM d, yyyy").toLowerCase();
      const eDateStr = format(eDate, "MMM d, yyyy").toLowerCase();
      return (
        type.includes(query) ||
        status.includes(query) ||
        reason.includes(query) ||
        sDateStr.includes(query) ||
        eDateStr.includes(query)
      );
    });
  }, [allLeaveRequests, leaveSearchQuery, timezone]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await deleteStaff(staff.id);
      if (res.success) {
        toast.success(`${labels.staff} removed successfully`);
        router.push(`/${staffSlug}`);
      } else {
        toast.error(res.error || "Failed to remove staff profile");
        setDeleteLoading(false);
      }
    } catch (err) {
      toast.error("An error occurred");
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-full min-w-0 animate-fade-in p-4 md:p-6 lg:p-8 space-y-6">
      
      {/* Header breadcrumb */}
      <div className="flex items-center gap-2 text-sm font-medium tracking-wider">
        <Link href={`/${staffSlug}`} className="text-black dark:text-white">
          {labels.staff}s
        </Link>
        <span className="text-slate-700 dark:text-slate-300">&gt;&gt;</span>
        <span className="text-indigo-600 dark:text-indigo-400">{staff.name}</span>
      </div>

      {/* Main Practitioner Profile Banner Card */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Accent Top Bar */}
        <div className="h-2.5 w-full" style={{ backgroundColor: staff.color }} />

        <div className="p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
            {/* Left: Avatar and Identity */}
            <div className="flex items-center gap-5">
              <div 
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-3xl flex items-center justify-center text-white text-xl sm:text-2xl font-bold shrink-0 shadow-md border-2"
                style={{ backgroundColor: staff.color, borderColor: staff.color }}
              >
                {getInitials(staff.name)}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-medium text-black dark:text-slate-200 tracking-tight">
                    {staff.name}
                  </h1>
                  {isLocked ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-400/15 text-amber-600 dark:text-amber-200 text-xs font-bold border border-amber-200 dark:border-amber-400/30">
                      <Lock className="h-3 w-3" />
                      Locked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-900/50">
                      <UserCheck className="h-3 w-3" />
                      Active
                    </span>
                  )}
                </div>

                <p className="text-sm font-medium text-black dark:text-slate-400">
                  {staff.bio || `Registered ${labels.staff}`}
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-black dark:text-slate-400">
                  {staff.user?.email && (
                    <span className="flex items-center gap-1.5 text-black dark:text-slate-400">
                      <Mail className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      <span>{staff.user.email}</span>
                    </span>
                  )}
                  {staff.user?.phone && (
                    <span className="flex items-center gap-1.5 text-black dark:text-slate-400">
                      <Phone className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      <span>{formatPhone(staff.user.phone)}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-black dark:text-slate-400">
                    <Shield className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <span>Role: {staff.user?.role ? staff.user.role.charAt(0).toUpperCase() + staff.user.role.slice(1).toLowerCase() : "Staff"}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 active:scale-95 cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Profile
                </button>
              )}

              <Link
                href="/schedule"
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-400 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <Clock className="h-3.5 w-3.5 text-indigo-500" />
                Manage Hours
              </Link>

              {canDelete && (
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="flex items-center gap-2 px-3.5 py-2.5 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Key Metrics Quick Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-5 w-5 rounded-md bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Calendar className="h-3 w-3" />
                </div>
                <span className="text-xs font-medium text-black dark:text-slate-400 tracking-wider">{labels.appointment}s</span>
              </div>
              <p className="text-xl font-medium text-black dark:text-slate-200 mt-1">
                {staff.bookings ? staff.bookings.length : 0}
              </p>
            </div>

            <div className="p-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-5 w-5 rounded-md bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <ServiceIcon className="h-3 w-3" />
                </div>
                <span className="text-xs font-medium text-black dark:text-slate-400 tracking-wider">Assigned {labels.service}s</span>
              </div>
              <p className="text-xl font-medium text-black dark:text-slate-200 mt-1">
                {staff.services ? staff.services.length : 0}
              </p>
            </div>

            <div className="p-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-5 w-5 rounded-md bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Clock className="h-3 w-3" />
                </div>
                <span className="text-xs font-medium text-black dark:text-slate-400 tracking-wider">Working Days</span>
              </div>
              <div className="flex items-baseline flex-wrap gap-2 mt-1">
                <p className="text-xl font-medium text-black dark:text-slate-200">
                  {workingDaysCount} / 7
                </p>
                {specialDaysCount > 0 && (
                  <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40">
                    +{specialDaysCount} special {specialDaysCount === 1 ? "day" : "days"}
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-5 w-5 rounded-md bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <MapPin className="h-3 w-3" />
                </div>
                <span className="text-xs font-medium text-black dark:text-slate-400 tracking-wider">Locations</span>
              </div>
              <p className="text-xl font-medium text-black dark:text-slate-200 mt-1">
                {staff.locations && staff.locations.length > 0 ? staff.locations.length : "All"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-8 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`pb-3 text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "profile"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
              : "border-transparent text-black dark:text-slate-400"
          }`}
        >
          Profile & Services
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("schedule")}
          className={`pb-3 text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "schedule"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
              : "border-transparent text-black dark:text-slate-400"
          }`}
        >
          Working Hours
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("bookings")}
          className={`pb-3 text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === "bookings"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
              : "border-transparent text-black dark:text-slate-400"
          }`}
        >
          <span>{labels.appointment} History</span>
          {staff.bookings && staff.bookings.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
              {staff.bookings.length}
            </span>
          )}
        </button>

        {staff.leaveRequests && staff.leaveRequests.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab("leave")}
            className={`pb-3 text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === "leave"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                : "border-transparent text-black dark:text-slate-400"
            }`}
          >
            <span>Leave Requests</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
              {staff.leaveRequests.length}
            </span>
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Tab 1: Profile & Services */}
        {activeTab === "profile" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Col: Contact and Profile Details */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-black dark:text-slate-400 tracking-wider">Contact & Account</span>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-black dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-indigo-500" />
                      Email Address
                    </span>
                    <p className="text-sm font-medium text-black dark:text-slate-300 break-all pl-5">
                      {staff.user?.email || "No email set"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-medium text-black dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-indigo-500" />
                      Phone Number
                    </span>
                    <p className="text-sm font-medium text-black dark:text-slate-300 font-mono pl-5">
                      {formatPhone(staff.user?.phone) || "No phone set"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-medium text-black dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                      Member Since
                    </span>
                    <p className="text-sm font-medium text-black dark:text-slate-300 pl-5">
                      {staff.createdAt ? format(new Date(staff.createdAt), "MMMM d, yyyy") : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Locations Card */}
              {allLocations && allLocations.length > 0 && (
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                  <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-black dark:text-slate-400 tracking-wider">Assigned Locations</span>
                    </div>
                  </div>
                  <div className="p-6">
                    {staff.locations && staff.locations.length > 0 ? (
                      <div className="space-y-2">
                        {staff.locations.map((loc: any) => (
                          <div key={loc.id} className="p-3 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
                            <MapPin className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-black dark:text-slate-300">{loc.name}</p>
                              {loc.address && <p className="text-xs text-black dark:text-slate-400 mt-0.5">{loc.address}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-black dark:text-slate-400 italic">Available across all business locations.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Col: Assigned Services */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-4 md:px-8 md:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <ServiceIcon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-black dark:text-slate-400 tracking-wider">Assigned {labels.service}s</span>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                    {staff.services ? staff.services.length : 0} {labels.service}s
                  </span>
                </div>

                <div className="p-6 md:p-8 space-y-5">
                  {staff.services && staff.services.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {staff.services.map((srv: any) => (
                        <div 
                          key={srv.id}
                          className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col justify-between gap-3 hover:border-indigo-300 dark:hover:border-indigo-900 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-1.5 h-6 rounded-full shrink-0" style={{ backgroundColor: srv.color || "#6366f1" }} />
                              <h4 className="text-sm font-medium text-black dark:text-slate-200 truncate">{srv.name}</h4>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                            <span className="text-black dark:text-slate-400 font-medium flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-indigo-500" />
                              {srv.durationMinutes} mins
                              {srv.bufferTime ? ` (+${srv.bufferTime}m buffer)` : ""}
                            </span>
                            <span className="font-mono font-medium text-indigo-600 dark:text-indigo-400">
                              {currencySymbol}{parseFloat(srv.price).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      <ServiceIcon className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                      <p className="text-sm font-medium text-black dark:text-slate-200">No {labels.service}s Assigned</p>
                      <p className="text-xs text-black dark:text-slate-400 mt-1">Assign services to this {labels.staffLower} by editing their profile.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Working Hours */}
        {activeTab === "schedule" && (
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 md:px-8 md:py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Clock className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-black dark:text-slate-400 tracking-wider">Weekly Availability Schedule</span>
                <Tooltip 
                  position="bottom"
                  variant="light"
                  interactive={true}
                  content={
                    <div className="p-1.5 space-y-2 text-left max-w-xs text-xs">
                      <p className="font-bold text-slate-900 dark:text-white text-xs border-b border-slate-100 dark:border-slate-800 pb-1">Schedule Badges & Shifts</p>
                      
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 shrink-0">
                            Working
                          </span>
                          <span className="text-slate-600 dark:text-slate-300">Standard weekly recurring hours.</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 shrink-0">
                            Special Hours
                          </span>
                          <span className="text-slate-600 dark:text-slate-300">Date-specific manual hours or shifts.</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 shrink-0">
                            Blocked Off
                          </span>
                          <span className="text-slate-600 dark:text-slate-300">Blocked hours or scheduled time off.</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-slate-50 text-slate-600 dark:bg-slate-900/40 dark:text-slate-400 border border-slate-200 dark:border-slate-800 shrink-0">
                            Closed
                          </span>
                          <span className="text-slate-600 dark:text-slate-300">Normal non-working day.</span>
                        </div>
                      </div>
                    </div>
                  }
                >
                  <button 
                    type="button" 
                    className="h-5 w-5 rounded-full text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
                    aria-label="Schedule Information"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
              </div>

              <Link
                href="/schedule"
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer self-start sm:self-auto"
              >
                <Clock className="h-3.5 w-3.5" />
                Customize in Schedule Calendar
              </Link>
            </div>

            <div className="p-6 md:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {DAYS_OF_WEEK.map((day) => {
                  const recurringSlots = getStaffDaySchedule(day) || [];
                  const manualOverrides = getUpcomingDayOverrides(day);
                  
                  const hasRecurring = recurringSlots.length > 0;

                  // Group override time intervals and track their specific calendar dates
                  const overrideIntervalsMap = new Map<string, { start: string; end: string; dates: string[] }>();
                  manualOverrides.forEach((ov: any) => {
                    const sDate = getInTimezone(new Date(ov.startTime), timezone);
                    const eDate = getInTimezone(new Date(ov.endTime), timezone);
                    const start = format(sDate, "HH:mm");
                    const end = format(eDate, "HH:mm");
                    const dateStr = format(sDate, "MMM d");
                    const key = `${start}-${end}`;

                    if (!overrideIntervalsMap.has(key)) {
                      overrideIntervalsMap.set(key, { start, end, dates: [dateStr] });
                    } else {
                      const existing = overrideIntervalsMap.get(key)!;
                      if (!existing.dates.includes(dateStr)) {
                        existing.dates.push(dateStr);
                      }
                    }
                  });

                  // Keep only custom slots that are not redundant with recurring weekly shifts
                  const distinctCustomSlots = Array.from(overrideIntervalsMap.values()).filter((ovSlot) => {
                    return !recurringSlots.some((recSlot: any) => 
                      recSlot.start <= ovSlot.start && recSlot.end >= ovSlot.end
                    );
                  });

                  const hasCustom = distinctCustomSlots.length > 0;
                  const hasOnlyCustom = !hasRecurring && hasCustom;
                  const isOpen = hasRecurring || hasCustom;

                  return (
                    <div 
                      key={day}
                      className={`p-4 rounded-2xl border transition-all ${
                        isOpen 
                          ? hasOnlyCustom
                            ? 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-200/60 dark:border-amber-900/40 shadow-sm'
                            : 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 shadow-sm' 
                          : 'bg-slate-50/40 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-black dark:text-slate-200 capitalize">{day}</span>
                        {hasOnlyCustom ? (
                          <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40">
                            Special Hours
                          </span>
                        ) : hasRecurring ? (
                          <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
                            Working
                          </span>
                        ) : (
                          <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 dark:bg-slate-900/40 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                            Closed
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        {isOpen ? (
                          <>
                            {/* Standard Recurring Weekly Shifts */}
                            {recurringSlots.map((slot: any, sIdx: number) => (
                              <div 
                                key={`rec-${sIdx}`}
                                className="px-3 py-1.5 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-medium flex items-center justify-between border border-indigo-100/60 dark:border-indigo-900/30"
                              >
                                <span>{formatTimeStr(slot.start)}</span>
                                <span className="text-slate-400">→</span>
                                <span>{formatTimeStr(slot.end)}</span>
                              </div>
                            ))}

                            {/* Custom Date Overrides with Explicit Date Badge */}
                            {distinctCustomSlots.map((slot: any, cIdx: number) => {
                              const dateLabel = slot.dates.length === 1 
                                ? `${slot.dates[0]} only` 
                                : slot.dates.length === 2
                                  ? slot.dates.join(", ")
                                  : `${slot.dates[0]}, ${slot.dates[1]} +${slot.dates.length - 2} more`;

                              return (
                                <div 
                                  key={`custom-${cIdx}`}
                                  className="px-3 py-1.5 bg-amber-50/30 dark:bg-amber-950/10 text-xs font-medium rounded-xl flex flex-col gap-0.5 border border-amber-200/60 dark:border-amber-900/40 shadow-sm"
                                >
                                  <div className="flex items-center justify-between text-black dark:text-white font-medium">
                                    <span>{formatTimeStr(slot.start)}</span>
                                    <span className="text-slate-400">→</span>
                                    <span>{formatTimeStr(slot.end)}</span>
                                  </div>
                                  <div 
                                    className="flex items-center justify-between gap-1.5 text-[10px] text-amber-700 dark:text-amber-200 pt-0.5 border-t border-amber-100 dark:border-amber-900/30 min-w-0"
                                    title={`Scheduled on: ${slot.dates.join(", ")}`}
                                  >
                                    <span className="font-normal truncate min-w-0">{dateLabel}</span>
                                    {hasRecurring && (
                                      <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 shrink-0">
                                        Special Hours
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        ) : (
                          <p className="text-xs text-black dark:text-slate-400 italic py-1">Off / Not Working</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom Manually Opened Hours & Blocked Overrides */}
              {(() => {
                const upcomingOverrides = mergeDateRanges(
                  (staff.availabilityOverrides || []).filter((ov: any) => {
                    try { return new Date(ov.endTime) >= todayStart; } catch { return false; }
                  })
                );
                const upcomingBlocks = mergeDateRanges(
                  (staff.blockedSlots || []).filter((bl: any) => {
                    try { return new Date(bl.endTime) >= todayStart; } catch { return false; }
                  })
                );

                if (upcomingOverrides.length === 0 && upcomingBlocks.length === 0) return null;

                return (
                  <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-amber-50 dark:bg-amber-400/15 text-amber-600 dark:text-amber-300 flex items-center justify-center">
                        <Clock className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-black dark:text-slate-400 tracking-wider">Manual Overrides & Special Hours</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {upcomingOverrides.map((ov: any, idx: number) => {
                        const sDate = getInTimezone(new Date(ov.startTime), timezone);
                        const eDate = getInTimezone(new Date(ov.endTime), timezone);
                        const timePattern = timeFormat === "24h" ? "HH:mm" : "hh:mm a";
                        const customReason = (ov.reason && !["one-off shift", "special hours", "custom shift"].includes(ov.reason.toLowerCase().trim())) 
                          ? ov.reason 
                          : null;

                        return (
                          <div key={ov.id || `ov-merged-${idx}`} className="p-4 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10 flex flex-col justify-between gap-2 shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-normal text-amber-800 dark:text-amber-200">
                                {format(sDate, "MMM d, yyyy")}
                              </span>
                              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40">
                                Special Hours
                              </span>
                            </div>
                            <div className="text-xs font-medium text-black dark:text-white flex items-center justify-between pt-1 border-t border-amber-100 dark:border-amber-900/30">
                              <span>{format(sDate, timePattern)}</span>
                              <span className="text-slate-400">→</span>
                              <span>{format(eDate, timePattern)}</span>
                            </div>
                            {customReason && (
                              <ExpandableReason 
                                text={customReason} 
                                colorClass="text-amber-700 dark:text-amber-200"
                              />
                            )}
                          </div>
                        );
                      })}

                      {upcomingBlocks.map((bl: any, idx: number) => {
                        const sDate = getInTimezone(new Date(bl.startTime), timezone);
                        const eDate = getInTimezone(new Date(bl.endTime), timezone);
                        const timePattern = timeFormat === "24h" ? "HH:mm" : "hh:mm a";
                        const customBlockReason = (bl.reason && !["scheduled off", "one-time blocked period", "blocked"].includes(bl.reason.toLowerCase().trim())) 
                          ? bl.reason 
                          : null;

                        return (
                          <div key={bl.id || `bl-merged-${idx}`} className="p-4 rounded-2xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/10 flex flex-col justify-between gap-2 shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-normal text-rose-800 dark:text-rose-300">
                                {format(sDate, "MMM d, yyyy")}
                              </span>
                              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
                                Blocked Off
                              </span>
                            </div>
                            <div className="text-xs font-medium text-black dark:text-white flex items-center justify-between pt-1 border-t border-rose-100 dark:border-rose-900/30">
                              <span>{format(sDate, timePattern)}</span>
                              <span className="text-slate-400">→</span>
                              <span>{format(eDate, timePattern)}</span>
                            </div>
                            {customBlockReason && (
                              <ExpandableReason 
                                text={customBlockReason} 
                                colorClass="text-rose-700 dark:text-rose-400"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Tab 3: Appointments History */}
        {activeTab === "bookings" && (
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 md:px-8 md:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Calendar className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-black dark:text-slate-400 tracking-wider">{labels.appointment} History</span>
              </div>

              <Link
                href={`/${appointmentSlug}`}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400"
              >
                <span>View Full Calendar</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>

            {totalBookings > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left border-collapse">
                    <thead>
                      <tr className="bg-indigo-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                        <th className="px-6 py-3 sm:px-8 sm:py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{labels.customer}</th>
                        <th className="px-6 py-3 sm:px-8 sm:py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{labels.service}</th>
                        <th className="px-6 py-3 sm:px-8 sm:py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Date & Time</th>
                        <th className="px-6 py-3 sm:px-8 sm:py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                        <th className="px-6 py-3 sm:px-8 sm:py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Price</th>
                        <th className="px-6 py-3 sm:px-8 sm:py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {currentBookings.map((b: any) => {
                        const localDate = getInTimezone(new Date(b.startTime), timezone);
                        const timePattern = timeFormat === "24h" ? "HH:mm" : "hh:mm a";
                        return (
                          <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                            <td className="px-6 py-3.5 sm:px-8 sm:py-3.5 whitespace-nowrap">
                              <p className="text-sm font-medium text-black dark:text-slate-300">{b.customerName}</p>
                              {b.customerEmail && <p className="text-xs text-black dark:text-slate-400">{b.customerEmail}</p>}
                            </td>
                            <td className="px-6 py-3.5 sm:px-8 sm:py-3.5 whitespace-nowrap">
                              <span className="text-sm font-medium text-black dark:text-slate-300">
                                {b.service?.name || "Service"}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 sm:px-8 sm:py-3.5 whitespace-nowrap">
                              <p className="text-sm font-medium text-black dark:text-slate-300">
                                {format(localDate, "MMM d, yyyy")}
                              </p>
                              <p className="text-xs text-black dark:text-slate-400">
                                {format(localDate, timePattern)}
                              </p>
                            </td>
                            <td className="px-6 py-3.5 sm:px-8 sm:py-3.5 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeStyles(b.status)}`}>
                                {b.status}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 sm:px-8 sm:py-3.5 whitespace-nowrap">
                              <span className="text-sm font-mono font-medium text-black dark:text-slate-300">
                                {currencySymbol}{parseFloat(b.price || b.service?.price || "0").toFixed(2)}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 sm:px-8 sm:py-3.5 whitespace-nowrap text-right">
                              <Link
                                href={`/${appointmentSlug}/${b.id}`}
                                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400"
                              >
                                Details
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Footer */}
                {totalBookings > itemsPerPage && (
                  <div className="px-8 py-4 bg-indigo-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <p className="text-[10px] font-normal text-slate-400 uppercase tracking-widest">
                      Showing <span className="text-black dark:text-white">{indexOfFirstItem + 1}</span> to <span className="text-black dark:text-white">{Math.min(indexOfLastItem, totalBookings)}</span> of <span className="text-black dark:text-white">{totalBookings}</span> {labels.appointmentLower}s
                    </p>
                    
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 cursor-pointer"
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
                              type="button"
                              onClick={() => paginate(pageNum as number)}
                              className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                                isActive
                                  ? "bg-indigo-600 text-white shadow-sm"
                                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-800"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => paginate(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 cursor-pointer"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-12 text-center">
                <Calendar className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-sm font-medium text-black dark:text-slate-200">No {labels.appointment}s Found</p>
                <p className="text-xs text-black dark:text-slate-400 mt-1">This {labels.staffLower} does not have any bookings yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Leave Requests */}
        {activeTab === "leave" && staff.leaveRequests && (
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 md:px-8 md:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Clock className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-black dark:text-slate-400 tracking-wider">Leave & Time Off</span>
              </div>
              {allLeaveRequests.length > 0 && (
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {filteredLeaveRequests.length} {filteredLeaveRequests.length === 1 ? 'request' : 'requests'}
                </span>
              )}
            </div>

            <div className="p-6 md:p-8 space-y-4">
              {allLeaveRequests.length > 5 && (
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search leaves..."
                    value={leaveSearchQuery}
                    onChange={(e) => setLeaveSearchQuery(e.target.value)}
                    className="w-full bg-slate-50/50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-9 pr-10 text-xs font-semibold text-slate-900 dark:text-white placeholder:font-normal placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-all shadow-sm"
                  />
                  {leaveSearchQuery && (
                    <button
                      onClick={() => setLeaveSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800/60 transition-all active:scale-90"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}

              {allLeaveRequests.length === 0 ? (
                <p className="text-center text-slate-400 dark:text-slate-500 text-xs py-4 italic">No recent requests.</p>
              ) : filteredLeaveRequests.length === 0 ? (
                <div className="text-center py-6 bg-slate-50/30 dark:bg-slate-950/20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800/60">
                  <p className="text-xs text-slate-400">No matching results found.</p>
                </div>
              ) : (
                <div className={`space-y-3 pt-1 ${allLeaveRequests.length > 5 ? "max-h-[420px] overflow-y-auto pr-1 premium-scrollbar" : ""}`}>
                {filteredLeaveRequests.map((lr: any) => {
                  const sDate = getInTimezone(new Date(lr.startTime), timezone);
                  const eDate = getInTimezone(new Date(lr.endTime), timezone);
                  return (
                    <div key={lr.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-black dark:text-slate-300">{lr.type || "Time Off"}</p>
                        <p className="text-xs text-black dark:text-slate-400 mt-0.5">
                          {format(sDate, "MMM d, yyyy")} - {format(eDate, "MMM d, yyyy")}
                        </p>
                        {lr.reason && <p className="text-xs text-black dark:text-slate-400 mt-1">{lr.reason}</p>}
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeStyles(lr.status)}`}>
                        {lr.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Staff Modal */}
      {isEditModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4 md:p-8">
            <div 
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse"
            />
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-indigo-100/50 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
              <div className="px-8 py-6 border-b border-indigo-100/50 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 rounded-t-[2.4rem] z-10">
                <div className="flex items-center gap-3">
                  <div 
                    className="h-10 w-10 rounded-2xl flex items-center justify-center border shadow-sm"
                    style={{ borderColor: staff.color, backgroundColor: `${staff.color}10` }}
                  >
                    <labels.staffIcon className="h-5 w-5" style={{ color: staff.color }} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      Edit {labels.staff}
                    </h2>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Configuring {staff.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsEditModalOpen(false)} 
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                </button>
              </div>
              <div className="flex-1 flex flex-col min-h-0">
                <EditStaffForm 
                  staff={staff} 
                  isAdmin={isAdmin} 
                  onSuccess={() => {
                    setIsEditModalOpen(false);
                    router.refresh();
                  }} 
                  services={allServices}
                  locations={allLocations}
                  businessType={tenant?.businessType}
                  country={country}
                />
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse cursor-pointer" 
              onClick={() => setIsDeleteModalOpen(false)}
            />
            <div className="relative bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="p-8 text-center">
                <div className="mx-auto h-16 w-16 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center mb-6 border border-rose-100 dark:border-rose-900/50 animate-bounce">
                  <AlertCircle className="h-8 w-8 text-rose-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Remove {labels.staff}?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-8">
                  Are you sure you want to remove <span className="font-bold text-slate-900 dark:text-white">{staff.name}</span>? This will permanently delete their profile and associated user account.
                </p>

                <div className="grid grid-cols-2 gap-4 mt-8">
                  <button 
                    type="button"
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="py-3 px-4 rounded-2xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className="bg-rose-600 text-white py-3 px-4 rounded-2xl font-bold text-xs hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Remove"}
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
