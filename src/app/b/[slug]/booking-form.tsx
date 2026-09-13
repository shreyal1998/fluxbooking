"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { 
  format, 
  addDays, 
  subDays, 
  startOfToday, 
  startOfDay, 
  startOfWeek, 
  isSameDay, 
  isBefore, 
  parse 
} from "date-fns";
import { 
  ChevronRight, 
  ChevronLeft, 
  Clock, 
  CheckCircle2, 
  Loader2,
  Calendar as CalendarIcon,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Users,
  RefreshCcw,
  Sun,
  Sunset,
  Moon,
  Check,
  Search,
  X,
  MapPin,
  Building2
} from "lucide-react";
import { createBooking, rescheduleBookingByCustomer, getNextAvailableDate } from "@/app/actions/booking";
import { toast } from "sonner";
import { LiquidLoader } from "@/components/ui/liquid-loader";

import { getLabels } from "@/lib/labels";
import { formatCurrency } from "@/lib/currency-utils";
import { BusinessType } from "@prisma/client";
import { PhoneInput } from "@/components/ui/phone-input";
import { validatePhoneNumber } from "@/lib/utils";

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: string;
  color: string;
}

interface Location {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  isPrimary: boolean;
}

interface Staff {
  id: string;
  name: string;
  bio?: string | null;
  color: string;
  services?: { id: string }[];
  locations?: { id: string }[];
}

const InputError = ({ message }: { message?: string }) => {
  if (!message) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1.5 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      <span className="text-xs font-semibold">{message}</span>
    </div>
  );
};

