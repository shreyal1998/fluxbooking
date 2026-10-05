"use client";

import { useState, useEffect, useRef } from "react";
import { Check, Copy, Share2, Mail, Building2, Sparkles, ChevronDown, Search, X } from "lucide-react";
import { toast } from "sonner";

export function ShareableLink({ 
  tenantSlug, 
  staffId, 
  staffName,
  services = [],
  locations = [],
  serviceLabel = "Service"
}: { 
  tenantSlug: string; 
  staffId: string; 
  staffName: string;
  services?: any[];
  locations?: any[];
  serviceLabel?: string;
}) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showEmailMenu, setShowEmailMenu] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const [branchSearch, setBranchSearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");

  const menuRef = useRef<HTMLDivElement>(null);
  const branchDropdownRef = useRef<HTMLDivElement>(null);
  const serviceDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowEmailMenu(false);
      }
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target as Node)) {
        setIsBranchDropdownOpen(false);
      }
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(event.target as Node)) {
        setIsServiceDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const locationQuery = selectedLocationId ? `&locationId=${selectedLocationId}` : "";
  const serviceQuery = selectedServiceId ? `&serviceId=${selectedServiceId}` : "";

  const bookingUrl = mounted 
    ? `${origin}/b/${tenantSlug}?staffId=${staffId}${locationQuery}${serviceQuery}` 
    : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      toast.success("Booking link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link.");
    }
  };

  const shareText = `Book an appointment with me here: ${bookingUrl}`;
  const shareTextClean = shareText.replace(/https?:\/\//g, "");
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent("Book an appointment with " + staffName)}&body=${encodeURIComponent(shareText)}`;

  const selectedLocation = locations.find(l => l.id === selectedLocationId);
  const selectedService = services.find(s => s.id === selectedServiceId);

  const filteredLocations = locations.filter(loc =>
    loc.name.toLowerCase().includes(branchSearch.toLowerCase().trim()) ||
    (loc.address && loc.address.toLowerCase().includes(branchSearch.toLowerCase().trim()))
  );

  const filteredServices = services.filter(srv =>
    srv.name.toLowerCase().includes(serviceSearch.toLowerCase().trim())
  );

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl py-6 px-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative z-20 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <Share2 className="h-4 w-4" />
        </div>
        <span className="text-sm font-medium text-slate-900 dark:text-slate-200 tracking-wide">Share Booking Link</span>
      </div>

      <div className="space-y-4">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
          Provide your clients with a direct link to schedule appointments with you.
        </p>

        {/* Optional Filters for Location & Service */}
        {(locations.length > 1 || services.length > 1) && (
          <div className="flex flex-col gap-3 p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80">
            
            {/* Custom Branch Dropdown */}
            {locations.length > 1 && (
              <div className="space-y-1.5" ref={branchDropdownRef}>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                  Branch
                </label>
                
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBranchDropdownOpen(!isBranchDropdownOpen);
                      setIsServiceDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between rounded-xl border-2 px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none transition-all shadow-2xs text-left cursor-pointer ${
                      isBranchDropdownOpen
                        ? "border-indigo-600 bg-white dark:bg-slate-900 ring-2 ring-indigo-500/10"
                        : "border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate min-w-0 pr-1">
                      <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="truncate text-slate-700 dark:text-slate-200 font-medium">
                        {selectedLocation ? selectedLocation.name : "All My Branches"}
                      </span>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                        isBranchDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isBranchDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 space-y-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-64 flex flex-col">
                      {locations.length > 4 && (
                        <div className="relative shrink-0">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            value={branchSearch}
                            onChange={(e) => setBranchSearch(e.target.value)}
                            placeholder="Search branch..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-indigo-500 dark:text-white"
                          />
                        </div>
                      )}
                      <div className="overflow-y-auto space-y-1 custom-scrollbar pr-0.5 flex-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLocationId("");
                            setIsBranchDropdownOpen(false);
                            setBranchSearch("");
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors text-left cursor-pointer ${
                            selectedLocationId === ""
                              ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <span className="truncate">All My Branches</span>
                          {selectedLocationId === "" && <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                        </button>
                        {filteredLocations.map((loc) => {
                          const isSelected = selectedLocationId === loc.id;
                          return (
                            <button
                              key={loc.id}
                              type="button"
                              onClick={() => {
                                setSelectedLocationId(loc.id);
                                setIsBranchDropdownOpen(false);
                                setBranchSearch("");
                              }}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors text-left cursor-pointer ${
                                isSelected
                                  ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold"
                                  : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              <div className="flex flex-col truncate min-w-0 pr-1">
                                <span className="truncate font-medium">{loc.name}{loc.isPrimary ? " (Main)" : ""}</span>
                                {loc.address && <span className="text-[10px] text-slate-400 truncate">{loc.address}</span>}
                              </div>
                              {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                            </button>
                          );
                        })}
                        {filteredLocations.length === 0 && (
                          <p className="text-center text-xs text-slate-400 py-3 italic">No branches found</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Custom Treatment / Service Dropdown */}
            {services.length > 1 && (
              <div className="space-y-1.5" ref={serviceDropdownRef}>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                  {serviceLabel}
                </label>
                
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsServiceDropdownOpen(!isServiceDropdownOpen);
                      setIsBranchDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between rounded-xl border-2 px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none transition-all shadow-2xs text-left cursor-pointer ${
                      isServiceDropdownOpen
                        ? "border-indigo-600 bg-white dark:bg-slate-900 ring-2 ring-indigo-500/10"
                        : "border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate min-w-0 pr-1">
                      {selectedService ? (
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: selectedService.color }} />
                      ) : (
                        <Sparkles className="h-4 w-4 text-slate-400 shrink-0" />
                      )}
                      <span className="truncate text-slate-700 dark:text-slate-200 font-medium">
                        {selectedService ? selectedService.name : `All My ${serviceLabel}s`}
                      </span>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                        isServiceDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isServiceDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 space-y-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-64 flex flex-col">
                      {services.length > 4 && (
                        <div className="relative shrink-0">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            value={serviceSearch}
                            onChange={(e) => setServiceSearch(e.target.value)}
                            placeholder={`Search ${serviceLabel.toLowerCase()}...`}
                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-indigo-500 dark:text-white"
                          />
                        </div>
                      )}
                      <div className="overflow-y-auto space-y-1 custom-scrollbar pr-0.5 flex-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedServiceId("");
                            setIsServiceDropdownOpen(false);
                            setServiceSearch("");
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors text-left cursor-pointer ${
                            selectedServiceId === ""
                              ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <span className="truncate">All My {serviceLabel}s</span>
                          {selectedServiceId === "" && <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                        </button>
                        {filteredServices.map((srv) => {
                          const isSelected = selectedServiceId === srv.id;
                          return (
                            <button
                              key={srv.id}
                              type="button"
                              onClick={() => {
                                setSelectedServiceId(srv.id);
                                setIsServiceDropdownOpen(false);
                                setServiceSearch("");
                              }}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors text-left cursor-pointer ${
                                isSelected
                                  ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold"
                                  : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 truncate min-w-0 pr-1">
                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: srv.color }} />
                                <span className="truncate font-medium">{srv.name}</span>
                              </div>
                              {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                            </button>
                          );
                        })}
                        {filteredServices.length === 0 && (
                          <p className="text-center text-xs text-slate-400 py-3 italic">No {serviceLabel.toLowerCase()}s found</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Link display & copy */}
        <div className="flex items-center gap-2 p-3 bg-slate-50/50 dark:bg-slate-950/45 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <code className="text-xs font-mono text-indigo-600 dark:text-indigo-400 flex-1 break-all select-all font-bold pr-2 overflow-hidden text-ellipsis whitespace-nowrap">
            {mounted ? bookingUrl.replace(/(^\w+:|^)\/\//, "") : "Loading booking URL..."}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!mounted}
            className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center shadow-md cursor-pointer"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* WhatsApp */}
          <a
            href={mounted ? whatsappUrl : "#"}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer text-center active:scale-95 ${!mounted ? "opacity-50 pointer-events-none" : ""}`}
          >
            <svg className="h-4 w-4 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.45 5.516 0 10.023-4.444 10.026-9.913.001-2.65-1.03-5.14-2.901-7.016C16.502 1.8 14.027 1.8 12.012 1.8c-5.518 0-10.026 4.446-10.028 9.916-.001 1.77.461 3.491 1.341 5.021l-.995 3.634 3.727-.977zm11.377-6.52c-.279-.14-1.646-.81-1.9-.9-.253-.09-.438-.14-.622.14-.184.28-.713.9-.874 1.09-.16.18-.32.2-.6.06-.279-.14-1.18-.43-2.247-1.38-.83-.74-1.39-1.65-1.55-1.93-.16-.28-.017-.43.122-.57.126-.127.279-.32.419-.48.14-.16.187-.27.28-.45.093-.18.046-.34-.023-.48-.069-.14-.622-1.5-.853-2.06-.226-.54-.473-.47-.622-.47-.12 0-.29-.01-.46-.01-.17 0-.45.06-.69.32-.24.26-.92.9-.92 2.2 0 1.3.94 2.56 1.07 2.74.13.18 1.85 2.83 4.49 3.97.63.27 1.12.43 1.5.55.63.2 1.21.17 1.66.1.51-.08 1.646-.67 1.879-1.32.233-.65.233-1.21.164-1.32-.07-.11-.253-.2-.533-.34z"/>
            </svg>
            WhatsApp
          </a>

          {/* Email Dropdown */}
          <div className="relative w-full" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowEmailMenu(!showEmailMenu)}
              disabled={!mounted}
              className={`w-full flex items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer text-center active:scale-95 ${!mounted ? "opacity-50 pointer-events-none" : ""}`}
            >
              <Mail className="h-4 w-4 shrink-0" />
              Email Link
            </button>

            {showEmailMenu && (
              <div className="absolute right-0 bottom-full mb-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 space-y-1">
                <span className="block px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Open email in:
                </span>
                
                {/* Default Mail app */}
                <a
                  href={emailUrl}
                  onClick={() => setShowEmailMenu(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors cursor-pointer"
                >
                  <Mail className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Default Mail App</span>
                </a>

                {/* Gmail Web */}
                <a
                  href={`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent("Book an appointment with " + staffName)}&body=${encodeURIComponent(shareText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowEmailMenu(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors cursor-pointer"
                >
                  <Mail className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
                  <span>Gmail (Web)</span>
                </a>

                {/* Outlook Web */}
                <a
                  href={`https://outlook.live.com/mail/0/deeplink/compose?subject=${encodeURIComponent("Book an appointment with " + staffName)}&body=${encodeURIComponent(shareText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowEmailMenu(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors cursor-pointer"
                >
                  <Mail className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
                  <span>Outlook (Web)</span>
                </a>

                {/* Yahoo Mail (Web) */}
                <a
                  href={`https://mail.yahoo.com/d/compose-message?subject=${encodeURIComponent("Book an appointment with " + staffName)}&body=${encodeURIComponent(shareTextClean)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowEmailMenu(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors cursor-pointer"
                >
                  <Mail className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400 shrink-0" />
                  <span>Yahoo Mail (Web)</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
