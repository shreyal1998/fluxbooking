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
import { useState, useEffect, useRef, useMemo } from "react";
import { getLabels } from "@/lib/labels";
import { Logo } from "../logo";
import { TrialBadge } from "./trial-badge";
import { CompactThemeToggle } from "./compact-theme-toggle";
import NProgress from "nprogress";
import { Portal } from "../ui/portal";
import { searchGlobal } from "@/app/actions/dashboard";
import { Loader2, User, Calendar as CalendarIcon, Users as UsersIcon } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

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

  const labels = getLabels(tenant?.businessType);
  const user = session?.user;

  const filteredNavItems = useMemo(() => {
    const items = [
      { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { name: "Booking Calendar", href: "/dashboard/appointments", icon: Calendar },
      { name: labels.service + "s", href: "/dashboard/services", icon: labels.serviceIcon, adminOnly: true },
      { name: labels.staff, href: "/dashboard/staff", icon: labels.staffIcon, adminOnly: true },
      { name: labels.customer + "s", href: "/dashboard/customers", icon: labels.customerIcon },
      { name: "My Schedule", href: "/dashboard/my-schedule", icon: Clock },
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ];
    return items.filter(item => !item.adminOnly || user?.role === "ADMIN");
  }, [labels, user?.role]);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Manage body class and force-dismiss stuck loaders
  useEffect(() => {
    document.body.classList.add('in-dashboard');
    NProgress.done();
    return () => document.body.classList.remove('in-dashboard');
  }, [pathname]);

  // Global Search Logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          // 1. Search for Pages locally
          const matchingPages = filteredNavItems
            .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(item => ({
              id: item.href,
              type: 'page',
              title: item.name,
              subtitle: 'Navigate to Page',
              href: item.href,
              icon: item.icon
            }));

          // 2. Search for Data from Server
          const result = await searchGlobal(searchQuery);
          
          const combined = [...matchingPages, ...(result.results || [])];
          setSearchResults(combined);
        } catch (error) {
          console.error(error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, filteredNavItems]);

  // Close search results on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    <div className="flex flex-1 bg-white dark:bg-slate-950 transition-colors duration-500 text-slate-900 dark:text-slate-100">
      <aside className="hidden lg:flex flex-col w-72 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 z-[100001] transition-all duration-500 sticky top-0 h-screen">
        <div className="h-16 lg:h-20 px-6 lg:px-10 flex items-center">
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
      <main className="flex-1 flex flex-col relative">
        {/* Top Header */}
        <header className="h-16 lg:h-20 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 lg:px-10 z-50 sticky top-0 transition-all duration-500">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-900 dark:text-white shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="max-w-md w-full ml-0 md:ml-4 mr-auto hidden sm:block relative group" ref={searchRef}>
             {isSearching ? (
               <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-indigo-500" />
             ) : (
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
             )}
             <input 
              placeholder="Search appointments, customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-white/50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 focus:border-indigo-600/10 dark:focus:border-indigo-500/10 rounded-2xl text-sm font-medium focus:outline-none focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
             />

             {/* Search Results Dropdown */}
             {(searchResults.length > 0 || (searchQuery.length >= 2 && !isSearching)) && (
               <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 py-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                 {searchResults.length > 0 ? (
                   <>
                     <div className="px-4 py-2 border-b border-slate-50 dark:border-slate-800/50 mb-1">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Search Results</p>
                     </div>
                     <div className="max-h-80 overflow-y-auto custom-scrollbar">
                       {searchResults.map((result) => (
                         <Link
                           key={`${result.type}-${result.id}`}
                           href={result.href}
                           onClick={() => {
                             setSearchQuery("");
                             setSearchResults([]);
                           }}
                           className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                         >
                           <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                             result.type === 'customer' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                             result.type === 'appointment' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' :
                             result.type === 'staff' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                             result.type === 'page' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' :
                             'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                           }`}>
                             {result.type === 'customer' ? <labels.customerIcon className="h-4 w-4" /> :
                              result.type === 'appointment' ? <CalendarIcon className="h-4 w-4" /> :
                              result.type === 'staff' ? <labels.staffIcon className="h-4 w-4" /> :
                              result.type === 'page' ? <result.icon className="h-4 w-4" /> :
                              <labels.serviceIcon className="h-4 w-4" />}
                           </div>
                           <div className="flex-1 min-w-0">
                             <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{result.title}</p>
                             <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate uppercase tracking-tight">{result.subtitle}</p>
                           </div>
                           <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                         </Link>
                       ))}
                     </div>
                   </>
                 ) : (
                   <div className="px-6 py-10 text-center">
                      <div className="h-12 w-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                        <Search className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">No data found</p>
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Try another search term</p>
                   </div>
                 )}
               </div>
             )}
          </div>

          <div className="flex items-center gap-2 md:gap-4 lg:gap-6">
            <TrialBadge planStatus={tenant?.planStatus} trialEndsAt={tenant?.trialEndsAt} />
            <CompactThemeToggle />
            <Tooltip content="Notifications" position="bottom">
              <button className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-white transition-all relative shadow-sm">
                <Bell className="h-4.5 w-4.5" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-rose-500 border-2 border-white dark:border-slate-700 rounded-full"></span>
              </button>
            </Tooltip>
            
            <div className="flex items-center gap-3 pl-2 border-l border-slate-100 dark:border-slate-800">
              <div className="hidden md:flex flex-col items-end">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[120px]">{user?.name || "User"}</p>
                <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{user?.role || "Member"}</p>
              </div>
              <Tooltip content="Your Profile" position="bottom">
                <div className="h-9 w-9 rounded-xl bg-indigo-600 shadow-lg shadow-indigo-500/20 flex items-center justify-center text-white font-medium text-xs border-2 border-white dark:border-slate-700 select-none hover:scale-105 transition-transform cursor-pointer shrink-0">
                  {user?.name?.substring(0, 2).toUpperCase() || "US"}
                </div>
              </Tooltip>
            </div>
          </div>
        </header>
        
        <div className={`flex-1 flex flex-col transition-colors duration-700 ${bgClass}`}>
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
                <Logo size="xl" textClassName="text-slate-900 dark:text-white" />
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
