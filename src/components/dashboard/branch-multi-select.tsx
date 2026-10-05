"use client";

import { useState, useRef, useEffect } from "react";
import { Building2, ChevronDown, Check, Search, X } from "lucide-react";

interface BranchMultiSelectProps {
  locations: any[];
  selectedLocations: string[];
  onChange: (selected: string[]) => void;
  label?: string;
  name?: string;
  hasError?: boolean;
}

export function BranchMultiSelect({
  locations = [],
  selectedLocations = [],
  onChange,
  label = "Available at Branches",
  name = "locations",
  hasError = false
}: BranchMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!locations || locations.length === 0) return null;

  const handleToggle = () => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 220);
    }
    setIsOpen(!isOpen);
  };

  const filteredLocations = locations.filter(loc =>
    loc.name.toLowerCase().includes(search.toLowerCase().trim()) ||
    (loc.address && loc.address.toLowerCase().includes(search.toLowerCase().trim()))
  );

  const toggleLocation = (id: string) => {
    if (selectedLocations.includes(id)) {
      onChange(selectedLocations.filter(locId => locId !== id));
    } else {
      onChange([...selectedLocations, id]);
    }
  };

  const selectAll = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onChange(locations.map(l => l.id));
  };

  const deselectAll = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onChange([]);
  };

  const getDisplayText = () => {
    if (selectedLocations.length === 0) {
      return "Select branches...";
    }
    if (selectedLocations.length === locations.length) {
      return `All branches (${locations.length})`;
    }
    if (selectedLocations.length === 1) {
      const loc = locations.find(l => l.id === selectedLocations[0]);
      return loc ? loc.name : "1 branch selected";
    }
    return `${selectedLocations.length} branches selected`;
  };

  return (
    <div className="space-y-1.5">
      {/* Hidden inputs for natural FormData serialization */}
      {selectedLocations.map(id => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 flex items-center gap-1.5">
        <Building2 className="h-3.5 w-3.5 text-slate-400" />
        {label}
      </label>

      <div ref={dropdownRef} className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={handleToggle}
          className={`w-full flex items-center justify-between rounded-xl border-2 px-3.5 py-2.5 text-xs focus:outline-none transition-all shadow-2xs text-left cursor-pointer ${
            hasError
              ? "border-rose-200 bg-rose-50/50 dark:bg-rose-900/10 dark:border-rose-900/50 focus:border-rose-500"
              : isOpen
                ? "border-indigo-600 bg-white dark:bg-slate-900 ring-2 ring-indigo-500/10"
                : "border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-800"
          }`}
        >
          <div className="flex items-center gap-2 truncate min-w-0">
            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate text-slate-700 dark:text-slate-200 font-medium">
              {getDisplayText()}
            </span>
          </div>
          <ChevronDown
            className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div
            className={`absolute left-0 right-0 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl p-2 space-y-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 ${
              openUpward
                ? "bottom-full mb-1.5 origin-bottom slide-in-from-bottom-2"
                : "top-full mt-1.5 origin-top slide-in-from-top-2"
            }`}
          >
            {/* Quick Actions Header inside dropdown */}
            <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-100 dark:border-slate-800 text-[10px]">
              <span className="font-semibold text-slate-400">
                {selectedLocations.length} of {locations.length} selected
              </span>
              <div className="flex items-center gap-2">
                {selectedLocations.length < locations.length && (
                  <button
                    type="button"
                    onClick={selectAll}
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    Select All
                  </button>
                )}
                {selectedLocations.length > 0 && selectedLocations.length < locations.length && (
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                )}
                {selectedLocations.length > 0 && (
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="font-bold text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    Deselect All
                  </button>
                )}
              </div>
            </div>

            {locations.length > 4 && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search branch..."
                  className="w-full pl-7 pr-3 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-indigo-500 dark:text-white"
                />
              </div>
            )}

            <div className="max-h-40 overflow-y-auto space-y-0.5 custom-scrollbar">
              {filteredLocations.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-3 italic">
                  No branches found.
                </p>
              ) : (
                filteredLocations.map((loc) => {
                  const isSelected = selectedLocations.includes(loc.id);
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => toggleLocation(loc.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl transition-all text-left text-xs cursor-pointer ${
                        isSelected
                          ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="truncate">{loc.name}</span>
                          {loc.isPrimary && (
                            <span className="text-[8px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1 py-0.2 rounded-md border border-emerald-200/40 shrink-0">
                              Main
                            </span>
                          )}
                        </div>
                        {loc.address && (
                          <p className="text-[10px] text-slate-400 font-normal truncate mt-0.5">
                            {loc.address}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0">
                        {isSelected ? (
                          <div className="h-4.5 w-4.5 rounded-md bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="h-3 w-3 stroke-[2.5]" />
                          </div>
                        ) : (
                          <div className="h-4.5 w-4.5 rounded-md border-2 border-slate-300 dark:border-slate-700" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
