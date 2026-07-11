"use client";

import { useState, useEffect, useRef } from "react";
import { format, addMinutes, parse } from "date-fns";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  X,
  Pencil,
  Search,
  UserPlus,
  AlertCircle,
  Plus,
  ArrowRight,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Check
} from "lucide-react";
import { createBooking, updateBooking } from "@/app/actions/booking";
import { searchCustomers, addCustomer, getActiveCustomers, getPaginatedActiveCustomers } from "@/app/actions/customer";
import { toast } from "sonner";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { Portal } from "@/components/ui/portal";
import { Tooltip } from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";

import { getLabels } from "@/lib/labels";
import { formatCurrency, getCurrencySymbol } from "@/lib/currency-utils";
import { getInTimezone } from "@/lib/timezone-utils";

function InputError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1.5 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200 text-left">
      <AlertCircle className="h-3 w-3" />
      <span className="text-[10px] font-black uppercase tracking-wider">{message}</span>
    </div>
  );
}

const timeOptions = (() => {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (const m of ["00", "15", "30", "45"]) {
      const hourStr = h.toString().padStart(2, "0");
      const timeStr = `${hourStr}:${m}`;
      const period = h < 12 ? "AM" : "PM";
      const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const label = `${displayHour}:${m} ${period}`;
      options.push({ value: timeStr, label });
    }
  }
  return options;
})();

interface ManualBookingProps {
  tenantId: string;
  services: any[];
  staff: any[];
  mode?: "create" | "edit";
  initialData?: any;
  onClose?: () => void;
  inline?: boolean;
  businessType?: any;
  currency?: string;
  timeFormat?: string;
  timezone?: string;
}

