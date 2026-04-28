"use client";

import { useState } from "react";
import { 
  Building, 
  Globe, 
  Shield, 
  Clock, 
  Palette, 
  CreditCard,
  Lock
} from "lucide-react";
import { AvailabilityEditor } from "@/components/dashboard/availability-editor";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { BillingSettings } from "@/components/dashboard/billing-settings";
import { BrandingSettings } from "@/components/dashboard/branding-settings";
import { LocationList } from "@/components/dashboard/location-list";

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
  const [activeTab, setActiveTab] = useState<TabType>("business");

  const tabs: Tab[] = [
    { 
      id: "business", 
      label: "Business", 
      description: "Profile, hours and locations",
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
      label: "Appearance", 
      description: "Branding and theme",
      icon: Palette 
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
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-soft overflow-hidden">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                <Building className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Business Profile</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Core information about your venue.</p>
                </div>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Business Name</label>
                    <input
                      type="text"
                      disabled
                      value={tenant?.name}
                      className="block w-full rounded-2xl border-none bg-slate-50 dark:bg-slate-800 px-5 py-4 text-sm text-slate-500 dark:text-slate-300 font-medium opacity-70"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Business Type</label>
                    <input
                      type="text"
                      disabled
                      value={tenant?.businessType}
                      className="block w-full rounded-2xl border-none bg-slate-50 dark:bg-slate-800 px-5 py-4 text-sm text-slate-500 dark:text-slate-300 font-medium opacity-70"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Public URL Slug</label>
                  <div className="flex rounded-2xl shadow-sm overflow-hidden">
                    <span className="inline-flex items-center bg-slate-100 dark:bg-slate-950 px-5 text-slate-500 dark:text-slate-400 text-xs font-bold border-r border-slate-200 dark:border-slate-800">
                      {process.env.NEXT_PUBLIC_APP_URL || 'fluxbooking.com'}/b/
                    </span>
                    <input
                      type="text"
                      disabled
                      value={tenant?.slug}
                      className="block w-full min-w-0 flex-1 border-none bg-slate-50 dark:bg-slate-800 px-5 py-4 text-sm text-slate-500 dark:text-slate-300 font-bold opacity-70"
                    />
                  </div>
                  <p className="mt-3 text-[10px] text-slate-400 font-medium ml-1 flex items-center gap-1.5">
                    <Globe className="h-3 w-3" /> Your unique identifier used for your public booking page.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-soft overflow-hidden">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                <Clock className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Business Hours</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Master availability for your venue.</p>
                </div>
              </div>
              <div className="p-8">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">Define the general opening and closing hours for your venue. These act as the master constraints for all bookings.</p>
                <AvailabilityEditor 
                  initialAvailability={tenant?.businessHoursJson || {
                    monday: { start: "09:00", end: "17:00" },
                    tuesday: { start: "09:00", end: "17:00" },
                    wednesday: { start: "09:00", end: "17:00" },
                    thursday: { start: "09:00", end: "17:00" },
                    friday: { start: "09:00", end: "17:00" },
                  }} 
                  isBusiness={true} 
                />
              </div>
            </div>

            {userRole === "ADMIN" && (
              <LocationList 
                locations={tenant?.locations || []} 
                isPro={tenant?.plan === "PRO"} 
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

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-soft overflow-hidden">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                <Palette className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Appearance</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Customize your workspace look.</p>
                </div>
              </div>
              <div className="p-8">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">Customize how FluxBooking looks on your device.</p>
                <ThemeToggle />
              </div>
            </div>
          </div>
        );
      case "security":
        return (
          <div className="space-y-10 animate-fade-in max-w-5xl">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-soft overflow-hidden">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                <Shield className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Account Security</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Protect your administrator access.</p>
                </div>
              </div>
              <div className="p-8 space-y-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Admin Email</label>
                  <input
                    type="text"
                    disabled
                    value={sessionUser?.email || ""}
                    className="block w-full rounded-2xl border-none bg-slate-50 dark:bg-slate-800 px-5 py-4 text-sm text-slate-500 dark:text-slate-300 font-bold opacity-70"
                  />
                </div>
                <button className="text-sm font-black text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 uppercase tracking-widest flex items-center gap-2 group transition-all">
                  Change Password
                  <span className="h-1 w-0 group-hover:w-8 bg-indigo-600 dark:bg-indigo-400 transition-all duration-300"></span>
                </button>
              </div>
            </div>

            {userRole === "ADMIN" && (
              <div className="bg-rose-50 dark:bg-rose-900/10 p-8 rounded-[2rem] border border-rose-100 dark:border-rose-900/30">
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
    <div className="flex-1 flex flex-col min-h-0">
      {/* Tabs Navigation */}
      <div className="flex-shrink-0 mb-10">
        <div className="flex flex-wrap items-center bg-slate-50 dark:bg-slate-800 p-1.5 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm self-start inline-flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-6 py-3 rounded-[1.5rem] transition-all relative ${
                activeTab === tab.id
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              }`}
            >
              <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? "text-indigo-600 dark:text-indigo-400" : ""}`} />
              <div className="text-left">
                <div className="text-[10px] font-black uppercase tracking-widest leading-none mb-0.5">{tab.label}</div>
                <div className={`text-[9px] font-medium whitespace-nowrap hidden sm:block ${activeTab === tab.id ? "text-indigo-400 dark:text-indigo-300/60" : "text-slate-400"}`}>
                  {tab.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 -mr-2 scrollbar-hide">
        {renderTabContent()}
      </div>
    </div>
  );
}