export function BookingForm({ 
  tenantId, 
  tenantName,
  logoUrl,
  services, 
  staff,
  locations = [],
  primaryColor = "#6366f1",
  businessType,
  timezone = "UTC",
  currency = "USD",
  timeFormat = "12h",
  weekStart = "sunday",
  country
}: { 
  tenantId: string; 
  tenantName?: string;
  logoUrl?: string | null;
  services: Service[]; 
  staff: Staff[];
  locations?: Location[];
  primaryColor?: string;
  businessType?: BusinessType;
  timezone?: string;
  currency?: string;
  timeFormat?: string;
  weekStart?: string;
  country?: string;
}) {
  const labels = getLabels(businessType);
  const searchParams = useSearchParams();
  const rescheduleId = searchParams.get("reschedule");
  const isRescheduling = !!rescheduleId;

  const timeDisplayFormat = timeFormat === "24h" ? "HH:mm" : "hh:mm a";
  const weekStartsOn = (weekStart === "monday" ? 1 : 0) as 0 | 1;

  // Calculate "today" based on the business timezone
  const getTodayAtVenue = () => {
    try {
      const str = new Date().toLocaleString("en-US", { timeZone: timezone });
      return startOfDay(new Date(str));
    } catch {
      return startOfToday();
    }
  };

  const [hasMounted, setHasMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    searchParams.get("staffId") || "any"
  );
  
  const todayAtVenue = getTodayAtVenue();
  const [selectedDate, setSelectedDate] = useState<Date | null>(todayAtVenue);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => startOfWeek(getTodayAtVenue(), { weekStartsOn }));
  
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; staffId: string; staffName: string } | null>(null);
  const [slots, setSlots] = useState<{ time: string; staffId: string; staffName: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serviceSearch, setServiceSearch] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [nextAvailableDate, setNextAvailableDate] = useState<string | null>(null);
  const [findingNextDate, setFindingNextDate] = useState(false);
  const staffScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollStaffLeft, setCanScrollStaffLeft] = useState(false);
  const [canScrollStaffRight, setCanScrollStaffRight] = useState(false);

  const checkStaffScroll = () => {
    if (staffScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = staffScrollRef.current;
      setCanScrollStaffLeft(scrollLeft > 6);
      setCanScrollStaffRight(scrollLeft + clientWidth < scrollWidth - 6);
    }
  };

  const scrollStaff = (direction: "left" | "right") => {
    if (staffScrollRef.current) {
      const amount = direction === "left" ? -180 : 180;
      staffScrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
      setTimeout(checkStaffScroll, 250);
    }
  };

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Check practitioner scroll state on step change or window resize
  useEffect(() => {
    const timer = setTimeout(checkStaffScroll, 100);
    window.addEventListener("resize", checkStaffScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkStaffScroll);
    };
  }, [step]);

  // Update currentWeekStart when weekStartsOn changes
  useEffect(() => {
    setCurrentWeekStart(startOfWeek(selectedDate || todayAtVenue, { weekStartsOn }));
  }, [weekStartsOn]);

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(() => {
    if (locations && locations.length > 0) {
      const primary = locations.find(l => l.isPrimary);
      return primary ? primary.id : locations[0].id;
    }
    return null;
  });

  const activeLocation = locations.find(l => l.id === selectedLocationId) || (locations.length > 0 ? locations[0] : null);

  // Filter staff by assigned branch location
  const branchStaff = (selectedLocationId && locations.length > 1)
    ? staff.filter(s => {
        if (!s.locations || s.locations.length === 0) return true;
        return s.locations.some((l: any) => l.id === selectedLocationId);
      })
    : staff;

  // Filter staff available for the selected service
  const filteredStaff = branchStaff.filter(s => 
    !selectedService || s.services?.some((srv) => srv.id === selectedService.id)
  );

  // Filter services based on selected staff if one is preselected via query parameter
  const filteredServices = selectedStaffId !== "any"
    ? services.filter(srv => {
        const selectedStaff = staff.find(s => s.id === selectedStaffId);
        return selectedStaff?.services?.some((sSrv: any) => sSrv.id === srv.id);
      })
    : services;

  // Filter services by search query
  const searchedServices = filteredServices.filter(s =>
    s.name.toLowerCase().includes(serviceSearch.toLowerCase().trim())
  );

  // 7-day week array
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const minWeekStart = startOfWeek(todayAtVenue, { weekStartsOn });
  const isPrevWeekDisabled = currentWeekStart.getTime() <= minWeekStart.getTime();

  const handlePrevWeek = () => {
    if (isPrevWeekDisabled) return;
    const newWeek = subDays(currentWeekStart, 7);
    setCurrentWeekStart(newWeek);
    const targetDate = isSameDay(newWeek, minWeekStart) ? todayAtVenue : newWeek;
    setSelectedDate(targetDate);
    setSelectedSlot(null);
  };

  const handleNextWeek = () => {
    const newWeek = addDays(currentWeekStart, 7);
    setCurrentWeekStart(newWeek);
    setSelectedDate(newWeek);
    setSelectedSlot(null);
  };

  const handleJumpToToday = () => {
    setCurrentWeekStart(minWeekStart);
    setSelectedDate(todayAtVenue);
    setSelectedSlot(null);
  };

  const handleJumpToNextAvailable = (dateStr: string) => {
    try {
      const targetDate = parse(dateStr, "yyyy-MM-dd", new Date());
      const targetWeek = startOfWeek(targetDate, { weekStartsOn });
      setCurrentWeekStart(targetWeek);
      setSelectedDate(targetDate);
      setSelectedSlot(null);
    } catch (e) {
      console.error("Error jumping to date", e);
    }
  };

  const formatNextAvailableLabel = (dateStr: string) => {
    try {
      const d = parse(dateStr, "yyyy-MM-dd", new Date());
      return format(d, "EEE, MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  // Week range label for header (e.g. "September 2026" or "Aug – Sep 2026")
  const weekEnd = addDays(currentWeekStart, 6);
  const weekMonthYearLabel = format(currentWeekStart, "MMM yyyy") === format(weekEnd, "MMM yyyy")
    ? format(currentWeekStart, "MMMM yyyy")
    : `${format(currentWeekStart, "MMM")} – ${format(weekEnd, "MMM yyyy")}`;

  // Fetch slots when date, service, or staff changes
  useEffect(() => {
    async function fetchSlots() {
      if (!selectedService || !selectedDate) {
        setSlots([]);
        return;
      }
      
      setLoadingSlots(true);
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const staffParam = selectedStaffId !== "any" ? `&staffId=${selectedStaffId}` : "";
        const response = await fetch(`/api/slots?tenantId=${tenantId}&serviceId=${selectedService.id}&date=${dateStr}${staffParam}`);
        const data = await response.json();
        const fetchedSlots = data.slots || [];
        setSlots(fetchedSlots);

        if (fetchedSlots.length === 0) {
          setFindingNextDate(true);
          setNextAvailableDate(null);
          getNextAvailableDate(
            tenantId,
            selectedService.id,
            dateStr,
            selectedStaffId !== "any" ? selectedStaffId : undefined
          ).then(res => {
            if (res.success && res.date) {
              setNextAvailableDate(res.date);
            }
          }).finally(() => {
            setFindingNextDate(false);
          });
        } else {
          setNextAvailableDate(null);
        }
      } catch {
        console.error("Failed to fetch slots");
      } finally {
        setLoadingSlots(false);
      }
    }

    if (hasMounted && step === 2 && selectedService && selectedDate) {
      fetchSlots();
    }
  }, [selectedDate, selectedService, selectedStaffId, step, tenantId, hasMounted]);

  if (!hasMounted) {
    return (
      <div className="flex justify-center items-center p-24">
        <LiquidLoader color={primaryColor} />
      </div>
    );
  }

  async function handleConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedService || !selectedSlot || !selectedDate) return;

    setSubmitting(true);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const customerName = formData.get("customerName") as string;
    const customerEmail = formData.get("customerEmail") as string;
    const customerPhone = formData.get("customerPhone") as string;

    const errors: Record<string, string> = {};
    if (!customerName) errors.customerName = "Full name is required";
    if (!customerEmail) errors.customerEmail = "Email address is required";

    const phoneError = validatePhoneNumber(customerPhone);
    if (phoneError) errors.customerPhone = phoneError;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitting(false);
      return;
    }

    if (isRescheduling && rescheduleId) {
      const result = await rescheduleBookingByCustomer(
        rescheduleId,
        format(selectedDate, "yyyy-MM-dd"),
        selectedSlot.time
      );
      setSubmitting(false);
      if (result.success) {
        toast.success(`${labels.appointment} rescheduled successfully!`);
        setSuccess(true);
      } else {
        toast.error(result.error);
      }
    } else {
      formData.append("tenantId", tenantId);
      formData.append("serviceId", selectedService.id);
      formData.append("staffId", selectedSlot.staffId);
      formData.append("date", format(selectedDate, "yyyy-MM-dd"));
      formData.append("time", selectedSlot.time);
      if (selectedLocationId) {
        formData.append("locationId", selectedLocationId);
      }

      const result = await createBooking(formData);
      setSubmitting(false);

      if (result.success) {
        toast.success(`${labels.appointment} confirmed! Please check your email.`);
        setSuccess(true);
      } else {
        toast.error(result.error);
      }
    }
  }

  if (success) {
    return (
      <div className="p-8 md:p-14 text-center space-y-6 animate-fade-in">
        <div 
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border shadow-md animate-in zoom-in-95 duration-300"
          style={{ 
            backgroundColor: `${primaryColor}15`, 
            borderColor: `${primaryColor}30`,
            color: primaryColor 
          }}
        >
          <CheckCircle2 className="h-8 w-8" />
        </div>
        
        <div className="space-y-1.5">
          <h3 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            {isRescheduling ? "Reschedule Successful!" : `${labels.appointment} Confirmed!`}
          </h3>
          <p className="text-slate-500 font-normal max-w-md mx-auto text-sm">
            We&apos;ve sent a detailed confirmation email and calendar invite.
          </p>
        </div>

        <div className="bg-slate-50/80 rounded-3xl p-6 border border-slate-200/80 text-left max-w-md mx-auto shadow-xs space-y-3">
           <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/60">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{labels.service}</span>
              <span className="text-sm font-semibold text-slate-900">{selectedService?.name}</span>
           </div>
           <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/60">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Date & Time</span>
              <span className="text-sm font-semibold text-slate-900">
                {selectedDate && format(selectedDate, "EEE, MMM d, yyyy")} • {selectedSlot && format(parse(selectedSlot.time, "HH:mm", new Date()), timeDisplayFormat)}
              </span>
           </div>
           <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/60">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{labels.staff}</span>
              <span className="text-sm font-semibold text-slate-900">{selectedSlot?.staffName}</span>
           </div>
           <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Duration</span>
              <span className="text-sm font-semibold text-slate-900">{selectedService?.durationMinutes} mins</span>
           </div>
        </div>

        <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button 
            onClick={() => window.location.href = window.location.pathname}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl text-sm font-medium text-white transition-all shadow-md active:scale-95 cursor-pointer"
            style={{ backgroundColor: primaryColor }}
          >
            {isRescheduling ? `Back to ${labels.appointmentLower}` : `Book Another ${labels.appointmentLower}`}
          </button>
        </div>
      </div>
    );
  }

  const stepsList = [
    { num: 1, label: labels.service },
    { num: 2, label: "Date & Time" },
    { num: 3, label: "Details" }
  ];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Reschedule Active Banner */}
      {isRescheduling && (
        <div 
          className="px-6 py-2.5 text-white flex items-center justify-center gap-2 font-medium text-xs uppercase tracking-wider shadow-xs"
          style={{ backgroundColor: primaryColor }}
        >
          <RefreshCcw className="h-3.5 w-3.5 animate-spin-slow" />
          <span>Rescheduling Appointment</span>
        </div>
      )}

      {/* Stepper Header */}
      <div className="px-5 md:px-8 py-3.5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            {stepsList.map((st, idx) => {
              const isCurrent = step === st.num;
              const isPast = step > st.num;
              return (
                <div key={st.num} className="flex items-center gap-2">
                  <div 
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isCurrent 
                        ? "text-white shadow-xs" 
                        : isPast 
                          ? "bg-emerald-500 text-white" 
                          : "bg-slate-200/80 text-slate-600"
                    }`}
                    style={{ 
                      backgroundColor: isCurrent ? primaryColor : undefined,
                    }}
                  >
                    {isPast ? (
                      <Check className="h-3 w-3 stroke-[2.5]" />
                    ) : (
                      <span className="text-[11px] font-semibold">{st.num}</span>
                    )}
                    <span className="hidden sm:inline font-medium">{st.label}</span>
                  </div>
                  {idx < stepsList.length - 1 && (
                    <div className={`w-4 md:w-8 h-0.5 rounded-full ${isPast ? "bg-emerald-500" : "bg-slate-200"}`} />
                  )}
                </div>
              );
            })}
          </div>

          <span className="text-xs font-medium text-slate-500">
            Step {step} of 3
          </span>
        </div>
      </div>

      {/* Stepper Content Body */}
      <div className="p-5 md:p-8 flex-1 overflow-y-auto">
        {/* STEP 1: SERVICE SELECTION */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-0.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Sparkles className="h-4 w-4" style={{ color: primaryColor }} />
                  {isRescheduling ? `Confirm ${labels.service}` : `Select a ${labels.service}`}
                </h2>
                {selectedStaffId !== "any" && staff.find(s => s.id === selectedStaffId) && (
                  <span 
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-2xs"
                    style={{
                      backgroundColor: `${primaryColor}0c`,
                      borderColor: `${primaryColor}25`,
                      color: primaryColor
                    }}
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>{staff.find(s => s.id === selectedStaffId)?.name}</span>
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-xs font-normal">
                {isRescheduling 
                  ? `Verify the ${labels.serviceLower} for your new appointment date and time.`
                  : selectedStaffId !== "any" && staff.find(s => s.id === selectedStaffId)
                    ? <>Showing available {labels.serviceLower === "class" ? "classes" : `${labels.serviceLower}s`} for <strong className="font-semibold text-slate-900">{staff.find(s => s.id === selectedStaffId)?.name}</strong>.</>
                    : `Choose the ${labels.serviceLower} you would like to book.`}
              </p>
            </div>

            {/* Multi-Location Branch Selector */}
            {locations && locations.length > 1 && (
              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <MapPin className="h-3.5 w-3.5" style={{ color: primaryColor }} />
                    <span>Select Location Branch</span>
                  </div>
                  {activeLocation && (
                    <span className="text-[11px] font-semibold" style={{ color: primaryColor }}>
                      {activeLocation.name}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {locations.map((loc) => {
                    const isLocSelected = selectedLocationId === loc.id;
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => {
                          setSelectedLocationId(loc.id);
                          if (selectedStaffId !== "any") {
                            const isStaffAtLoc = staff.find(s => s.id === selectedStaffId)?.locations?.some(l => l.id === loc.id) ?? true;
                            if (!isStaffAtLoc) setSelectedStaffId("any");
                          }
                        }}
                        className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                          isLocSelected
                            ? "shadow-2xs"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                        style={{
                          borderColor: isLocSelected ? primaryColor : undefined,
                          backgroundColor: isLocSelected ? `${primaryColor}08` : undefined,
                        }}
                      >
                        <div
                          className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{
                            backgroundColor: isLocSelected ? `${primaryColor}20` : "#f1f5f9",
                            color: isLocSelected ? primaryColor : "#64748b",
                          }}
                        >
                          <Building2 className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {loc.name}
                            </p>
                            {loc.isPrimary && (
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-full">
                                Main
                              </span>
                            )}
                          </div>
                          {loc.address && (
                            <p className="text-[11px] text-slate-500 truncate font-normal">
                              {loc.address}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Service Search Bar */}
            {(filteredServices.length > 0 || serviceSearch) && (
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  placeholder={`Search ${labels.serviceLower === "class" ? "classes" : `${labels.serviceLower}s`}...`}
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs md:text-sm font-normal text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white transition-all shadow-2xs"
                  style={{
                    borderColor: serviceSearch ? primaryColor : undefined,
                  }}
                />
                {serviceSearch && (
                  <button
                    type="button"
                    onClick={() => setServiceSearch("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 rounded-full bg-slate-200/80 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            )}

            <div className="grid gap-2.5">
              {filteredServices.length === 0 ? (
                <div className="text-center py-10 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs md:text-sm text-slate-600 font-medium">No {labels.serviceLower === "class" ? "classes" : `${labels.serviceLower}s`} available at this time.</p>
                </div>
              ) : searchedServices.length === 0 ? (
                <div className="text-center py-10 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                  <Search className="h-6 w-6 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs md:text-sm font-medium text-slate-600">No {labels.serviceLower === "class" ? "classes" : `${labels.serviceLower}s`} found</p>
                </div>
              ) : (
                searchedServices.map((service) => {
                  const isSelected = selectedService?.id === service.id;
                  return (
                    <button
                      key={service.id}
                      onClick={() => {
                        setSelectedService(service);
                        setStep(2);
                      }}
                      className={`group w-full flex items-center justify-between p-3.5 md:p-4 rounded-2xl border-2 text-left transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? "shadow-sm"
                          : "bg-white shadow-2xs"
                      }`}
                      style={{ 
                        borderColor: isSelected ? primaryColor : "#e2e8f0",
                        backgroundColor: isSelected ? `${primaryColor}0c` : "#ffffff"
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = primaryColor;
                          e.currentTarget.style.backgroundColor = `${primaryColor}06`;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = "#e2e8f0";
                          e.currentTarget.style.backgroundColor = "#ffffff";
                        }
                      }}
                    >
                      <div className="space-y-1 pr-3">
                        <p className="font-medium text-black text-sm md:text-base tracking-tight">
                          {service.name}
                        </p>
                        <div className="flex items-center gap-2.5 text-slate-800 text-xs font-normal">
                          <span className="flex items-center gap-1 font-normal text-slate-800">
                            <Clock className="h-3 w-3 text-slate-500" /> {service.durationMinutes} mins
                          </span>
                          <span className="h-1 w-1 bg-slate-300 rounded-full" />
                          <span className="font-normal text-slate-900">
                            {formatCurrency(service.price, currency)}
                          </span>
                        </div>
                      </div>

                      <div 
                        className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                          isSelected ? "text-white shadow-xs" : "bg-slate-100 text-slate-600 border border-slate-200 group-hover:text-slate-900"
                        }`}
                        style={{ backgroundColor: isSelected ? primaryColor : undefined }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* STEP 2: 7-DAY WEEK SELECTOR & TIME SLOTS */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <button 
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" /> Change {labels.serviceLower}
            </button>
            
            {/* Header */}
            <div className="space-y-0.5">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {isRescheduling ? "Select New Time" : "Choose Date & Time"}
              </h2>
              <p className="text-slate-500 text-xs font-normal">
                Showing available slots for <strong className="font-semibold text-slate-900">{selectedService?.name}</strong> ({selectedService?.durationMinutes} mins).
              </p>
            </div>

            {/* 1-Click Practitioner Selector Bar */}
            {filteredStaff.length > 1 && (
              <div className="relative group/staff">
                {canScrollStaffLeft && (
                  <button
                    type="button"
                    onClick={() => scrollStaff("left")}
                    aria-label="Scroll left"
                    className="absolute left-1 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full bg-white/95 shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}

                <div 
                  ref={staffScrollRef}
                  onScroll={checkStaffScroll}
                  className="flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto no-scrollbar scroll-smooth"
                >
                  <button 
                    type="button"
                    onClick={() => setSelectedStaffId("any")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer ${
                      selectedStaffId === "any" 
                        ? "bg-white text-slate-900 shadow-xs" 
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Any {labels.staff}
                  </button>
                  {filteredStaff.map(s => {
                    const isStaffSelected = selectedStaffId === s.id;
                    return (
                      <button 
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedStaffId(s.id)}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer ${
                          isStaffSelected 
                            ? "bg-white text-slate-900 shadow-xs" 
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <span>{s.name}</span>
                      </button>
                    );
                  })}
                </div>

                {canScrollStaffRight && (
                  <button
                    type="button"
                    onClick={() => scrollStaff("right")}
                    aria-label="Scroll right"
                    className="absolute right-1 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full bg-white/95 shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {/* 7-DAY WEEK SELECTOR CONTAINER */}
            <div className="space-y-3 bg-slate-50/70 p-4 md:p-5 rounded-3xl border border-slate-200">
              {/* Week Navigation Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-semibold text-slate-900">
                    {weekMonthYearLabel}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {!isPrevWeekDisabled && (
                    <button
                      type="button"
                      onClick={handleJumpToToday}
                      className="px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors shadow-2xs cursor-pointer mr-1"
                    >
                      Today
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handlePrevWeek}
                    disabled={isPrevWeekDisabled}
                    aria-label="Previous Week"
                    className="h-8 w-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextWeek}
                    aria-label="Next Week"
                    className="h-8 w-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-all shadow-2xs cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* 7 Days of the Week Grid */}
              <div className="grid grid-cols-7 gap-1.5 md:gap-2">
                {weekDays.map((dayDate) => {
                  const dateKey = format(dayDate, "yyyy-MM-dd");
                  const isSelected = selectedDate ? isSameDay(dayDate, selectedDate) : false;
                  const isToday = isSameDay(dayDate, todayAtVenue);
                  const isPast = isBefore(dayDate, todayAtVenue) && !isToday;

                  return (
                    <button
                      key={dateKey}
                      disabled={isPast}
                      onClick={() => setSelectedDate(dayDate)}
                      className={`group relative flex flex-col items-center justify-center py-2.5 md:py-3 rounded-2xl border-2 transition-all duration-150 ${
                        isPast
                          ? "bg-slate-200/60 border-slate-200/80 cursor-not-allowed text-slate-500"
                          : isSelected
                            ? "shadow-sm z-10 cursor-pointer"
                            : "bg-white shadow-2xs cursor-pointer"
                      }`}
                      style={{ 
                        borderColor: isSelected ? primaryColor : (isPast ? "#e2e8f0cc" : "#e2e8f0"),
                        backgroundColor: isSelected ? `${primaryColor}14` : (isPast ? "#e2e8f099" : "#ffffff"),
                      }}
                      onMouseEnter={(e) => {
                        if (!isPast && !isSelected) {
                          e.currentTarget.style.borderColor = primaryColor;
                          e.currentTarget.style.backgroundColor = `${primaryColor}08`;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isPast && !isSelected) {
                          e.currentTarget.style.borderColor = "#e2e8f0";
                          e.currentTarget.style.backgroundColor = "#ffffff";
                        }
                      }}
                    >
                      <span 
                        className={`text-[10px] md:text-[11px] uppercase tracking-tight ${
                          isToday && !isSelected ? "font-bold" : "font-medium"
                        }`}
                        style={{ 
                          color: isSelected 
                            ? primaryColor 
                            : isPast 
                              ? '#64748b' 
                              : isToday 
                                ? primaryColor 
                                : '#64748b' 
                        }}
                      >
                        {format(dayDate, "EEE")}
                      </span>
                      
                      {isToday && !isSelected ? (
                        <span 
                          className="h-7 w-7 md:h-8 md:w-8 rounded-full flex items-center justify-center text-sm md:text-base font-bold mt-0.5 shadow-2xs"
                          style={{
                            backgroundColor: `${primaryColor}20`,
                            color: primaryColor
                          }}
                        >
                          {format(dayDate, "d")}
                        </span>
                      ) : (
                        <span 
                          className={`text-base md:text-lg font-medium mt-0.5 h-7 md:h-8 flex items-center justify-center ${
                            isPast ? "text-slate-600" : "text-slate-900 font-semibold"
                          }`}
                          style={{
                            color: isSelected ? primaryColor : undefined
                          }}
                        >
                          {format(dayDate, "d")}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TIME SLOTS SECTION */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <span className="text-xs font-medium text-slate-900">
                    {selectedDate 
                      ? `Available Times • ${format(selectedDate, "EEEE, MMMM d")}`
                      : "Available Times"}
                  </span>
                </div>
              </div>

              {!selectedDate ? (
                <div className="p-10 text-center bg-slate-50/70 rounded-3xl border border-dashed border-slate-200">
                  <CalendarIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-600 font-medium text-sm">
                    Please select a date above to view available time slots.
                  </p>
                </div>
              ) : loadingSlots ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3.5 bg-slate-50/50 rounded-3xl border border-slate-100">
                  <LiquidLoader color={primaryColor} />
                  <p className="text-xs font-normal text-slate-500">
                    Checking available time slots...
                  </p>
                </div>
              ) : slots.length > 0 ? (
                <div className="space-y-5">
                  {[
                    { label: 'Morning', icon: Sun, filter: (s: { time: string }) => parseInt(s.time.split(':')[0]) < 12 },
                    { label: 'Afternoon', icon: Sunset, filter: (s: { time: string }) => parseInt(s.time.split(':')[0]) >= 12 && parseInt(s.time.split(':')[0]) < 17 },
                    { label: 'Evening', icon: Moon, filter: (s: { time: string }) => parseInt(s.time.split(':')[0]) >= 17 },
                  ].map((section) => {
                    const sectionSlots = slots.filter(section.filter);
                    if (sectionSlots.length === 0) return null;
                    
                    return (
                      <div key={section.label} className="space-y-2.5">
                        <div className="flex items-center gap-2 px-1">
                          <section.icon className="h-3.5 w-3.5 text-slate-500" />
                          <h3 className="text-xs font-semibold text-slate-800">{section.label}</h3>
                          <div className="flex-1 h-px bg-slate-200/80 ml-2" />
                        </div>
                        
                        {/* Time Slots Grid: Normal font weight, crisp dark black text */}
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                          {sectionSlots.map((slot, i) => {
                            const isSlotSelected = selectedSlot?.time === slot.time && selectedSlot?.staffId === slot.staffId;
                            return (
                              <button
                                key={`${slot.time}-${slot.staffId}-${i}`}
                                type="button"
                                onClick={() => {
                                  setSelectedSlot(slot);
                                }}
                                className={`py-3 px-3 rounded-2xl border-2 transition-all duration-150 flex items-center justify-center cursor-pointer text-sm ${
                                  isSlotSelected
                                    ? "font-medium text-white shadow-sm"
                                    : "bg-white text-slate-900 font-normal shadow-2xs active:scale-98"
                                }`}
                                style={{ 
                                  backgroundColor: isSlotSelected ? primaryColor : "#ffffff",
                                  borderColor: isSlotSelected ? primaryColor : "#e2e8f0",
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSlotSelected) {
                                    e.currentTarget.style.borderColor = primaryColor;
                                    e.currentTarget.style.backgroundColor = `${primaryColor}08`;
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSlotSelected) {
                                    e.currentTarget.style.borderColor = "#e2e8f0";
                                    e.currentTarget.style.backgroundColor = "#ffffff";
                                  }
                                }}
                              >
                                {format(parse(slot.time, "HH:mm", new Date()), timeDisplayFormat)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50/80 rounded-3xl border border-dashed border-slate-200 space-y-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">
                      No time slots available on this date
                    </p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      {filteredStaff.length > 1 && selectedStaffId !== "any"
                        ? `No open appointments for ${staff.find(s => s.id === selectedStaffId)?.name} on this date.`
                        : `All appointment slots for this date are booked or closed.`}
                    </p>
                  </div>

                  {nextAvailableDate ? (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => handleJumpToNextAvailable(nextAvailableDate)}
                        className="px-4 py-2.5 text-xs font-semibold rounded-2xl text-white shadow-xs hover:shadow transition-all cursor-pointer inline-flex items-center gap-2 active:scale-98"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <span>Go to next available: {formatNextAvailableLabel(nextAvailableDate)}</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  ) : findingNextDate ? (
                    <div className="pt-1 flex items-center justify-center gap-2 text-xs text-slate-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Checking next available date...</span>
                    </div>
                  ) : selectedDate && isSameDay(selectedDate, addDays(currentWeekStart, 6)) ? (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handleNextWeek}
                        className="px-4 py-2 text-xs font-semibold rounded-2xl text-white shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-98"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <span>Check Next Week</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 font-normal pt-1">
                      Please select another date from the calendar above.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Navigation Buttons */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <button 
                type="button"
                onClick={() => setStep(1)}
                className="px-6 h-11 md:h-12 rounded-2xl border-2 bg-white hover:bg-slate-50 font-semibold text-xs md:text-sm transition-all cursor-pointer shadow-2xs flex items-center justify-center active:scale-98"
                style={{ borderColor: primaryColor, color: primaryColor }}
              >
                Previous
              </button>

              <button 
                type="button"
                disabled={!selectedSlot}
                onClick={() => {
                  if (selectedSlot) setStep(3);
                }}
                className={`px-6 h-11 md:h-12 rounded-2xl font-semibold text-xs md:text-sm transition-all flex items-center justify-center active:scale-98 ${
                  selectedSlot 
                    ? "text-white shadow-md hover:opacity-95 cursor-pointer" 
                    : "bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                }`}
                style={{ 
                  backgroundColor: selectedSlot ? primaryColor : undefined 
                }}
              >
                <span>Continue</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: DETAILS & CONFIRMATION */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <button 
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" /> Change date or time
            </button>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                {isRescheduling ? "Confirm Reschedule" : "Your Details"}
              </h2>
              <p className="text-slate-500 text-sm font-normal">
                {isRescheduling 
                  ? `Review and confirm your new ${labels.appointmentLower} schedule.`
                  : `Please enter your details to confirm your ${labels.appointmentLower}.`}
              </p>
            </div>

            {/* Booking Summary Card */}
            <div 
              className="rounded-3xl p-5 md:p-6 border space-y-4" 
              style={{ 
                backgroundColor: `${primaryColor}08`, 
                borderColor: `${primaryColor}25` 
              }}
            >
               <div className="flex items-center gap-3.5">
                  <div 
                    className="h-10 w-10 bg-white rounded-2xl flex items-center justify-center shadow-2xs shrink-0" 
                    style={{ color: primaryColor }}
                  >
                     <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      {labels.service} & {labels.staff}
                    </p>
                    <p className="font-semibold text-slate-900 text-sm md:text-base">
                      {selectedService?.name} <span className="font-normal text-slate-500">with</span> {selectedSlot?.staffName}
                    </p>
                  </div>
               </div>

               <div className="flex items-center gap-3.5">
                  <div 
                    className="h-10 w-10 bg-white rounded-2xl flex items-center justify-center shadow-2xs shrink-0" 
                    style={{ color: primaryColor }}
                  >
                     <CalendarIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      Scheduled Date & Time
                    </p>
                    <p className="font-semibold text-slate-900 text-sm md:text-base">
                      {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")} • {selectedSlot && format(parse(selectedSlot.time, "HH:mm", new Date()), timeDisplayFormat)}
                    </p>
                  </div>
               </div>

               {activeLocation && (
                 <div className="flex items-center gap-3.5 pt-1 border-t border-slate-200/50">
                    <div 
                      className="h-10 w-10 bg-white rounded-2xl flex items-center justify-center shadow-2xs shrink-0" 
                      style={{ color: primaryColor }}
                    >
                       <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                        Branch Location
                      </p>
                      <p className="font-semibold text-slate-900 text-sm md:text-base">
                        {activeLocation.name}
                      </p>
                      {activeLocation.address && (
                        <p className="text-xs text-slate-500 font-normal">
                          {activeLocation.address}
                        </p>
                      )}
                    </div>
                 </div>
               )}
            </div>

            {/* Booking Form Inputs */}
            <form onSubmit={handleConfirm} className="space-y-4" noValidate>
              {!isRescheduling && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 ml-1 mb-1.5">
                      Your Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      name="customerName"
                      type="text"
                      required
                      onFocus={() => {
                        setFocusedField("name");
                        clearFieldError("customerName");
                      }}
                      onBlur={() => setFocusedField(null)}
                      onChange={() => clearFieldError("customerName")}
                      style={{
                        borderColor: fieldErrors.customerName
                          ? undefined
                          : (focusedField === "name" ? primaryColor : undefined),
                      }}
                      className={`w-full rounded-2xl border-2 px-5 py-3 text-sm focus:outline-none transition-colors duration-75 font-normal text-slate-900 shadow-2xs placeholder:text-slate-400 bg-white ${
                        fieldErrors.customerName 
                          ? "border-rose-200 bg-rose-50/50 focus:border-rose-500" 
                          : "border-slate-200"
                      }`}
                      placeholder={labels.customerPlaceholder}
                    />
                    <InputError message={fieldErrors.customerName} />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 ml-1 mb-1.5">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      name="customerEmail"
                      type="email"
                      required
                      onFocus={() => {
                        setFocusedField("email");
                        clearFieldError("customerEmail");
                      }}
                      onBlur={() => setFocusedField(null)}
                      onChange={() => clearFieldError("customerEmail")}
                      style={{
                        borderColor: fieldErrors.customerEmail
                          ? undefined
                          : (focusedField === "email" ? primaryColor : undefined),
                      }}
                      className={`w-full rounded-2xl border-2 px-5 py-3 text-sm focus:outline-none transition-colors duration-75 font-normal text-slate-900 shadow-2xs placeholder:text-slate-400 bg-white ${
                        fieldErrors.customerEmail 
                          ? "border-rose-200 bg-rose-50/50 focus:border-rose-500" 
                          : "border-slate-200"
                      }`}
                      placeholder="client@example.com"
                    />
                    <InputError message={fieldErrors.customerEmail} />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 ml-1 mb-1.5">
                      Phone Number
                    </label>
                    <PhoneInput
                      name="customerPhone"
                      defaultValue=""
                      defaultCountry={country || "US"}
                      placeholder="234 567 890"
                      hasError={!!fieldErrors.customerPhone}
                      primaryColor={primaryColor}
                      onChange={() => clearFieldError("customerPhone")}
                      onFocus={() => clearFieldError("customerPhone")}
                    />
                    <InputError message={fieldErrors.customerPhone} />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 ml-1 mb-1.5">
                      Special Request / Notes
                    </label>
                    <textarea
                      name="notes"
                      rows={3}
                      onFocus={() => setFocusedField("notes")}
                      onBlur={() => setFocusedField(null)}
                      style={{
                        borderColor: focusedField === "notes" ? primaryColor : undefined,
                      }}
                      className="w-full rounded-2xl border-2 border-slate-200 p-4 text-sm focus:outline-none transition-colors duration-75 font-normal text-slate-900 shadow-2xs resize-none placeholder:text-slate-400 bg-white"
                      placeholder="Add any specific instructions or requirements..."
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full h-11 md:h-12 rounded-2xl border-2 bg-white hover:bg-slate-50 font-semibold text-xs md:text-sm transition-all cursor-pointer shadow-2xs flex items-center justify-center active:scale-98"
                  style={{ borderColor: primaryColor, color: primaryColor }}
                >
                  Previous
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 md:h-12 text-white rounded-2xl font-bold text-xs md:text-sm shadow-md transition-all hover:opacity-95 active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  style={{ backgroundColor: primaryColor }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> 
                      <span>{isRescheduling ? "Updating..." : `Confirming...`}</span>
                    </>
                  ) : (
                    <span>{isRescheduling ? "Confirm Time" : `Confirm ${labels.appointment}`}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

