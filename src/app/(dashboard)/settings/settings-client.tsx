"use client";

import { useState, useEffect, useTransition } from "react";
import { Building, Globe, Shield, Clock, Palette, CreditCard, Lock, Check, Loader2 } from "lucide-react";
import { BillingSettings } from "@/components/dashboard/billing-settings";
import { BrandingSettings } from "@/components/dashboard/branding-settings";
import { LocationList } from "@/components/dashboard/location-list";
import { getLabels } from "@/lib/labels";
import { timezones } from "@/config/timezones";
import { COUNTRIES } from "@/config/countries";
import { updateTenantTimezone, updateTenantCountry } from "@/app/actions/dashboard";
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
  const [isUpdatingTimezone, setIsUpdatingTimezone] = useState(false);
  const [isUpdatingCountry, setIsUpdatingCountry] = useState(false);
  const labels = getLabels(tenant?.businessType);

  const handleTimezoneChange = async (newTimezone: string) => {
    setTimezone(newTimezone);
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
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
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
                      className="block w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-4 text-sm text-slate-700 dark:text-slate-400 font-bold shadow-sm cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest ml-1 mb-2">Business Type</label>
                    <input
                      type="text"
                      disabled
                      value={labels.businessTypeName}
                      className="block w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-4 text-sm text-slate-700 dark:text-slate-400 font-bold shadow-sm cursor-not-allowed"
                    />
                  </div>
                </div>

                {userRole === "ADMIN" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-2">Business Country</label>
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                          {isUpdatingCountry ? (
                            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                          ) : (
                            <Globe className="h-4 w-4" />
                          )}
                        </div>
                        <select
                          value={country}
                          onChange={(e) => handleCountryChange(e.target.value)}
                          disabled={isUpdatingCountry}
                          className="block w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-12 pr-10 py-4 text-sm text-slate-900 dark:text-white font-bold appearance-none transition-all hover:bg-slate-50 dark:hover:bg-slate-800 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/5 focus:outline-none disabled:bg-slate-50 dark:disabled:bg-slate-950/40 disabled:border-slate-200 dark:disabled:border-slate-800 shadow-sm"
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <Check className={`h-4 w-4 text-emerald-500 transition-all ${isUpdatingCountry ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`} />
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 font-medium ml-1 flex items-center gap-1.5">
                        <Globe className="h-3 w-3" /> Syncs your currency and primary timezone automatically.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-2">Business Timezone</label>
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                          {isUpdatingTimezone ? (
                            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                          ) : (
                            <Clock className="h-4 w-4" />
                          )}
                        </div>
                        <select
                          value={timezone}
                          onChange={(e) => handleTimezoneChange(e.target.value)}
                          disabled={isUpdatingTimezone || isUpdatingCountry}
                          className="block w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-12 pr-10 py-4 text-sm text-slate-900 dark:text-white font-bold appearance-none transition-all hover:bg-slate-50 dark:hover:bg-slate-800 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/5 focus:outline-none disabled:bg-slate-50/50 dark:disabled:bg-slate-900/50 disabled:border-slate-300 dark:disabled:border-slate-700 shadow-sm"
                        >
                          {timezones.map((tz) => (
                            <option key={tz.value} value={tz.value}>
                              {tz.label}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <Check className={`h-4 w-4 text-emerald-500 transition-all ${isUpdatingTimezone ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`} />
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 font-medium ml-1 flex items-center gap-1.5">
                        <Clock className="h-3 w-3" /> Controls the "Current Time" line on your calendar.
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest ml-1 mb-2">Public URL Slug</label>
                  <div className="flex rounded-2xl shadow-sm overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                    <span className="inline-flex items-center bg-slate-100 dark:bg-slate-950/60 px-5 text-slate-500 dark:text-slate-500 text-xs font-bold border-r border-slate-200 dark:border-slate-800">
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
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
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
                    className="block w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-4 text-sm text-slate-700 dark:text-slate-400 font-black shadow-sm cursor-not-allowed"
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
        <div className="flex flex-wrap items-center bg-slate-50 dark:bg-slate-800 p-1.5 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm self-start inline-flex">
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
