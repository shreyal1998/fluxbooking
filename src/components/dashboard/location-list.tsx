"use client";

import { MapPin, Plus, Trash2, Globe, Building2 } from "lucide-react";
import { useState } from "react";

interface Location {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  isPrimary: boolean;
}

interface LocationListProps {
  locations: Location[];
  isPro: boolean;
}

export function LocationList({ locations: initialLocations, isPro }: LocationListProps) {
  const [locations, setLocations] = useState(initialLocations);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-bold text-slate-900 dark:text-white">Business Locations</h3>
        </div>
        {isPro && (
          <button className="h-9 px-4 bg-indigo-600 text-white rounded-lg text-xs font-black transition-all hover:bg-indigo-700 flex items-center gap-2">
            <Plus className="h-3.5 w-3.5" />
            Add Location
          </button>
        )}
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {locations.length > 0 ? (
          locations.map((loc) => (
            <div key={loc.id} className="p-6 flex items-start justify-between group">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-slate-900 dark:text-white">{loc.name}</h4>
                    {loc.isPrimary && (
                      <span className="text-[10px] font-black uppercase bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">Primary</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{loc.address || "No address set"}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{loc.phone || "No phone number"}</p>
                </div>
              </div>
              {isPro && !loc.isPrimary && (
                <button className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="p-12 text-center">
            <div className="h-12 w-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
               <Globe className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-slate-500">No locations added yet.</p>
          </div>
        )}
      </div>

      {!isPro && (
        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border-t border-indigo-100 dark:border-indigo-800 flex items-center justify-between">
           <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Upgrade to Pro for multiple location support</p>
           <button className="text-xs font-black text-indigo-600 underline">View Plans</button>
        </div>
      )}
    </div>
  );
}
