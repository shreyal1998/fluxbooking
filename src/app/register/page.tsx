"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, Loader2, Eye, EyeOff, ArrowRight } from "lucide-react";
import { registerBusiness } from "@/app/actions/register";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    const result = await registerBusiness(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/login?registered=true");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-12 sm:px-6 lg:px-8 selection:bg-indigo-100">
      <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] border border-slate-100">
        <div className="flex flex-col items-center">
          <Link href="/" className="flex items-center gap-2 mb-6 group">
            <div className="bg-indigo-600 p-1.5 rounded-lg group-hover:scale-110 transition-transform">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight text-slate-900">FluxBooking</span>
          </Link>
          <h2 className="text-center text-3xl font-black text-slate-900 tracking-tight">
            Join FluxBooking
          </h2>
          <p className="mt-2 text-center text-sm font-medium text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-indigo-600 hover:text-indigo-500 underline-offset-4 hover:underline">
              Log in
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-sm font-bold border border-rose-100 animate-shake">
              {error}
            </div>
          )}
          <div className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="block w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all sm:text-sm font-medium"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="block w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all sm:text-sm font-medium"
                placeholder="john@example.com"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="block w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all sm:text-sm font-medium pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                  Confirm
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    className="block w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all sm:text-sm font-medium pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="businessName" className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                Business Name
              </label>
              <input
                id="businessName"
                name="businessName"
                type="text"
                required
                className="block w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all sm:text-sm font-medium"
                placeholder="My Awesome Salon"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="businessType" className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                  Type
                </label>
                <select
                  id="businessType"
                  name="businessType"
                  required
                  className="block w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-4 py-3 text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all sm:text-sm font-bold appearance-none cursor-pointer"
                >
                  <option value="SALON">Salon / Spa</option>
                  <option value="GYM">Gym / Fitness</option>
                </select>
              </div>
              <div>
                <label htmlFor="slug" className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                  Custom URL
                </label>
                <div className="flex rounded-2xl shadow-sm overflow-hidden border-2 border-slate-50">
                  <span className="inline-flex items-center bg-slate-100 px-3 text-slate-500 text-xs font-bold border-r border-slate-200">
                    /b/
                  </span>
                  <input
                    id="slug"
                    name="slug"
                    type="text"
                    required
                    className="block w-full min-w-0 flex-1 bg-slate-50 px-3 py-3 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none transition-all text-xs font-bold"
                    placeholder="my-salon"
                  />
                </div>
              </div>
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
                  <span>Create Account</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
