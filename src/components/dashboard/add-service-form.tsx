"use client";

import { useState } from "react";
import { Plus, Clock, DollarSign, Palette, AlertCircle, Loader2, Check } from "lucide-react";
import { addService } from "@/app/actions/dashboard";
import { toast } from "sonner";

export function AddServiceForm({ onSuccess }: { onSuccess?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

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
    const duration = formData.get("duration") as string;
    const price = formData.get("price") as string;

    const errors: Record<string, string> = {};
    if (!name) errors.name = "Service name is required";
    if (!duration) errors.duration = "Duration is required";
    if (!price) errors.price = "Price is required";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    const result = await addService(formData);

    if (result?.error) {
      setGeneralError(result.error);
      toast.error(result.error);
      setLoading(false);
    } else {
      toast.success("Service created successfully!");
      (e.target as HTMLFormElement).reset();
      setLoading(false);
      if (onSuccess) onSuccess();
    }
  };

  const InputError = ({ message }: { message?: string }) => {
    if (!message) return null;
    return (
      <div className="flex items-center gap-1.5 mt-1.5 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200">
        <AlertCircle className="h-3 w-3" />
        <span className="text-[10px] font-black uppercase tracking-wider">{message}</span>
      </div>
    );
  };

  return (
    <div className="px-8 py-6 transition-colors text-left bg-white dark:bg-slate-900">
      {generalError && (
        <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-bold border border-rose-100 dark:border-rose-900/30">
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Service Name</label>
          <input
            name="name"
            type="text"
            required
            onChange={() => clearFieldError("name")}
            placeholder="e.g., Haircut & Style"
            className={`w-full rounded-2xl border-2 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white bg-transparent ${
              fieldErrors.name ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" : "border-slate-100 dark:border-slate-700 focus:border-indigo-600"
            }`}
          />
          <InputError message={fieldErrors.name} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Duration (min)</label>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                name="duration"
                type="number"
                required
                onChange={() => clearFieldError("duration")}
                placeholder="30"
                className={`w-full pl-11 rounded-2xl border-2 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white bg-transparent ${
                  fieldErrors.duration ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" : "border-slate-100 dark:border-slate-700 focus:border-indigo-600"
                }`}
              />
            </div>
            <InputError message={fieldErrors.duration} />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Buffer Time (min)</label>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                name="bufferTime"
                type="number"
                min="0"
                defaultValue="0"
                placeholder="10"
                className="w-full pl-11 rounded-2xl border-2 border-slate-100 dark:border-slate-700 px-5 py-3 text-sm focus:outline-none transition-all focus:border-indigo-600 dark:text-white bg-transparent"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Price ($)</label>
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              name="price"
              type="number"
              step="0.01"
              required
              onChange={() => clearFieldError("price")}
              placeholder="50.00"
              className={`w-full pl-11 rounded-2xl border-2 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white bg-transparent ${
                fieldErrors.price ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" : "border-slate-100 dark:border-slate-700 focus:border-indigo-600"
              }`}
            />
          </div>
          <InputError message={fieldErrors.price} />
        </div>

        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-3 flex items-center gap-2">
            <Palette className="h-4 w-4 text-slate-400" />
            Brand Color
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
                <input type="radio" name="color" value={color.value} className="peer sr-only" defaultChecked={color.name === 'Indigo'} />
                <div className="w-8 h-8 rounded-xl border-2 border-transparent peer-checked:border-indigo-600 peer-checked:scale-110 transition-all shadow-sm group-hover:scale-110" style={{ backgroundColor: color.value }}></div>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center gap-2 py-4 px-4 rounded-2xl text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 dark:shadow-none border border-transparent dark:border-white/10 disabled:opacity-50 transition-all active:scale-[0.98]"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            <>
              <Check className="h-5 w-5" />
              Create Service
            </>
          )}
        </button>
      </form>
    </div>
  );
}
