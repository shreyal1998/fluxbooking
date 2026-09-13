"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { Building, Globe, Shield, Clock, Palette, CreditCard, Lock, Check, Loader2, ChevronDown, Search, Calendar, FileText, Copy, X, AlertCircle } from "lucide-react";
import { BillingSettings } from "@/components/dashboard/billing-settings";
import { BrandingSettings } from "@/components/dashboard/branding-settings";
import { LocationList } from "@/components/dashboard/location-list";
import { Tooltip } from "@/components/ui/tooltip";
import { getLabels } from "@/lib/labels";
import { timezones } from "@/config/timezones";
import { COUNTRIES } from "@/config/countries";
import { updateTenantTimezone, updateTenantCountry, updateTenantTimeFormat, updateTenantWeekStart, deleteBusiness } from "@/app/actions/dashboard";
import { syncLemonSqueezySubscription } from "@/app/actions/lemonsqueezy";
import { toast } from "sonner";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { Portal } from "@/components/ui/portal";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";

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
  sessionUser,
  initialInvoices = []
}: { 
  tenant: any, 
  userRole: string, 
  sessionUser: any,
  initialInvoices?: any[]
}) {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const tabParam = params.tab as TabType;
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [confirmDeleteBusiness, setConfirmDeleteBusiness] = useState(false);
  const [deleteBusinessLoading, setDeleteBusinessLoading] = useState(false);

  // Handle successful checkout return and sync subscription
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      syncLemonSqueezySubscription().then((res) => {
        if (res.success) {
          toast.success(`Subscription upgraded! Active plan: ${res.plan}`);
        } else {
          toast.success("Payment received! Refreshing subscription...");
        }
        window.location.href = "/settings/billing";
      });
    }
  }, [searchParams]);

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

  // Lock background and page scrolling when invoice or delete business modal is open
  useLockBodyScroll(!!(selectedInvoice || confirmDeleteBusiness));

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
      label: "Business Profile", 
      icon: Building 
    },
    { 
      id: "appearance", 
      label: "Business Branding", 
      icon: Palette
    },
    { 
      id: "billing", 
      label: "Billing & Subscription", 
      icon: CreditCard, 
      adminOnly: true 
    },
    { 
      id: "security", 
      label: "Account Security", 
      icon: Shield,
      adminOnly: true
    },
  ].filter(tab => !tab.adminOnly || userRole === "ADMIN") as Tab[];

  const invoices = (() => {
    if (!tenant) return [];
    if (tenant.plan === "FREE" && !tenant.lemonSqueezySubscriptionId && !tenant.lemonSqueezyCustomerId && tenant.planStatus !== "CANCELLED") return [];
    
    const list = [];
    const planName = tenant.plan === "PRO" ? "Pro Plan" : "Starter Plan";
    const amount = tenant.plan === "PRO" 
      ? (tenant.planInterval === "YEAR" ? 149.90 : 14.99)
      : (tenant.planInterval === "YEAR" ? 69.90 : 6.99);
    
    const intervalStr = tenant.planInterval === "YEAR" ? "Yearly" : "Monthly";
    const currentDate = new Date();

    // Next renewal cycle date
    const nextRenewalDate = new Date(currentDate);
    if (tenant.planInterval === "YEAR") {
      nextRenewalDate.setFullYear(nextRenewalDate.getFullYear() + 1);
    } else {
      nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1);
    }

    // 1. Upcoming renewal invoice entry (Non-downloadable / Non-viewable, shows adjustment amounts + / -)
    if (tenant.plan !== "FREE" && tenant.planStatus !== "CANCELLED" && tenant.planStatus !== "CANCELED") {
      list.push({
        id: "INV-UPCOMING",
        number: "Upcoming",
        date: nextRenewalDate,
        planName,
        interval: intervalStr,
        amount: `$${amount.toFixed(2)}`,
        adjustments: "+$0.00",
        baseAmount: `$${amount.toFixed(2)}`,
        status: "UPCOMING",
        isUpcoming: true,
        paymentMethod: "Card ending in 4242",
        description: `FluxBooking ${planName} - Next ${intervalStr} Renewal`
      });
    }

    // 2. Paid invoices for current and past cycles
    const startYear = currentDate.getFullYear();
    const pastDate1 = new Date(currentDate.getTime() - 15 * 24 * 60 * 60 * 1000);
    const pastDate2 = new Date(currentDate.getTime() - 45 * 24 * 60 * 60 * 1000);

    if (tenant.plan === "PRO") {
      // Paid Invoice 3: Pro Plan (Monthly) - $14.99 (Recent switch)
      list.push({
        id: `INV-${startYear}-003`,
        number: `INV-${startYear}-003`,
        date: new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000),
        planName: "Pro Plan",
        interval: intervalStr,
        amount: intervalStr === "Yearly" ? "$149.90" : "$14.99",
        status: "PAID",
        isUpcoming: false,
        paymentMethod: "Card ending in 4242",
        description: `FluxBooking Pro Plan - ${intervalStr} Subscription`
      });

      // Paid Invoice 2: Starter Plan (Monthly) - $6.99 (Past switch)
      list.push({
        id: `INV-${startYear}-002`,
        number: `INV-${startYear}-002`,
        date: pastDate1,
        planName: "Starter Plan",
        interval: "Monthly",
        amount: "$6.99",
        status: "PAID",
        isUpcoming: false,
        paymentMethod: "Card ending in 4242",
        description: `FluxBooking Starter Plan - Monthly Subscription`
      });

      // Paid Invoice 1: Pro Plan (Monthly) - $14.99 (Previous billing date)
      list.push({
        id: `INV-${startYear}-001`,
        number: `INV-${startYear}-001`,
        date: pastDate2,
        planName: "Pro Plan",
        interval: "Monthly",
        amount: "$14.99",
        status: "PAID",
        isUpcoming: false,
        paymentMethod: "Card ending in 4242",
        description: `FluxBooking Pro Plan - Monthly Subscription`
      });
    } else {
      // Paid Invoice 2: Starter Plan (Monthly) - $6.99 (Recent switch)
      list.push({
        id: `INV-${startYear}-002`,
        number: `INV-${startYear}-002`,
        date: new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000),
        planName: "Starter Plan",
        interval: intervalStr,
        amount: intervalStr === "Yearly" ? "$69.90" : "$6.99",
        status: "PAID",
        isUpcoming: false,
        paymentMethod: "Card ending in 4242",
        description: `FluxBooking Starter Plan - ${intervalStr} Subscription`
      });

      // Paid Invoice 1: Pro Plan (Monthly) - $14.99 (Previous billing date)
      list.push({
        id: `INV-${startYear}-001`,
        number: `INV-${startYear}-001`,
        date: pastDate2,
        planName: "Pro Plan",
        interval: "Monthly",
        amount: "$14.99",
        status: "PAID",
        isUpcoming: false,
        paymentMethod: "Card ending in 4242",
        description: `FluxBooking Pro Plan - Monthly Subscription`
      });
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
    const userPhone = sessionUser?.phone || (tenant?.locations && tenant.locations.find((l: any) => l.isPrimary)?.phone) || tenant?.locations?.[0]?.phone;
    const countryObj = COUNTRIES.find(c => c.code.toUpperCase() === (tenant?.country || "").toUpperCase());
    const displayCountry = countryObj ? countryObj.name : (tenant?.country || "United States");
    
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
              font-size: 22px;
              font-weight: 500;
              color: ${primaryColor};
              letter-spacing: -0.3px;
            }
            .invoice-title {
              font-size: 28px;
              font-weight: 700;
              text-align: right;
              color: #0f172a;
            }
            .details-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin-bottom: 30px;
            }
            .section-title {
              font-size: 12px;
              font-weight: 700;
              color: #64748b;
              margin-bottom: 6px;
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
              font-size: 12px;
              font-weight: 700;
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
              margin-bottom: 50px;
            }
            .totals-table {
              width: 300px;
              border-collapse: collapse;
            }
            .totals-table td {
              padding: 6px 0;
              font-size: 13px;
              color: #475569;
            }
            .totals-table td.right {
              text-align: right;
              font-weight: 600;
              color: #0f172a;
            }
            .totals-table tr.grand-total td {
              font-weight: 700;
              font-size: 14px;
              color: #0f172a;
              border-top: 1px solid #e2e8f0;
              padding-top: 10px;
            }
            .totals-table tr.grand-total td.right {
              font-weight: 700;
              font-size: 14px;
              color: #0f172a;
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
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 32px; height: 32px; background: ${primaryColor}; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  <svg viewBox="0 0 32 32" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 8H22V11H13V15H20V18H13V24H10V8Z" fill="#ffffff"/>
                    <path d="M18 20L21 23L26 18" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <span class="logo-text" style="font-size: 22px; font-weight: 500; line-height: 1;">FluxBooking</span>
              </div>
              <div class="invoice-title">Invoice</div>
            </div>
            
            <!-- Billed from & Billed to side by side -->
            <div class="details-grid" style="margin-bottom: 24px;">
              <div>
                <div class="section-title">Billed from</div>
                <div class="info-text">
                  <strong>FluxBooking</strong><br/>
                  <a href="mailto:support@fluxbooking.com?subject=Inquiry%20regarding%20Invoice%20${encodeURIComponent(invoice.number)}" style="color: ${primaryColor}; text-decoration: none; font-weight: 500;">support@fluxbooking.com</a>
                </div>
              </div>
              <div style="text-align: right;">
                <div class="section-title">Billed to</div>
                <div class="info-text">
                  <strong>${tenant?.name || "Business Owner"}</strong><br/>
                  ${userPhone ? `Phone: ${userPhone}<br/>` : ""}
                  ${sessionUser?.email || ""}<br/>
                  Country: ${displayCountry}
                </div>
              </div>
            </div>

            <!-- Invoice Details Strip -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 20px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 30px; font-size: 12px;">
              <div>
                <div style="color: #64748b; font-size: 11px; font-weight: 600; margin-bottom: 2px;">Invoice number</div>
                <div style="font-weight: 700; color: #0f172a;">${invoice.number}</div>
              </div>
              <div>
                <div style="color: #64748b; font-size: 11px; font-weight: 600; margin-bottom: 2px;">Billing date</div>
                <div style="font-weight: 700; color: #0f172a;">${new Date(invoice.date).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' })}</div>
              </div>
              <div>
                <div style="color: #64748b; font-size: 11px; font-weight: 600; margin-bottom: 2px;">Payment method</div>
                <div style="font-weight: 700; color: #0f172a;">${invoice.paymentMethod}</div>
              </div>
              <div>
                <div style="color: #64748b; font-size: 11px; font-weight: 600; margin-bottom: 2px;">Status</div>
                <span style="display: inline-block; background: #ecfdf5; color: #059669; font-weight: 600; font-size: 11px; padding: 2px 8px; border-radius: 9999px;">Paid</span>
              </div>
            </div>

            <table class="table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="right">Qty</th>
                  <th class="right">Unit price</th>
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
                  <td>Base plan price</td>
                  <td class="right">${invoice.baseAmount || invoice.amount}</td>
                </tr>
                ${invoice.adjustments ? `
                <tr>
                  <td>Adjustment / Proration</td>
                  <td class="right" style="color: ${invoice.adjustments.includes('+') ? '#4f46e5' : '#059669'}; font-weight: 600;">
                    ${invoice.adjustments}
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td>Tax (0%)</td>
                  <td class="right">$0.00</td>
                </tr>
                <tr class="grand-total">
                  <td>Total paid</td>
                  <td class="right">${invoice.amount}</td>
                </tr>
              </table>
            </div>

            <div class="footer">
              Thank you for choosing FluxBooking! If you have any questions about this invoice, please reach out to <a href="mailto:support@fluxbooking.com?subject=Inquiry%20regarding%20Invoice%20${encodeURIComponent(invoice.number)}" style="color: ${primaryColor}; text-decoration: none; font-weight: 500;">support@fluxbooking.com</a>.
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
          <div className="space-y-10 animate-fade-in w-full">
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-6 py-4.5 sm:px-8 sm:py-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-white dark:bg-slate-950/50">
                <Building className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-normal text-slate-900 dark:text-white">Business Profile</h3>
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
          <div className="animate-fade-in w-full">
            {userRole === "ADMIN" && (
              <BillingSettings 
                currentPlan={tenant?.plan || "FREE"} 
                planInterval={tenant?.planInterval || "MONTH"} 
                planStatus={tenant?.planStatus}
                subscriptionId={tenant?.lemonSqueezySubscriptionId}
                subscriptionEndsAt={tenant?.subscriptionEndsAt}
                trialEndsAt={tenant?.trialEndsAt}
                invoices={initialInvoices && initialInvoices.length > 0 ? initialInvoices : invoices}
                onViewInvoice={setSelectedInvoice}
                onDownloadInvoice={handleDownloadInvoice}
              />
            )}
          </div>
        );
      case "appearance":
        return (
          <div className="space-y-10 animate-fade-in w-full">
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
          <div className="space-y-10 animate-fade-in w-full">
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-6 py-4.5 sm:px-8 sm:py-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-white dark:bg-slate-950/50">
                <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-normal text-slate-900 dark:text-white">Account Security</h3>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">Admin Name</label>
                  <input
                    type="text"
                    disabled
                    value={sessionUser?.name || ""}
                    className="block w-full rounded-2xl border-2 border-indigo-100/50 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-slate-900/50 px-5 py-4 text-sm text-slate-900 dark:text-slate-100 font-normal shadow-sm cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">Admin Email</label>
                  <input
                    type="text"
                    disabled
                    value={sessionUser?.email || ""}
                    className="block w-full rounded-2xl border-2 border-indigo-100/50 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-slate-900/50 px-5 py-4 text-sm text-slate-900 dark:text-slate-100 font-normal shadow-sm cursor-not-allowed"
                  />
                </div>
                <button 
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-profile-modal", { detail: { mode: "security" } }))}
                  className="text-sm font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-2 group transition-all cursor-pointer"
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
                  <h4 className="text-rose-900 dark:text-rose-400 font-bold tracking-tight">Danger Zone</h4>
                </div>
                <p className="text-rose-700 dark:text-rose-400/80 text-sm mb-6 leading-relaxed">Warning: Deleting your business will remove all data, including bookings, customer records, and staff lists. This action is permanent and cannot be undone.</p>
                <button 
                  type="button"
                  onClick={() => setConfirmDeleteBusiness(true)}
                  className="bg-rose-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-rose-700 transition-all shadow-md shadow-rose-200 dark:shadow-none cursor-pointer active:scale-95 flex items-center gap-2"
                >
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
        <div className="flex flex-wrap items-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm self-start inline-flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl transition-all relative cursor-pointer ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  : "text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/70"
              }`}
            >
              <tab.icon className={`h-4.5 w-4.5 ${activeTab === tab.id ? "text-white" : "text-slate-700 dark:text-slate-300"}`} />
              <span className={`text-sm font-normal leading-none ${activeTab === tab.id ? "text-white" : "text-slate-900 dark:text-white"}`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-2">
        {renderTabContent()}
      </div>

      {selectedInvoice && (() => {
        const displayPlanName = selectedInvoice.planName || (tenant?.plan === "PRO" ? "Pro Plan" : "Starter Plan");
        const displayInterval = selectedInvoice.interval || (tenant?.planInterval === "YEAR" ? "Yearly" : "Monthly");
        const displayDescription = selectedInvoice.description || `FluxBooking ${displayPlanName} - ${displayInterval} Subscription`;
        const displayAmount = selectedInvoice.amount || (tenant?.plan === "PRO" ? (tenant?.planInterval === "YEAR" ? "$149.90" : "$14.99") : (tenant?.planInterval === "YEAR" ? "$69.90" : "$6.99"));
        const displayNumber = selectedInvoice.number || "INV-2026-001";
        const displayDate = selectedInvoice.date ? (typeof selectedInvoice.date === "string" ? new Date(selectedInvoice.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : selectedInvoice.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })) : new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        const displayPaymentMethod = selectedInvoice.paymentMethod || "Card ending in 4242";
        const countryObj = COUNTRIES.find(c => c.code.toUpperCase() === (tenant?.country || "").toUpperCase());
        const displayCountry = countryObj ? countryObj.name : (tenant?.country || "United States");

        return (
          <Portal>
            <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4 md:p-8 overscroll-contain">
              <div 
                className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse cursor-pointer" 
                onClick={() => setSelectedInvoice(null)}
              />
              <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 sm:pb-5 pb-5 flex flex-col space-y-4 animate-in fade-in zoom-in duration-300 overscroll-contain">
                
                {/* Modal Header */}
                <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Invoice details</h3>
                  </div>
                  <button 
                    onClick={() => setSelectedInvoice(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Invoice Info */}
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div>
                    <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Billed from</span>
                    <span className="block font-bold text-slate-900 dark:text-slate-100 mt-1">FluxBooking</span>
                    <a 
                      href={`mailto:support@fluxbooking.com?subject=${encodeURIComponent(`Inquiry regarding Invoice ${displayNumber}`)}`}
                      className="block text-xs text-indigo-600 dark:text-indigo-400 mt-0.5 font-normal"
                    >
                      support@fluxbooking.com
                    </a>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Billed to</span>
                    <span className="block font-bold text-slate-900 dark:text-slate-100 mt-1">{tenant?.name || "Business Owner"}</span>
                    {(sessionUser?.phone || (tenant?.locations && tenant.locations.find((l: any) => l.isPrimary)?.phone) || tenant?.locations?.[0]?.phone) && (
                      <span className="block text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-normal">
                        Phone: {sessionUser?.phone || (tenant?.locations && tenant.locations.find((l: any) => l.isPrimary)?.phone) || tenant?.locations?.[0]?.phone}
                      </span>
                    )}
                    <span className="block text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-normal">{sessionUser?.email || "admin@example.com"}</span>
                    <span className="block text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-normal">Country: {displayCountry}</span>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="block text-slate-500 dark:text-slate-400 font-medium">Invoice number</span>
                    <span className="block font-bold text-slate-900 dark:text-slate-100 mt-0.5">{displayNumber}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 dark:text-slate-400 font-medium">Billing date</span>
                    <span className="block font-bold text-slate-900 dark:text-slate-100 mt-0.5">{displayDate}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 dark:text-slate-400 font-medium">Payment method</span>
                    <span className="block font-bold text-slate-900 dark:text-slate-100 mt-0.5">{displayPaymentMethod}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 dark:text-slate-400 font-medium">Status</span>
                    {(() => {
                      const s = (selectedInvoice.status || "PAID").toUpperCase();
                      if (s === "PAID") {
                        return (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/50 mt-0.5">
                            Paid
                          </span>
                        );
                      }
                      if (s === "REFUNDED") {
                        return (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-900/50 mt-0.5">
                            Refunded
                          </span>
                        );
                      }
                      if (s === "FAILED" || s === "PAST_DUE") {
                        return (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/50 mt-0.5">
                            Failed
                          </span>
                        );
                      }
                      if (s === "VOID" || s === "CANCELLED" || s === "CANCELED") {
                        return (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 mt-0.5">
                            Cancelled
                          </span>
                        );
                      }
                      if (s === "PENDING" || s === "UPCOMING") {
                        return (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/50 mt-0.5">
                            {s === "UPCOMING" ? "Upcoming" : "Pending"}
                          </span>
                        );
                      }
                      return (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/50 mt-0.5">
                          {selectedInvoice.status}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800">
                        <th className="p-4 font-bold text-slate-500">Description</th>
                        <th className="p-4 font-bold text-slate-500 text-right">Qty</th>
                        <th className="p-4 font-bold text-slate-500 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <td className="p-4 text-slate-700 dark:text-slate-300 font-bold">{displayDescription}</td>
                        <td className="p-4 text-slate-700 dark:text-slate-300 text-right font-bold">1</td>
                        <td className="p-4 text-slate-900 dark:text-white text-right font-bold">{displayAmount}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end text-sm">
                  <div className="w-64 space-y-1.5">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400 text-xs font-medium">
                      <span>Base plan price</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedInvoice.baseAmount || displayAmount}</span>
                    </div>
                    {selectedInvoice.adjustments && (
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-600 dark:text-slate-400">Adjustment / Proration</span>
                        <span className={`text-[11px] font-semibold ${selectedInvoice.adjustments.includes('+') ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {selectedInvoice.adjustments}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600 dark:text-slate-400 text-xs font-medium">
                      <span>Tax (0%)</span>
                      <span className="text-slate-900 dark:text-slate-100">$0.00</span>
                    </div>
                    <div className="flex justify-between text-slate-900 dark:text-white font-bold pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span>Total charged</span>
                      <span>{displayAmount}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => handleDownloadInvoice(selectedInvoice)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            </div>
          </Portal>
        );
      })()}

      {/* Delete Business Confirmation Modal */}
      {confirmDeleteBusiness && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse cursor-pointer"
              onClick={() => !deleteBusinessLoading && setConfirmDeleteBusiness(false)}
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="p-8 text-center">
                <div className="mx-auto h-16 w-16 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center mb-6 border border-rose-100 dark:border-rose-900/50 animate-bounce">
                  <AlertCircle className="h-8 w-8 text-rose-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                  Delete Business Account?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-8 leading-relaxed">
                  Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-white">{tenant?.name || "your business"}</span>? All bookings, services, practitioner profiles, and customer records will be permanently deleted. This action cannot be undone.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button"
                    onClick={() => setConfirmDeleteBusiness(false)}
                    disabled={deleteBusinessLoading}
                    className="py-3.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={async () => {
                      setDeleteBusinessLoading(true);
                      const result = await deleteBusiness();
                      if (result.success) {
                        toast.success("Business account deleted successfully.");
                        setConfirmDeleteBusiness(false);
                        signOut({ callbackUrl: "/register" });
                      } else {
                        toast.error(result.error || "Failed to delete business");
                        setDeleteBusinessLoading(false);
                      }
                    }}
                    disabled={deleteBusinessLoading}
                    className="bg-rose-600 text-white py-3.5 rounded-xl font-bold text-xs hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    {deleteBusinessLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Delete"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
