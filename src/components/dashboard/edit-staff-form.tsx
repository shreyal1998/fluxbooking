"use client";

import { useState, useRef } from "react";
import { AlertCircle, Loader2, Palette, Trash2, ShieldAlert, Scissors, Check, Eye, EyeOff, ChevronDown, Search, X } from "lucide-react";
import { updateStaffProfile, deleteStaff } from "@/app/actions/dashboard";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { getLabels } from "@/lib/labels";
import { PhoneInput } from "@/components/ui/phone-input";
import { validatePhoneNumber } from "@/lib/utils";

interface EditStaffFormProps {
  staff: {
    id: string;
    name: string;
    bio: string | null;
    color: string;
    user?: {
      email: string;
      phone: string | null;
    } | null;
    services?: any[];
  };
  isAdmin: boolean;
  onSuccess?: () => void;
  services: any[];
  businessType?: any;
  country?: string;
  securityOnlyMode?: boolean;
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

export function EditStaffForm({ staff, isAdmin, onSuccess, services, businessType, country, securityOnlyMode = false }: EditStaffFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>(
    staff.services?.map(s => s.id) || []
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);

  const filteredServices = (services || []).filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const labels = getLabels(businessType);

  // Clear errors when the staff member changes
  useEffect(() => {
    setFieldErrors({});
    setGeneralError(null);
    setConfirmDelete(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setSelectedServices(staff.services?.map(s => s.id) || []);
  }, [staff.id, staff.services]);

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId) 
        : [...prev, serviceId]
    );
  };

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      const newErrors = { ...fieldErrors };
      delete newErrors[field];
      setFieldErrors(newErrors);
    }
    setGeneralError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});
    setGeneralError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;

    const errors: Record<string, string> = {};
    const phoneError = validatePhoneNumber(phone);
    if (phoneError) errors.phone = phoneError;
    if (isAdmin) {
      if (!name) errors.name = `${labels.staff} name is required`;
      if (!email) {
        errors.email = "Email address is required";
      } else if (!/\S+@\S+\.\S+/.test(email)) {
        errors.email = "Please enter a valid email address";
      }
    }

    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password) {
      if (password.length < 6) {
        errors.password = "Password must be at least 6 characters";
      }
      if (password !== confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }
    
    // Append selected services
    selectedServices.forEach(id => formData.append("services", id));

    const form = e.currentTarget;
    const result = await updateStaffProfile(staff.id, formData);

    if (result?.error) {
      setGeneralError(result.error);
      toast.error(result.error);
      setLoading(false);
    } else {
      if ((result as any).emailChanged || (result as any).passwordChanged) {
        const msg = (result as any).emailChanged
          ? "Email updated! Logging out to refresh session..."
          : "Password updated! Logging out to refresh session...";
        toast.success(msg);
        setTimeout(() => {
          signOut({ callbackUrl: "/login" });
        }, 1500);
        return;
      }
      toast.success("Profile updated successfully!");
      router.refresh();
      
      // Clear password inputs
      const pwdInput = form.querySelector('input[name="password"]') as HTMLInputElement;
      const cpwdInput = form.querySelector('input[name="confirmPassword"]') as HTMLInputElement;
      if (pwdInput) pwdInput.value = "";
      if (cpwdInput) cpwdInput.value = "";

      setLoading(false);
      setFieldErrors({});
      setGeneralError(null);
      setShowPassword(false);
      setShowConfirmPassword(false);
      if (onSuccess) onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900" noValidate>
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-8 py-6 space-y-5 premium-scrollbar">
        <div>
          <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">
            Full Name <span className="text-rose-500">*</span>
          </label>
              <input
                name="name"
                type="text"
                required
                disabled={!isAdmin}
                defaultValue={staff.name}
                placeholder={labels.staffPlaceholder}
                onChange={() => clearFieldError("name")}
                className={`w-full rounded-2xl border-2 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white shadow-sm ${
                  !isAdmin
                    ? "border-indigo-100/30 dark:border-slate-800 bg-indigo-50/10 dark:bg-slate-900/20 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                    : fieldErrors.name 
                      ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" 
                      : "border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-700 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900"
                }`}
              />
              <InputError message={fieldErrors.name} />
              {!isAdmin && <input type="hidden" name="name" value={staff.name} />}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                name="email"
                type="email"
                required
                disabled={!isAdmin}
                defaultValue={staff.user?.email || ""}
                placeholder="practitioner@example.com"
                onChange={() => clearFieldError("email")}
                className={`w-full rounded-2xl border-2 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white shadow-sm ${
                  !isAdmin
                    ? "border-indigo-100/30 dark:border-slate-800 bg-indigo-50/10 dark:bg-slate-900/20 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                    : fieldErrors.email 
                      ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" 
                      : "border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-700 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900"
                }`}
              />
              <InputError message={fieldErrors.email} />
              {!isAdmin && <input type="hidden" name="email" value={staff.user?.email || ""} />}
            </div>

        {securityOnlyMode ? (
          <>
            <input type="hidden" name="bio" value={staff.bio || ""} />
            <input type="hidden" name="phone" value={staff.user?.phone || ""} />
            <input type="hidden" name="color" value={staff.color} />
            {selectedServices.map((serviceId) => (
              <input key={serviceId} type="hidden" name="services" value={serviceId} />
            ))}
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">Phone Number</label>
              <PhoneInput
                name="phone"
                defaultValue={staff.user?.phone || ""}
                defaultCountry={country || "US"}
              />
              <InputError message={fieldErrors.phone} />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">Bio / Specialization</label>
              <textarea
                name="bio"
                rows={3}
                defaultValue={staff.bio || ""}
                onChange={() => clearFieldError("bio")}
                placeholder="e.g., Senior Stylist with 10 years experience..."
                className={`w-full rounded-2xl border-2 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white resize-none shadow-sm ${
                  fieldErrors.bio 
                    ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" 
                    : "border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-700 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900"
                }`}
              />
              <InputError message={fieldErrors.bio} />
            </div>

            {staff.user && (
              <div className="p-5 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-3xl border-2 border-indigo-100 dark:border-indigo-900/30 space-y-3">
                <p className="text-xs font-bold text-indigo-500 dark:text-indigo-400">Change Password (Optional)</p>
                <div>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      onChange={() => clearFieldError("password")}
                      placeholder="New password"
                      className={`h-10 w-full rounded-xl border-2 pl-4 pr-10 py-2 focus:outline-none transition-all dark:text-white placeholder:text-xs placeholder:tracking-normal placeholder:font-medium placeholder:text-slate-400 shadow-sm text-sm ${
                        showPassword ? "font-semibold tracking-normal" : "tracking-[0.25em]"
                      } ${
                        fieldErrors.password 
                          ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" 
                          : "border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-700 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
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
                      placeholder="Confirm new password"
                      className={`h-10 w-full rounded-xl border-2 pl-4 pr-10 py-2 focus:outline-none transition-all dark:text-white placeholder:text-xs placeholder:tracking-normal placeholder:font-medium placeholder:text-slate-400 shadow-sm text-sm ${
                        showConfirmPassword ? "font-semibold tracking-normal" : "tracking-[0.25em]"
                      } ${
                        fieldErrors.confirmPassword 
                          ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" 
                          : "border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-700 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <InputError message={fieldErrors.confirmPassword} />
                </div>
              </div>
            )}

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
                      defaultChecked={staff.color === color.value} 
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
             {isAdmin && (
               <div className="pt-2">
                 <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-3 flex items-center gap-2">
                   <labels.serviceIcon className="h-4 w-4 text-slate-400" />
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
                   </div>
                 ) : (
                   <p className="text-[10px] text-slate-400 italic bg-indigo-50/30 dark:bg-slate-800/50 p-3 rounded-xl border border-dashed border-indigo-100/50 dark:border-slate-800 shadow-sm">
                     No {labels.serviceLower}s created yet.
                   </p>
                 )}
               </div>
             )}
          </>
        )}
      </div>

      <div className="px-8 py-4 border-t border-indigo-100/30 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-[2.5rem] transition-colors flex flex-col gap-3">
        <button
          type="submit"
          disabled={loading || deleteLoading}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md border border-transparent dark:border-white/10 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (securityOnlyMode ? "Save" : "Save Profile Changes")}
        </button>

        {generalError && (
          <div 
            className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold border border-rose-100 dark:border-rose-900/30 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            {generalError}
          </div>
        )}
      </div>
    </form>
  );
}
