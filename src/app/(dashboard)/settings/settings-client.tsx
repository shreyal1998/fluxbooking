"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { Building, Globe, Shield, Clock, Palette, CreditCard, Lock, Check, Loader2, ChevronDown, Search } from "lucide-react";
import { BillingSettings } from "@/components/dashboard/billing-settings";
import { BrandingSettings } from "@/components/dashboard/branding-settings";
import { LocationList } from "@/components/dashboard/location-list";
import { getLabels } from "@/lib/labels";
import { timezones } from "@/config/timezones";
import { COUNTRIES } from "@/config/countries";
import { updateTenantTimezone, updateTenantCountry, updateTenantTimeFormat } from "@/app/actions/dashboard";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";

type TabType = "business" | "billing" | "appearance" | "security";

interface Tab {
  id: TabType;
  label: string;
  description: string;
  icon: any;
  adminOnly?: boolean;
}

export function SettingsClient({ 
  tenant, 
  userRole, 
  sessionUser 
}: { 
  tenant: any, 
  userRole: string, 
  sessionUser: any 
}) {
  const router = useRouter();
  const params = useParams();
  const tabParam = params.tab as TabType;
  const [isPending, startTransition] = useTransition();
  
  const [activeTab, setActiveTab] = useState<TabType>(
    (tabParam && ["business", "billing", "appearance", "security"].includes(tabParam)) 
      ? tabParam 
      : "business"
  );

  // Sync tab with URL parameter
  useEffect(() => {
    if (tabParam && ["business", "billing", "appearance", "security"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    startTransition(() => {
      router.push(`/settings/${tabId}`);
    });
  };
  
  // Intelligent initialization: if timezone is UTC but country has a specific timezone, use it.
  const initialCountry = tenant?.country || "US";
  const countryData = COUNTRIES.find(c => c.code === initialCountry);
  const initialTimezone = (tenant?.timezone === "UTC" && countryData?.timezone) 
    ? countryData.timezone 
    : (tenant?.timezone || "UTC");

  const [timezone, setTimezone] = useState(initialTimezone);
  const [country, setCountry] = useState(initialCountry);
  const [timeFormat, setTimeFormat] = useState(tenant?.timeFormat || "12h");
  const [isUpdatingTimezone, setIsUpdatingTimezone] = useState(false);
  const [isUpdatingCountry, setIsUpdatingCountry] = useState(false);
  const [isUpdatingTimeFormat, setIsUpdatingTimeFormat] = useState(false);
  
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [countrySearch, setCountrySearch] = useState("");
  const [timezoneSearch, setTimezoneSearch] = useState("");

  const countryRef = useRef<HTMLDivElement>(null);
  const timezoneRef = useRef<HTMLDivElement>(null);
  const timeFormatRef = useRef<HTMLDivElement>(null);
  const countrySearchRef = useRef<HTMLInputElement>(null);
  const timezoneSearchRef = useRef<HTMLInputElement>(null);

  const labels = getLabels(tenant?.businessType);

  const toggleDropdown = (dropdown: string | null) => {
    if (openDropdown === dropdown || dropdown === null) {
      setOpenDropdown(null);
    } else {
      setOpenDropdown(dropdown);
    }
    // Always clear search when toggling or closing
    setCountrySearch("");
    setTimezoneSearch("");
  };

  // Focus search input when dropdown opens
  useEffect(() => {
    if (openDropdown === "country") {
      setTimeout(() => countrySearchRef.current?.focus(), 100);
    } else if (openDropdown === "timezone") {
      setTimeout(() => timezoneSearchRef.current?.focus(), 100);
    }
  }, [openDropdown]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        (countryRef.current && !countryRef.current.contains(event.target as Node)) &&
        (timezoneRef.current && !timezoneRef.current.contains(event.target as Node)) &&
        (timeFormatRef.current && !timeFormatRef.current.contains(event.target as Node))
      ) {
        if (openDropdown) toggleDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]); // Add openDropdown to dependencies to ensure toggleDropdown has correct state

  const handleTimezoneChange = async (newTimezone: string) => {
    setTimezone(newTimezone);
    toggleDropdown(null);
    setIsUpdatingTimezone(true);
    const result = await updateTenantTimezone(newTimezone);
    setIsUpdatingTimezone(false);
    
    if (result.success) {
      toast.success("Timezone updated successfully");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update timezone");
      setTimezone(tenant?.timezone || "UTC");
    }
  };

  const handleCountryChange = async (newCountryCode: string) => {
    const selectedCountry = COUNTRIES.find(c => c.code === newCountryCode);
    if (!selectedCountry) return;

    setCountry(newCountryCode);
    setOpenDropdown(null);
    setIsUpdatingCountry(true);
    
    const result = await updateTenantCountry(
      newCountryCode, 
      selectedCountry.currency
    );
    
    setIsUpdatingCountry(false);
    
    if (result.success) {
      toast.success(`Business location updated to ${selectedCountry.name}. Currency synced!`);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update country");
      setCountry(tenant?.country || "US");
    }
  };

  const handleTimeFormatChange = async (newFormat: string) => {
    setTimeFormat(newFormat);
    setOpenDropdown(null);
    setIsUpdatingTimeFormat(true);
    const result = await updateTenantTimeFormat(newFormat);
    setIsUpdatingTimeFormat(false);
    
    if (result.success) {
      toast.success("Time format updated successfully");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update time format");
      setTimeFormat(tenant?.timeFormat || "12h");
    }
  };

  const filteredCountries = COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const filteredTimezones = timezones.filter(tz => 
    tz.label.toLowerCase().includes(timezoneSearch.toLowerCase())
  );

  const tabs: Tab[] = [
    { 
      id: "business", 
      label: "Business", 
      description: "Profile and locations",
      icon: Building 
    },
    { 
      id: "billing", 
      label: "Billing", 
      description: "Plans and subscription",
      icon: CreditCard, 
      adminOnly: true 
    },
    { 
      id: "appearance", 
      label: "Branding", 
      description: "Business visuals",
      icon: Palette,
      adminOnly: true
    },
    { 
      id: "security", 
      label: "Security", 
      description: "Account and safety",
      icon: Shield 
    },
  ].filter(tab => !tab.adminOnly || userRole === "ADMIN") as Tab[];

  const renderTabContent = () => {
    switch (activeTab) {
      case "business":
        return (
          <div className="space-y-10 animate-fade-in max-w-5xl">
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-white dark:bg-slate-950/50">
                <Building className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white">Business Profile</h3>
                </div>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest ml-1 mb-2">Business Name</label>
                    <input
                      type="text"
                      disabled
                      value={tenant?.name}
                      className="block w-full rounded-2xl border-2 border-indigo-100/50 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-slate-900/50 px-5 py-4 text-sm text-slate-700 dark:text-slate-400 font-bold shadow-sm cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest ml-1 mb-2">Business Type</label>
                    <input
                      type="text"
                      disabled
                      value={labels.businessTypeName}
                      className="block w-full rounded-2xl border-2 border-indigo-100/50 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-slate-900/50 px-5 py-4 text-sm text-slate-700 dark:text-slate-400 font-bold shadow-sm cursor-not-allowed"
                    />
                  </div>
                </div>

                {userRole === "ADMIN" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-2">Business Country</label>
                        <div className="relative group" ref={countryRef}>
                          <button
                            type="button"
                            onClick={() => toggleDropdown("country")}
                            disabled={isUpdatingCountry}
                            className={`flex items-center justify-between w-full rounded-2xl border-2 px-5 py-4 text-sm font-bold transition-all shadow-sm ${
                              openDropdown === "country" 
                                ? "border-indigo-600 shadow-lg shadow-indigo-500/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" 
                                : "border-indigo-100/50 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-slate-900 focus:border-indigo-600 focus:ring-indigo-500/10 hover:border-indigo-200 dark:hover:border-indigo-800"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {isUpdatingCountry ? (
                                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                              ) : (
                                <Globe className="h-4 w-4 text-slate-400" />
                              )}
                              <span>{COUNTRIES.find(c => c.code === country)?.name || "Select Country"}</span>
                            </div>
                            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${openDropdown === "country" ? "rotate-180" : ""}`} />
                          </button>

                          {openDropdown === "country" && (
                            <div className="absolute z-50 w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-slate-100 dark:border-slate-800 py-2 mt-2 max-h-72 flex flex-col animate-in fade-in zoom-in duration-200">
                              <div className="px-3 pb-2 pt-1 border-b-2 border-slate-100 dark:border-slate-800 mb-1 sticky top-0 bg-white dark:bg-slate-900 z-10">
                                <div className="relative group">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                  <input 
                                    ref={countrySearchRef}
                                    type="text"
                                    placeholder="Search country..."
                                    value={countrySearch}
                                    onChange={(e) => setCountrySearch(e.target.value)}
                                    autoComplete="off"
                                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all focus:border-indigo-500/40 shadow-sm"
                                  />
                                </div>
                              </div>
                              <div className="overflow-y-auto flex-1 custom-scrollbar">
                                {filteredCountries.length === 0 ? (
                                  <div className="px-5 py-8 text-center">
                                    <p className="text-xs font-bold text-slate-400 italic">No countries found</p>
                                  </div>
                                ) : (
                                  filteredCountries.map((c) => (
                                    <button
                                      key={c.code}
                                      type="button"
                                      onClick={() => handleCountryChange(c.code)}
                                      className={`flex items-center justify-between w-full px-5 py-3 text-sm font-bold transition-colors text-left ${
                                        country === c.code ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                      }`}
                                    >
                                      {c.name}
                                      {country === c.code && <Check className="h-4 w-4" />}
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 font-medium ml-1 flex items-center gap-1.5">
                          <Globe className="h-3 w-3" /> Syncs your currency and primary timezone automatically.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-2">Business Timezone</label>
                        <div className="relative group" ref={timezoneRef}>
                          <button
                            type="button"
                            onClick={() => toggleDropdown("timezone")}
                            disabled={isUpdatingTimezone || isUpdatingCountry}
                            className={`flex items-center justify-between w-full rounded-2xl border-2 px-5 py-4 text-sm font-bold transition-all shadow-sm ${
                              openDropdown === "timezone" 
                                ? "border-indigo-600 shadow-lg shadow-indigo-500/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" 
                                : "border-indigo-100/50 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-slate-900 focus:border-indigo-600 focus:ring-indigo-500/10 hover:border-indigo-200 dark:hover:border-indigo-800"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {isUpdatingTimezone ? (
                                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                              ) : (
                                <Clock className="h-4 w-4 text-slate-400" />
                              )}
                              <span className="truncate max-w-[200px] md:max-w-[250px]">{timezones.find(tz => tz.value === timezone)?.label || "Select Timezone"}</span>
                            </div>
                            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${openDropdown === "timezone" ? "rotate-180" : ""}`} />
                          </button>

                          {openDropdown === "timezone" && (
                            <div className="absolute z-50 w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-slate-100 dark:border-slate-800 py-2 mt-2 max-h-72 flex flex-col animate-in fade-in zoom-in duration-200">
                              <div className="px-3 pb-2 pt-1 border-b-2 border-slate-100 dark:border-slate-800 mb-1 sticky top-0 bg-white dark:bg-slate-900 z-10">
                                <div className="relative group">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                  <input 
                                    ref={timezoneSearchRef}
                                    type="text"
                                    placeholder="Search timezone..."
                                    value={timezoneSearch}
                                    onChange={(e) => setTimezoneSearch(e.target.value)}
                                    autoComplete="off"
                                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all focus:border-indigo-500/40 shadow-sm"
                                  />
                                </div>
                              </div>
                              <div className="overflow-y-auto flex-1 custom-scrollbar">
                                {filteredTimezones.length === 0 ? (
                                  <div className="px-5 py-8 text-center">
                                    <p className="text-xs font-bold text-slate-400 italic">No timezones found</p>
                                  </div>
                                ) : (
                                  filteredTimezones.map((tz) => (
                                    <button
                                      key={tz.value}
                                      type="button"
                                      onClick={() => handleTimezoneChange(tz.value)}
                                      className={`flex items-center justify-between w-full px-5 py-3 text-sm font-bold transition-colors text-left ${
                                        timezone === tz.value ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                      }`}
                                    >
                                      <span className="truncate">{tz.label}</span>
                                      {timezone === tz.value && <Check className="h-4 w-4" />}
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 font-medium ml-1 flex items-center gap-1.5">
                          <Clock className="h-3 w-3" /> Controls the "Current Time" line on your calendar.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-2">Time Format</label>
                        <div className="relative group" ref={timeFormatRef}>
                          <button
                            type="button"
                            onClick={() => toggleDropdown("format")}
                            disabled={isUpdatingTimeFormat}
                            className={`flex items-center justify-between w-full rounded-2xl border-2 px-5 py-4 text-sm font-bold transition-all shadow-sm ${
                              openDropdown === "format" 
                                ? "border-indigo-600 shadow-lg shadow-indigo-500/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" 
                                : "border-indigo-100/50 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-slate-900 focus:border-indigo-600 focus:ring-indigo-500/10 hover:border-indigo-200 dark:hover:border-indigo-800"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {isUpdatingTimeFormat ? (
                                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                              ) : (
                                <Clock className="h-4 w-4 text-slate-400" />
                              )}
                              <span>{timeFormat === "12h" ? "12-hour (e.g. 2:00 PM)" : "24-hour (e.g. 14:00)"}</span>
                            </div>
                            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${openDropdown === "format" ? "rotate-180" : ""}`} />
                          </button>

                          {openDropdown === "format" && (
                            <div className="absolute z-50 w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-slate-100 dark:border-slate-800 py-2 mt-2 flex flex-col animate-in fade-in zoom-in duration-200">
                              <button
                                type="button"
                                onClick={() => handleTimeFormatChange("12h")}
                                className={`flex items-center justify-between w-full px-5 py-3 text-sm font-bold transition-colors text-left ${
                                  timeFormat === "12h" ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                }`}
                              >
                                <span>12-hour (e.g. 2:00 PM)</span>
                                {timeFormat === "12h" && <Check className="h-4 w-4" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleTimeFormatChange("24h")}
                                className={`flex items-center justify-between w-full px-5 py-3 text-sm font-bold transition-colors text-left ${
                                  timeFormat === "24h" ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                }`}
                              >
                                <span>24-hour (e.g. 14:00)</span>
                                {timeFormat === "24h" && <Check className="h-4 w-4" />}
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 font-medium ml-1 flex items-center gap-1.5">
                          <Clock className="h-3 w-3" /> Changes how time is displayed across your dashboard and booking page.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest ml-1 mb-2">Public URL Slug</label>
                  <div className="flex rounded-2xl shadow-sm overflow-hidden border-2 border-indigo-100/50 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-slate-900/50">
                    <span className="inline-flex items-center bg-slate-100 dark:bg-slate-950/60 px-5 text-slate-500 dark:text-slate-500 text-xs font-bold border-r-2 border-slate-100 dark:border-slate-800">
                      {process.env.NEXT_PUBLIC_APP_URL || 'fluxbooking.com'}/b/
                    </span>
                    <input
                      type="text"
                      disabled
                      value={tenant?.slug}
                      className="block w-full min-w-0 flex-1 border-none bg-transparent px-5 py-4 text-sm text-slate-700 dark:text-slate-400 font-black cursor-not-allowed"
                    />
                  </div>
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 font-medium ml-1 flex items-center gap-1.5">
                    <Globe className="h-3 w-3" /> Your unique identifier used for your public booking page.
                  </p>
                </div>
              </div>
            </div>

            {userRole === "ADMIN" && (
              <LocationList 
                locations={tenant?.locations || []} 
                isPro={tenant?.plan === "PRO"} 
                businessType={tenant?.businessType}
              />
            )}
          </div>
        );
      case "billing":
        return (
          <div className="animate-fade-in max-w-5xl">
            {userRole === "ADMIN" && (
              <BillingSettings 
                currentPlan={tenant?.plan || "FREE"} 
                planInterval={tenant?.planInterval || "MONTH"} 
              />
            )}
          </div>
        );
      case "appearance":
        return (
          <div className="space-y-10 animate-fade-in max-w-5xl">
            {userRole === "ADMIN" && (
              <BrandingSettings 
                initialColor={tenant?.primaryColor || "#6366f1"} 
                initialLogo={tenant?.logoUrl || null} 
              />
            )}
          </div>
        );
      case "security":
        return (
          <div className="space-y-10 animate-fade-in max-w-5xl">
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-8 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-white dark:bg-slate-950/50">
                <Shield className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white">Account Security</h3>
                  <p className="text-sm font-normal text-slate-500 dark:text-slate-400">Protect your administrator access.</p>
                </div>
              </div>
              <div className="p-8 space-y-8">
                <div>
                  <label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest ml-1 mb-2">Admin Email</label>
                  <input
                    type="text"
                    disabled
                    value={sessionUser?.email || ""}
                    className="block w-full rounded-2xl border-2 border-indigo-100/50 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-slate-900/50 px-5 py-4 text-sm text-slate-700 dark:text-slate-400 font-black shadow-sm cursor-not-allowed"
                  />
                </div>
                <button className="text-sm font-black text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 uppercase tracking-widest flex items-center gap-2 group transition-all">
                  Change Password
                  <span className="h-1 w-0 group-hover:w-8 bg-indigo-600 dark:bg-indigo-400 transition-all duration-300"></span>
                </button>
              </div>
            </div>

            {userRole === "ADMIN" && (
              <div className="bg-rose-50 dark:bg-rose-900/10 p-8 rounded-[2.5rem] border border-rose-200 dark:border-rose-900/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-8 rounded-xl bg-rose-600 text-white flex items-center justify-center">
                    <Lock className="h-4 w-4" />
                  </div>
                  <h4 className="text-rose-900 dark:text-rose-400 font-black uppercase tracking-tight">Danger Zone</h4>
                </div>
                <p className="text-rose-700 dark:text-rose-400/80 text-sm mb-8 leading-relaxed">Warning: Deleting your business will remove all data, including appointments and staff lists. This action is irreversible.</p>
                <button className="bg-rose-600 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-200 dark:shadow-none">
                  Delete Business
                </button>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 px-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Settings</h2>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex-shrink-0 mb-10 px-4">
        <div className="flex flex-wrap items-center bg-slate-50 dark:bg-slate-800 p-1.5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm self-start inline-flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-3 px-6 py-3 rounded-[1.5rem] transition-all relative ${
                activeTab === tab.id
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm"
                  : "text-black dark:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50"
              }`}
            >
              <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? "text-indigo-600 dark:text-indigo-400" : "text-slate-600 dark:text-slate-400"}`} />
              <div className="text-left">
                <div className="text-xs font-medium uppercase leading-none mb-0.5">{tab.label}</div>
                <div className={`text-xs font-medium whitespace-nowrap hidden sm:block ${activeTab === tab.id ? "text-indigo-400 dark:text-indigo-300/60" : "text-slate-600 dark:text-slate-400"}`}>
                  {tab.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4">
        {renderTabContent()}
      </div>
    </div>
  );
}
