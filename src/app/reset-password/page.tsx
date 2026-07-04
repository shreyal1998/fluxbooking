"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2, Lock } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeCleaner } from "@/components/providers/theme-cleaner";
import { resetPassword } from "@/app/actions/auth";

const InputError = ({ message }: { message?: string }) => {
  if (!message) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1.5 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200">
      <AlertCircle className="h-3 w-3" />
      <span className="text-[10px] font-black uppercase tracking-wider">{message}</span>
    </div>
  );
};

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setGeneralError("Invalid or missing password reset token.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    setFieldErrors({});
    setGeneralError(null);

    const errors: Record<string, string> = {};
    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters long";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    try {
      const res = await resetPassword(token, password);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login?registered=password_reset_success");
        }, 3000);
      } else {
        setGeneralError(res.error || "Failed to reset password.");
      }
    } catch (err) {
      setGeneralError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-indigo-50/40 px-4 py-12 sm:px-6 lg:px-8">
        <ThemeCleaner />
        <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(99,102,241,0.12)] border border-slate-100 text-center animate-fade-in">
          <Logo size="xl" className="mx-auto mb-6" />
          <div className="bg-rose-50 text-rose-700 p-6 rounded-2xl border border-rose-100 flex flex-col items-center gap-3">
            <AlertCircle className="h-10 w-10 text-rose-500 animate-bounce" />
            <h3 className="text-lg font-black tracking-tight">Invalid Link</h3>
            <p className="text-sm font-medium text-rose-600">
              The password reset link is invalid, broken, or has expired. Please request a new link.
            </p>
          </div>
          <Link
            href="/forgot-password"
            className="mt-6 block w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-base transition-all flex items-center justify-center gap-2 shadow-2xl"
          >
            <span>Request New Link</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-indigo-50/40 px-4 py-12 sm:px-6 lg:px-8 selection:bg-indigo-100">
      <ThemeCleaner />
      <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(99,102,241,0.12)] border border-slate-100 animate-fade-in">
        <div className="flex flex-col items-center">
          <Link href="/" className="mb-6 outline-none">
            <Logo size="xl" />
          </Link>
          <h2 className="text-center text-3xl font-black text-slate-900 tracking-tight">
            Reset Password
          </h2>
          <p className="mt-2 text-center text-sm font-medium text-slate-500">
            Create a secure new password for your account
          </p>
        </div>

        {success ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-emerald-50 text-emerald-700 p-6 rounded-2xl border border-emerald-100 flex flex-col items-center text-center gap-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 animate-bounce" />
              <div className="space-y-1">
                <p className="font-extrabold text-lg">Password Updated!</p>
                <p className="text-sm text-emerald-600 font-medium">
                  Your password has been reset successfully. Redirecting you to login...
                </p>
              </div>
            </div>
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
            {generalError && (
              <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-sm font-bold border border-rose-100 flex items-center gap-2.5 animate-shake">
                <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
                <span>{generalError}</span>
              </div>
            )}
            
            <div className="space-y-5">
              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        const errs = { ...fieldErrors };
                        delete errs.password;
                        setFieldErrors(errs);
                      }
                    }}
                    className={`block w-full rounded-2xl border-2 px-4 py-3 text-slate-900 placeholder-slate-400 placeholder:text-xl placeholder:tracking-[0.25em] focus:bg-white focus:outline-none focus:ring-4 transition-all sm:text-sm font-medium shadow-sm pl-11 pr-10 ${
                      fieldErrors.password 
                        ? "border-rose-100 bg-rose-50 focus:border-rose-500 focus:ring-rose-500/10" 
                        : "border-indigo-100/50 bg-indigo-50/30 focus:border-indigo-600 focus:ring-indigo-500/10 hover:border-indigo-200"
                    }`}
                    placeholder="••••••••"
                  />
                  <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <InputError message={fieldErrors.password} />
              </div>

              {/* Confirm Password Input */}
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (fieldErrors.confirmPassword) {
                        const errs = { ...fieldErrors };
                        delete errs.confirmPassword;
                        setFieldErrors(errs);
                      }
                    }}
                    className={`block w-full rounded-2xl border-2 px-4 py-3 text-slate-900 placeholder-slate-400 placeholder:text-xl placeholder:tracking-[0.25em] focus:bg-white focus:outline-none focus:ring-4 transition-all sm:text-sm font-medium shadow-sm pl-11 pr-10 ${
                      fieldErrors.confirmPassword 
                        ? "border-rose-100 bg-rose-50 focus:border-rose-500 focus:ring-rose-500/10" 
                        : "border-indigo-100/50 bg-indigo-50/30 focus:border-indigo-600 focus:ring-indigo-500/10 hover:border-indigo-200"
                    }`}
                    placeholder="••••••••"
                  />
                  <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <InputError message={fieldErrors.confirmPassword} />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-base shadow-2xl shadow-slate-200 transition-all hover:bg-slate-800 hover:scale-[1.02] active:scale-95 disabled:bg-slate-300 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <span>Reset Password</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-indigo-50/40">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
