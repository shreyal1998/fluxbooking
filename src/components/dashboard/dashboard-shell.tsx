"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Scissors, 
  Users, 
  Calendar, 
  Settings, 
  LogOut,
  Bell,
  Search,
  Clock,
  UserCircle,
  Menu,
  X,
  ChevronRight
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { getLabels } from "@/lib/labels";
import { Logo } from "../logo";
import { TrialBanner } from "./trial-banner";
import { CompactThemeToggle } from "./compact-theme-toggle";
import NProgress from "nprogress";
import { Portal } from "../ui/portal";

export function DashboardShell({ 
  children,
  session,
  tenant
}: { 
  children: React.ReactNode,
  session: any,
  tenant: any
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Manage body class and force-dismiss stuck loaders
  useEffect(() => {
    document.body.classList.add('in-dashboard');
    NProgress.done();
    return () => document.body.classList.remove('in-dashboard');
  }, [pathname]);

  const labels = getLabels(tenant?.businessType);
  const user = session?.user;

  const navItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Booking Calendar", href: "/dashboard/appointments", icon: Calendar },
    { name: labels.service + "s", href: "/dashboard/services", icon: Scissors, adminOnly: true },
    { name: labels.staff, href: "/dashboard/staff", icon: Users, adminOnly: true },
    { name: "Customers", href: "/dashboard/customers", icon: UserCircle },
    { name: "My Schedule", href: "/dashboard/my-schedule", icon: Clock },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  const filteredNavItems = navItems.filter(item => 
    !item.adminOnly || user?.role === "ADMIN"
  );

  const getPageBackground = (path: string) => {
    return "bg-slate-50 dark:bg-slate-950";
  };

  const bgClass = getPageBackground(pathname);

  // Helper to determine if a link is active (normalized)
  const isLinkActive = (href: string) => {
    const currentPath = pathname.replace(/\/$/, "") || "/";
    const targetPath = href.replace(/\/$/, "") || "/";
    return currentPath === targetPath;
  };

  return (
    <div className="flex flex-1 bg-white dark:bg-slate-950 transition-colors duration-500 overflow-hidden text-slate-900 dark:text-slate-100">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 z-[100001] transition-all duration-500 relative">
        <div className="h-20 lg:h-24 px-6 lg:px-10 flex items-center">
          {isLinkActive("/dashboard") ? (
            <div className="px-2 relative -top-0.5 left-2 cursor-default">
              <Logo size="xl" textClassName="dark:text-white" />
            </div>
          ) : (
            <Link href="/dashboard" className="px-2 relative -top-0.5 left-2">
              <Logo size="xl" textClassName="dark:text-white" />
            </Link>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {filteredNavItems.map((item) => {
            const isActive = isLinkActive(item.href);
            const commonProps = {
              className: `flex items-center justify-between px-4 py-3 rounded-[1.25rem] transition-all group relative overflow-hidden ${
                isActive 
                  ? "bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 dark:shadow-none" 
                  : "text-slate-900 dark:text-white hover:bg-white dark:hover:bg-slate-800"
              }`
            };

            const content = (
              <>
                <div className="flex items-center gap-4 relative z-10">
                  <item.icon className={`h-5 w-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? "text-white" : "text-slate-900 dark:text-white"}`} />
                  <span className={`text-sm font-medium tracking-tight`}>{item.name}</span>
                </div>
                {isActive && <ChevronRight className="h-4 w-4 text-white/50 relative z-10" />}
              </>
            );

            if (isActive) {
              return <div key={item.name} {...commonProps}>{content}</div>;
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                {...commonProps}
              >
                {content}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <TrialBanner 
            planStatus={tenant?.planStatus} 
            trialEndsAt={tenant?.trialEndsAt} 
          />
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-4 w-full px-5 py-4 text-slate-900 dark:text-white hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all group"
            >
              <LogOut className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Top Header */}
        <header className="h-20 lg:h-24 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 lg:px-10 z-50 sticky top-0 transition-all duration-500">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white shadow-sm"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex-1 max-w-xl mx-8 hidden sm:block relative group">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
             <input 
              placeholder="Search appointments, customers..."
              className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 focus:border-indigo-600/20 dark:focus:border-indigo-500/20 rounded-2xl text-sm font-medium focus:outline-none focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
             />
          </div>

          <div className="flex items-center gap-4 lg:gap-6">
            <CompactThemeToggle />
            <button className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-white transition-all relative shadow-sm">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-rose-500 border-2 border-white dark:border-slate-700 rounded-full"></span>
            </button>
            <div className="h-10 lg:h-12 w-10 lg:w-12 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-500/20 flex items-center justify-center text-white font-medium text-sm border-2 border-white dark:border-slate-700 select-none hover:scale-105 transition-transform cursor-pointer">
              {user?.name?.substring(0, 2).toUpperCase() || "US"}
            </div>
          </div>
        </header>
        
        <div className={`flex-1 flex flex-col overflow-hidden transition-colors duration-700 ${bgClass}`}>
          {children}
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] absolute-top lg:hidden">
            <div 
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse cursor-pointer" 
              onClick={() => setIsMobileMenuOpen(false)} 
            />
            <aside className="absolute left-0 top-0 bottom-0 w-80 bg-white dark:bg-slate-900 shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col">
              <div className="h-20 px-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-700">
                <div className="relative -top-0.5 left-2">
                  <Logo size="xl" textClassName="text-slate-900 dark:text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <CompactThemeToggle />
                  <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <X className="h-6 w-6 text-slate-900 dark:text-white" />
                  </button>
                </div>
              </div>
              <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
                {filteredNavItems.map((item) => {
                  const isActive = isLinkActive(item.href);
                  const commonProps = {
                    className: `flex items-center gap-4 px-6 py-5 rounded-3xl transition-all ${
                      isActive 
                        ? "bg-indigo-600 text-white shadow-xl shadow-indigo-500/20" 
                        : "text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`
                  };
                  const content = (
                    <>
                      <item.icon className="h-6 w-6" />
                      <span className="text-base font-medium">{item.name}</span>
                    </>
                  );

                  if (isActive) {
                    return <div key={item.name} {...commonProps}>{content}</div>;
                  }

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      {...commonProps}
                    >
                      {content}
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-auto">
                 <TrialBanner 
                  planStatus={tenant?.planStatus} 
                  trialEndsAt={tenant?.trialEndsAt} 
                 />
                 <div className="p-8 border-t border-slate-100 dark:border-slate-700">
                    <button onClick={() => signOut()} className="flex items-center gap-4 text-rose-600 font-medium">
                      <LogOut className="h-6 w-6" /> Logout
                    </button>
                 </div>
              </div>
            </aside>
          </div>
        </Portal>
      )}
    </div>
  );
}
