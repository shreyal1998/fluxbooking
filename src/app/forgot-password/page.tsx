"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, ArrowLeft, ArrowRight, AlertCircle, Mail, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeCleaner } from "@/components/providers/theme-cleaner";
import { requestPasswordReset } from "@/app/actions/auth";

const InputError = ({ message }: { message?: string }) => {
  if (!message) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1.5 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      <span className="text-xs font-semibold">{message}</span>
    </div>
  );
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setFieldError(null);
    setGeneralError(null);
    setSuccess(false);

    if (!email) {
      setFieldError("Email is required");
      setLoading(false);
      return;
    }

    try {
      const res = await requestPasswordReset(email);
      if (res.success) {
        setSuccess(true);
      } else {
        setGeneralError(res.error || "Failed to send reset link.");
      }
    } catch (err) {
      setGeneralError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-indigo-50/40 px-4 py-12 sm:px-6 lg:px-8 selection:bg-indigo-100">
      <ThemeCleaner />
      <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(99,102,241,0.12)] border border-slate-100 animate-fade-in">
        <div className="flex flex-col items-center">
          <Link href="/" className="mb-6 outline-none">
            <Logo size="xl" />
          </Link>
          <h2 className="text-center text-3xl font-black text-slate-900 tracking-tight">
            Forgot Password
          </h2>
          <p className="mt-2 text-center text-sm font-medium text-slate-500">
            Enter your email to receive a password reset link
          </p>
        </div>

        {success ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-emerald-50 text-emerald-700 p-5 rounded-2xl border border-emerald-100 flex flex-col items-center text-center gap-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 animate-bounce" />
              <div className="space-y-1">
                <p className="font-extrabold text-base">Check your inbox</p>
                <p className="text-sm text-emerald-600 font-medium">
                  We've sent a secure password reset link to <strong className="font-bold">{email}</strong>.
                </p>
              </div>
            </div>
            
            <div className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
              <p className="font-bold text-slate-500 uppercase tracking-widest text-[9px]">Development Mode Note:</p>
              <p className="font-medium">
                In local development, the reset link is printed directly in your server terminal output.
              </p>
            </div>

            <Link
              href="/login"
              className="w-full h-14 bg-slate-950 text-white rounded-2xl font-black text-base shadow-2xl shadow-slate-200 transition-all hover:bg-slate-800 flex items-center justify-center gap-3"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Login</span>
            </Link>
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
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-slate-500 dark:text-slate-400 ml-1 mb-2">
                  Email address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFieldError(null);
                    }}
                    className={`block w-full rounded-2xl border-2 px-4 py-3 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none transition-all sm:text-sm font-medium shadow-sm pl-11 ${
                      fieldError 
                        ? "border-rose-100 bg-rose-50 focus:border-rose-500" 
                        : "border-indigo-100/50 bg-indigo-50/30 focus:border-indigo-600 hover:border-indigo-200"
                    }`}
                    placeholder="john@example.com"
                  />
                  <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                </div>
                <InputError message={fieldError || undefined} />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-base shadow-2xl shadow-slate-200 transition-all hover:bg-slate-800 hover:scale-[1.02] active:scale-95 disabled:bg-slate-300 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <span>Send Reset Link</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>

              <Link
                href="/login"
                className="w-full h-14 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-3"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Cancel</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
