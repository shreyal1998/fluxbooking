"use client";

import { useState } from "react";
import { AlertCircle, Loader2, Palette, Trash2, ShieldAlert, Scissors, Check } from "lucide-react";
import { updateStaffProfile, deleteStaff } from "@/app/actions/dashboard";
import { toast } from "sonner";

interface EditStaffFormProps {
  staff: {
    id: string;
    name: string;
    bio: string | null;
    color: string;
    user?: {
      email: string;
      phone: string | null;
    } | null;
    services?: any[];
  };
  isAdmin: boolean;
  onSuccess?: () => void;
  services: any[];
}

const InputError = ({ message }: { message?: string }) => {
  if (!message) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1.5 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200">
      <AlertCircle className="h-3 w-3" />
      <span className="text-[10px] font-black uppercase tracking-wider">{message}</span>
    </div>
  );
};

export function EditStaffForm({ staff, isAdmin, onSuccess, services }: EditStaffFormProps) {
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>(
    staff.services?.map(s => s.id) || []
  );

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId) 
        : [...prev, serviceId]
    );
  };

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      const newErrors = { ...fieldErrors };
      delete newErrors[field];
      setFieldErrors(newErrors);
    }
    setGeneralError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});
    setGeneralError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;

    const errors: Record<string, string> = {};
    if (isAdmin && !name) errors.name = "Staff name is required";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }
    
    // Append selected services
    selectedServices.forEach(id => formData.append("services", id));

    const result = await updateStaffProfile(staff.id, formData);

    if (result?.error) {
      setGeneralError(result.error);
      toast.error(result.error);
      setLoading(false);
    } else {
      toast.success("Profile updated successfully!");
      setLoading(false);
      if (onSuccess) onSuccess();
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleteLoading(true);
    setGeneralError(null);
    const result = await deleteStaff(staff.id);

    if (result?.error) {
      setGeneralError(result.error);
      toast.error(result.error);
      setDeleteLoading(false);
      setConfirmDelete(false);
    } else {
      toast.success("Staff member removed successfully!");
      setDeleteLoading(false);
      if (onSuccess) onSuccess();
    }
  };

  return (
    <div className="space-y-6">
      {generalError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl flex items-start gap-3 text-rose-600 dark:text-rose-400">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-xs font-bold leading-relaxed">{generalError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {isAdmin && (
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
            <input
              name="name"
              type="text"
              required
              defaultValue={staff.name}
              onChange={() => clearFieldError("name")}
              className={`w-full rounded-xl border-2 px-4 py-2 text-sm focus:outline-none transition-all dark:text-white bg-transparent ${
                fieldErrors.name ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" : "border-slate-100 dark:border-slate-700 focus:border-indigo-600"
              }`}
            />
            <InputError message={fieldErrors.name} />
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Bio / specialization</label>
          <textarea
            name="bio"
            rows={3}
            defaultValue={staff.bio || ""}
            onChange={() => clearFieldError("bio")}
            placeholder="e.g., Senior Stylist with 10 years experience..."
            className={`w-full rounded-xl border-2 px-4 py-2 text-sm focus:outline-none transition-all dark:text-white bg-transparent ${
              fieldErrors.bio ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" : "border-slate-100 dark:border-slate-700 focus:border-indigo-600"
            }`}
          />
          <InputError message={fieldErrors.bio} />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
          <input
            name="phone"
            type="tel"
            defaultValue={staff.user?.phone || ""}
            onChange={() => clearFieldError("phone")}
            placeholder="+1 234 567 8900"
            className={`w-full rounded-xl border-2 px-4 py-2 text-sm focus:outline-none transition-all dark:text-white bg-transparent ${
              fieldErrors.phone ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" : "border-slate-100 dark:border-slate-700 focus:border-indigo-600"
            }`}
          />
          <InputError message={fieldErrors.phone} />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <Palette className="h-4 w-4 text-slate-400" />
            Calendar Color
          </label>
          <div className="flex flex-wrap gap-3">
            {[
              { name: 'Indigo', value: '#6366f1' },
              { name: 'Emerald', value: '#10b981' },
              { name: 'Sky', value: '#0ea5e9' },
              { name: 'Amber', value: '#f59e0b' },
              { name: 'Rose', value: '#f43f5e' },
              { name: 'Violet', value: '#8b5cf6' },
            ].map((color) => (
              <label key={color.value} className="relative cursor-pointer group">
                <input 
                  type="radio" 
                  name="color" 
                  value={color.value} 
                  className="peer sr-only" 
                  defaultChecked={staff.color === color.value} 
                />
                <div 
                  className="w-8 h-8 rounded-xl border-2 border-transparent peer-checked:border-indigo-600 peer-checked:scale-110 transition-all shadow-sm group-hover:scale-110" 
                  style={{ backgroundColor: color.value }}
                ></div>
              </label>
            ))}
          </div>
        </div>

        {/* Service Selection */}
        {isAdmin && (
          <div className="pt-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Scissors className="h-4 w-4 text-slate-400" />
              Assigned Services
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 scrollbar-hide">
              {services?.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => toggleService(service.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left ${
                    selectedServices?.includes(service.id)
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20"
                      : "border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:border-indigo-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: service.color }}></div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{service.name}</span>
                  </div>
                  {selectedServices?.includes(service.id) && <Check className="h-4 w-4 text-indigo-600" />}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || deleteLoading}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none border border-transparent dark:border-white/10 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Profile Changes"}
        </button>
      </form>

      {isAdmin && (
        <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
          <div className="bg-rose-50 dark:bg-rose-900/10 p-5 rounded-2xl border border-rose-100 dark:border-rose-900/20">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-400 font-bold mb-1">
              <ShieldAlert className="h-4 w-4" />
              <h4 className="text-sm">Danger Zone</h4>
            </div>
            <p className="text-xs text-rose-600 dark:text-rose-400/70 mb-4">
              Deleting this staff member will also remove their historical data and past appointments. This cannot be undone.
            </p>
            <button
              onClick={handleDelete}
              disabled={loading || deleteLoading}
              className={`w-full py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                confirmDelete 
                  ? "bg-rose-600 text-white hover:bg-rose-700" 
                  : "bg-white dark:bg-slate-950 text-rose-600 border border-rose-200 dark:border-rose-900/30 hover:bg-rose-50 dark:hover:bg-rose-900/20"
              }`}
            >
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>
                  <Trash2 className="h-4 w-4" />
                  {confirmDelete ? "Click again to confirm delete" : "Remove Staff Member"}
                </>
              )}
            </button>
            {confirmDelete && (
              <button 
                onClick={() => setConfirmDelete(false)}
                className="w-full mt-2 text-[10px] font-bold text-slate-500 hover:underline"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
