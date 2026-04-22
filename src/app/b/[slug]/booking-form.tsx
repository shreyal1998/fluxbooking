"use client";

import { useState, useEffect } from "react";
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
  ArrowRight
} from "lucide-react";
import { createBooking } from "@/app/actions/booking";

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: string;
}

interface Staff {
  id: string;
  name: string;
}

export function BookingForm({ 
  tenantId, 
  services, 
  staff 
}: { 
  tenantId: string; 
  services: Service[]; 
  staff: Staff[] 
}) {
  const [hasMounted, setHasMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; staffId: string; staffName: string } | null>(null);
  const [slots, setSlots] = useState<{ time: string; staffId: string; staffName: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Fetch slots when date or service changes
  useEffect(() => {
    async function fetchSlots() {
      if (!selectedService) return;
      
      setLoadingSlots(true);
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const response = await fetch(`/api/slots?tenantId=${tenantId}&serviceId=${selectedService.id}&date=${dateStr}`);
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
  }, [selectedDate, selectedService, step, tenantId, hasMounted]);

  if (!hasMounted) {
    return (
      <div className="flex justify-center items-center p-24">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  async function handleConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedService || !selectedSlot) return;

    setSubmitting(true);
    const formData = new FormData(event.currentTarget);
    formData.append("tenantId", tenantId);
    formData.append("serviceId", selectedService.id);
    formData.append("staffId", selectedSlot.staffId);
    formData.append("date", format(selectedDate, "yyyy-MM-dd"));
    formData.append("time", selectedSlot.time);

    const result = await createBooking(formData);
    setSubmitting(false);

    if (result.success) {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="p-12 text-center space-y-6 animate-fade-in">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-xl shadow-emerald-500/10">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>
        <div className="space-y-2">
          <h3 className="text-3xl font-black text-slate-900">Booking Confirmed!</h3>
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
          onClick={() => window.location.reload()}
          className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          Book another appointment
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Step Indicator */}
      <div className="px-8 pt-8 pb-4 flex items-center justify-between border-b border-slate-50">
        <div className="flex items-center gap-4">
           {[1, 2, 3].map(i => (
             <div key={i} className="flex items-center gap-2">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  step === i 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110" 
                    : step > i ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                }`}>
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
                <Sparkles className="h-6 w-6 text-indigo-600" /> Select a Service
              </h2>
              <p className="text-slate-500 font-medium mt-1">Choose the service you'd like to book.</p>
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
                      ? "border-indigo-600 bg-indigo-50/30"
                      : "border-slate-100 bg-slate-50/50 hover:border-indigo-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 text-lg">{service.name}</p>
                    <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {service.durationMinutes}m</span>
                      <span className="h-1 w-1 bg-slate-300 rounded-full"></span>
                      <span>${service.price}</span>
                    </div>
                  </div>
                  <div className={`h-10 w-10 rounded-2xl flex items-center justify-center transition-all ${
                    selectedService?.id === service.id ? "bg-indigo-600 text-white" : "bg-white text-slate-400 shadow-sm group-hover:bg-indigo-50 group-hover:text-indigo-600"
                  }`}>
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
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors mb-2"
            >
              <ChevronLeft className="h-4 w-4" /> Back to services
            </button>
            
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Pick a time</h2>
              <p className="text-slate-500 font-medium mt-1">Available slots for {selectedService?.name}.</p>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
              {[...Array(7)].map((_, i) => {
                const date = addDays(startOfToday(), i);
                const isSelected = format(selectedDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(date)}
                    className={`flex-shrink-0 flex flex-col items-center justify-center w-20 h-24 rounded-2xl border-2 transition-all ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/50 shadow-lg shadow-indigo-100/50"
                        : "border-slate-100 bg-slate-50/50 hover:border-slate-200"
                    }`}
                  >
                    <span className={`text-[10px] font-black uppercase tracking-tighter ${isSelected ? "text-indigo-600" : "text-slate-400"}`}>
                      {format(date, "EEE")}
                    </span>
                    <span className={`text-xl font-black mt-1 ${isSelected ? "text-indigo-900" : "text-slate-900"}`}>
                      {format(date, "d")}
                    </span>
                  </button>
                );
              })}
            </div>

            {loadingSlots ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
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
                        ? "border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                        : "border-slate-50 bg-slate-50 hover:border-indigo-200 text-slate-700"
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <p className="text-slate-500 font-medium">No slots available for this day. Try another date!</p>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-fade-in">
            <button 
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors mb-2"
            >
              <ChevronLeft className="h-4 w-4" /> Back to times
            </button>

            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase tracking-tighter">Your Details</h2>
              <p className="text-slate-500 font-medium mt-1">Review and confirm your appointment.</p>
            </div>

            <div className="bg-indigo-50/50 rounded-3xl p-6 border border-indigo-100/50 space-y-4">
               <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-indigo-600">
                     <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">Appointment</p>
                    <p className="font-bold text-slate-900">{selectedService?.name} with {selectedSlot?.staffName}</p>
                  </div>
               </div>
               <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-indigo-600">
                     <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">Date & Time</p>
                    <p className="font-bold text-slate-900">{format(selectedDate, "EEEE, MMMM d")} at {selectedSlot?.time}</p>
                  </div>
               </div>
            </div>

            <form onSubmit={handleConfirm} className="space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2">Your Name</label>
                  <input
                    name="customerName"
                    type="text"
                    required
                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 focus:bg-white focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-900"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2">Email Address</label>
                  <input
                    name="customerEmail"
                    type="email"
                    required
                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 focus:bg-white focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-900"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-2xl shadow-slate-200 transition-all hover:bg-slate-800 hover:scale-[1.02] active:scale-95 disabled:bg-slate-300 flex items-center justify-center gap-3 mt-4"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" /> 
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Booking</span>
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
