"use client";

import { useState } from "react";
import { Palette, Check, Loader2, Sparkles } from "lucide-react";
import { updateTenantBranding } from "@/app/actions/dashboard";
import { toast } from "sonner";

export function BrandingSettings({ initialColor, initialLogo }: { initialColor: string, initialLogo: string | null }) {
  const [loading, setLoading] = useState(false);
  const [selectedColor, setSelectedColor] = useState(initialColor);
  
  const colors = [
    { name: 'Black', value: '#000000' },
    { name: 'Slate', value: '#475569' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Sky', value: '#0ea5e9' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Orange', value: '#f97316' },
  ];

  const handleSave = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append("primaryColor", selectedColor);
    formData.append("logoUrl", initialLogo || "");

    const result = await updateTenantBranding(formData);
    if (result.success) {
      toast.success("Branding updated successfully!");
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-6 py-4.5 sm:px-8 sm:py-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-white dark:bg-slate-950/50">
        <Palette className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        <h3 className="font-normal text-slate-900 dark:text-white">Business Branding</h3>
      </div>

      <div className="p-8 space-y-8">
        <div className="space-y-4">
          <label className="block text-sm font-bold text-slate-500 dark:text-slate-400">Primary Brand Color</label>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
            {colors.map((color) => {
              const isSelected = selectedColor.toLowerCase() === color.value.toLowerCase();
              return (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className={`relative h-11 w-full rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-offset-2 ring-black dark:ring-white ring-offset-white dark:ring-offset-slate-900 z-10'
                      : 'ring-1 ring-inset ring-black/15 dark:ring-white/25 hover:ring-black/30 dark:hover:ring-white/40'
                  }`}
                  style={{ backgroundColor: color.value }}
                >
                  {isSelected && <Check className="h-4 w-4 text-white drop-shadow-md stroke-[3]" />}
                </button>
              );
            })}
          </div>

          {/* Custom Hex Color Picker */}
          <div className="flex items-center gap-3 pt-1">
            <div className="relative w-48">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <input
                  type="color"
                  value={selectedColor.startsWith("#") && selectedColor.length === 7 ? selectedColor : "#6366f1"}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="h-6 w-6 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer overflow-hidden p-0 bg-transparent"
                />
                <span className="text-xs font-semibold text-slate-400 select-none">#</span>
              </div>
              <input
                type="text"
                value={selectedColor.replace("#", "")}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9A-Fa-f]/g, "").slice(0, 6);
                  setSelectedColor(`#${val}`);
                }}
                placeholder="000000"
                className="w-full pl-14 pr-4 py-2.5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-sm font-semibold text-slate-900 dark:text-white uppercase focus:outline-none focus:border-indigo-500 dark:focus:border-white transition-colors shadow-2xs"
              />
            </div>
            <span className="text-xs font-medium text-slate-400">Custom Brand Hex</span>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
           <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4">Preview</p>
           <div className="flex flex-col sm:flex-row items-center gap-6">
              <button 
                className="px-8 py-3 rounded-2xl text-white font-black text-sm shadow-xl dark:shadow-none border border-transparent dark:border-white/10"
                style={{ backgroundColor: selectedColor }}
              >
                Confirm Booking
              </button>
              <div className="flex items-center gap-2">
                 <div className="h-8 w-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: selectedColor }}>
                    <Sparkles className="h-4 w-4" />
                 </div>
                 <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Active State</span>
              </div>
           </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setSelectedColor(initialColor)}
            disabled={loading}
            className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-2xl border border-slate-200/60 dark:border-slate-700/60 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-[2] bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white py-4 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-100 dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Branding Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
