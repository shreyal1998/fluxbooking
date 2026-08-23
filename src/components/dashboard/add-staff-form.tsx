"use client";

import { useState, useRef, useEffect } from "react";
import { UserPlus, AlertCircle, Loader2, Search, ChevronDown, Scissors, Check, Eye, EyeOff, X, Palette } from "lucide-react";
import { addStaff } from "@/app/actions/dashboard";
import { COUNTRIES } from "@/config/countries";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getLabels } from "@/lib/labels";
import { PhoneInput } from "@/components/ui/phone-input";
import { validatePhoneNumber } from "@/lib/utils";

export function AddStaffForm({ 
  users, 
  services, 
  onSuccess,
  businessType,
  country
}: { 
  users: any[], 
  services: any[], 
  onSuccess?: () => void,
  businessType?: any,
  country?: string
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (generalError && errorRef.current) {
      const timer = setTimeout(() => {
        errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [generalError]);

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);

  const filteredServices = (services || []).filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const labels = getLabels(businessType);
  
  // Phone number input state - handled by PhoneInput component

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      const newErrors = { ...fieldErrors };
      delete newErrors[field];
      setFieldErrors(newErrors);
    }
    setGeneralError(null);
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId) 
        : [...prev, serviceId]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});
    setGeneralError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const phone = formData.get("phone") as string;

    const errors: Record<string, string> = {};
    const phoneError = validatePhoneNumber(phone);
    if (phoneError) errors.phone = phoneError;
    if (!name) errors.name = `${labels.staff} name is required`;
    
    if (!email) errors.email = "Email is required";
    if (!password) errors.password = "Password is required";
    else if (password.length < 6) errors.password = "Password must be at least 6 characters";
    
    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (password && password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    // Append selected services
    selectedServices.forEach(id => formData.append("services", id));

    const result = await addStaff(formData);

    if (result?.error) {
      setGeneralError(result.error);
      setLoading(false);
    } else {
      toast.success(`${labels.staff} added successfully!`);
      router.refresh();
      (e.target as HTMLFormElement).reset();
      setFieldErrors({});
      setGeneralError(null);
      setShowPassword(false);
      setShowConfirmPassword(false);
      setSelectedServices([]);
      setLoading(false);
      if (onSuccess) onSuccess();
    }
  };

  const InputError = ({ message }: { message?: string }) => {
    if (!message) return null;
    return (
      <div className="flex items-center gap-1.5 mt-1.5 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span className="text-xs font-semibold">{message}</span>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900" noValidate>
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-8 py-6 space-y-5 premium-scrollbar">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">
            Full Name <span className="text-rose-500">*</span>
          </label>
          <input
            name="name"
            type="text"
            required
            onChange={() => clearFieldError("name")}
            onFocus={() => clearFieldError("name")}
            placeholder={labels.staffPlaceholder}
            className={`w-full rounded-2xl border-2 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white shadow-sm ${
              fieldErrors.name 
                ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" 
                : "border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-800 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900"
            }`}
          />
          <InputError message={fieldErrors.name} />
        </div>

        {/* Email Address */}
        <div>
          <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">
            Email Address <span className="text-rose-500">*</span>
          </label>
          <input
            name="email"
            type="email"
            onChange={() => clearFieldError("email")}
            onFocus={() => clearFieldError("email")}
            placeholder="practitioner@example.com"
            className={`w-full rounded-2xl border-2 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white shadow-sm ${
              fieldErrors.email 
                ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" 
                : "border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-800 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900"
            }`}
          />
          <InputError message={fieldErrors.email} />
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">
            Phone Number
          </label>
          <PhoneInput
            name="phone"
            defaultValue=""
            defaultCountry={country || "US"}
            hasError={!!fieldErrors.phone}
            onChange={() => clearFieldError("phone")}
            onFocus={() => clearFieldError("phone")}
          />
          <InputError message={fieldErrors.phone} />
        </div>

        {/* Bio / Specialization */}
        <div>
          <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">Bio / Specialization</label>
          <textarea
            name="bio"
            rows={2}
            placeholder={`Describe this ${labels.staffLower}'s expertise...`}
            className="w-full bg-indigo-50/30 dark:bg-slate-900 border-2 border-indigo-100/50 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm dark:text-white outline-none transition-all focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-800 shadow-sm resize-none"
          />
        </div>

        {/* Login Credentials (Password) */}
        <div className="p-5 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-3xl border-2 border-indigo-100 dark:border-indigo-900/30">
          <p className="text-xs font-bold text-indigo-500 dark:text-indigo-400 mb-4">Login Credentials</p>
          <div className="space-y-3">
            <div>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  onChange={() => clearFieldError("password")}
                  onFocus={() => clearFieldError("password")}
                  placeholder="Password *"
                  className={`h-10 w-full rounded-xl border-2 pl-4 pr-10 py-2 focus:outline-none transition-all dark:text-white placeholder:text-xs placeholder:tracking-normal placeholder:font-medium placeholder:text-slate-400 shadow-sm text-sm ${
                    showPassword ? "font-semibold tracking-normal" : "tracking-[0.25em]"
                  } ${
                    fieldErrors.password 
                      ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" 
                      : "border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-800 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors animate-in fade-in duration-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <InputError message={fieldErrors.password} />
            </div>
            <div>
              <div className="relative">
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  onChange={() => clearFieldError("confirmPassword")}
                  placeholder="Confirm Password *"
                  className={`h-10 w-full rounded-xl border-2 pl-4 pr-10 py-2 focus:outline-none transition-all dark:text-white placeholder:text-xs placeholder:tracking-normal placeholder:font-medium placeholder:text-slate-400 shadow-sm text-sm ${
                    showConfirmPassword ? "font-semibold tracking-normal" : "tracking-[0.25em]"
                  } ${
                    fieldErrors.confirmPassword 
                      ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" 
                      : "border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-800 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors animate-in fade-in duration-200"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <InputError message={fieldErrors.confirmPassword} />
            </div>
          </div>
        </div>

        {/* Calendar Color */}
        <div>
          <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-3 flex items-center gap-2">
            <Palette className="h-4 w-4 text-slate-400" />
            Calendar Color
          </label>
          <div className="flex flex-wrap gap-3">
            {[
              { name: 'Indigo', value: '#6366f1' },
              { name: 'Emerald', value: '#10b981' },
              { name: 'Sky', value: '#0ea5e9' },
              { name: 'Amber', value: '#f59e0b' },
              { name: 'Rose', value: '#f43f5e' },
              { name: 'Violet', value: '#8b5cf6' },
            ].map((color) => (
              <label key={color.value} className="relative cursor-pointer group">
                <input
                  type="radio"
                  name="color"
                  value={color.value}
                  className="peer sr-only"
                  defaultChecked={color.value === '#6366f1'}
                />
                <div
                  className="w-8 h-8 rounded-xl border-2 border-transparent peer-checked:border-indigo-600 peer-checked:scale-110 transition-all shadow-sm group-hover:scale-110"
                  style={{ backgroundColor: color.value }}
                ></div>
              </label>
            ))}
          </div>
        </div>

        {/* Service Selection */}
        <div>
          <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-3 flex items-center gap-2">
            <labels.serviceIcon className="h-3.5 w-3.5" />
            Assigned {labels.service}s
          </label>
          {services.length > 0 ? (
            <div className="space-y-2">
              <div className="relative">
                <button
                  ref={triggerRef}
                  type="button"
                  onClick={() => {
                    if (!isDropdownOpen && triggerRef.current && scrollContainerRef.current) {
                      const triggerRect = triggerRef.current.getBoundingClientRect();
                      const containerRect = scrollContainerRef.current.getBoundingClientRect();
                      const spaceBelow = containerRect.bottom - triggerRect.bottom;
                      setOpenUpward(spaceBelow < 230);
                    }
                    setIsDropdownOpen(!isDropdownOpen);
                  }}
                  className="w-full flex items-center justify-between rounded-2xl border-2 border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white shadow-sm hover:border-indigo-200 dark:hover:border-slate-800 text-left"
                >
                  <span className="truncate text-slate-700 dark:text-slate-200">
                    {selectedServices.length === 0 
                      ? `Select ${labels.serviceLower}s...` 
                      : `${selectedServices.length} ${labels.serviceLower}${selectedServices.length === 1 ? '' : 's'} selected`}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                    
                    <div className={`absolute left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-4 space-y-3 animate-in fade-in zoom-in duration-200 max-h-56 flex flex-col ${openUpward ? 'bottom-full mb-2 origin-bottom slide-in-from-bottom-2' : 'top-full mt-2 origin-top slide-in-from-top-2'}`}>
                      <div className="relative flex-shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder={`Search ${labels.serviceLower}s...`}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-indigo-500 dark:text-white"
                        />
                      </div>
                      
                      <div className="overflow-y-auto space-y-1 pr-1 flex-1 premium-scrollbar">
                        {filteredServices.map((service: any) => {
                          const isSelected = selectedServices.includes(service.id);
                          return (
                            <button
                              key={service.id}
                              type="button"
                              onClick={() => toggleService(service.id)}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left text-xs ${
                                isSelected
                                  ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold"
                                  : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <div className="w-1.5 h-4 rounded-full shrink-0" style={{ backgroundColor: service.color }}></div>
                                <span className="truncate">{service.name}</span>
                              </div>
                              {isSelected && <Check className="h-4 w-4 text-indigo-600 shrink-0" />}
                            </button>
                          );
                        })}
                        {filteredServices.length === 0 && (
                          <p className="text-center text-xs text-slate-400 py-4 italic">No matching options.</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {selectedServices.length > 0 && (
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1">
                  {selectedServices.map(serviceId => {
                    const service = services.find(s => s.id === serviceId);
                    if (!service) return null;
                    return (
                      <div 
                        key={serviceId}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/20 text-xs font-bold text-slate-700 dark:text-slate-200 border border-indigo-100/30 dark:border-slate-800"
                      >
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: service.color }}></div>
                        <span>{service.name}</span>
                        <button
                          type="button"
                          onClick={() => toggleService(serviceId)}
                          className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer shrink-0 ml-0.5"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <p className="text-[10px] text-slate-400 italic bg-indigo-50/30 dark:bg-slate-800/50 p-3 rounded-xl border border-dashed border-indigo-100/50 dark:border-slate-800 shadow-sm">
              No {labels.serviceLower}s created yet.
            </p>
          )}
        </div>

      </div>


      <div className="px-8 py-4 border-t border-indigo-100/30 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-[2.5rem] transition-colors flex flex-col gap-3">
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md border border-transparent dark:border-white/10 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            <>
              <Check className="h-5 w-5" />
              Add {labels.staff}
            </>
          )}
        </button>

        {generalError && (
          <div 
            ref={errorRef}
            className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold border border-rose-100 dark:border-rose-900/30 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            {generalError}
          </div>
        )}
      </div>
    </form>
  );
}
