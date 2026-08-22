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
  ChevronRight,
  ChevronLeft,
  CalendarCheck
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useState, useEffect, useRef, useMemo } from "react";
import { getLabels } from "@/lib/labels";
import { Logo } from "../logo";
import { TrialBadge } from "./trial-badge";
import { useTheme } from "next-themes";
import { CompactThemeToggle } from "./compact-theme-toggle";
import { Portal } from "../ui/portal";
import { searchGlobal, getPersonalProfile } from "@/app/actions/dashboard";
import { EditStaffForm } from "./edit-staff-form";
import { toast } from "sonner";
import { Loader2, User, Calendar as CalendarIcon, Users as UsersIcon, AlertCircle, Sparkles, Lock } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { checkStaffLockStatus } from "@/app/actions/auth";
import { LockedStaffScreen } from "./locked-staff-screen";

export function DashboardShell({ 
  children,
  session,
  tenant,
  dbTheme,
  initialCollapsed = false
}: { 
  children: React.ReactNode,
  session: any,
  tenant: any,
  dbTheme?: string,
  initialCollapsed?: boolean
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLockedClient, setIsLockedClient] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(initialCollapsed);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalMode, setProfileModalMode] = useState<"profile" | "security">("profile");
  const [profileData, setProfileData] = useState<{ staff: any; services: any[] } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const handleProfileClick = async (mode: "profile" | "security" = "profile") => {
    setProfileModalMode(mode);
    setIsProfileModalOpen(true);
    setLoadingProfile(true);
    try {
      const res = await getPersonalProfile();
      if (res.success) {
        setProfileData({
          staff: res.staff,
          services: res.services || []
        });
      } else {
        toast.error(res.error || "Failed to load profile");
        setIsProfileModalOpen(false);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load profile");
      setIsProfileModalOpen(false);
    } finally {
      setLoadingProfile(false);
    }
  };

  const toggleSidebar = () => {
    const next = !isSidebarCollapsed;
    setIsSidebarCollapsed(next);
    const userId = session?.user?.id;
    if (userId) {
      localStorage.setItem(`sidebar-collapsed:${userId}`, String(next));
      document.cookie = `sidebar-collapsed-${userId}=${next}; path=/; max-age=31536000; SameSite=Lax`;
    } else {
      localStorage.setItem("sidebar-collapsed", String(next));
      document.cookie = `sidebar-collapsed=${next}; path=/; max-age=31536000; SameSite=Lax`;
    }
  };

  useEffect(() => {
    const handleOpenProfile = (e: Event) => {
      const customEvent = e as CustomEvent;
      const mode = customEvent.detail?.mode || "profile";
      handleProfileClick(mode);
    };
    window.addEventListener("open-profile-modal", handleOpenProfile);
    return () => {
      window.removeEventListener("open-profile-modal", handleOpenProfile);
    };
  }, []);

  // Lock body scroll when the security settings popup is open
  useEffect(() => {
    if (isProfileModalOpen && profileModalMode === "security") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isProfileModalOpen, profileModalMode]);

  useEffect(() => {
    // Only check if user is a staff member
    if (session?.user?.role !== "STAFF") return;

    const checkLock = async () => {
      try {
        const res = await checkStaffLockStatus();
        if (res.isLocked) {
          setIsLockedClient(true);
        }
      } catch (e) {
        console.error("Failed to check lock status:", e);
      }
    };

    checkLock();

    // Periodically verify lock status in background every 30 seconds
    const interval = setInterval(checkLock, 30000);
    return () => clearInterval(interval);
  }, [pathname, session]);

  const { theme, setTheme } = useTheme();
  const [hasSyncedTheme, setHasSyncedTheme] = useState(false);

  useEffect(() => {
    if (dbTheme && !hasSyncedTheme) {
      setTheme(dbTheme);
      setHasSyncedTheme(true);
    }
  }, [dbTheme, hasSyncedTheme, setTheme]);

  const labels = getLabels(tenant?.businessType);
  const user = session?.user;

  const filteredNavItems = useMemo(() => {
    const items = [
      { name: "Overview", href: "/overview", icon: LayoutDashboard },
      { name: "Booking Calendar", href: `/${labels.appointmentSlug}`, icon: Calendar },
      { name: "Schedule Calendar", href: "/schedule", icon: CalendarCheck },
      { name: labels.service + "s", href: `/${labels.serviceSlug}`, icon: labels.serviceIcon },
      { name: labels.staff + "s", href: `/${labels.staffSlug}`, icon: labels.staffIcon },
      { name: labels.customer + "s", href: `/${labels.customerSlug}`, icon: labels.customerIcon },
      { name: "My Schedule", href: "/my-schedule", icon: Clock },
      { name: "Settings", href: "/settings/business", icon: Settings },
    ];
    return items;
  }, [labels]);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Manage body class once on mount
  useEffect(() => {
    document.body.classList.add('in-dashboard');
    return () => {
      document.body.classList.remove('in-dashboard');
      document.body.classList.remove('sidebar-collapsed');
    };
  }, []);

  // Manage body class for sidebar collapsed state
  useEffect(() => {
    if (isSidebarCollapsed) {
      document.body.classList.add("sidebar-collapsed");
    } else {
      document.body.classList.remove("sidebar-collapsed");
    }
  }, [isSidebarCollapsed]);

  // Manage body class for logout confirmation
  useEffect(() => {
    if (showLogoutConfirm) {
      document.body.classList.add("logout-confirm-active");
    } else {
      document.body.classList.remove("logout-confirm-active");
    }
    return () => {
      document.body.classList.remove("logout-confirm-active");
    };
  }, [showLogoutConfirm]);

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
    return "bg-indigo-50/40 dark:bg-slate-950";
  };

  const bgClass = getPageBackground(pathname);
  // Helper to determine if a link is active (normalized)
  const isLinkActive = (href: string) => {
    const currentPath = pathname.replace(/\/$/, "") || "/";
    const targetPath = href.replace(/\/$/, "") || "/";
    if (targetPath === "/overview") {
      return currentPath === "/overview";
    }
    if (targetPath.startsWith("/settings")) {
      return currentPath.startsWith("/settings");
    }
    return currentPath === targetPath || currentPath.startsWith(targetPath + "/");
  };

  if (isLockedClient) {
    return <LockedStaffScreen tenantName={tenant?.name || "Business"} />;
  }

  return (
    <div className="flex flex-1 bg-white dark:bg-slate-950 transition-colors duration-500 text-slate-900 dark:text-slate-100">
      <aside className={`hidden lg:flex flex-col shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-100 dark:border-slate-800 z-[100001] transition-all duration-300 sticky top-0 h-screen relative ${isSidebarCollapsed ? "w-20" : "w-72"}`}>
        {/* Collapse Toggle Button */}
        <div className="absolute right-[-14px] top-10 z-[100002]">
          <Tooltip content={isSidebarCollapsed ? "Expand" : "Collapse"} position="right" delay={100}>
            <button
              onClick={toggleSidebar}
              className="w-7 h-7 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white shadow-md hover:scale-105 transition-all outline-none"
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </Tooltip>
        </div>

        <div className={`h-16 lg:h-20 flex items-center ${isSidebarCollapsed ? "px-4 justify-center" : "px-8"}`}>
          <Link href="/overview" className="relative -top-0.5">
            <Logo 
              size="xl" 
              textClassName={isSidebarCollapsed ? "hidden" : "dark:text-white"} 
              iconClassName={isSidebarCollapsed ? "w-11 h-11 flex items-center justify-center rounded-xl p-0 !bg-indigo-50 dark:!bg-indigo-950/40 !shadow-none [&_svg]:!text-indigo-600 dark:[&_svg]:!text-indigo-400 [&_svg]:!h-7 [&_svg]:!w-7" : ""}
            />
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {filteredNavItems.map((item) => {
            const isActive = isLinkActive(item.href);
            
            const className = `flex items-center transition-all group relative overflow-hidden ${
              isSidebarCollapsed 
                ? `w-11 h-11 mx-auto justify-center rounded-xl ${
                    isActive 
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 dark:shadow-none" 
                      : "text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`
                : `justify-between px-4 py-1.5 rounded-[1.25rem] ${
                    isActive 
                      ? "bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 dark:shadow-none" 
                      : "text-slate-900 dark:text-white hover:bg-white dark:hover:bg-slate-800"
                  }`
            }`;

            const iconClass = `h-5 w-5 transition-transform duration-300 group-hover:scale-110 ${
              isActive ? "text-white" : "text-slate-900 dark:text-white"
            }`;

            const content = isSidebarCollapsed ? (
              <div className="flex items-center justify-center relative z-10 w-8 h-8 shrink-0">
                <item.icon className={iconClass} />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 relative z-10">
                  <div className="w-8 h-8 flex items-center justify-center shrink-0">
                    <item.icon className={iconClass} />
                  </div>
                  <span className="text-base font-medium tracking-tight whitespace-nowrap">{item.name}</span>
                </div>
                {isActive && <ChevronRight className="h-4 w-4 text-white/50 relative z-10" />}
              </>
            );

            const buttonEl = isActive ? (
              <div key={item.name} className={className}>{content}</div>
            ) : (
              <Link key={item.name} href={item.href} className={className}>
                {content}
              </Link>
            );

            if (isSidebarCollapsed) {
              return (
                <div key={item.name} className="w-full flex justify-center py-0">
                  <Tooltip content={item.name} position="right" delay={100}>
                    {buttonEl}
                  </Tooltip>
                </div>
              );
            }

            return buttonEl;
          })}
        </nav>

        <div className="mt-auto">
          <div className={`border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 ${isSidebarCollapsed ? "p-3 flex justify-center" : "p-4"}`}>
            {isSidebarCollapsed ? (
              <Tooltip content="Logout" position="right" delay={100}>
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="flex items-center justify-center w-11 h-11 text-slate-900 dark:text-white hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all group"
                >
                  <div className="w-8 h-8 flex items-center justify-center shrink-0">
                    <LogOut className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
                  </div>
                </button>
              </Tooltip>
            ) : (
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="flex items-center gap-2 w-full px-4 py-1.5 text-slate-900 dark:text-white hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all group"
              >
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  <LogOut className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
                </div>
                <span className="text-base font-medium">Logout</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Header */}
        <header className="h-16 lg:h-20 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-6 lg:px-10 z-[500] sticky top-0 transition-all duration-500">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
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
              placeholder={`Search ${labels.appointmentLower}s, ${labels.customerLower}s...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 focus:border-indigo-500/40 dark:focus:border-indigo-500/40 rounded-2xl text-sm font-medium focus:outline-none focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-4 focus:ring-indigo-500/5 shadow-sm"
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
            {tenant?.plan !== "FREE" && (
              <TrialBadge planStatus={tenant?.planStatus} trialEndsAt={tenant?.trialEndsAt} plan={tenant?.plan} />
            )}
            {tenant?.plan !== "FREE" && tenant?.planStatus !== "TRIALING" && (
              <Link 
                href="/settings/billing"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-amber-600 dark:text-amber-400 transition-all active:scale-95 group shadow-sm shrink-0"
              >
                <Tooltip 
                  content={
                    tenant?.plan === "PRO" 
                      ? "You have unlimited practitioners and full access to all features." 
                      : "Upgrade your plan to unlock more practitioners. Go to Settings › Billing."
                  } 
                  position="bottom"
                >
                  {tenant?.plan === "PRO" ? (
                    <Sparkles className="h-3.5 w-3.5 text-current" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-current" />
                  )}
                </Tooltip>
                <span className="text-[9px] font-black uppercase tracking-wider hidden sm:inline">
                  {tenant?.plan === "PRO" ? "Pro Plan" : "Starter Plan"}
                </span>
              </Link>
            )}
            {tenant?.plan === "FREE" && tenant?.trialEndsAt && new Date(tenant.trialEndsAt) < new Date() && (
              <Link 
                href="/settings/billing"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 transition-all active:scale-95 group shadow-sm text-amber-600 dark:text-amber-400 shrink-0"
              >
                <Tooltip content="Upgrade your plan to unlock more practitioners. Go to Settings › Billing." position="bottom">
                  <AlertCircle className="h-3.5 w-3.5" />
                </Tooltip>
                <span className="text-[9px] font-black uppercase tracking-wider hidden sm:inline">
                  Trial Ended ({tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1).toLowerCase()} Plan)
                </span>
              </Link>
            )}
            <CompactThemeToggle />
            <button className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-white transition-all relative shadow-sm">
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-rose-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
            </button>
            
            <div 
              onClick={() => handleProfileClick("profile")}
              className="flex items-center gap-3 pl-2 border-l border-slate-100 dark:border-slate-800 cursor-pointer hover:opacity-80 transition-all select-none group"
            >
              <div className="hidden md:flex flex-col items-end">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[120px] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{user?.name || "User"}</p>
                <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{user?.role || "Member"}</p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-indigo-600 shadow-lg shadow-indigo-500/20 flex items-center justify-center text-white font-medium text-xs border-2 border-white dark:border-slate-800 select-none group-hover:scale-105 transition-all shrink-0">
                {user?.name?.substring(0, 2).toUpperCase() || "US"}
              </div>
            </div>
          </div>
        </header>
        
        <div className={`flex-1 flex flex-col min-w-0 transition-colors duration-700 ${bgClass}`}>
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
              <div className="h-20 px-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <Logo size="xl" textClassName="text-slate-900 dark:text-white" />
                <div className="flex items-center gap-2">
                  <CompactThemeToggle />
                  <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800">
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
                      <span className="text-base font-medium whitespace-nowrap">{item.name}</span>
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
                 <div className="p-8 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={() => {
                      setIsMobileMenuOpen(false);
                      setShowLogoutConfirm(true);
                    }} className="flex items-center gap-4 text-rose-600 font-medium">
                      <LogOut className="h-6 w-6" /> Logout
                    </button>
                 </div>
              </div>
            </aside>
          </div>
        </Portal>
      )}

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4">
            <div 
              className={`fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse ${
                profileModalMode === "security" ? "cursor-default" : "cursor-pointer"
              }`}
              onClick={() => {
                if (profileModalMode !== "security") {
                  setIsProfileModalOpen(false);
                }
              }}
            />
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-indigo-100/50 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
              <div className="px-8 py-6 border-b border-indigo-100/50 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 rounded-t-[2.4rem] z-10">
                <div className="flex items-center gap-3">
                  <div 
                    className="h-10 w-10 rounded-2xl flex items-center justify-center border shadow-sm"
                    style={{ 
                      borderColor: profileData?.staff?.color || "#6366f1", 
                      backgroundColor: `${profileData?.staff?.color || "#6366f1"}10` 
                    }}
                  >
                    {profileModalMode === "security" ? (
                      <Lock className="h-5 w-5" style={{ color: profileData?.staff?.color || "#6366f1" }} />
                    ) : (
                      <UserCircle className="h-5 w-5" style={{ color: profileData?.staff?.color || "#6366f1" }} />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      {profileModalMode === "security" ? "Security Settings" : "My Profile"}
                    </h2>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                      {profileModalMode === "security" ? "Update your credentials" : "Configuring your settings"}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsProfileModalOpen(false)} 
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <X className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                </button>
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                {loadingProfile ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading profile information...</p>
                  </div>
                ) : profileData?.staff ? (
                  <EditStaffForm 
                    staff={profileData.staff}
                    isAdmin={session?.user?.role === "ADMIN"}
                    onSuccess={() => {
                      setIsProfileModalOpen(false);
                      toast.success(
                        profileModalMode === "security" 
                          ? "Security settings updated successfully!" 
                          : "Profile updated successfully!"
                      );
                      window.location.reload();
                    }}
                    services={profileData.services}
                    businessType={tenant?.businessType}
                    country={tenant?.country}
                    securityOnlyMode={profileModalMode === "security"}
                  />
                ) : (
                  <div className="p-8 text-center space-y-4">
                    <div className="mx-auto h-16 w-16 rounded-3xl bg-amber-50 dark:bg-amber-900/10 flex items-center justify-center text-amber-500">
                      <AlertCircle className="h-8 w-8" />
                    </div>
                    <div className="max-w-sm mx-auto">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">No Linked Practitioner Profile</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        This user account is not linked to any practitioner profile. 
                        Please go to the Staff section to link your account or create a profile.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300"
              onClick={() => setShowLogoutConfirm(false)}
            />
            <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-8 animate-in zoom-in-95 duration-200 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-rose-400 to-rose-500" />
              
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-3xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mb-6">
                  <LogOut className="h-8 w-8 text-rose-600 dark:text-rose-400" />
                </div>
                
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Confirm Logout</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">Are you sure you want to log out of your account?</p>
                
                <div className="flex flex-col w-full gap-3">
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold shadow-lg shadow-rose-600/20 transition-all active:scale-[0.98]"
                  >
                    Yes, Logout
                  </button>
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="w-full py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-2xl font-bold transition-all active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
