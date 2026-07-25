"use client";

import Link from "next/link";
import { Footer } from "@/components/footer";
import { Logo } from "@/components/logo";
import { ThemeCleaner } from "@/components/providers/theme-cleaner";
import { useSession } from "next-auth/react";
import { ReadingProgress } from "@/components/reading-progress";

function NavActions() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  return isAuthenticated ? (
    <Link
      href="/overview"
      className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 hover:shadow-indigo-200"
    >
      Go to Dashboard
    </Link>
  ) : (
    <>
      <Link className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors" href="/login">Login</Link>
      <Link
        href="/register"
        className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 hover:shadow-indigo-200"
      >
        Get Started
      </Link>
    </>
  );
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-white selection:bg-indigo-100 selection:text-indigo-900">
      <ReadingProgress />
      <ThemeCleaner />
      {/* Global SaaS Header */}
      <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-white/80 backdrop-blur-xl border-b border-slate-100/50 dark:border-slate-100/50">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-20 flex items-center justify-between">
          <Link 
            href="/"
            className="cursor-pointer relative -top-0.5 left-2"
          >
            <Logo textClassName="!text-slate-900 dark:!text-slate-900" />
          </Link>
          <nav className="hidden md:flex items-center gap-10">
            <Link 
              href="/features"
              scroll={false}
              onClick={() => window.dispatchEvent(new CustomEvent("flux-scroll", { detail: "features" }))}
              className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              Features
            </Link>
            <Link 
              href="/pricing"
              scroll={false}
              onClick={() => window.dispatchEvent(new CustomEvent("flux-scroll", { detail: "pricing" }))}
              className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              Pricing
            </Link>
            <Link className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors" href="/docs">Docs</Link>
            
            <NavActions />
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
