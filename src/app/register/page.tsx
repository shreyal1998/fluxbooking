"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Calendar, Loader2, Eye, EyeOff, ArrowRight, Globe, ChevronDown, Check, Search, AlertCircle } from "lucide-react";
import { registerBusiness } from "@/app/actions/register";
import { COUNTRIES } from "@/config/countries";
import { Logo } from "@/components/logo";

function RegisterContent() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<typeof COUNTRIES[0] | null>(null);
  const [selectedBusinessType, setSelectedBusinessType] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [countrySearch, setCountrySearch] = useState("");
  const [dropdownDirection, setDropdownDirection] = useState<"up" | "down">("down");
  
  // Specific Refs for each dropdown to ensure "Click Outside" works perfectly
  const countryRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPlan = searchParams.get("plan") || "FREE";

  const filteredCountries = COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  useEffect(() => {
    if (openDropdown === "country" && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [openDropdown]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
      // If country dropdown is open, check if click is outside it
      if (openDropdown === "country" && countryRef.current && !countryRef.current.contains(target)) {
        setOpenDropdown(null);
      }
      // If type dropdown is open, check if click is outside it
      if (openDropdown === "type" && typeRef.current && !typeRef.current.contains(target)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

  const toggleDropdown = (e: React.MouseEvent, name: string) => {
    const button = e.currentTarget as HTMLButtonElement;
    const rect = button.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceNeeded = 250;

    setDropdownDirection(spaceBelow < spaceNeeded ? "up" : "down");
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const handleCountrySelect = (country: typeof COUNTRIES[0]) => {
    setSelectedCountry(country);
    setOpenDropdown(null);
    clearFieldError("country");
  };

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      const newErrors = { ...fieldErrors };
      delete newErrors[field];
      setFieldErrors(newErrors);
    }
    setGeneralError(null);
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setFieldErrors({});
    setGeneralError(null);

    const formData = new FormData(event.currentTarget);
    const errors: Record<string, string> = {};

    // Client-side validation
    if (!formData.get("name")) errors.name = "Name is required";
    if (!formData.get("email")) errors.email = "Email is required";
    if (!formData.get("password")) errors.password = "Password is required";
    if (!formData.get("confirmPassword")) errors.confirmPassword = "Confirm your password";
    if (!formData.get("businessName")) errors.businessName = "Business name is required";
    if (!formData.get("slug")) errors.slug = "URL is required";
    if (!formData.get("phone")) errors.phone = "Phone number is required";
    if (!selectedCountry) errors.country = "Select your country";
    if (!selectedBusinessType) errors.businessType = "Select business type";

    const password = formData.get("password") as string;
    const phone = formData.get("phone") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    
    // Format check for phone
    if (phone && !/^[0-9\s-]{7,20}$/.test(phone)) {
      errors.phone = "Invalid phone format";
    }

    // Only show mismatch error if both fields have values
    if (password && confirmPassword && password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    const result = await registerBusiness(formData);

    if (result.error) {
      if (result.error.includes("email")) {
        setFieldErrors({ email: "An account with this email already exists" });
      } else if (result.error.includes("URL")) {
        setFieldErrors({ slug: "This Business URL is already taken" });
      } else {
        setGeneralError(result.error);
      }
      setLoading(false);
    } else {
      router.push("/login?registered=true");
    }
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-12 sm:px-6 lg:px-8 selection:bg-indigo-100">
      <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] border border-slate-100">
        <div className="flex flex-col items-center">
          <Link href="/" className="mb-6 outline-none">
            <Logo size="xl" />
          </Link>
          <h2 className="text-center text-3xl font-black text-slate-900 tracking-tight">
            Join FluxBooking
          </h2>
          <p className="mt-2 text-center text-sm font-medium text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-indigo-600 hover:text-indigo-500 underline-offset-4 hover:underline">
              Log in
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
          {generalError && (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-sm font-bold border border-rose-100">
              {generalError}
            </div>
          )}
          
          <input type="hidden" name="plan" value={initialPlan} />
          <input type="hidden" name="timezone" value={Intl.DateTimeFormat().resolvedOptions().timeZone} />

          <div className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                onChange={() => clearFieldError("name")}
                className={`block w-full rounded-2xl border-2 px-4 py-3 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 transition-all sm:text-sm font-medium ${
                  fieldErrors.name ? "border-rose-100 bg-rose-50 focus:border-rose-500 focus:ring-rose-500/10" : "border-slate-100 bg-slate-50 focus:border-indigo-600 focus:ring-indigo-500/10"
                }`}
                placeholder="John Doe"
              />
              <InputError message={fieldErrors.name} />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                onChange={() => clearFieldError("email")}
                className={`block w-full rounded-2xl border-2 px-4 py-3 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 transition-all sm:text-sm font-medium ${
                  fieldErrors.email ? "border-rose-100 bg-rose-50 focus:border-rose-500 focus:ring-rose-500/10" : "border-slate-100 bg-slate-50 focus:border-indigo-600 focus:ring-indigo-500/10"
                }`}
                placeholder="john@example.com"
              />
              <InputError message={fieldErrors.email} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    onChange={() => clearFieldError("password")}
                    className={`block w-full rounded-2xl border-2 px-4 py-3 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 transition-all sm:text-sm font-medium pr-10 ${
                      fieldErrors.password ? "border-rose-100 bg-rose-50 focus:border-rose-500 focus:ring-rose-500/10" : "border-slate-100 bg-slate-50 focus:border-indigo-600 focus:ring-indigo-500/10"
                    }`}
                    placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <InputError message={fieldErrors.password} />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    onChange={() => clearFieldError("confirmPassword")}
                    className={`block w-full rounded-2xl border-2 px-4 py-3 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 transition-all sm:text-sm font-medium pr-10 ${
                      fieldErrors.confirmPassword ? "border-rose-100 bg-rose-50 focus:border-rose-500 focus:ring-rose-500/10" : "border-slate-100 bg-slate-50 focus:border-indigo-600 focus:ring-indigo-500/10"
                    }`}
                    placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <InputError message={fieldErrors.confirmPassword} />
              </div>
            </div>

            <div>
              <label htmlFor="businessName" className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                Business Name
              </label>
              <input
                id="businessName"
                name="businessName"
                type="text"
                onChange={() => clearFieldError("businessName")}
                className={`block w-full rounded-2xl border-2 px-4 py-3 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 transition-all sm:text-sm font-medium ${
                  fieldErrors.businessName ? "border-rose-100 bg-rose-50 focus:border-rose-500 focus:ring-rose-500/10" : "border-slate-100 bg-slate-50 focus:border-indigo-600 focus:ring-indigo-500/10"
                }`}
                placeholder="My Awesome Salon"
              />
              <InputError message={fieldErrors.businessName} />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                Country
              </label>
              <div className="relative" ref={countryRef}>
                <input type="hidden" name="country" value={selectedCountry?.code || ""} />
                <button
                  type="button"
                  onClick={(e) => toggleDropdown(e, "country")}
                  className={`flex items-center justify-between w-full rounded-2xl border-2 px-4 py-3 text-slate-900 focus:bg-white transition-all sm:text-sm font-bold ${
                    openDropdown === "country" ? "border-indigo-600 shadow-lg shadow-indigo-500/10" : "border-slate-100 bg-slate-50"
                  } ${fieldErrors.country ? "border-rose-100 bg-rose-50" : ""}`}
                >
                  <span className={!selectedCountry ? "text-slate-400" : ""}>
                    {selectedCountry ? selectedCountry.name : "Select Country"}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${openDropdown === "country" ? "rotate-180" : ""}`} />
                </button>
                <InputError message={fieldErrors.country} />

                {openDropdown === "country" && (
                  <div className={`absolute z-50 w-full bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 max-h-72 flex flex-col animate-in fade-in zoom-in duration-200 ${
                    dropdownDirection === "up" ? "bottom-full mb-2" : "top-full mt-2"
                  }`}>
                    <div className="px-3 pb-2 pt-1 border-b border-slate-100 mb-1 sticky top-0 bg-white z-10">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input 
                          ref={searchInputRef}
                          type="text"
                          placeholder="Search country..."
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          autoComplete="off"
                          className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                      {filteredCountries.length === 0 ? (
                        <div className="px-5 py-8 text-center">
                          <p className="text-xs font-bold text-slate-400 italic">No countries found matching "{countrySearch}"</p>
                        </div>
                      ) : (
                        filteredCountries.map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => handleCountrySelect(c as any)}
                            className={`flex items-center w-full px-5 py-3 text-sm font-bold transition-colors text-left ${
                              selectedCountry?.code === c.code ? "bg-indigo-50 text-indigo-600" : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {c.name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                Phone Number
              </label>
              <div className="flex gap-2">
                <div className="w-20 bg-slate-100 border-2 border-slate-100 rounded-2xl flex items-center justify-center text-sm font-black text-slate-500">
                   +{selectedCountry?.phoneCode || "--"}
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  onChange={() => clearFieldError("phone")}
                  className={`flex-1 rounded-2xl border-2 px-4 py-3 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 transition-all sm:text-sm font-medium ${
                    fieldErrors.phone ? "border-rose-100 bg-rose-50 focus:border-rose-500 focus:ring-rose-500/10" : "border-slate-100 bg-slate-50 focus:border-indigo-600 focus:ring-indigo-500/10"
                  }`}
                  placeholder="234 567 890"
                />
              </div>
              <InputError message={fieldErrors.phone} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                  Type
                </label>
                <div className="relative" ref={typeRef}>
                  <input type="hidden" name="businessType" value={selectedBusinessType || ""} />
                  <button
                    type="button"
                    onClick={(e) => toggleDropdown(e, "type")}
                    className={`flex items-center justify-between w-full rounded-2xl border-2 px-4 py-3 text-slate-900 focus:bg-white focus:border-indigo-600 transition-all sm:text-sm font-bold ${
                      fieldErrors.businessType ? "border-rose-100 bg-rose-50" : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    <span className={!selectedBusinessType ? "text-slate-400" : ""}>
                      {selectedBusinessType === "SALON" ? "Salon / Spa" : 
                       selectedBusinessType === "GYM" ? "Gym / Fitness" : 
                       selectedBusinessType === "CLINIC" ? "Healthcare & Wellness" : 
                       "Select Type"}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${openDropdown === "type" ? "rotate-180" : ""}`} />
                  </button>
                  <InputError message={fieldErrors.businessType} />

                  {openDropdown === "type" && (
                    <div className={`absolute z-50 w-full bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 animate-in fade-in zoom-in duration-200 ${
                      dropdownDirection === "up" ? "bottom-full mb-2" : "top-full mt-2"
                    }`}>
                      {[
                        { id: "SALON", label: "Salon & Beauty" },
                        { id: "GYM", label: "Fitness & Gym" },
                        { id: "CLINIC", label: "Medical & Health" },
                      ].map((type) => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => { setSelectedBusinessType(type.id); setOpenDropdown(null); clearFieldError("businessType"); }}
                          className={`flex items-center w-full px-5 py-3 text-sm font-bold transition-colors text-left ${
                            selectedBusinessType === type.id ? "bg-indigo-50 text-indigo-600" : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="slug" className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                  Custom URL
                </label>
                <div className={`flex rounded-2xl shadow-sm overflow-hidden border-2 transition-all ${
                  fieldErrors.slug ? "border-rose-100 bg-rose-50" : "border-slate-100 bg-slate-50"
                }`}>
                  <span className="inline-flex items-center bg-slate-100 px-3 text-slate-500 text-xs font-bold border-r border-slate-100">
                    /b/
                  </span>
                  <input
                    id="slug"
                    name="slug"
                    type="text"
                    required
                    onChange={() => clearFieldError("slug")}
                    className="block w-full min-w-0 flex-1 bg-transparent px-3 py-3 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none transition-all text-xs font-bold"
                    placeholder="my-salon"
                  />
                </div>
                <InputError message={fieldErrors.slug} />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-base shadow-2xl shadow-slate-200 transition-all hover:bg-slate-800 hover:scale-[1.02] active:scale-95 disabled:bg-slate-300 flex items-center justify-center gap-3"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}
