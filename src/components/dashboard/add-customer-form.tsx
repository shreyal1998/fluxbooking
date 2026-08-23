"use client";

import { useState } from "react";
import { UserCircle, Mail, FileText, Loader2, Check, AlertCircle } from "lucide-react";
import { PhoneInput } from "@/components/ui/phone-input";
import { addCustomer } from "@/app/actions/customer";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getLabels } from "@/lib/labels";
import { COUNTRIES } from "@/config/countries";
import { validatePhoneNumber } from "@/lib/utils";

export function AddCustomerForm({ 
  tenantId, 
  onSuccess,
  businessType,
  country,
  skipRefresh = false
}: { 
  tenantId: string, 
  onSuccess?: (customer?: any) => void,
  businessType?: any,
  country?: string,
  skipRefresh?: boolean
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const labels = getLabels(businessType);
  const countryData = COUNTRIES.find(c => c.code === (country || "US"));
  const dialCode = countryData?.phoneCode ? `+${countryData.phoneCode} ` : "+1 ";

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    formData.append("tenantId", tenantId);

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;

    const errors: Record<string, string> = {};
    if (!name) errors.name = `${labels.customer} name is required`;
    if (!email) errors.email = "Email is required";

    const phoneError = validatePhoneNumber(phone);
    if (phoneError) errors.phone = phoneError;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    const result = await addCustomer(formData);
    if (result.success) {
      toast.success(`${labels.customer} added successfully!`);
      if (!skipRefresh) {
        router.refresh();
      }
      if (onSuccess) onSuccess(result.customer);
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
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span className="text-xs font-semibold">{message}</span>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900" noValidate>
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 premium-scrollbar">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">
              {labels.customer} Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                name="name"
                type="text"
                required
                onChange={() => clearFieldError("name")}
                onFocus={() => clearFieldError("name")}
                placeholder={labels.customerPlaceholder}
                className={`w-full pl-11 rounded-2xl border-2 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white shadow-sm ${
                  fieldErrors.name 
                    ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" 
                    : "border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-800 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900"
                }`}
              />
            </div>
            <InputError message={fieldErrors.name} />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                name="email"
                type="email"
                required
                onChange={() => clearFieldError("email")}
                onFocus={() => clearFieldError("email")}
                placeholder="customer@example.com"
                className={`w-full pl-11 rounded-2xl border-2 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white shadow-sm ${
                  fieldErrors.email 
                    ? "border-rose-100 bg-rose-50 dark:bg-rose-900/10 focus:border-rose-500" 
                    : "border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-slate-800 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900"
                }`}
              />
            </div>
            <InputError message={fieldErrors.email} />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">Phone Number</label>
            <PhoneInput
              name="phone"
              defaultCountry={country || "US"}
              defaultValue=""
              placeholder="234 567 890"
              hasError={!!fieldErrors.phone}
              onChange={() => clearFieldError("phone")}
              onFocus={() => clearFieldError("phone")}
            />
            <InputError message={fieldErrors.phone} />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">Internal Notes</label>
            <div className="relative">
              <FileText className="absolute left-4 top-4 h-4 w-4 text-slate-400" />
              <textarea
                name="notes"
                rows={3}
                placeholder="Any specific preferences or history..."
                className="w-full pl-11 rounded-2xl border-2 border-indigo-100/50 dark:border-slate-800 bg-indigo-50/30 dark:bg-slate-900 px-5 py-3 text-sm focus:outline-none transition-all dark:text-white resize-none shadow-sm hover:border-indigo-200 dark:hover:border-slate-800 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-4 border-t border-indigo-100/30 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-[2.5rem] transition-colors">
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md border border-transparent dark:border-white/10 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Check className="h-5 w-5" /> Add {labels.customer}</>}
        </button>
      </div>
    </form>
  );
}
