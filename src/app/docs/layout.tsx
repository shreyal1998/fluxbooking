"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BookOpen, 
  ChevronRight, 
  Settings, 
  Users, 
  Calendar, 
  CreditCard, 
  ShieldCheck,
  Zap,
  Layout,
  ArrowLeft
} from "lucide-react";

const sidebarLinks = [
  {
    title: "Getting Started",
    links: [
      { name: "Introduction", href: "/docs", icon: BookOpen },
      { name: "Quick Start", href: "/docs/quick-start", icon: Zap },
    ]
  },
  {
    title: "Setup & Configuration",
    links: [
      { name: "Business Profile", href: "/docs/business-profile", icon: Settings },
      { name: "Branding", href: "/docs/branding", icon: Layout },
    ]
  },
  {
    title: "Core Features",
    links: [
      { name: "Staff Management", href: "/docs/staff", icon: Users },
      { name: "Services & Pricing", href: "/docs/services", icon: CreditCard },
      { name: "Calendar & Bookings", href: "/docs/bookings", icon: Calendar },
    ]
  },
  {
    title: "Account & Security",
    links: [
      { name: "Data Isolation", href: "/docs/multi-tenancy", icon: ShieldCheck },
    ]
  }
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    // This keeps the URL as is but ensures we are at the top
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  // Find current link name for breadcrumb
  const currentLink = sidebarLinks
    .flatMap(section => section.links)
    .find(link => link.href === pathname);

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-80 border-r border-slate-100 hidden lg:block sticky top-0 h-screen overflow-y-auto bg-slate-50/50">
        <div className="p-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 mb-10 px-4 py-2 rounded-full border border-slate-200 bg-white text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:shadow-md hover:shadow-indigo-500/5 transition-all group"
          >
            <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" />
            fluxbooking.com
          </Link>

          <button 
            onClick={scrollToTop}
            className="flex items-center gap-2 mb-10 group outline-none cursor-pointer"
          >
            <div className="bg-indigo-600 p-1.5 rounded-lg group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/20">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <span className="font-black text-xl tracking-tight text-slate-900">FluxDocs</span>
          </button>

          <nav className="space-y-10">
            {sidebarLinks.map((section) => (
              <div key={section.title}>
                <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 px-2">
                  {section.title}
                </h5>
                <ul className="space-y-1">
                  {section.links.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                      <li key={link.name}>
                        <Link
                          href={link.href}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold transition-all group ${
                            isActive 
                              ? "bg-white text-indigo-600 shadow-sm" 
                              : "text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm"
                          }`}
                        >
                          <link.icon className={`h-4 w-4 transition-colors ${
                            isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-indigo-600"
                          }`} />
                          {link.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 border-b border-slate-100 flex items-center justify-between px-8 lg:px-12 sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <Link href="/docs" className="hover:text-slate-600 transition-colors">Documentation</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-900">{currentLink?.name || "Introduction"}</span>
          </div>
          <Link 
            href="/register" 
            className="text-xs font-black bg-indigo-600 text-white px-4 py-2 rounded-full hover:bg-indigo-700 transition-colors"
          >
            Start Free Trial
          </Link>
        </header>

        <div className="max-w-4xl mx-auto px-8 lg:px-12 py-16">
          {children}
        </div>
      </main>
    </div>
  );
}

