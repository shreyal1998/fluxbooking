"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { format, addDays, startOfToday } from "date-fns";
import { 
  ChevronRight, 
  ChevronLeft, 
  Clock, 
  User, 
  CheckCircle2, 
  Loader2,
  Calendar,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Users,
  RefreshCcw
} from "lucide-react";
import { createBooking, rescheduleBookingByCustomer } from "@/app/actions/booking";
import { toast } from "sonner";

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: string;
  color: string;
}

interface Staff {
  id: string;
  name: string;
  bio?: string | null;
  color: string;
  services?: any[];
}

const InputError = ({ message }: { message?: string }) => {
  if (!message) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1.5 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200">
      <AlertCircle className="h-3 w-3" />
      <span className="text-[10px] font-black uppercase tracking-wider">{message}</span>
    </div>
  );
};

export function BookingForm({ 
  tenantId, 
  services, 
  staff,
  primaryColor = "#6366f1"
}: { 
  tenantId: string; 
  services: Service[]; 
  staff: Staff[];
  primaryColor?: string;
}) {
  const searchParams = useSearchParams();
  const rescheduleId = searchParams.get("reschedule");
  const isRescheduling = !!rescheduleId;

  const [hasMounted, setHasMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("any");
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; staffId: string; staffName: string } | null>(null);
  const [slots, setSlots] = useState<{ time: string; staffId: string; staffName: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      const newErrors = { ...fieldErrors };
      delete newErrors[field];
      setFieldErrors(newErrors);
    }
  };

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Filter staff based on selected service
  const filteredStaff = staff.filter(s => 
    !selectedService || s.services?.some((srv: any) => srv.id === selectedService.id)
  );

  // Fetch slots when date, service, or staff changes
  useEffect(() => {
    async function fetchSlots() {
      if (!selectedService) return;
      
      setLoadingSlots(true);
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const staffParam = selectedStaffId !== "any" ? `&staffId=${selectedStaffId}` : "";
        const response = await fetch(`/api/slots?tenantId=${tenantId}&serviceId=${selectedService.id}&date=${dateStr}${staffParam}`);
        const data = await response.json();
        setSlots(data.slots || []);
      } catch (error) {
        console.error("Failed to fetch slots");
      } finally {
        setLoadingSlots(false);
      }
    }

    if (hasMounted && step === 2 && selectedService) {
      fetchSlots();
    }
  }, [selectedDate, selectedService, selectedStaffId, step, tenantId, hasMounted]);

  if (!hasMounted) {
    return (
      <div className="flex justify-center items-center p-24">
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  async function handleConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedService || !selectedSlot) return;

    setSubmitting(true);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const customerName = formData.get("customerName") as string;
    const customerEmail = formData.get("customerEmail") as string;

    const errors: Record<string, string> = {};
    if (!customerName) errors.customerName = "Full name is required";
    if (!customerEmail) errors.customerEmail = "Email address is required";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitting(false);
      return;
    }

    if (isRescheduling && rescheduleId) {
      // HANDLE RESCHEDULE
      const result = await rescheduleBookingByCustomer(
        rescheduleId,
        format(selectedDate, "yyyy-MM-dd"),
        selectedSlot.time
      );
      setSubmitting(false);
      if (result.success) {
        toast.success("Appointment rescheduled successfully!");
        setSuccess(true);
      } else {
        toast.error(result.error);
      }
    } else {
      // HANDLE NEW BOOKING
      formData.append("tenantId", tenantId);
      formData.append("serviceId", selectedService.id);
      formData.append("staffId", selectedSlot.staffId);
      formData.append("date", format(selectedDate, "yyyy-MM-dd"));
      formData.append("time", selectedSlot.time);

      const result = await createBooking(formData);
      setSubmitting(false);

      if (result.success) {
        toast.success("Booking confirmed! Please check your email.");
        setSuccess(true);
      } else {
        toast.error(result.error);
      }
    }
  };

  if (success) {
    return (
      <div className="p-12 text-center space-y-6 animate-fade-in">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-xl shadow-emerald-500/10">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>
        <div className="space-y-2">
          <h3 className="text-3xl font-black text-slate-900">{isRescheduling ? "Update Successful!" : "Booking Confirmed!"}</h3>
          <p className="text-slate-500 font-medium">We've sent a confirmation email with all the details.</p>
        </div>
        <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 text-left max-w-sm mx-auto">
           <div className="flex justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Service</span>
              <span className="text-sm font-bold text-slate-900">{selectedService?.name}</span>
           </div>
           <div className="flex justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Time</span>
              <span className="text-sm font-bold text-slate-900">{format(selectedDate, "MMM d")} at {selectedSlot?.time}</span>
           </div>
           <div className="flex justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Staff</span>
              <span className="text-sm font-bold text-slate-900">{selectedSlot?.staffName}</span>
           </div>
        </div>
        <button 
          onClick={() => window.location.href = window.location.pathname}
          className="text-sm font-bold transition-colors"
          style={{ color: primaryColor }}
        >
          {isRescheduling ? "Back to booking" : "Book another appointment"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Reschedule Badge */}
      {isRescheduling && (
        <div className="px-8 py-3 bg-indigo-600 text-white flex items-center justify-center gap-2">
           <RefreshCcw className="h-4 w-4 animate-spin-slow" />
           <span className="text-xs font-black uppercase tracking-widest">Rescheduling Mode Active</span>
        </div>
      )}

      {/* Step Indicator */}
      <div className="px-8 pt-8 pb-4 flex items-center justify-between border-b border-slate-50">
        <div className="flex items-center gap-4">
           {[1, 2, 3].map(i => (
             <div key={i} className="flex items-center gap-2">
                <div 
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    step === i 
                      ? "text-white shadow-lg scale-110" 
                      : step > i ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                  }`}
                  style={{ backgroundColor: step === i ? primaryColor : (step > i ? undefined : undefined) }}
                >
                  {step > i ? <CheckCircle2 className="h-4 w-4" /> : i}
                </div>
                {i < 3 && <div className={`w-8 h-0.5 rounded-full ${step > i ? 'bg-emerald-500' : 'bg-slate-100'}`}></div>}
             </div>
           ))}
        </div>
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
           Step {step} of 3
        </span>
      </div>

      <div className="p-8 md:p-10 flex-1 overflow-y-auto max-h-[600px]">
        {step === 1 && (
          <div className="space-y-8 animate-fade-in">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Sparkles className="h-6 w-6" style={{ color: primaryColor }} /> {isRescheduling ? "Confirm Service" : "Select a Service"}
              </h2>
              <p className="text-slate-500 font-medium mt-1">{isRescheduling ? "Verify the service for your new appointment time." : "Choose the service you'd like to book."}</p>
            </div>
            <div className="grid gap-4">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => {
                    setSelectedService(service);
                    setStep(2);
                  }}
                  className={`group flex items-center justify-between p-6 rounded-3xl border-2 text-left transition-all ${
                    selectedService?.id === service.id
                      ? "bg-opacity-10"
                      : "border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-slate-50"
                  }`}
                  style={{ 
                    borderColor: selectedService?.id === service.id ? primaryColor : undefined,
                    backgroundColor: selectedService?.id === service.id ? `${primaryColor}10` : undefined
                  }}
                >
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 text-lg">{service.name}</p>
                    <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {service.durationMinutes}m</span>
                      <span className="h-1 w-1 bg-slate-300 rounded-full"></span>
                      <span>${service.price}</span>
                    </div>
                  </div>
                  <div 
                    className={`h-10 w-10 rounded-2xl flex items-center justify-center transition-all ${
                      selectedService?.id === service.id ? "text-white" : "bg-white text-slate-400 shadow-sm"
                    }`}
                    style={{ backgroundColor: selectedService?.id === service.id ? primaryColor : undefined }}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-fade-in">
             <button 
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors mb-2"
            >
              <ChevronLeft className="h-4 w-4" /> Back to services
            </button>
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{isRescheduling ? "Select new time" : "Pick a time"}</h2>
                <p className="text-slate-500 font-medium mt-1">Available slots for {selectedService?.name}.</p>
              </div>

              {/* Staff Preference Selector */}
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
                 <button 
                  onClick={() => setSelectedStaffId("any")}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    selectedStaffId === "any" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                 >
                   Any Staff
                 </button>
                 {filteredStaff.map(s => (
                   <button 
                    key={s.id}
                    onClick={() => setSelectedStaffId(s.id)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      selectedStaffId === s.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                   >
                     {s.name.split(' ')[0]}
                   </button>
                 ))}
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
              {[...Array(14)].map((_, i) => {
                const date = addDays(startOfToday(), i);
                const isSelected = format(selectedDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(date)}
                    className={`flex-shrink-0 flex flex-col items-center justify-center w-20 h-24 rounded-2xl border-2 transition-all ${
                      isSelected
                        ? "shadow-lg shadow-indigo-100/50"
                        : "border-slate-100 bg-slate-50/50 hover:border-slate-200"
                    }`}
                    style={{ 
                      borderColor: isSelected ? primaryColor : undefined,
                      backgroundColor: isSelected ? `${primaryColor}10` : undefined
                    }}
                  >
                    <span className={`text-[10px] font-black uppercase tracking-tighter`} style={{ color: isSelected ? primaryColor : '#94A3B8' }}>
                      {format(date, "EEE")}
                    </span>
                    <span className={`text-xl font-black mt-1 ${isSelected ? "text-slate-900" : "text-slate-900"}`}>
                      {format(date, "d")}
                    </span>
                  </button>
                );
              })}
            </div>

            {loadingSlots ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-10 w-10 animate-spin" style={{ color: primaryColor }} />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Searching available slots...</p>
              </div>
            ) : slots.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {slots.map((slot, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedSlot(slot);
                      setStep(3);
                    }}
                    className={`p-4 rounded-2xl border-2 font-black text-sm transition-all ${
                      selectedSlot?.time === slot.time && selectedSlot?.staffId === slot.staffId
                        ? "text-white shadow-lg"
                        : "border-slate-50 bg-slate-50 hover:border-slate-200 text-slate-700"
                    }`}
                    style={{ 
                      backgroundColor: (selectedSlot?.time === slot.time && selectedSlot?.staffId === slot.staffId) ? primaryColor : undefined,
                      borderColor: (selectedSlot?.time === slot.time && selectedSlot?.staffId === slot.staffId) ? primaryColor : undefined
                    }}
                  >
                    {slot.time}
                    <div className="text-[8px] opacity-60 font-medium mt-1">{slot.staffName.split(' ')[0]}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <p className="text-slate-500 font-medium">No slots available for this day. Try another date or staff member!</p>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-fade-in">
            <button 
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors mb-2"
            >
              <ChevronLeft className="h-4 w-4" /> Back to times
            </button>

            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase tracking-tighter">{isRescheduling ? "Confirm Change" : "Your Details"}</h2>
              <p className="text-slate-500 font-medium mt-1">{isRescheduling ? "Verify your new appointment details." : "Review and confirm your appointment."}</p>
            </div>

            <div className="bg-opacity-5 rounded-3xl p-6 border space-y-4" style={{ backgroundColor: `${primaryColor}05`, borderColor: `${primaryColor}20` }}>
               <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center shadow-sm" style={{ color: primaryColor }}>
                     <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider opacity-60" style={{ color: primaryColor }}>{isRescheduling ? "Updated Service" : "Appointment"}</p>
                    <p className="font-bold text-slate-900">{selectedService?.name} with {selectedSlot?.staffName}</p>
                  </div>
               </div>
               <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center shadow-sm" style={{ color: primaryColor }}>
                     <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider opacity-60" style={{ color: primaryColor }}>New Date & Time</p>
                    <p className="font-bold text-slate-900">{format(selectedDate, "EEEE, MMMM d")} at {selectedSlot?.time}</p>
                  </div>
               </div>
            </div>

            <form onSubmit={handleConfirm} className="space-y-5" noValidate>
              {!isRescheduling && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2">Your Name</label>
                    <input
                      name="customerName"
                      type="text"
                      required
                      onChange={() => clearFieldError("customerName")}
                      className={`w-full border-2 rounded-2xl px-5 py-4 focus:bg-white focus:outline-none focus:ring-4 transition-all font-medium text-slate-900 ${
                        fieldErrors.customerName ? "border-rose-100 bg-rose-50 focus:border-rose-500" : "border-slate-50 bg-slate-50 focus:border-indigo-600 focus:ring-indigo-500/10"
                      }`}
                      placeholder="Enter your full name"
                    />
                    <InputError message={fieldErrors.customerName} />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2">Email Address</label>
                    <input
                      name="customerEmail"
                      type="email"
                      required
                      onChange={() => clearFieldError("customerEmail")}
                      className={`w-full border-2 rounded-2xl px-5 py-4 focus:bg-white focus:outline-none focus:ring-4 transition-all font-medium text-slate-900 ${
                        fieldErrors.customerEmail ? "border-rose-100 bg-rose-50 focus:border-rose-500" : "border-slate-50 bg-slate-50 focus:border-indigo-600 focus:ring-indigo-500/10"
                      }`}
                      placeholder="name@example.com"
                    />
                    <InputError message={fieldErrors.customerEmail} />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-16 text-white rounded-2xl font-black text-lg shadow-2xl transition-all hover:scale-[1.02] active:scale-95 disabled:bg-slate-300 flex items-center justify-center gap-3 mt-4"
                style={{ backgroundColor: primaryColor }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" /> 
                    <span>Updating Appointment...</span>
                  </>
                ) : (
                  <>
                    <span>{isRescheduling ? "Confirm New Time" : "Confirm Booking"}</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