export function ManualBooking({ 
  tenantId, 
  services, 
  staff, 
  mode = "create", 
  initialData = null,
  onClose,
  inline = false,
  businessType,
  currency = "USD",
  timeFormat = "12h",
  timezone = "UTC"
}: ManualBookingProps) {
  const router = useRouter();
  const labels = getLabels(businessType);
  const [isOpen, setIsOpen] = useState(mode === "edit" || inline);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  // Patient Selector States
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [activeCustomers, setActiveCustomers] = useState<any[]>([]);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const [hasMoreCustomers, setHasMoreCustomers] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerSkip, setCustomerSkip] = useState(0);

  const fetchPatients = async (currentSearch: string, currentSkip: number, isReset: boolean) => {
    if (loadingCustomers) return;
    setLoadingCustomers(true);
    
    const newCustomers = await getPaginatedActiveCustomers(currentSearch, currentSkip, 5);
    
    if (isReset) {
      setActiveCustomers(newCustomers || []);
      setCustomerSkip(newCustomers?.length || 0);
    } else {
      setActiveCustomers(prev => [...prev, ...(newCustomers || [])]);
      setCustomerSkip(prev => prev + (newCustomers?.length || 0));
    }
    
    setHasMoreCustomers((newCustomers?.length || 0) === 5);
    setLoadingCustomers(false);
  };

  const handleDropdownScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (container.scrollHeight - container.scrollTop <= container.clientHeight + 15) {
      if (hasMoreCustomers && !loadingCustomers) {
        fetchPatients(customerSearch, customerSkip, false);
      }
    }
  };
  
  // Custom Dropdown Open States
  const [isServiceOpen, setIsServiceOpen] = useState(false);
  const [isStaffOpen, setIsStaffOpen] = useState(false);
  const [isStartTimeOpen, setIsStartTimeOpen] = useState(false);
  const [isEndTimeOpen, setIsEndTimeOpen] = useState(false);

  // Dropdown Refs for Click Outside Detection
  const serviceRef = useRef<HTMLDivElement>(null);
  const staffRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<HTMLDivElement>(null);
  const endTimeRef = useRef<HTMLDivElement>(null);

  // Customer Search State
  const [customerSearch, setCustomerSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);

  useLockBodyScroll(isOpen && !inline);

  // Selection States
  const [selectedService, setSelectedService] = useState<any>(
    initialData?.service || null
  );
  
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    initialData?.staffId || ""
  );

  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    initialData?.startTime 
      ? format(new Date(initialData.startTime), "yyyy-MM-dd") 
      : ""
  );

  const [startTimeStr, setStartTimeStr] = useState<string>(
    initialData?.startTime 
      ? format(new Date(initialData.startTime), "HH:mm") 
      : ""
  );

  const [endTimeStr, setEndTimeStr] = useState<string>(
    initialData?.endTime 
      ? format(new Date(initialData.endTime), "HH:mm") 
      : ""
  );

  const [customPrice, setCustomPrice] = useState<string>(
    initialData?.price ? initialData.price.toString() : ""
  );

  const [customerInfo, setCustomerInfo] = useState({
    id: initialData?.customerId || "",
    name: initialData?.customerName || "",
    email: initialData?.customerEmail || "",
    phone: ""
  });

  // Clear errors when context changes
  useEffect(() => {
    setFieldErrors({});
  }, [initialData]);

  // Click Outside Hook
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (serviceRef.current && !serviceRef.current.contains(event.target as Node)) {
        setIsServiceOpen(false);
      }
      if (staffRef.current && !staffRef.current.contains(event.target as Node)) {
        setIsStaffOpen(false);
      }
      if (startTimeRef.current && !startTimeRef.current.contains(event.target as Node)) {
        setIsStartTimeOpen(false);
      }
      if (endTimeRef.current && !endTimeRef.current.contains(event.target as Node)) {
        setIsEndTimeOpen(false);
      }
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset form when popup is closed
  useEffect(() => {
    if (!isOpen && !inline) {
      setSelectedService(initialData?.service || null);
      setSelectedStaffId(initialData?.staffId || "");
      setSelectedDateStr(
        initialData?.startTime 
          ? format(new Date(initialData.startTime), "yyyy-MM-dd") 
          : ""
      );
      setStartTimeStr(
        initialData?.startTime 
          ? format(new Date(initialData.startTime), "HH:mm") 
          : ""
      );
      setEndTimeStr(
        initialData?.endTime 
          ? format(new Date(initialData.endTime), "HH:mm") 
          : ""
      );
      setCustomPrice(
        initialData?.price ? initialData.price.toString() : ""
      );
      setCustomerInfo({
        id: initialData?.customerId || "",
        name: initialData?.customerName || "",
        email: initialData?.customerEmail || "",
        phone: ""
      });
      setCustomerSearch("");
      setSearchResults([]);
      setIsAddingNewCustomer(false);
      setFieldErrors({});
      setIsCustomerDropdownOpen(false);
      setHasMoreCustomers(true);
      setCustomerSkip(0);
    }
  }, [isOpen, initialData, inline]);

  // Debounced search and initial load for patients in dropdown
  useEffect(() => {
    if (!isOpen || !isCustomerDropdownOpen) return;
    
    const handler = setTimeout(() => {
      fetchPatients(customerSearch, 0, true);
    }, 150);

    return () => clearTimeout(handler);
  }, [customerSearch, isCustomerDropdownOpen, isOpen]);

  // Autofill start and end times when a service is selected
  useEffect(() => {
    // Only pre-fill automatically if we are booking directly from a calendar slot click (initialData is present)
    if (selectedService && initialData) {
      const currentStart = startTimeStr;
      if (currentStart) {
        try {
          const parsedStart = parse(currentStart, "HH:mm", new Date());
          const end = addMinutes(parsedStart, selectedService.durationMinutes);
          setEndTimeStr(format(end, "HH:mm"));
        } catch (err) {
          console.error(err);
        }
      }
    }
  }, [selectedService, initialData, startTimeStr]);

  // Adjust End Time when Start Time changes manually
  useEffect(() => {
    if (selectedService && startTimeStr) {
      try {
        const parsedStart = parse(startTimeStr, "HH:mm", new Date());
        const end = addMinutes(parsedStart, selectedService.durationMinutes);
        setEndTimeStr(format(end, "HH:mm"));
      } catch (err) {
        console.error(err);
      }
    }
  }, [startTimeStr, selectedService]);

  // Keep custom price synced with service default price
  useEffect(() => {
    if (selectedService && !initialData) {
      setCustomPrice(selectedService.price.toString());
    } else if (!selectedService) {
      setCustomPrice("");
    }
  }, [selectedService, initialData]);

  const handleSelectCustomer = (customer: any) => {
    setCustomerInfo({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone || ""
    });
    setCustomerSearch("");
    setSearchResults([]);
    setIsAddingNewCustomer(false);
    setFieldErrors(prev => ({ ...prev, customer: "" }));
  };

  useEffect(() => {
    const search = async () => {
      if (customerSearch.length > 2) {
        const results = await searchCustomers(customerSearch);
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    };
    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, tenantId]);

  const handleCreateNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    formData.append("tenantId", tenantId);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;

    const errors: Record<string, string> = {};
    if (!name) errors.customerName = "Name is required";
    if (!email) errors.customerEmail = "Email is required";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    const result = await addCustomer(formData);
    if (result.success) {
      toast.success(`${labels.customer} created and selected!`);
      handleSelectCustomer(result.customer);
    } else {
      if (result.error?.includes("email")) {
        setFieldErrors({ customerEmail: "This email is already in use" });
      } else {
        toast.error(result.error);
      }
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    
    if (!selectedService) {
      errors.service = "Please select a service.";
    }
    if (!selectedStaffId) {
      errors.staff = "Please select a team member.";
    }
    if (!selectedDateStr) {
      errors.date = "Please select a date.";
    }
    if (!startTimeStr) {
      errors.startTime = "Please select a start time.";
    }
    if (!endTimeStr) {
      errors.endTime = "Please select an end time.";
    }
    if (!customerInfo.name) {
      errors.customer = `Please select or add a ${labels.customerLower}.`;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setLoading(true);
    
    const formData = new FormData();
    formData.append("serviceId", selectedService.id);
    formData.append("staffId", selectedStaffId);
    formData.append("date", selectedDateStr);
    formData.append("time", startTimeStr);
    formData.append("endTime", endTimeStr);
    formData.append("customerName", customerInfo.name);
    formData.append("customerEmail", customerInfo.email);
    if (customerInfo.id) formData.append("customerId", customerInfo.id);
    if (customPrice) formData.append("price", customPrice);

    let result;
    if (mode === "edit") {
      result = await updateBooking(initialData.id, formData);
    } else {
      formData.append("tenantId", tenantId);
      result = await createBooking(formData);
    }

    if (result.success) {
      toast.success(mode === "edit" ? `${labels.appointment} updated successfully!` : `${labels.appointment} created successfully!`);
      router.refresh();
      handleClose();
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  const handleClose = () => {
    if (!inline) setIsOpen(false);
    if (onClose) onClose();
    if (mode !== "edit" && !inline) {
      setSelectedService(services.length > 0 ? services[0] : null);
      setSelectedStaffId(staff.length > 0 ? staff[0].id : "");
      setCustomerInfo({ id: "", name: "", email: "", phone: "" });
      setCustomerSearch("");
    }
  };

  const content = (
    <div className={`relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] ${inline ? '' : 'shadow-2xl border border-indigo-100/50 dark:border-slate-800 overflow-hidden'} animate-fade-in-up flex flex-col max-h-[90vh] transition-colors`}>
      {!inline && (
        <div className="px-8 py-6 border-b border-indigo-100/50 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 rounded-t-[2.4rem] z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 dark:shadow-none border border-transparent dark:border-white/10">
              {mode === 'edit' ? <Pencil className="h-5 w-5" /> : <CalendarIcon className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {mode === 'edit' ? `Edit ${labels.appointment}` : `Add ${labels.appointment}`}
              </h2>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Manual Booking Form</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="h-5 w-5 text-slate-400 dark:text-slate-500" />
          </button>
        </div>
      )}

      <div className={`flex-1 overflow-y-auto ${inline ? 'p-0' : 'p-8'} space-y-6 premium-scrollbar`}>
        {/* Service Selector */}
        <div className="space-y-2 relative" ref={serviceRef}>
          <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Select {labels.service} <span className="text-rose-500">*</span></label>
          <button 
            type="button"
            onClick={() => setIsServiceOpen(!isServiceOpen)}
            className={`w-full flex items-center justify-between bg-indigo-50/30 dark:bg-slate-800 border-2 rounded-2xl p-4 text-sm font-bold outline-none transition-all shadow-sm text-left ${selectedService ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'} ${fieldErrors.service ? 'border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500' : 'border-indigo-100/50 dark:border-slate-700/50 hover:border-indigo-200 dark:hover:border-slate-600'}`}
          >
            <span>{selectedService ? `${selectedService.name} (${selectedService.durationMinutes} mins)` : "Select Treatment"}</span>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isServiceOpen ? 'rotate-180' : ''}`} />
          </button>
          <InputError message={fieldErrors.service} />
          {isServiceOpen && (
            <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto py-1 premium-scrollbar">
              {services?.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedService(s);
                    setIsServiceOpen(false);
                    setFieldErrors(prev => ({ ...prev, service: "" }));
                  }}
                  className={`w-full px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between ${selectedService?.id === s.id ? 'bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}
                >
                  <span>{s.name} ({s.durationMinutes} mins)</span>
                  {selectedService?.id === s.id && <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Team Member Selector */}
        <div className="space-y-2 relative" ref={staffRef}>
          <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Team Member ({labels.staff}) <span className="text-rose-500">*</span></label>
          <button 
            type="button"
            onClick={() => setIsStaffOpen(!isStaffOpen)}
            className={`w-full flex items-center justify-between bg-indigo-50/30 dark:bg-slate-800 border-2 rounded-2xl p-4 text-sm font-bold outline-none transition-all shadow-sm text-left ${selectedStaffId ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'} ${fieldErrors.staff ? 'border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500' : 'border-indigo-100/50 dark:border-slate-700/50 hover:border-indigo-200 dark:hover:border-slate-600'}`}
          >
            <span>{staff.find(st => st.id === selectedStaffId)?.name || "Select Practitioner"}</span>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isStaffOpen ? 'rotate-180' : ''}`} />
          </button>
          <InputError message={fieldErrors.staff} />
          {isStaffOpen && (
            <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto py-1 premium-scrollbar">
              {staff?.map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    setSelectedStaffId(st.id);
                    setIsStaffOpen(false);
                    setFieldErrors(prev => ({ ...prev, staff: "" }));
                  }}
                  className={`w-full px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between ${selectedStaffId === st.id ? 'bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}
                >
                  <span>{st.name}</span>
                  {selectedStaffId === st.id && <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Booking Date <span className="text-rose-500">*</span></label>
          <div className="relative">
            <input 
              type="date"
              value={selectedDateStr}
              onChange={(e) => {
                setSelectedDateStr(e.target.value);
                setFieldErrors(prev => ({ ...prev, date: "" }));
              }}
              className={`w-full bg-indigo-50/30 dark:bg-slate-800 border-2 rounded-2xl p-4 text-sm font-bold outline-none transition-all shadow-sm ${selectedDateStr ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'} ${fieldErrors.date ? 'border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500' : 'border-indigo-100/50 dark:border-slate-700/50 focus:border-indigo-600 dark:focus:border-indigo-500 hover:border-indigo-200 dark:hover:border-slate-600'}`}
            />
          </div>
          <InputError message={fieldErrors.date} />
        </div>

        {/* Start Time & End Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 relative" ref={startTimeRef}>
            <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Start Time <span className="text-rose-500">*</span></label>
            <button 
              type="button"
              onClick={() => setIsStartTimeOpen(!isStartTimeOpen)}
              className={`w-full flex items-center justify-between bg-indigo-50/30 dark:bg-slate-800 border-2 rounded-2xl p-4 text-sm font-bold outline-none transition-all shadow-sm text-left ${startTimeStr ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'} ${fieldErrors.startTime ? 'border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500' : 'border-indigo-100/50 dark:border-slate-700/50 hover:border-indigo-200 dark:hover:border-slate-600'}`}
            >
              <span>{timeOptions.find(o => o.value === startTimeStr)?.label || "Select Start Time"}</span>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isStartTimeOpen ? 'rotate-180' : ''}`} />
            </button>
            <InputError message={fieldErrors.startTime} />
            {isStartTimeOpen && (
              <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto py-1 premium-scrollbar">
                {timeOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setStartTimeStr(opt.value);
                      setIsStartTimeOpen(false);
                      setFieldErrors(prev => ({ ...prev, startTime: "" }));
                    }}
                    className={`w-full px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between ${startTimeStr === opt.value ? 'bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    <span>{opt.label}</span>
                    {startTimeStr === opt.value && <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2 relative" ref={endTimeRef}>
            <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">End Time <span className="text-rose-500">*</span></label>
            <button 
              type="button"
              onClick={() => setIsEndTimeOpen(!isEndTimeOpen)}
              className={`w-full flex items-center justify-between bg-indigo-50/30 dark:bg-slate-800 border-2 rounded-2xl p-4 text-sm font-bold outline-none transition-all shadow-sm text-left ${endTimeStr ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'} ${fieldErrors.endTime ? 'border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500' : 'border-indigo-100/50 dark:border-slate-700/50 hover:border-indigo-200 dark:hover:border-slate-600'}`}
            >
              <span>{timeOptions.find(o => o.value === endTimeStr)?.label || "Select End Time"}</span>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isEndTimeOpen ? 'rotate-180' : ''}`} />
            </button>
            <InputError message={fieldErrors.endTime} />
            {isEndTimeOpen && (
              <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto py-1 premium-scrollbar">
                {timeOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setEndTimeStr(opt.value);
                      setIsEndTimeOpen(false);
                      setFieldErrors(prev => ({ ...prev, endTime: "" }));
                    }}
                    className={`w-full px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between ${endTimeStr === opt.value ? 'bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    <span>{opt.label}</span>
                    {endTimeStr === opt.value && <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Service Price Field */}
        <div className="space-y-2">
          <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Price</label>
          <div className={`flex items-center gap-3 bg-indigo-50/30 dark:bg-slate-800 border-2 border-indigo-100/50 dark:border-slate-700/50 rounded-2xl p-4 text-sm font-bold hover:border-indigo-200 dark:hover:border-slate-600 transition-all ${selectedService ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
            <span className="text-base font-bold text-indigo-600 dark:text-indigo-400 w-5 text-center select-none">{getCurrencySymbol(currency)}</span>
            <div className="flex-1">
              <span className="text-[10px] block text-slate-400 font-medium">Service Charge (Editable)</span>
              <input 
                type="number"
                step="0.01"
                disabled={!selectedService}
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder={selectedService ? "Enter custom price" : "Select Treatment first"}
                className="w-full bg-transparent border-none outline-none font-bold text-sm text-slate-900 dark:text-white disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Customer Section */}
        <div className="space-y-4 pt-2 border-t border-indigo-100/30 dark:border-slate-800">
          <div>
            <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Select {labels.customer} <span className="text-rose-500">*</span></label>
          </div>

          {!customerInfo.name && !isAddingNewCustomer ? (
            <div className="space-y-4 relative" ref={customerDropdownRef}>
              <button 
                type="button"
                onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                className={`w-full flex items-center justify-between bg-indigo-50/30 dark:bg-slate-800 border-2 rounded-2xl p-4 text-sm font-bold outline-none transition-all shadow-sm text-left ${customerInfo.name ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'} ${fieldErrors.customer ? 'border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500' : 'border-indigo-100/50 dark:border-slate-700/50 hover:border-indigo-200 dark:hover:border-slate-600'}`}
              >
                <span>{customerInfo.name || `Select ${labels.customer}`}</span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isCustomerDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              <InputError message={fieldErrors.customer} />
              
              {isCustomerDropdownOpen && (
                <div 
                  onScroll={handleDropdownScroll}
                  className="relative w-full mt-2 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl shadow-inner z-10 max-h-60 overflow-y-auto py-1 premium-scrollbar"
                >
                  <div className="px-3 py-2 border-b-2 border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search patients..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-slate-50 dark:bg-slate-800 text-xs font-bold p-2 outline-none rounded-lg border border-slate-200 dark:border-slate-700/50 dark:text-white"
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        setIsAddingNewCustomer(true);
                        setIsCustomerDropdownOpen(false);
                      }}
                      className="w-full py-2.5 bg-indigo-50/50 hover:bg-indigo-100/50 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 transition-all flex items-center justify-center gap-2 border border-indigo-100/30 dark:border-indigo-900/30"
                    >
                      <UserPlus className="h-3.5 w-3.5" /> + Add New {labels.customer}
                    </button>
                  </div>
                  {activeCustomers.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-slate-400 font-bold text-center">
                      {loadingCustomers ? "Loading..." : "No patients found"}
                    </div>
                  ) : (
                    <>
                      {activeCustomers.map(customer => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => {
                            handleSelectCustomer(customer);
                            setIsCustomerDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between border-b last:border-b-0 border-slate-100 dark:border-slate-800 ${customerInfo.id === customer.id ? 'bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-950 dark:text-white">{customer.name}</span>
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">({customer.email})</span>
                          </div>
                          {customerInfo.id === customer.id && <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
                        </button>
                      ))}
                      {loadingCustomers && (
                        <div className="px-4 py-2 text-center text-xs text-slate-400 font-bold">
                          Loading more...
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ) : isAddingNewCustomer ? (
            <form onSubmit={handleCreateNewCustomer} className="space-y-4 animate-fade-in" noValidate>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest">New {labels.customer} Details</h4>
                <button type="button" onClick={() => setIsAddingNewCustomer(false)} className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors">Back to search</button>
              </div>
              <div>
                <input 
                  name="name" 
                  placeholder="Full Name *" 
                  required 
                  className={`w-full bg-indigo-50/30 dark:bg-slate-800 rounded-2xl px-5 py-3 text-sm font-bold dark:text-white outline-none border-2 transition-all shadow-sm ${
                    fieldErrors.customerName 
                      ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" 
                      : "border-indigo-100/50 dark:border-slate-700/50 hover:border-indigo-200 dark:hover:border-slate-600 focus:border-indigo-600 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800"
                  }`} 
                />
                <InputError message={fieldErrors.customerName} />
              </div>
              <div>
                <input 
                  name="email" 
                  type="email" 
                  placeholder="Email Address *" 
                  required 
                  className={`w-full bg-indigo-50/30 dark:bg-slate-800 rounded-2xl px-5 py-3 text-sm font-bold dark:text-white outline-none border-2 transition-all shadow-sm ${
                    fieldErrors.customerEmail 
                      ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" 
                      : "border-indigo-100/50 dark:border-slate-700/50 hover:border-indigo-200 dark:hover:border-slate-600 focus:border-indigo-600 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800"
                  }`} 
                />
                <InputError message={fieldErrors.customerEmail} />
              </div>
              <input name="phone" placeholder="Phone Number (Optional)" className="w-full bg-indigo-50/30 dark:bg-slate-800 border-2 border-indigo-100/50 dark:border-slate-700/50 focus:border-indigo-600 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 rounded-2xl px-5 py-3 text-sm font-bold dark:text-white outline-none transition-all shadow-sm hover:border-indigo-200 dark:hover:border-slate-600" />
              <button type="submit" disabled={loading} className="w-full py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-[0.98]">
                {loading ? "Creating..." : `Create & Select ${labels.customer}`}
              </button>
            </form>
          ) : (
            <div className="w-full flex items-center justify-between bg-indigo-50/30 dark:bg-slate-800 border-2 border-indigo-100/50 dark:border-slate-700/50 rounded-2xl p-4 text-sm font-bold text-slate-900 dark:text-white animate-fade-in shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-[10px] font-black">
                  {customerInfo.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <span className="text-slate-900 dark:text-white">{customerInfo.name}</span>
                  {customerInfo.email && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold ml-2">({customerInfo.email})</span>
                  )}
                </div>
              </div>
              {mode !== 'edit' && (
                <button 
                  type="button"
                  onClick={() => setCustomerInfo({ id: "", name: "", email: "", phone: "" })} 
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all"
                >
                  <X className="h-4 w-4 text-slate-400 hover:text-slate-650" />
                </button>
              )}
            </div>
          )}
        </div>


      </div>

      {!inline && (
        <form onSubmit={handleSave} className="px-6 py-4 border-t border-indigo-100/30 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-[2.5rem] transition-colors">
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md border border-transparent dark:border-white/10 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {loading ? "Saving..." : (
              <>
                {mode === 'edit' ? `Update ${labels.appointment}` : `Confirm ${labels.appointment}`} <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      )}

      {inline && (
        <form onSubmit={handleSave} className="pt-4 border-t border-indigo-100/30 dark:border-slate-800">
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md border border-transparent dark:border-white/10 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {loading ? "Saving..." : (
              <>
                {mode === 'edit' ? `Update ${labels.appointment}` : `Confirm ${labels.appointment}`} <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );

  if (inline) return content;

  return (
    <>
      {mode === "create" && (
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-2xl font-bold text-xs hover:bg-indigo-700 transition-all shadow-sm border border-transparent dark:border-white/10"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      )}

      {isOpen && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4 md:p-8">
            <div 
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse" 
            />
            <div className="relative w-full max-w-lg">
              {content}
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
