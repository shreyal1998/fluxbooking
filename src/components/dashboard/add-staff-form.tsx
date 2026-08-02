"use client";

import { useState, useRef, useEffect } from "react";
import { UserPlus, AlertCircle, Loader2, Search, ChevronDown, Scissors, Check, Eye, EyeOff } from "lucide-react";
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
        <AlertCircle className="h-3 w-3" />
        <span className="text-[10px] font-black uppercase tracking-wider">{message}</span>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900" noValidate>
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5 premium-scrollbar">
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
            Full Name <span className="text-rose-500">*</span>
          </label>
          <input
            name="name"
            type="text"
            required
            onChange={() => clearFieldError("name")}
            placeholder={labels.staffPlaceholder}
            className={`w-full rounded-2xl border-2 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white shadow-sm ${
              fieldErrors.name 
                ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" 
                : "border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-800 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900"
            }`}
          />
          <InputError message={fieldErrors.name} />
        </div>
        
        <div className="space-y-4 pt-2">
           <div className="p-5 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-3xl border-2 border-indigo-100 dark:border-indigo-900/30">
             <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Login Credentials</p>
             <div className="space-y-3">
                  <div>
                    <input
                      name="email"
                      type="email"
                      onChange={() => clearFieldError("email")}
                      placeholder="Email *"
                      className={`w-full rounded-xl border-2 px-4 py-2.5 text-xs focus:outline-none transition-all dark:text-white shadow-sm ${
                        fieldErrors.email 
                          ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" 
                          : "border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-800 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900"
                      }`}
                    />
                    <InputError message={fieldErrors.email} />
                  </div>
                  <div>
                    <PhoneInput
                      name="phone"
                      defaultValue=""
                      defaultCountry={country || "US"}
                    />
                    <InputError message={fieldErrors.phone} />
                  </div>
                    <div>
                      <div className="relative">
                        <input
                          name="password"
                          type={showPassword ? "text" : "password"}
                          onChange={() => clearFieldError("password")}
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
        </div>

        {/* Service Selection */}
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-3 flex items-center gap-2">
            <labels.serviceIcon className="h-3.5 w-3.5" />
            Assigned {labels.service}s
          </label>
          <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 scrollbar-hide">
            {services?.map((service: any) => (
              <button
                key={service.id}
                type="button"
                onClick={() => toggleService(service.id)}
                className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left shadow-sm ${
                  selectedServices.includes(service.id)
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20"
                    : "border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-800/30 hover:border-indigo-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: service.color }}></div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{service.name}</span>
                </div>
                {selectedServices.includes(service.id) && <Check className="h-4 w-4 text-indigo-600" />}
              </button>
            ))}
          </div>
          {services.length === 0 && (
            <p className="text-[10px] text-slate-400 italic bg-indigo-50/30 dark:bg-slate-800/50 p-3 rounded-xl border border-dashed border-indigo-100/50 dark:border-slate-800 shadow-sm">
              No {labels.serviceLower}s created yet.
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Bio / Specialization</label>
          <textarea
            name="bio"
            rows={2}
            placeholder={`Describe this ${labels.staffLower}'s expertise...`}
            className="w-full bg-indigo-50/30 dark:bg-slate-900 border-2 border-indigo-100/50 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-800 shadow-sm resize-none"
          />
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
