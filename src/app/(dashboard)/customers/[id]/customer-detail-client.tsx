"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Phone,
  Calendar,
  Pencil,
  MapPin,
  DollarSign,
  UserCheck,
  UserMinus,
  User,
  ChevronLeft,
  ChevronRight,
  Search,
  FileText,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Plus,
  X,
  History,
  TrendingUp,
  Clock,
  ShieldCheck,
  Stethoscope,
  Scissors,
  Dumbbell
} from "lucide-react";
import { Portal } from "@/components/ui/portal";
import { Tooltip } from "@/components/ui/tooltip";
import { getLabels } from "@/lib/labels";
import { COUNTRIES } from "@/config/countries";
import { getInTimezone } from "@/lib/timezone-utils";
import { format } from "date-fns";
import { updateCustomer, toggleCustomerStatus, deleteCustomer } from "@/app/actions/customer";
import { PhoneInput } from "@/components/ui/phone-input";
import { toast } from "sonner";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";

interface CustomerDetailClientProps {
  customer: any;
  userRole: string;
  tenant: any;
  country?: string;
  timeFormat?: string;
  timezone?: string;
  currency?: string;
}

export function CustomerDetailClient({
  customer: initialCustomer,
  userRole,
  tenant,
  country,
  timeFormat = "12h",
  timezone = "UTC",
  currency = "USD"
}: CustomerDetailClientProps) {
  const router = useRouter();
  const [customer, setCustomer] = useState(initialCustomer);

  useEffect(() => {
    setCustomer(initialCustomer);
  }, [initialCustomer]);

  const [activeTab, setActiveTab] = useState<"profile" | "bookings">("profile");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useLockBodyScroll(isEditModalOpen || isArchiveModalOpen);

  const labels = getLabels(tenant?.businessType);
  const customerSlug = labels.customerSlug;
  const staffSlug = labels.staffSlug;
  const appointmentSlug = labels.appointmentSlug;
  const ServiceIcon = labels.serviceIcon;
  const StaffIcon = labels.staffIcon;

  const isAdmin = userRole === "ADMIN";
  const countryData = COUNTRIES.find((c) => c.code === (country || "US"));
  const currencySymbol = countryData?.symbol || "$";
  const dialCode = countryData?.phoneCode ? `+${countryData.phoneCode} ` : "";

  const formatPhone = (phone?: string | null) => {
    if (!phone) return null;
    return phone.startsWith("+") ? phone : `${dialCode}${phone}`;
  };

  const getInitials = (n: string) => {
    if (!n) return "PT";
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
      case "NOSHOW":
        return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/20 dark:text-slate-400 dark:border-slate-800";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/20 dark:text-slate-400 dark:border-slate-800";
    }
  };

  const allBookings = customer.bookings || [];
  const totalBookings = allBookings.length;

  const now = new Date();
  const upcomingBookingsCount = allBookings.filter(
    (b: any) => new Date(b.startTime) > now && b.status !== "CANCELLED"
  ).length;

  const completedBookingsCount = allBookings.filter(
    (b: any) => b.status === "COMPLETED"
  ).length;

  // Calculate total spend
  const totalSpend = allBookings.reduce((sum: number, b: any) => {
    if (b.status === "COMPLETED" || b.status === "CONFIRMED") {
      const price = parseFloat(b.price || b.service?.price || "0");
      return sum + (isNaN(price) ? 0 : price);
    }
    return sum;
  }, 0);

  // Pagination for Appointments History
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

  // Frequently visited staff & services
  const practitionerVisits = useMemo(() => {
    const counts: Record<string, { staff: any; count: number; lastDate: Date }> = {};
    allBookings.forEach((b: any) => {
      if (b.staff) {
        const sid = b.staff.id;
        const bDate = new Date(b.startTime);
        if (!counts[sid]) {
          counts[sid] = { staff: b.staff, count: 1, lastDate: bDate };
        } else {
          counts[sid].count += 1;
          if (bDate > counts[sid].lastDate) {
            counts[sid].lastDate = bDate;
          }
        }
      }
    });
    return Object.values(counts).sort((a, b) => b.count - a.count);
  }, [allBookings]);

  const serviceVisits = useMemo(() => {
    const counts: Record<string, { service: any; count: number }> = {};
    allBookings.forEach((b: any) => {
      if (b.service) {
        const srvId = b.service.id;
        if (!counts[srvId]) {
          counts[srvId] = { service: b.service, count: 1 };
        } else {
          counts[srvId].count += 1;
        }
      }
    });
    return Object.values(counts).sort((a, b) => b.count - a.count);
  }, [allBookings]);

  // Last visited date & first visited date
  const firstVisitDate = allBookings.length > 0 ? new Date(allBookings[allBookings.length - 1].startTime) : null;
  const lastVisitDate = allBookings.length > 0 ? new Date(allBookings[0].startTime) : null;

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await updateCustomer(customer.id, formData);
    if (result.success) {
      toast.success(`${labels.customer} updated successfully!`);
      router.refresh();
      setIsEditModalOpen(false);
    } else {
      toast.error(result.error || "Failed to update profile");
    }
    setLoading(false);
  };

  const handleToggleStatus = async (newStatus: "ACTIVE" | "INACTIVE", reason?: string) => {
    setStatusLoading(true);
    const result = await toggleCustomerStatus(customer.id, newStatus, reason);
    if (result.success) {
      toast.success(newStatus === "ACTIVE" ? `${labels.customer} activated!` : `${labels.customer} inactivated!`);
      router.refresh();
      setIsArchiveModalOpen(false);
    } else {
      toast.error(result.error || "Failed to update status");
    }
    setStatusLoading(false);
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-full min-w-0 animate-fade-in p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header breadcrumb */}
      <div className="flex items-center gap-2 text-sm font-medium tracking-wider">
        <Link href={`/${customerSlug}`} className="text-black dark:text-white">
          {labels.customer}s
        </Link>
        <span className="text-slate-700 dark:text-slate-300">&gt;&gt;</span>
        <span className="text-indigo-600 dark:text-indigo-400">{customer.name}</span>
      </div>

      {/* Main Patient Profile Banner Card */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Accent Top Bar */}
        <div
          className="h-2.5 w-full bg-indigo-600"
          style={{ backgroundColor: tenant?.primaryColor || "#6366f1" }}
        />

        <div className="p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
            {/* Left: Avatar and Identity */}
            <div className="flex items-center gap-5">
              <div
                className={`h-16 w-16 sm:h-20 sm:w-20 rounded-3xl flex items-center justify-center text-white text-xl sm:text-2xl font-bold shrink-0 shadow-md border-2 ${
                  customer.status === "ACTIVE"
                    ? "bg-indigo-600 border-indigo-500 shadow-indigo-500/20"
                    : "bg-slate-600 border-slate-500 shadow-slate-500/20"
                }`}
              >
                {getInitials(customer.name)}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-medium text-black dark:text-slate-200 tracking-tight">
                    {customer.name}
                  </h1>
                  {customer.status === "ACTIVE" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-900/50">
                      <UserCheck className="h-3 w-3" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-200 dark:border-rose-900/50">
                      <UserMinus className="h-3 w-3" />
                      Inactive
                    </span>
                  )}
                </div>

                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Registered {labels.customer}
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-black dark:text-slate-400">
                  {customer.email && (
                    <span className="flex items-center gap-1.5 text-black dark:text-slate-400">
                      <Mail className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      <span>{customer.email}</span>
                    </span>
                  )}
                  {customer.phone && (
                    <span className="flex items-center gap-1.5 text-black dark:text-slate-400">
                      <Phone className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      <span>{formatPhone(customer.phone)}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-black dark:text-slate-400">
                    <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <span>Since {customer.createdAt ? format(new Date(customer.createdAt), "MMM d, yyyy") : "N/A"}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 active:scale-95 cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Profile
              </button>

              <Link
                href={`/${appointmentSlug}?customerEmail=${encodeURIComponent(customer.email)}`}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-400 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                Book {labels.appointment}
              </Link>

              {customer.status === "ACTIVE" ? (
                <button
                  type="button"
                  onClick={() => setIsArchiveModalOpen(true)}
                  className="flex items-center gap-2 px-3.5 py-2.5 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                >
                  <UserMinus className="h-3.5 w-3.5" />
                  Inactivate
                </button>
              ) : (
                isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleToggleStatus("ACTIVE")}
                    disabled={statusLoading}
                    className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    Activate
                  </button>
                )
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
                <span className="text-xs font-medium text-black dark:text-slate-400 tracking-wider">Total {labels.appointment}s</span>
              </div>
              <p className="text-xl font-medium text-black dark:text-slate-200 mt-1">
                {totalBookings}
              </p>
            </div>

            <div className="p-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-5 w-5 rounded-md bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <DollarSign className="h-3 w-3" />
                </div>
                <span className="text-xs font-medium text-black dark:text-slate-400 tracking-wider">Lifetime Value</span>
              </div>
              <p className="text-xl font-medium text-black dark:text-slate-200 mt-1 font-mono">
                {currencySymbol}{totalSpend.toFixed(2)}
              </p>
            </div>

            <div className="p-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-5 w-5 rounded-md bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Clock className="h-3 w-3" />
                </div>
                <span className="text-xs font-medium text-black dark:text-slate-400 tracking-wider">Upcoming Visits</span>
              </div>
              <p className="text-xl font-medium text-black dark:text-slate-200 mt-1">
                {upcomingBookingsCount}
              </p>
            </div>

            <div className="p-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-5 w-5 rounded-md bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <UserCheck className="h-3 w-3" />
                </div>
                <span className="text-xs font-medium text-black dark:text-slate-400 tracking-wider">Completed Visits</span>
              </div>
              <p className="text-xl font-medium text-black dark:text-slate-200 mt-1">
                {completedBookingsCount}
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
          Profile & Notes
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
          {totalBookings > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
              {totalBookings}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Tab 1: Profile & Notes */}
        {activeTab === "profile" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Col: Contact and Profile Details */}
            <div className="lg:col-span-1 space-y-6">
              {/* Contact & Profile Card */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-black dark:text-slate-400 tracking-wider">Contact & Profile</span>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-black dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-indigo-500" />
                      Email Address
                    </span>
                    <p className="text-sm font-medium text-black dark:text-slate-300 break-all pl-5">
                      {customer.email || "No email set"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-medium text-black dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-indigo-500" />
                      Phone Number
                    </span>
                    <p className="text-sm font-medium text-black dark:text-slate-300 font-mono pl-5">
                      {formatPhone(customer.phone) || "—"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-medium text-black dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                      {labels.customer} Since
                    </span>
                    <p className="text-sm font-medium text-black dark:text-slate-300 pl-5">
                      {customer.createdAt ? format(new Date(customer.createdAt), "MMMM d, yyyy") : "N/A"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-medium text-black dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                      Account Status
                    </span>
                    <div className="pl-5 pt-0.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border ${
                        customer.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/50"
                          : "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:border-rose-900/50"
                      }`}>
                        {customer.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visit History Overview Card */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <History className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-black dark:text-slate-400 tracking-wider">Visit History Overview</span>
                  </div>
                </div>
                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">First Visit</span>
                    <span className="text-black dark:text-slate-200 font-medium">
                      {firstVisitDate ? format(getInTimezone(firstVisitDate, timezone), "MMM d, yyyy") : "None yet"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Most Recent Visit</span>
                    <span className="text-black dark:text-slate-200 font-medium">
                      {lastVisitDate ? format(getInTimezone(lastVisitDate, timezone), "MMM d, yyyy") : "None yet"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Total Appointments</span>
                    <span className="text-black dark:text-slate-200 font-medium">{totalBookings}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Total Spend</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                      {currencySymbol}{totalSpend.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Notes, History, Practitioners & Services */}
            <div className="lg:col-span-2 space-y-6">
              {/* Notes & Medical/Treatment Records Card */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                <div className="px-5 py-3 md:px-6 md:py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-black dark:text-slate-400 tracking-wider">
                      {labels.customer} Notes & History
                    </span>
                  </div>
                  {customer.notes && (
                    <button
                      onClick={() => setIsEditModalOpen(true)}
                      className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit Notes
                    </button>
                  )}
                </div>

                <div className="p-4 sm:p-5">
                  {customer.notes ? (
                    <div className="bg-slate-50/50 dark:bg-slate-950/20 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs sm:text-sm leading-relaxed text-black dark:text-slate-300 whitespace-pre-wrap max-h-28 overflow-y-auto premium-scrollbar">
                      {customer.notes}
                    </div>
                  ) : (
                    <div className="py-3 px-4 text-center bg-slate-50/30 dark:bg-slate-950/10 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                      <p className="text-xs text-slate-500 dark:text-slate-400">No notes recorded.</p>
                      <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 cursor-pointer"
                      >
                        + Add notes
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Practitioners Visited & Services Received */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Visited Practitioners */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                  <div className="px-6 py-4 md:px-8 md:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <StaffIcon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-black dark:text-slate-400 tracking-wider">
                        {labels.staff}s Seen
                      </span>
                    </div>
                  </div>
                  <div className="p-6 md:p-8 flex-1">
                    {practitionerVisits.length > 0 ? (
                      <div className="space-y-3">
                        {practitionerVisits.map((item) => (
                          <div
                            key={item.staff.id}
                            className="p-3.5 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm"
                                style={{ backgroundColor: item.staff.color || "#6366f1" }}
                              >
                                {getInitials(item.staff.name)}
                              </div>
                              <div>
                                <Link
                                  href={`/${staffSlug}/${item.staff.id}`}
                                  className="text-sm font-semibold text-black dark:text-slate-200 transition-colors"
                                >
                                  {item.staff.name}
                                </Link>
                                <p className="text-xs text-slate-400">
                                  Last seen: {format(getInTimezone(item.lastDate, timezone), "MMM d, yyyy")}
                                </p>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/40">
                              {item.count} {item.count === 1 ? "visit" : "visits"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No {labels.staffLower} visits recorded yet.</p>
                    )}
                  </div>
                </div>

                {/* Services Received */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                  <div className="px-6 py-4 md:px-8 md:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <ServiceIcon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-black dark:text-slate-400 tracking-wider">
                        {labels.service}s Received
                      </span>
                    </div>
                  </div>
                  <div className="p-6 md:p-8 flex-1">
                    {serviceVisits.length > 0 ? (
                      <div className="space-y-3">
                        {serviceVisits.map((item) => (
                          <div
                            key={item.service.id}
                            className="p-3.5 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className="h-3 w-3 rounded-full shrink-0 shadow-sm"
                                style={{ backgroundColor: item.service.color || "#6366f1" }}
                              />
                              <span className="text-sm font-medium text-black dark:text-slate-200">
                                {item.service.name}
                              </span>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {item.count}x
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No {labels.serviceLower}s received yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Appointments History */}
        {activeTab === "bookings" && (
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 md:px-8 md:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Calendar className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-black dark:text-slate-400 tracking-wider">
                  {labels.appointment} History
                </span>
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
                        <th className="px-6 py-3 sm:px-8 sm:py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                          {labels.service}
                        </th>
                        <th className="px-6 py-3 sm:px-8 sm:py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                          {labels.staff}
                        </th>
                        <th className="px-6 py-3 sm:px-8 sm:py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                          Date & Time
                        </th>
                        <th className="px-6 py-3 sm:px-8 sm:py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                          Status
                        </th>
                        <th className="px-6 py-3 sm:px-8 sm:py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                          Price
                        </th>
                        <th className="px-6 py-3 sm:px-8 sm:py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {currentBookings.map((b: any) => {
                        const localDate = getInTimezone(new Date(b.startTime), timezone);
                        const timePattern = timeFormat === "24h" ? "HH:mm" : "hh:mm a";
                        return (
                          <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                            <td className="px-6 py-3.5 sm:px-8 sm:py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {b.service?.color && (
                                  <div
                                    className="h-2.5 w-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: b.service.color }}
                                  />
                                )}
                                <span className="text-sm font-medium text-black dark:text-slate-300">
                                  {b.service?.name || "Service"}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-3.5 sm:px-8 sm:py-3.5 whitespace-nowrap">
                              <p className="text-sm font-medium text-black dark:text-slate-300">
                                {b.staff?.name || "Unassigned"}
                              </p>
                              {b.location && (
                                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                  <MapPin className="h-3 w-3" />
                                  {b.location.name}
                                </p>
                              )}
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
                      Showing <span className="text-black dark:text-white">{indexOfFirstItem + 1}</span> to{" "}
                      <span className="text-black dark:text-white">{Math.min(indexOfLastItem, totalBookings)}</span> of{" "}
                      <span className="text-black dark:text-white">{totalBookings}</span> {labels.appointmentLower}s
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
                <p className="text-xs text-black dark:text-slate-400 mt-1">
                  This {labels.customerLower} does not have any booking records yet.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Patient Modal */}
      {isEditModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4 md:p-8">
            <div
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse"
            />
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-indigo-100/50 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
              <div className="px-8 py-6 border-b border-indigo-100/50 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 rounded-t-[2.4rem] z-10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 dark:shadow-none border border-transparent dark:border-white/10">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      Edit {labels.customer}
                    </h2>
                    <p className="text-xs font-medium text-slate-500">Configuring {customer.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900">
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 premium-scrollbar">
                  <div>
                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      defaultValue={customer.name}
                      placeholder={labels.customerPlaceholder}
                      className="w-full rounded-2xl border-2 border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white shadow-sm hover:border-indigo-200 dark:hover:border-slate-800 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      defaultValue={customer.email}
                      placeholder="patient@example.com"
                      className="w-full rounded-2xl border-2 border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white shadow-sm hover:border-indigo-200 dark:hover:border-slate-800 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">
                      Phone Number
                    </label>
                    <PhoneInput
                      name="phone"
                      defaultValue={customer.phone || ""}
                      defaultCountry={country || "US"}
                      placeholder="234 567 890"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">
                      Notes & Medical / Treatment History
                    </label>
                    <textarea
                      name="notes"
                      rows={5}
                      defaultValue={customer.notes || ""}
                      placeholder="Enter patient notes, clinical records, preferences, or important history..."
                      className="w-full rounded-2xl border-2 border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white shadow-sm hover:border-indigo-200 dark:hover:border-slate-800 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900"
                    />
                  </div>
                </div>

                <div className="px-8 py-4 border-t border-indigo-100/30 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-[2.5rem]">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md border border-transparent dark:border-white/10 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : `Save ${labels.customer} Profile`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {/* Inactivate Confirmation Modal */}
      {isArchiveModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse cursor-pointer"
              onClick={() => setIsArchiveModalOpen(false)}
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="p-8 text-center">
                <div className="mx-auto h-16 w-16 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center mb-6 border border-amber-100 animate-bounce">
                  <AlertTriangle className="h-8 w-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                  Inactivate {labels.customer}?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-8">
                  Inactivating <span className="font-bold text-slate-900 dark:text-white">{customer.name}</span> will hide them from your active list.
                </p>

                <div className="space-y-4 text-left">
                  <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">
                    Reason for Inactivating
                  </label>
                  <select
                    value={archiveReason}
                    onChange={(e) => setArchiveReason(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl px-5 py-4 text-sm dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="">Select a reason...</option>
                    <option value="Moved away">Moved away</option>
                    <option value="Duplicate entry">Duplicate entry</option>
                    <option value="Requested no contact">Requested no contact</option>
                    <option value="Business decision">Business decision</option>
                    <option value="Other">Other (Type below)</option>
                  </select>

                  {archiveReason === "Other" && (
                    <input
                      type="text"
                      placeholder="Please specify..."
                      onChange={(e) => setArchiveReason(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl px-5 py-4 text-sm dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 animate-in fade-in"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8">
                  <button
                    type="button"
                    onClick={() => setIsArchiveModalOpen(false)}
                    className="py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus("INACTIVE", archiveReason)}
                    disabled={!archiveReason || statusLoading}
                    className="bg-amber-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-amber-700 transition-all shadow-xl shadow-amber-100 dark:shadow-none disabled:opacity-50 cursor-pointer"
                  >
                    {statusLoading ? "Inactivating..." : "Inactivate"}
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
