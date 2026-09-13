"use client";

import { MapPin, Plus, Trash2, Globe, Building2, Pencil, Loader2, X, Check, AlertCircle, Lock } from "lucide-react";
import { useState } from "react";
import { getLabels } from "@/lib/labels";
import { addLocation, updateLocation, deleteLocation } from "@/app/actions/dashboard";
import { toast } from "sonner";
import { PhoneInput } from "@/components/ui/phone-input";
import { Portal } from "@/components/ui/portal";
import { Tooltip } from "@/components/ui/tooltip";
import { validatePhoneNumber } from "@/lib/utils";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";

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
  businessType?: any;
  userRole?: string;
}

export function LocationList({ locations: initialLocations, isPro, businessType, userRole }: LocationListProps) {
  const [locations, setLocations] = useState(initialLocations);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Lock body scroll when modal or delete confirmation is open
  useLockBodyScroll(modalOpen || !!deletingLocation);

  // Form states
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const labels = getLabels(businessType);
  const isAdmin = !userRole || userRole.toUpperCase() === "ADMIN";

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    setGeneralError(null);
  };

  const handleOpenAdd = () => {
    if (!isPro) {
      toast.error("Business locations is a Pro feature. Please upgrade to the Pro plan to add and manage locations.");
      return;
    }
    setEditingLocation(null);
    setName("");
    setAddress("");
    setPhone("");
    setIsPrimary(locations.length === 0);
    setFieldErrors({});
    setGeneralError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (loc: Location) => {
    setEditingLocation(loc);
    setName(loc.name);
    setAddress(loc.address || "");
    setPhone(loc.phone || "");
    setIsPrimary(loc.isPrimary);
    setFieldErrors({});
    setGeneralError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError(null);

    const errors: Record<string, string> = {};
    if (!name.trim()) {
      errors.name = "Branch location name is required";
    }

    if (phone.trim()) {
      const phoneError = validatePhoneNumber(phone.trim());
      if (phoneError) {
        errors.phone = phoneError;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("address", address.trim());
    formData.append("phone", phone.trim());
    formData.append("isPrimary", isPrimary ? "true" : "false");

    if (editingLocation) {
      const res = await updateLocation(editingLocation.id, formData);
      if (res.success) {
        toast.success("Location updated successfully!");
        setLocations((prev) =>
          prev.map((loc) => {
            if (loc.id === editingLocation.id) {
              return { ...loc, name, address, phone, isPrimary: isPrimary || loc.isPrimary };
            }
            return isPrimary ? { ...loc, isPrimary: false } : loc;
          })
        );
        setModalOpen(false);
      } else {
        setGeneralError(res.error || "Failed to update location.");
      }
    } else {
      const res = await addLocation(formData);
      if (res.success) {
        toast.success("Location added successfully!");
        // Refresh local state
        setLocations((prev) => [
          ...prev.map((l) => (isPrimary ? { ...l, isPrimary: false } : l)),
          {
            id: `temp-${Date.now()}`,
            name,
            address,
            phone,
            isPrimary: isPrimary || prev.length === 0,
          },
        ]);
        setModalOpen(false);
      } else {
        setGeneralError(res.error || "Failed to add location.");
      }
    }
    setLoading(false);
  };

  const InputError = ({ message }: { message?: string }) => {
    if (!message) return null;
    return (
      <div className="flex items-center gap-1.5 mt-1.5 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span className="text-xs font-semibold">{message}</span>
      </div>
    );
  };

  const handleConfirmDelete = async () => {
    if (!deletingLocation) return;
    setDeleteLoading(true);
    const res = await deleteLocation(deletingLocation.id);
    if (res.success) {
      toast.success("Location deleted successfully!");
      setLocations((prev) => {
        const filtered = prev.filter((l) => l.id !== deletingLocation.id);
        if (filtered.length > 0 && !filtered.some((l) => l.isPrimary)) {
          filtered[0].isPrimary = true;
        }
        return filtered;
      });
      setDeletingLocation(null);
    } else {
      toast.error(res.error || "Failed to delete location.");
    }
    setDeleteLoading(false);
  };

  return (
    <>
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4.5 sm:px-8 sm:py-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-normal text-slate-900 dark:text-white">Business Locations</h3>
          </div>
          {isAdmin && (
            <button
              onClick={handleOpenAdd}
              className={`h-9 px-4 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto shrink-0 ${
                !isPro 
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700" 
                  : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-98"
              }`}
            >
              {!isPro ? <Lock className="h-3.5 w-3.5 text-amber-500" /> : <Plus className="h-3.5 w-3.5" />}
              <span>Add Location</span>
              {!isPro && (
                <span className="ml-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  Pro
                </span>
              )}
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {locations.length > 0 ? (
            locations.map((loc, idx) => {
              const isLocked = !isPro && (!loc.isPrimary || idx > 0);

              return (
                <div key={loc.id} className={`p-6 flex items-start justify-between group transition-all ${isLocked ? 'bg-slate-50/50 dark:bg-slate-900/30 opacity-75' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`h-10 w-10 rounded-xl border flex items-center justify-center transition-all shadow-xs shrink-0 ${
                      isLocked 
                        ? 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-400' 
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-500/30'
                    }`}>
                      {isLocked ? <Lock className="h-4 w-4" /> : <Building2 className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-bold ${isLocked ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>{loc.name}</h4>
                        {loc.isPrimary && (
                          <span className="text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/50">
                            Primary Branch
                          </span>
                        )}
                        {isLocked && (
                          <span className="text-[8px] font-black uppercase bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-lg tracking-wider shrink-0 flex items-center gap-1">
                            <Lock className="h-2.5 w-2.5" /> Locked
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-normal">
                        {isLocked ? "Pro Plan required to activate this location" : (loc.address || "No street address configured")}
                      </p>
                      {!isLocked && loc.phone && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-mono">
                          {loc.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1.5">
                      {isLocked ? (
                        <Tooltip content="Upgrade Plan" position="bottom" delay={100}>
                          <button
                            type="button"
                            onClick={() => (window.location.href = "/settings/billing")}
                            className="p-2.5 rounded-xl bg-transparent text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                            aria-label="Locked Location"
                          >
                            <Lock className="h-[18px] w-[18px]" />
                          </button>
                        </Tooltip>
                      ) : (
                        <Tooltip content="Edit" position="bottom" delay={100}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(loc)}
                            className="p-2.5 rounded-xl bg-transparent text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all border border-transparent active:scale-95 cursor-pointer"
                            aria-label="Edit"
                          >
                            <Pencil className="h-[18px] w-[18px]" />
                          </button>
                        </Tooltip>
                      )}
                      <Tooltip content="Delete" position="bottom" delay={100}>
                        <button
                          type="button"
                          onClick={() => setDeletingLocation(loc)}
                          className="p-2.5 rounded-xl bg-transparent text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all border border-transparent active:scale-95 cursor-pointer"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-[18px] w-[18px]" />
                        </button>
                      </Tooltip>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center">
              <div className="h-12 w-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                <Globe className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-slate-500">No locations added for this {labels.businessTypeName} yet.</p>
            </div>
          )}
        </div>

        {!isPro && isAdmin && (
          <div className="p-4 bg-indigo-50/70 dark:bg-indigo-900/20 border-t border-indigo-100 dark:border-indigo-800 flex items-center justify-between">
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              Business Locations is a Pro feature. Upgrade to Pro to add branch locations and assign staff.
            </p>
            <button
              onClick={() => (window.location.href = "/settings/billing")}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 underline cursor-pointer shrink-0 ml-4"
            >
              Upgrade to Pro
            </button>
          </div>
        )}
      </div>

      {/* ADD / EDIT LOCATION MODAL */}
      {modalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4 md:p-8">
            <div 
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse cursor-pointer"
              onClick={() => setModalOpen(false)}
            />
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-indigo-100/50 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="px-8 py-6 border-b border-indigo-100/50 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 rounded-t-[2.4rem] z-10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 dark:shadow-none border border-transparent dark:border-white/10">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      {editingLocation ? "Edit Branch Location" : "Add Branch Location"}
                    </h2>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      {editingLocation ? `Configuring ${editingLocation.name}` : "New Physical Branch"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900" noValidate>
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 premium-scrollbar">
                  <div>
                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">
                      Branch Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        clearFieldError("name");
                      }}
                      onFocus={() => clearFieldError("name")}
                      placeholder="e.g. Downtown Studio, Westside Clinic"
                      className={`w-full rounded-2xl border-2 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white shadow-sm ${
                        fieldErrors.name 
                          ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" 
                          : "border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-800 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900"
                      }`}
                    />
                    <InputError message={fieldErrors.name} />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">
                      Physical Street Address
                    </label>
                    <textarea
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. 123 Market St, Suite 400, New York, NY 10001"
                      className="w-full bg-indigo-50/30 dark:bg-slate-900 border-2 border-indigo-100/50 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm dark:text-white outline-none transition-all focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-800 shadow-sm resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">
                      Branch Phone Number
                    </label>
                    <PhoneInput
                      name="branchPhone"
                      defaultValue={phone}
                      hasError={!!fieldErrors.phone}
                      onChange={(val) => {
                        setPhone(val);
                        clearFieldError("phone");
                      }}
                      onFocus={() => clearFieldError("phone")}
                      placeholder="234 567 890"
                    />
                    <InputError message={fieldErrors.phone} />
                  </div>

                  <div className="p-4 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-2xl border-2 border-indigo-100 dark:border-indigo-900/30">
                    <label className="flex items-center justify-between cursor-pointer select-none">
                      <div className="pr-4">
                        <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                          Set as Primary Location
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          Designates this as your default headquarters branch for clients and automated communications.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={isPrimary}
                        onChange={(e) => setIsPrimary(e.target.checked)}
                        className="h-5 w-5 rounded-lg text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-4 border-t border-indigo-100/30 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-[2.5rem] transition-colors flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md border border-transparent dark:border-white/10 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-5 w-5" />
                        <span>{editingLocation ? "Save Changes" : "Add Location"}</span>
                      </>
                    )}
                  </button>

                  {generalError && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold border border-rose-100 dark:border-rose-900/30 animate-in fade-in slide-in-from-top-2 duration-200">
                      {generalError}
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingLocation && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse cursor-pointer" 
              onClick={() => setDeletingLocation(null)}
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="p-8 text-center">
                <div className="mx-auto h-16 w-16 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center mb-6 border border-rose-100 dark:border-rose-900/50 animate-bounce">
                  <AlertCircle className="h-8 w-8 text-rose-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Delete Location?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-8">
                  Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-white">{deletingLocation.name}</span>? This action cannot be undone and may affect staff schedules and existing bookings.
                </p>

                <div className="grid grid-cols-2 gap-4 mt-8">
                  <button 
                    onClick={() => setDeletingLocation(null)}
                    className="py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleConfirmDelete}
                    disabled={deleteLoading}
                    className="bg-rose-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-rose-700 transition-all shadow-xl shadow-rose-100 dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Delete"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}

