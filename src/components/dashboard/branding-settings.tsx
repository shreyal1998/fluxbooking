"use client";

import { useState } from "react";
import { Palette, Check, Loader2, Sparkles } from "lucide-react";
import { updateTenantBranding } from "@/app/actions/dashboard";
import { toast } from "sonner";

export function BrandingSettings({ initialColor, initialLogo }: { initialColor: string, initialLogo: string | null }) {
  const [loading, setLoading] = useState(false);
  const [selectedColor, setSelectedColor] = useState(initialColor);
  
  const colors = [
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Sky', value: '#0ea5e9' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Slate', value: '#0f172a' },
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
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-soft overflow-hidden">
      <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
          <Palette className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-black text-slate-900 dark:text-white">Business Branding</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Customize your public booking page.</p>
        </div>
      </div>

      <div className="p-8 space-y-8">
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Primary Brand Color</label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-4">
            {colors.map((color) => (
              <button
                key={color.value}
                onClick={() => setSelectedColor(color.value)}
                className={`relative h-12 w-full rounded-2xl transition-all hover:scale-110 active:scale-95 flex items-center justify-center shadow-sm ${
                  selectedColor === color.value ? 'ring-4 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-900' : ''
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              >
                {selectedColor === color.value && <Check className="h-5 w-5 text-white" />}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Preview</p>
           <div className="flex flex-col sm:flex-row items-center gap-6">
              <button 
                className="px-8 py-3 rounded-2xl text-white font-black text-sm shadow-xl transition-all cursor-default"
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
            disabled={loading || selectedColor === initialColor}
            className="flex-1 py-4 rounded-2xl font-black text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-30"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || selectedColor === initialColor}
            className="flex-[2] bg-slate-900 dark:bg-indigo-600 text-white py-4 rounded-2xl font-black hover:opacity-90 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Branding Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
