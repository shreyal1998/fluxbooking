"use client";

import { useState, useRef, useEffect } from "react";
import { UserPlus, AlertCircle, Loader2, Search, ChevronDown, Scissors, Check } from "lucide-react";
import { addStaff } from "@/app/actions/dashboard";
import { COUNTRIES } from "@/config/countries";
import { toast } from "sonner";

export function AddStaffForm({ 
  users, 
  services, 
  onSuccess 
}: { 
  users: any[], 
  services: any[], 
  onSuccess?: () => void 
}) {
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [showPasswordField, setShowPasswordField] = useState(true);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  
  // Country Code State
  const [openDropdown, setOpenDropdown] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES.find(c => c.code === "US") || COUNTRIES[0]);
  const [countrySearch, setCountrySearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // User Account State
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userSearch, setUserSearch] = useState("");
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const userSearchInputRef = useRef<HTMLInputElement>(null);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (openDropdown && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [openDropdown]);

  useEffect(() => {
    if (userDropdownOpen && userSearchInputRef.current) {
      userSearchInputRef.current.focus();
    }
  }, [userDropdownOpen]);

  const filteredCountries = COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
    c.phoneCode.includes(countrySearch)
  );

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
    const userId = formData.get("userId") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    const errors: Record<string, string> = {};
    if (!name) errors.name = "Team member name is required";
    
    if (!userId) {
      if (!email) errors.email = "Email is required for new account";
      if (!password) errors.password = "Password is required";
      else if (password.length < 6) errors.password = "Password must be at least 6 characters";
      
      if (!confirmPassword) {
        errors.confirmPassword = "Please confirm your password";
      } else if (password && password !== confirmPassword) {
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

    const result = await addStaff(formData);

    if (result?.error) {
      setGeneralError(result.error);
      toast.error(result.error);
      setLoading(false);
    } else {
      toast.success("Team member added successfully!");
      (e.target as HTMLFormElement).reset();
      setFieldErrors({});
      setGeneralError(null);
      setShowPasswordField(true);
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
    <div className="px-8 py-6 transition-colors text-left bg-white dark:bg-slate-900">
      {generalError && (
        <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-bold border border-rose-100 dark:border-rose-900/30">
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
            Full Name <span className="text-rose-500">*</span>
          </label>
          <input
            name="name"
            type="text"
            required
            onChange={() => clearFieldError("name")}
            placeholder="e.g., Sarah Smith"
            className={`w-full rounded-2xl border-2 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white bg-transparent ${
              fieldErrors.name ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" : "border-slate-100 dark:border-slate-700 focus:border-indigo-600"
            }`}
          />
          <InputError message={fieldErrors.name} />
        </div>
        
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
            User Account <span className="text-rose-500">*</span>
          </label>
          <div className="relative" ref={userDropdownRef}>
            <input type="hidden" name="userId" value={selectedUserId} />
            <button
              type="button"
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className={`flex items-center justify-between w-full rounded-2xl border-2 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white bg-slate-50 dark:bg-slate-800 ${
                userDropdownOpen ? "border-indigo-600 shadow-lg shadow-indigo-500/10" : "border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-indigo-600"
              }`}
            >
              <span className={!selectedUserId ? "text-slate-900 dark:text-white" : "font-medium"}>
                {selectedUserId 
                  ? `Use existing: ${users.find(u => u.id === selectedUserId)?.name || ""}` 
                  : "Create new login account"}
              </span>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {userDropdownOpen && (
              <div className="absolute z-[120] left-0 mt-2 w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 py-2 max-h-60 flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="px-3 pb-2 border-b border-slate-100 dark:border-slate-700 mb-1 sticky top-0 bg-white dark:bg-slate-900">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input 
                      ref={userSearchInputRef}
                      type="text"
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white transition-all"
                    />
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 text-left custom-scrollbar">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUserId("");
                      setShowPasswordField(true);
                      setUserDropdownOpen(false);
                      setUserSearch("");
                      clearFieldError("userId");
                    }}
                    className={`flex items-center justify-between w-full px-5 py-3 text-xs font-bold transition-colors ${
                      selectedUserId === "" ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Create new login account
                  </button>
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setShowPasswordField(false);
                        setUserDropdownOpen(false);
                        setUserSearch("");
                        setFieldErrors({}); // Clear errors when selecting existing user
                        setGeneralError(null);
                      }}
                      className={`flex flex-col items-start w-full px-5 py-3 transition-colors ${
                        selectedUserId === user.id ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate text-xs font-bold">{user.name}</span>
                      <span className={`text-xs font-medium mt-0.5 ${selectedUserId === user.id ? 'text-indigo-400 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'}`}>{user.email}</span>
                    </button>
                  ))}
                  {filteredUsers.length === 0 && (
                    <div className="px-5 py-4 text-xs font-bold text-slate-400 italic text-center">
                      No users found.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {showPasswordField && (
          <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
             <div className="p-5 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
               <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Login Credentials</p>
               <div className="space-y-3">
                  <div>
                    <input
                      name="email"
                      type="email"
                      onChange={() => clearFieldError("email")}
                      placeholder="Email *"
                      className={`w-full rounded-xl border-2 px-4 py-2.5 text-xs focus:outline-none transition-all dark:text-white bg-white dark:bg-slate-900 ${
                        fieldErrors.email ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" : "border-transparent focus:border-indigo-600"
                      }`}
                    />
                    <InputError message={fieldErrors.email} />
                  </div>
                  <div>
                    <div className="flex gap-2">
                       <div className="relative" ref={dropdownRef}>
                          <button
                            type="button"
                            onClick={() => setOpenDropdown(!openDropdown)}
                            className="h-10 px-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl flex items-center gap-2 text-xs font-black text-slate-500 hover:border-indigo-500 transition-all cursor-pointer"
                          >
                            <span>+{selectedCountry.phoneCode}</span>
                            <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${openDropdown ? 'rotate-180' : ''}`} />
                          </button>
                          <input type="hidden" name="staffCountryCode" value={selectedCountry.code} />

                          {openDropdown && (
                            <div className="absolute z-[120] left-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 py-2 max-h-60 flex flex-col">
                              <div className="px-3 pb-2 border-b border-slate-100 dark:border-slate-700 mb-1 sticky top-0 bg-white dark:bg-slate-900">
                                <div className="relative">
                                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                                  <input 
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Search..."
                                    value={countrySearch}
                                    onChange={(e) => setCountrySearch(e.target.value)}
                                    className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-indigo-500/20 dark:text-white"
                                  />
                                </div>
                              </div>
                              <div className="overflow-y-auto flex-1 text-left">
                                {filteredCountries.map((c) => (
                                  <button
                                    key={c.code}
                                    type="button"
                                    onClick={() => { setSelectedCountry(c); setOpenDropdown(false); setCountrySearch(""); }}
                                    className={`flex items-center justify-between w-full px-4 py-2 text-[10px] font-bold ${selectedCountry.code === c.code ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                  >
                                    <span className="truncate mr-2">{c.name}</span>
                                    <span className="text-slate-400">+{c.phoneCode}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                       </div>
                       <input
                        name="phone"
                        type="tel"
                        placeholder="Phone (Optional)"
                        className="flex-1 h-10 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2 text-xs dark:text-white focus:outline-none transition-all focus:border-indigo-500"
                       />
                    </div>
                  </div>
                    <div>
                      <input
                        name="password"
                        type="password"
                        onChange={() => clearFieldError("password")}
                        placeholder="Password *"
                        className={`w-full rounded-xl border-2 px-4 py-2.5 focus:outline-none transition-all dark:text-white bg-white dark:bg-slate-900 text-xl tracking-[0.25em] placeholder:text-xs placeholder:tracking-normal placeholder:font-medium placeholder:text-slate-400 ${
                          fieldErrors.password ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" : "border-transparent focus:border-indigo-600"
                        }`}
                      />
                      <InputError message={fieldErrors.password} />
                    </div>
                    <div>
                      <input
                        name="confirmPassword"
                        type="password"
                        onChange={() => clearFieldError("confirmPassword")}
                        placeholder="Confirm Password *"
                        className={`w-full rounded-xl border-2 px-4 py-2.5 focus:outline-none transition-all dark:text-white bg-white dark:bg-slate-900 text-xl tracking-[0.25em] placeholder:text-xs placeholder:tracking-normal placeholder:font-medium placeholder:text-slate-400 ${
                          fieldErrors.confirmPassword ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" : "border-transparent focus:border-indigo-600"
                        }`}
                      />
                      <InputError message={fieldErrors.confirmPassword} />
                    </div>
               </div>
             </div>
          </div>
        )}

        {/* Service Selection */}
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-3 flex items-center gap-2">
            <Scissors className="h-3.5 w-3.5" />
            Assigned Services
          </label>
          <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 scrollbar-hide">
            {services?.map((service: any) => (
              <button
                key={service.id}
                type="button"
                onClick={() => toggleService(service.id)}
                className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left ${
                  selectedServices.includes(service.id)
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20"
                    : "border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:border-indigo-100"
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
            <p className="text-[10px] text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-dashed border-slate-100 dark:border-slate-700">
              No services created yet.
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Bio / Specialization</label>
          <textarea
            name="bio"
            rows={2}
            placeholder="e.g., Expert colorist"
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-3 text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center gap-2 py-4 px-4 rounded-2xl text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 dark:shadow-none border border-transparent dark:border-white/10 disabled:opacity-50 transition-all active:scale-[0.98]"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            <>
              <Check className="h-5 w-5" />
              Add Member
            </>
          )}
        </button>
      </form>
    </div>
  );
}
