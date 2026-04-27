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
  Menu,
  X
} from "lucide-react";
import { useState } from "react";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Find current link name for breadcrumb
  const currentLink = sidebarLinks
    .flatMap(section => section.links)
    .find(link => link.href === pathname);

  return (
    <div className="max-w-7xl w-full mx-auto flex flex-col md:flex-row relative">
      {/* Mobile Toggle (Sticky below main header) */}
      <div className="md:hidden sticky top-20 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          <span>Docs</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-900">{currentLink?.name || "Intro"}</span>
        </div>
        <button 
          className="p-2 -mr-2 text-slate-600 bg-slate-50 rounded-lg"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Docs Sidebar */}
      <aside className={`
        fixed inset-0 top-[121px] md:top-0 z-40 bg-white md:bg-transparent md:sticky md:z-auto md:w-72 
        border-r border-slate-100 transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="h-full overflow-y-auto p-8 md:p-6 lg:p-12 md:pl-0">
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
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all group ${
                            isActive 
                              ? "bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-100" 
                              : "text-slate-600 hover:bg-slate-50 hover:text-indigo-600"
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

      {/* Content Section */}
      <main className="flex-1 min-w-0">
        <div className="px-6 md:px-12 py-10 lg:py-16 max-w-4xl">
          {/* Desktop Breadcrumb */}
          <div className="hidden md:flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-10">
            <Link href="/docs" className="hover:text-indigo-600 transition-colors">Docs</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-900">{currentLink?.name || "Intro"}</span>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
