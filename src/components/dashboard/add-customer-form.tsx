"use client";

import { useState } from "react";
import { UserCircle, Mail, Phone, FileText, Loader2, Check } from "lucide-react";
import { addCustomer } from "@/app/actions/customer";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getLabels } from "@/lib/labels";

export function AddCustomerForm({ 
  tenantId, 
  onSuccess,
  businessType
}: { 
  tenantId: string, 
  onSuccess?: () => void,
  businessType?: any
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const labels = getLabels(businessType);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    formData.append("tenantId", tenantId);

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;

    const errors: Record<string, string> = {};
    if (!name) errors.name = `${labels.customer} name is required`;
    if (!email) errors.email = "Email is required";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    const result = await addCustomer(formData);
    if (result.success) {
      toast.success(`${labels.customer} added successfully!`);
      router.refresh();
      if (onSuccess) onSuccess();
    } else {
      if (result.error?.includes("email")) {
        setFieldErrors({ email: "This email is already in use" });
      } else {
        toast.error(result.error);
      }
    }
    setLoading(false);
  };

  const InputError = ({ message }: { message?: string }) => {
    if (!message) return null;
    return (
      <div className="flex items-center gap-1.5 mt-1.5 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200">
        <span className="text-[10px] font-black uppercase tracking-wider">{message}</span>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 space-y-6" noValidate>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
            {labels.customer} Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              name="name"
              type="text"
              required
              placeholder={labels.customerPlaceholder}
              className={`w-full pl-11 rounded-2xl border-2 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white bg-transparent ${
                fieldErrors.name ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" : "border-slate-100 dark:border-slate-700 focus:border-indigo-600"
              }`}
            />
          </div>
          <InputError message={fieldErrors.name} />
        </div>

        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
            Email Address <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              name="email"
              type="email"
              required
              placeholder="customer@example.com"
              className={`w-full pl-11 rounded-2xl border-2 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white bg-transparent ${
                fieldErrors.email ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" : "border-slate-100 dark:border-slate-700 focus:border-indigo-600"
              }`}
            />
          </div>
          <InputError message={fieldErrors.email} />
        </div>

        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Phone Number</label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              name="phone"
              type="tel"
              placeholder="+1 234 567 890"
              className="w-full pl-11 rounded-2xl border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-600 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white bg-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Internal Notes</label>
          <div className="relative">
            <FileText className="absolute left-4 top-4 h-4 w-4 text-slate-400" />
            <textarea
              name="notes"
              rows={3}
              placeholder="Any specific preferences or history..."
              className="w-full pl-11 rounded-2xl border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-600 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white bg-transparent resize-none"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 dark:shadow-none disabled:opacity-50 transition-all flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Check className="h-5 w-5" /> Add {labels.customer}</>}
      </button>
    </form>
  );
}
