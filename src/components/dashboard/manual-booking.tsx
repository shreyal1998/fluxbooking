"use client";

import { useState, useEffect } from "react";
import { format, addDays, isSameDay } from "date-fns";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  ChevronRight,
  ArrowRight,
  Sparkles,
  X,
  Pencil,
  Search,
  UserPlus
} from "lucide-react";
import { getAvailableSlots, createBooking, updateBooking } from "@/app/actions/booking";
import { searchCustomers, addCustomer } from "@/app/actions/customer";

export function ManualBooking({ 
  tenantId, 
  services, 
  staff, 
  mode = "create", 
  initialData = null,
  onClose
}: any) {
  const [isOpen, setIsOpen] = useState(mode === "edit");
  const [step, setStep] = useState(mode === "edit" ? 2 : 1);
  const [loading, setLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  
  // Customer Search State
  const [customerSearch, setCustomerSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);

  // Selection State
  const [selectedService, setSelectedService] = useState<any>(initialData?.service || null);
  const [selectedDate, setSelectedDate] = useState(initialData ? new Date(initialData.startTime) : new Date());
  const [selectedSlot, setSelectedSlot] = useState<any>(initialData ? { 
    time: format(new Date(initialData.startTime), "HH:mm"),
    staffId: initialData.staffId,
    staffName: initialData.staff.name
  } : null);

  const [customerInfo, setCustomerInfo] = useState({
    id: initialData?.customerId || "",
    name: initialData?.customerName || "",
    email: initialData?.customerEmail || "",
    phone: ""
  });

  useEffect(() => {
    if (mode === "edit" && selectedService) {
      fetchSlots(selectedDate, selectedService.id);
    }
  }, []);

  // Customer Search Logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (customerSearch.length >= 2) {
        const results = await searchCustomers(customerSearch);
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [customerSearch]);

  const fetchSlots = async (date: Date, serviceId: string, staffId?: string) => {
    setLoading(true);
    const result = await getAvailableSlots(
      tenantId, 
      serviceId, 
      format(date, "yyyy-MM-dd"), 
      staffId,
      initialData?.id
    );
    if ((result as any).slots) {
      setAvailableSlots((result as any).slots);
    }
    setLoading(false);
  };

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
  };

  const handleCreateNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const result = await addCustomer(formData);
    if (result.success) {
      handleSelectCustomer(result.customer);
    } else {
      alert(result.error);
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData();
    formData.append("serviceId", selectedService.id);
    formData.append("staffId", selectedSlot.staffId);
    formData.append("date", format(selectedDate, "yyyy-MM-dd"));
    formData.append("time", selectedSlot.time);
    formData.append("customerName", customerInfo.name);
    formData.append("customerEmail", customerInfo.email);
    if (customerInfo.id) formData.append("customerId", customerInfo.id);

    let result;
    if (mode === "edit") {
      result = await updateBooking(initialData.id, formData);
    } else {
      formData.append("tenantId", tenantId);
      result = await createBooking(formData);
    }

    if (result.success) {
      handleClose();
    } else {
      alert(result.error);
    }
    setLoading(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
    if (mode !== "edit") {
      setStep(1);
      setSelectedService(null);
      setSelectedSlot(null);
      setCustomerInfo({ id: "", name: "", email: "", phone: "" });
    }
  };

  const nextSevenDays = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));

  return (
    <>
      {mode === "create" && (
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
        >
          <Sparkles className="h-4 w-4" />
          Manual Booking
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh] transition-colors">
            
            <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                  {mode === 'edit' ? <Pencil className="h-5 w-5" /> : <CalendarIcon className="h-5 w-5" />}
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    {mode === 'edit' ? 'Edit Booking' : 'Manual Booking'}
                  </h2>
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Step {step} of 3</p>
                </div>
              </div>
              <button 
                onClick={handleClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                      Select Service
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Which service is the customer booking?</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {services.map((service: any) => (
                      <button
                        key={service.id}
                        onClick={() => {
                          setSelectedService(service);
                          setStep(2);
                          fetchSlots(selectedDate, service.id);
                        }}
                        className="group flex items-center justify-between p-5 rounded-[2rem] border-2 border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-indigo-100 dark:hover:border-indigo-900 hover:bg-white dark:hover:bg-slate-800 transition-all text-left"
                      >
                        <div className="flex items-center gap-4">
                           <div className="w-2 h-10 rounded-full" style={{ backgroundColor: service.color }}></div>
                           <div>
                              <p className="font-bold text-slate-900 dark:text-white">{service.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{service.durationMinutes} mins • ${service.price}</p>
                           </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: selectedService?.color }}></div>
                       <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedService?.name}</span>
                    </div>
                    <button onClick={() => setStep(1)} className="text-xs font-bold text-indigo-600 hover:underline">Change Service</button>
                  </div>
                  <div>
                     <h3 className="text-lg font-black text-slate-900 dark:text-white">Select Date & Time</h3>
                     <div className="flex gap-3 overflow-x-auto py-4 -mx-2 px-2 scrollbar-hide">
                        {nextSevenDays.map((date) => {
                          const isSelected = isSameDay(date, selectedDate);
                          return (
                            <button
                              key={date.toString()}
                              onClick={() => handleDateChange(date)}
                              className={`flex flex-col items-center min-w-[70px] p-4 rounded-2xl border-2 transition-all ${
                                isSelected 
                                  ? "bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100" 
                                  : "bg-white dark:bg-slate-800 border-slate-50 dark:border-slate-800 text-slate-400 hover:border-indigo-100"
                              }`}
                            >
                              <span className="text-[10px] font-black uppercase tracking-tighter mb-1 opacity-70">{format(date, "EEE")}</span>
                              <span className={`text-lg font-black ${isSelected ? "text-white" : "text-slate-900 dark:text-white"}`}>{format(date, "d")}</span>
                            </button>
                          );
                        })}
                     </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Available Slots</p>
                    {loading ? (
                      <div className="flex justify-center py-8">
                        <div className="h-8 w-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
                      </div>
                    ) : availableSlots.length > 0 ? (
                      <div className="grid grid-cols-3 gap-3">
                        {availableSlots.map((slot, idx) => {
                          const isSelected = selectedSlot?.time === slot.time && selectedSlot?.staffId === slot.staffId;
                          return (
                            <button
                              key={idx}
                              onClick={() => { setSelectedSlot(slot); setStep(3); }}
                              className={`p-3 rounded-xl border-2 transition-all text-left ${
                                isSelected
                                  ? "bg-indigo-600 border-indigo-600 text-white shadow-lg"
                                  : "border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:border-indigo-100 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
                              }`}
                            >
                              <span className="text-xs font-black">{slot.time}</span>
                              <span className={`block text-[8px] uppercase tracking-tighter mt-0.5 ${isSelected ? 'text-indigo-100' : 'opacity-60'}`}>{slot.staffName}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No available slots for this date.</p>
                    )}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8">
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900/50 flex flex-wrap gap-6">
                      <div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Service</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedService?.name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Time</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{format(selectedDate, "MMM d")} at {selectedSlot?.time}</p>
                      </div>
                  </div>

                  {/* Customer Selection / Entry */}
                  <div className="space-y-6">
                    {!customerInfo.id && !isAddingNewCustomer ? (
                      <div className="space-y-4">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Search Customer</label>
                        <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <input 
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                            placeholder="Start typing name or email..."
                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 pl-12 pr-4 text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                          />
                        </div>
                        
                        {searchResults.length > 0 && (
                          <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xl">
                            {searchResults.map((customer) => (
                              <button
                                key={customer.id}
                                onClick={() => handleSelectCustomer(customer)}
                                className="w-full px-6 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700 border-b last:border-0 border-slate-50 dark:border-slate-700 transition-colors flex items-center gap-3"
                              >
                                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                                  {customer.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-900 dark:text-white">{customer.name}</p>
                                  <p className="text-[10px] text-slate-400">{customer.email}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        <button 
                          onClick={() => setIsAddingNewCustomer(true)}
                          className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-400 hover:border-indigo-400 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
                        >
                          <UserPlus className="h-4 w-4" /> Add New Customer Instead
                        </button>
                      </div>
                    ) : isAddingNewCustomer ? (
                      <form onSubmit={handleCreateNewCustomer} className="space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between">
                           <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">New Customer Details</h4>
                           <button type="button" onClick={() => setIsAddingNewCustomer(false)} className="text-[10px] font-bold text-indigo-600">Back to search</button>
                        </div>
                        <input name="name" placeholder="Full Name" required className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl px-5 py-3 text-sm dark:text-white outline-none" />
                        <input name="email" type="email" placeholder="Email Address" required className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl px-5 py-3 text-sm dark:text-white outline-none" />
                        <input name="phone" placeholder="Phone Number (Optional)" className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl px-5 py-3 text-sm dark:text-white outline-none" />
                        <button type="submit" disabled={loading} className="w-full py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all">
                          {loading ? "Creating..." : "Create & Select Customer"}
                        </button>
                      </form>
                    ) : (
                      <div className="p-6 rounded-3xl border-2 border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/20 flex items-center justify-between animate-fade-in">
                         <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xs">
                              {customerInfo.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                               <p className="text-sm font-black text-slate-900 dark:text-white">{customerInfo.name}</p>
                               <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{customerInfo.email}</p>
                            </div>
                         </div>
                         {mode !== 'edit' && (
                           <button onClick={() => setCustomerInfo({ id: "", name: "", email: "", phone: "" })} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all">
                             <X className="h-4 w-4 text-slate-400" />
                           </button>
                         )}
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSave} className="pt-4">
                    <div className="flex gap-3">
                       <button type="button" onClick={() => setStep(2)} className="flex-1 py-4 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">Go Back</button>
                       <button 
                         type="submit" 
                         disabled={loading || !customerInfo.name}
                         className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                       >
                         {loading ? "Saving..." : (
                           <>
                             {mode === 'edit' ? 'Update Booking' : 'Confirm Booking'} <ArrowRight className="h-4 w-4" />
                           </>
                         )}
                       </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
