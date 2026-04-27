"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";
import { Footer } from "@/components/footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-white selection:bg-indigo-100 selection:text-indigo-900">
      {/* Global SaaS Header */}
      <header className="fixed top-0 w-full z-50 glass border-b border-slate-100/50">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-20 flex items-center justify-between">
          <Link 
            href="/"
            className="flex items-center gap-2 group outline-none cursor-pointer"
          >
            <div className="bg-indigo-600 p-1.5 rounded-lg group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/20">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-2xl tracking-tight text-slate-900">FluxBooking</span>
          </Link>
          <nav className="hidden md:flex items-center gap-10">
            <Link className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors" href="/#features">Features</Link>
            <Link className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors" href="/#pricing">Pricing</Link>
            <Link className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors" href="/docs">Docs</Link>
            <Link className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors" href="/login">Login</Link>
            <Link
              href="/register"
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 hover:shadow-indigo-200"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Global SaaS Footer */}
      <Footer />
    </div>
  );
}
