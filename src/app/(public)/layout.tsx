"use client";

import Link from "next/link";
import { Footer } from "@/components/footer";
import { Logo } from "@/components/logo";

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
            className="cursor-pointer relative -top-0.5 left-2"
          >
            <Logo />
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
