"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { Building, Globe, Shield, Clock, Palette, CreditCard, Lock, Check, Loader2, ChevronDown, Search, Calendar, FileText, Copy } from "lucide-react";
import { BillingSettings } from "@/components/dashboard/billing-settings";
import { BrandingSettings } from "@/components/dashboard/branding-settings";
import { LocationList } from "@/components/dashboard/location-list";
import { Tooltip } from "@/components/ui/tooltip";
import { getLabels } from "@/lib/labels";
import { timezones } from "@/config/timezones";
import { COUNTRIES } from "@/config/countries";
import { updateTenantTimezone, updateTenantCountry, updateTenantTimeFormat, updateTenantWeekStart } from "@/app/actions/dashboard";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";

type TabType = "business" | "billing" | "appearance" | "invoices" | "security";

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
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = () => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "https://fluxbooking.com");
    const fullUrl = `${appUrl}/b/${tenant?.slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast.success("Public booking URL copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };
  
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
  const [weekStart, setWeekStart] = useState(tenant?.weekStart || "sunday");
  const [isUpdatingTimezone, setIsUpdatingTimezone] = useState(false);
  const [isUpdatingCountry, setIsUpdatingCountry] = useState(false);
  const [isUpdatingTimeFormat, setIsUpdatingTimeFormat] = useState(false);
  const [isUpdatingWeekStart, setIsUpdatingWeekStart] = useState(false);
  
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [countrySearch, setCountrySearch] = useState("");
  const [timezoneSearch, setTimezoneSearch] = useState("");

  const countryRef = useRef<HTMLDivElement>(null);
  const timezoneRef = useRef<HTMLDivElement>(null);
  const timeFormatRef = useRef<HTMLDivElement>(null);
  const weekStartRef = useRef<HTMLDivElement>(null);
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
        (timeFormatRef.current && !timeFormatRef.current.contains(event.target as Node)) &&
        (weekStartRef.current && !weekStartRef.current.contains(event.target as Node))
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

  const handleWeekStartChange = async (newWeekStart: string) => {
    setWeekStart(newWeekStart);
    setOpenDropdown(null);
    setIsUpdatingWeekStart(true);
    const result = await updateTenantWeekStart(newWeekStart);
    setIsUpdatingWeekStart(false);

    if (result.success) {
      toast.success("First day of week updated successfully");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update week start");
      setWeekStart(tenant?.weekStart || "sunday");
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
      id: "appearance", 
      label: "Branding", 
      description: "Business visuals",
      icon: Palette
    },
    { 
      id: "billing", 
      label: "Billing", 
      description: "Plans and subscription",
      icon: CreditCard, 
      adminOnly: true 
    },
    { 
      id: "security", 
      label: "Security", 
      description: "Account and safety",
      icon: Shield,
      adminOnly: true
    },
  ].filter(tab => !tab.adminOnly || userRole === "ADMIN") as Tab[];

  const invoices = (() => {
    if (!tenant || tenant.plan === "FREE") return [];
    
    const list = [];
    const planName = tenant.plan === "PRO" ? "Pro Plan" : "Starter Plan";
    const amount = tenant.plan === "PRO" 
      ? (tenant.planInterval === "YEAR" ? 149.90 : 14.99)
      : (tenant.planInterval === "YEAR" ? 69.90 : 6.99);
    
    const intervalStr = tenant.planInterval === "YEAR" ? "Yearly" : "Monthly";
    
    const startDate = new Date(tenant.createdAt || "2026-01-10T10:00:00Z");
    const currentDate = new Date();
    
    let tempDate = new Date(currentDate);
    for (let i = 0; i < 6; i++) {
      if (tempDate < startDate) break;
      
      const invoiceNum = `INV-2026-${(6 - i).toString().padStart(3, "0")}`;
      list.push({
        id: invoiceNum,
        number: invoiceNum,
        date: new Date(tempDate),
        planName,
        interval: intervalStr,
        amount: `$${amount.toFixed(2)}`,
        status: "PAID",
        paymentMethod: "Card ending in 4242",
        description: `FluxBooking ${planName} - ${intervalStr} Subscription`
      });
      
      if (tenant.planInterval === "YEAR") {
        tempDate.setFullYear(tempDate.getFullYear() - 1);
      } else {
        tempDate.setMonth(tempDate.getMonth() - 1);
      }
    }
    return list;
  })();

  const handleDownloadInvoice = (invoice: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked! Please allow popups to download the invoice PDF.");
      return;
    }

    const primaryColor = tenant?.primaryColor || "#6366f1";
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.number}</title>
          <style>
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .no-print {
                display: none !important;
              }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 40px;
              line-height: 1.5;
            }
            .invoice-box {
              max-width: 800px;
              margin: auto;
              background: #fff;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo-text {
              font-size: 24px;
              font-weight: 800;
              color: ${primaryColor};
              letter-spacing: -0.5px;
            }
            .invoice-title {
              font-size: 28px;
              font-weight: 700;
              text-align: right;
              color: #0f172a;
            }
            .details-grid {
              display: grid;
              grid-template-cols: 1fr 1fr;
              gap: 40px;
              margin-bottom: 40px;
            }
            .section-title {
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #64748b;
              margin-bottom: 8px;
            }
            .info-text {
              font-size: 14px;
              color: #334155;
            }
            .info-text strong {
              color: #0f172a;
            }
            .table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 40px;
            }
            .table th {
              background: #f8fafc;
              border-bottom: 2px solid #e2e8f0;
              padding: 12px 16px;
              text-align: left;
              font-size: 11px;
              font-weight: 850;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #475569;
            }
            .table td {
              border-bottom: 1px solid #f1f5f9;
              padding: 16px;
              font-size: 14px;
              color: #334155;
            }
            .table td.right, .table th.right {
              text-align: right;
            }
            .totals-container {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 60px;
            }
            .totals-table {
              width: 250px;
              border-collapse: collapse;
            }
            .totals-table td {
              padding: 8px 12px;
              font-size: 14px;
              color: #475569;
            }
            .totals-table tr.grand-total td {
              font-weight: 700;
              font-size: 16px;
              color: #0f172a;
              border-top: 2px solid #e2e8f0;
              padding-top: 12px;
            }
            .footer {
              text-align: center;
              font-size: 12px;
              color: #94a3b8;
              border-top: 1px solid #f1f5f9;
              padding-top: 20px;
              margin-top: 60px;
            }
            .btn-print {
              background: ${primaryColor};
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="text-align: right; max-width: 800px; margin: auto;">
            <button class="btn-print" onclick="window.print()">Print / Save PDF</button>
          </div>
          <div class="invoice-box">
            <div class="header">
              <div>
                <span class="logo-text">FluxBooking</span>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Automated Booking Platform</div>
              </div>
              <div class="invoice-title">INVOICE</div>
            </div>
            
            <div class="details-grid">
              <div>
                <div class="section-title">Billed From</div>
                <div class="info-text">
                  <strong>FluxBooking Inc.</strong><br/>
                  100 Tech Way, Suite 400<br/>
                  San Francisco, CA 94107<br/>
                  billing@fluxbooking.com
                </div>
              </div>
              <div style="text-align: right;">
                <div class="section-title">Invoice Details</div>
                <div class="info-text">
                  <strong>Invoice Number:</strong> ${invoice.number}<br/>
                  <strong>Date:</strong> ${invoice.date.toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })}<br/>
                  <strong>Status:</strong> <span style="color: #10b981; font-weight: 700;">PAID</span><br/>
                  <strong>Payment Method:</strong> ${invoice.paymentMethod}
                </div>
              </div>
            </div>

            <div class="details-grid" style="margin-bottom: 30px;">
              <div>
                <div class="section-title">Billed To</div>
                <div class="info-text">
                  <strong>${tenant?.name || "Business Owner"}</strong><br/>
                  ${sessionUser?.email || ""}<br/>
                  ${sessionUser?.phone ? `Phone: ${sessionUser.phone}<br/>` : ""}
                  Country: ${tenant?.country || "US"}
                </div>
              </div>
            </div>

            <table class="table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="right">Qty</th>
                  <th class="right">Unit Price</th>
                  <th class="right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${invoice.description}</td>
                  <td class="right">1</td>
                  <td class="right">${invoice.amount}</td>
                  <td class="right">${invoice.amount}</td>
                </tr>
              </tbody>
            </table>

            <div class="totals-container">
              <table class="totals-table">
                <tr>
                  <td>Subtotal</td>
                  <td class="right">${invoice.amount}</td>
                </tr>
                <tr>
                  <td>Tax (0%)</td>
                  <td class="right">$0.00</td>
                </tr>
                <tr class="grand-total">
                  <td>Total Paid</td>
                  <td class="right">${invoice.amount}</td>
                </tr>
              </table>
            </div>

            <div class="footer">
              Thank you for choosing FluxBooking! If you have any questions about this invoice, please reach out to billing@fluxbooking.com.
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

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
                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">Business Name</label>
                    <input
                      type="text"
                      disabled
                      value={tenant?.name}
                      className="block w-full rounded-2xl border-2 border-indigo-100/50 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-slate-900/50 px-5 py-4 text-sm text-slate-700 dark:text-slate-400 font-bold shadow-sm cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">Business Type</label>
                    <input
                      type="text"
                      disabled
                      value={labels.businessTypeName}
                      className="block w-full rounded-2xl border-2 border-indigo-100/50 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-slate-900/50 px-5 py-4 text-sm text-slate-700 dark:text-slate-400 font-bold shadow-sm cursor-not-allowed"
                    />
                  </div>
                </div>


                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">Business Country</label>
                    <div className="relative group" ref={countryRef}>
                      <button
                        type="button"
                        onClick={() => toggleDropdown("country")}
                        disabled={isUpdatingCountry || userRole !== "ADMIN"}
                        className={`flex items-center justify-between w-full rounded-2xl border-2 px-5 py-4 text-sm font-bold transition-all shadow-sm ${
                          userRole !== "ADMIN"
                            ? "border-indigo-100/50 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-slate-900/50 text-slate-700 dark:text-slate-400 cursor-not-allowed"
                            : openDropdown === "country" 
                              ? "border-indigo-600 shadow-lg shadow-indigo-500/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" 
                              : "border-indigo-100/50 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-slate-900 focus:border-indigo-600 hover:border-indigo-200 dark:hover:border-indigo-800"
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
                        {userRole === "ADMIN" && (
                          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${openDropdown === "country" ? "rotate-180" : ""}`} />
                        )}
                      </button>

                      {userRole === "ADMIN" && openDropdown === "country" && (
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
                                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 outline-none transition-all focus:border-indigo-500/40 shadow-sm"
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
                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">Business Timezone</label>
                    <div className="relative group" ref={timezoneRef}>
                      <button
                        type="button"
                        onClick={() => toggleDropdown("timezone")}
                        disabled={isUpdatingTimezone || isUpdatingCountry || userRole !== "ADMIN"}
                        className={`flex items-center justify-between w-full rounded-2xl border-2 px-5 py-4 text-sm font-bold transition-all shadow-sm ${
                          userRole !== "ADMIN"
                            ? "border-indigo-100/50 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-slate-900/50 text-slate-700 dark:text-slate-400 cursor-not-allowed"
                            : openDropdown === "timezone" 
                              ? "border-indigo-600 shadow-lg shadow-indigo-500/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" 
                              : "border-indigo-100/50 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-slate-900 focus:border-indigo-600 hover:border-indigo-200 dark:hover:border-indigo-800"
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
                        {userRole === "ADMIN" && (
                          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${openDropdown === "timezone" ? "rotate-180" : ""}`} />
                        )}
                      </button>

                      {userRole === "ADMIN" && openDropdown === "timezone" && (
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
                                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 outline-none transition-all focus:border-indigo-500/40 shadow-sm"
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
                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">Time Format</label>
                    <div className="relative group" ref={timeFormatRef}>
                      <button
                        type="button"
                        onClick={() => toggleDropdown("format")}
                        disabled={isUpdatingTimeFormat || userRole !== "ADMIN"}
                        className={`flex items-center justify-between w-full rounded-2xl border-2 px-5 py-4 text-sm font-bold transition-all shadow-sm ${
                          userRole !== "ADMIN"
                            ? "border-indigo-100/50 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-slate-900/50 text-slate-700 dark:text-slate-400 cursor-not-allowed"
                            : openDropdown === "format" 
                              ? "border-indigo-600 shadow-lg shadow-indigo-500/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" 
                              : "border-indigo-100/50 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-slate-900 focus:border-indigo-600 hover:border-indigo-200 dark:hover:border-indigo-800"
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
                        {userRole === "ADMIN" && (
                          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${openDropdown === "format" ? "rotate-180" : ""}`} />
                        )}
                      </button>

                      {userRole === "ADMIN" && openDropdown === "format" && (
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

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">First Day of Week</label>
                    <div className="relative group" ref={weekStartRef}>
                      <button
                        type="button"
                        onClick={() => toggleDropdown("weekstart")}
                        disabled={isUpdatingWeekStart || userRole !== "ADMIN"}
                        className={`flex items-center justify-between w-full rounded-2xl border-2 px-5 py-4 text-sm font-bold transition-all shadow-sm ${
                          userRole !== "ADMIN"
                            ? "border-indigo-100/50 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-slate-900/50 text-slate-700 dark:text-slate-400 cursor-not-allowed"
                            : openDropdown === "weekstart"
                              ? "border-indigo-600 shadow-lg shadow-indigo-500/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                              : "border-indigo-100/50 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-slate-900 focus:border-indigo-600 hover:border-indigo-200 dark:hover:border-indigo-800"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isUpdatingWeekStart ? (
                            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                          ) : (
                            <Calendar className="h-4 w-4 text-slate-400" />
                          )}
                          <span>{weekStart === "monday" ? "Monday" : "Sunday"}</span>
                        </div>
                        {userRole === "ADMIN" && (
                          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${openDropdown === "weekstart" ? "rotate-180" : ""}`} />
                        )}
                      </button>

                      {userRole === "ADMIN" && openDropdown === "weekstart" && (
                        <div className="absolute z-50 w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-slate-100 dark:border-slate-800 py-2 mt-2 flex flex-col animate-in fade-in zoom-in duration-200">
                          <button
                            type="button"
                            onClick={() => handleWeekStartChange("sunday")}
                            className={`flex items-center justify-between w-full px-5 py-3 text-sm font-bold transition-colors text-left ${
                              weekStart === "sunday" ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                            }`}
                          >
                            <span>Sunday</span>
                            {weekStart === "sunday" && <Check className="h-4 w-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleWeekStartChange("monday")}
                            className={`flex items-center justify-between w-full px-5 py-3 text-sm font-bold transition-colors text-left ${
                              weekStart === "monday" ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                            }`}
                          >
                            <span>Monday</span>
                            {weekStart === "monday" && <Check className="h-4 w-4" />}
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 font-medium ml-1 flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" /> Sets the first day shown on your calendar and date picker.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">Public URL Slug</label>
                  <div className="flex rounded-2xl shadow-sm overflow-hidden border-2 border-indigo-100/50 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-slate-900/50 items-center pr-2">
                    <span className="inline-flex items-center bg-slate-100 dark:bg-slate-950/60 px-5 py-4 text-slate-500 dark:text-slate-500 text-xs font-bold border-r-2 border-slate-100 dark:border-slate-800 self-stretch">
                      {process.env.NEXT_PUBLIC_APP_URL || 'fluxbooking.com'}/b/
                    </span>
                    <input
                      type="text"
                      disabled
                      value={tenant?.slug}
                      className="block w-full min-w-0 flex-1 border-none bg-transparent px-5 py-4 text-sm text-slate-700 dark:text-slate-400 font-black cursor-not-allowed focus:outline-none focus:ring-0"
                    />
                    <Tooltip content="Copy" position="bottom" delay={100}>
                      <button
                        type="button"
                        onClick={handleCopyUrl}
                        className="p-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer mr-1"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-emerald-500 animate-fade-in" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </Tooltip>
                  </div>
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 font-medium ml-1 flex items-center gap-1.5">
                    <Globe className="h-3 w-3" /> Your unique identifier used for your public booking page.
                  </p>
                </div>
              </div>
            </div>

            <LocationList 
              locations={tenant?.locations || []} 
              isPro={tenant?.plan === "PRO"} 
              businessType={tenant?.businessType}
              userRole={userRole}
            />
          </div>
        );
      case "billing":
        return (
          <div className="animate-fade-in max-w-5xl">
            {userRole === "ADMIN" && (
              <BillingSettings 
                currentPlan={tenant?.plan || "FREE"} 
                planInterval={tenant?.planInterval || "MONTH"} 
                planStatus={tenant?.planStatus}
                subscriptionId={tenant?.lemonSqueezySubscriptionId}
                subscriptionEndsAt={tenant?.subscriptionEndsAt}
                trialEndsAt={tenant?.trialEndsAt}
                invoices={invoices}
                onViewInvoice={setSelectedInvoice}
                onDownloadInvoice={handleDownloadInvoice}
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
                  <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">Admin Email</label>
                  <input
                    type="text"
                    disabled
                    value={sessionUser?.email || ""}
                    className="block w-full rounded-2xl border-2 border-indigo-100/50 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-slate-900/50 px-5 py-4 text-sm text-slate-700 dark:text-slate-400 font-black shadow-sm cursor-not-allowed"
                  />
                </div>
                <button 
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-profile-modal", { detail: { mode: "security" } }))}
                  className="text-sm font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-2 group transition-all"
                >
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
                <p className="text-rose-700 dark:text-rose-400/80 text-sm mb-8 leading-relaxed">Warning: Deleting your business will remove all data, including bookings and staff lists. This action is irreversible.</p>
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
    <div className="flex-1 flex flex-col space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div>
          <h2 className="text-xl font-medium text-slate-900 dark:text-slate-200 tracking-tight">Settings</h2>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex-shrink-0 px-2">
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
                <div className="text-xs font-semibold leading-none mb-0.5">{tab.label}</div>
                <div className={`text-xs font-medium whitespace-nowrap hidden sm:block ${activeTab === tab.id ? "text-indigo-400 dark:text-indigo-300/60" : "text-slate-600 dark:text-slate-400"}`}>
                  {tab.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-2">
        {renderTabContent()}
      </div>

      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-905 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 relative flex flex-col space-y-6">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Invoice Details</h3>
              </div>
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 text-sm font-black p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>

            {/* Invoice Info */}
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Billed From</span>
                <span className="block font-bold text-slate-850 dark:text-slate-200 mt-1">FluxBooking Inc.</span>
                <span className="block text-xs text-slate-550 dark:text-slate-450 mt-0.5">100 Tech Way, Suite 400<br/>San Francisco, CA 94107</span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Billed To</span>
                <span className="block font-bold text-slate-850 dark:text-slate-200 mt-1">{tenant?.name}</span>
                <span className="block text-xs text-slate-550 dark:text-slate-450 mt-0.5">{sessionUser?.email}</span>
                {sessionUser?.phone && (
                  <span className="block text-xs text-slate-550 dark:text-slate-455 mt-0.5">Phone: {sessionUser.phone}</span>
                )}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="block text-slate-400 font-medium">Invoice Number</span>
                <span className="block font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedInvoice.number}</span>
              </div>
              <div>
                <span className="block text-slate-400 font-medium">Billing Date</span>
                <span className="block font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedInvoice.date.toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div>
                <span className="block text-slate-400 font-medium">Payment Method</span>
                <span className="block font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedInvoice.paymentMethod}</span>
              </div>
              <div>
                <span className="block text-slate-400 font-medium">Status</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-650 dark:text-emerald-400 mt-0.5">
                  Paid
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4 font-black text-slate-505 uppercase tracking-wider">Description</th>
                    <th className="p-4 font-black text-slate-505 uppercase tracking-wider text-right">Qty</th>
                    <th className="p-4 font-black text-slate-505 uppercase tracking-wider text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <td className="p-4 text-slate-700 dark:text-slate-300 font-bold">{selectedInvoice.description}</td>
                    <td className="p-4 text-slate-700 dark:text-slate-300 text-right font-bold">1</td>
                    <td className="p-4 text-slate-700 dark:text-slate-300 text-right font-black">{selectedInvoice.amount}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end text-sm">
              <div className="w-48 space-y-1.5">
                <div className="flex justify-between text-slate-505 text-xs">
                  <span>Subtotal</span>
                  <span className="font-bold">{selectedInvoice.amount}</span>
                </div>
                <div className="flex justify-between text-slate-505 text-xs">
                  <span>Tax (0%)</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between text-slate-900 dark:text-white font-bold pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span>Total Paid</span>
                  <span>{selectedInvoice.amount}</span>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => handleDownloadInvoice(selectedInvoice)}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md cursor-pointer"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
