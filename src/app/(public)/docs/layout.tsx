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
  X,
  MapPin,
  UserCheck,
  Mail
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
      { name: "Visual Branding", href: "/docs/branding", icon: Layout },
      { name: "Locations", href: "/docs/locations", icon: MapPin },
    ]
  },
  {
    title: "Core Operations",
    links: [
      { name: "Staff & Practitioners", href: "/docs/staff", icon: Users },
      { name: "Services & Pricing", href: "/docs/services", icon: CreditCard },
      { name: "Calendar & Bookings", href: "/docs/bookings", icon: Calendar },
      { name: "Patients & Customers", href: "/docs/customers", icon: UserCheck },
    ]
  },
  {
    title: "Communication & Security",
    links: [
      { name: "Email Notifications", href: "/docs/notifications", icon: Mail },
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
    <div className="max-w-7xl w-full mx-auto flex flex-col md:flex-row relative pt-20 min-h-[calc(100vh-80px)]">
      {/* Mobile Toggle (Sticky below main header) */}
      <div className="md:hidden sticky top-20 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
          <Link href="/docs" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Docs</Link>
          <ChevronRight className="h-4 w-4 text-slate-400" />
          <span className="text-slate-900 dark:text-white font-semibold">{currentLink?.name || "Intro"}</span>
        </div>
        <button 
          className="p-1.5 -mr-1.5 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Docs Sidebar */}
      <aside className={`
        fixed inset-0 top-[120px] md:top-20 z-40 bg-white dark:bg-slate-950 md:bg-transparent md:sticky md:z-auto md:w-64 lg:w-72 shrink-0
        md:h-[calc(100vh-5rem)] border-r border-slate-100 dark:border-slate-800 transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="h-full overflow-y-auto thin-scrollbar p-6 md:pt-4 md:pb-8 md:pr-4 md:pl-0 lg:pt-6 lg:pr-6">
          <nav className="space-y-7">
            {sidebarLinks.map((section) => (
              <div key={section.title}>
                <h5 className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-2.5 px-2.5 uppercase tracking-wider">
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
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all group ${
                            isActive 
                              ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-sm shadow-indigo-100 dark:shadow-none" 
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-indigo-600 dark:hover:text-indigo-400"
                          }`}
                        >
                          <link.icon className={`h-4 w-4 shrink-0 transition-colors ${
                            isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                          }`} />
                          <span className="truncate whitespace-nowrap">{link.name}</span>
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
        <div className="px-6 md:px-10 lg:px-12 pt-4 pb-12 md:pt-5 md:pb-16 max-w-4xl">
          {/* Desktop Breadcrumb */}
          <div className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 mb-5">
            <Link href="/docs" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Docs</Link>
            <ChevronRight className="h-4 w-4 text-slate-400" />
            <span className="text-slate-900 dark:text-white font-semibold">{currentLink?.name || "Intro"}</span>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
