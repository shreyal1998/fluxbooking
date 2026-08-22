"use client";

import { useState, useEffect, useRef } from "react";
import { Check, Copy, Share2, Mail } from "lucide-react";
import { toast } from "sonner";

export function ShareableLink({ 
  tenantSlug, 
  staffId, 
  staffName 
}: { 
  tenantSlug: string; 
  staffId: string; 
  staffName: string;
}) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showEmailMenu, setShowEmailMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowEmailMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const bookingUrl = mounted 
    ? `${origin}/b/${tenantSlug}?staffId=${staffId}` 
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

        {/* Link display & copy */}
        <div className="flex items-center gap-2 p-3 bg-slate-50/50 dark:bg-slate-950/45 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <code className="text-xs font-mono text-indigo-600 dark:text-indigo-400 flex-1 break-all select-all font-bold pr-2 overflow-hidden text-ellipsis whitespace-nowrap">
            {mounted ? `${origin.replace(/(^\w+:|^)\/\//, "")}/b/${tenantSlug}?staffId=...` : "Loading booking URL..."}
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
            className={`flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center ${!mounted ? "opacity-50 pointer-events-none" : ""}`}
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
              className={`w-full flex items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-950/45 text-indigo-700 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center ${!mounted ? "opacity-50 pointer-events-none" : ""}`}
            >
              <Mail className="h-4 w-4 shrink-0" />
              Email Link
            </button>

            {showEmailMenu && (
              <div className="absolute right-0 bottom-full mb-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 space-y-1">
                <span className="block px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
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
