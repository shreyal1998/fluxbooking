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
  UserCircle
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { getLabels } from "@/lib/labels";
import { BusinessType } from "@prisma/client";

export function DashboardShell({ 
  children,
  businessType 
}: { 
  children: React.ReactNode,
  businessType?: BusinessType
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const labels = getLabels(businessType);

  const navItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { 
      name: labels.service + "s", 
      href: "/dashboard/services", 
      icon: Scissors,
      adminOnly: true 
    },
    { 
      name: "Team", 
      href: "/dashboard/staff", 
      icon: Users,
      adminOnly: true 
    },
    { 
      name: labels.customer + "s", 
      href: "/dashboard/customers", 
      icon: UserCircle
    },
    { 
      name: "My Schedule", 
      href: "/dashboard/my-schedule", 
      icon: Clock
    },
    { name: "Appointments", href: "/dashboard/appointments", icon: Calendar },
    { 
      name: "Settings", 
      href: "/dashboard/settings", 
      icon: Settings,
      adminOnly: true 
    },
  ];

  const filteredNavItems = navItems.filter(item => {
    if ((item as any).adminOnly && userRole !== "ADMIN") return false;
    if ((item as any).staffOnly && userRole !== "STAFF") return false;
    return true;
  });

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] dark:bg-slate-950 transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col sticky top-0 h-screen">
        <div className="h-20 flex items-center px-8">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="bg-indigo-600 p-1.5 rounded-lg group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/20">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">FluxBooking</span>
          </Link>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1">
          <div className="px-4 mb-4">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Menu</p>
          </div>
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                  isActive 
                    ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 shadow-sm shadow-indigo-100/50 dark:shadow-none" 
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-4 mb-4 border border-slate-100 dark:border-slate-800">
             <p className="text-xs font-bold text-slate-900 dark:text-white mb-1">Need help?</p>
             <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">Check our documentation for quick start guides.</p>
             <button className="w-full py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
               View Docs
             </button>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all group"
          >
            <LogOut className="h-5 w-5 text-slate-400 dark:text-slate-500 group-hover:text-red-500 dark:group-hover:text-red-400" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 md:px-12 sticky top-0 z-[50]">
          <div className="flex items-center gap-4 flex-1">

             <h1 className="text-xl font-bold text-slate-900 dark:text-white hidden lg:block">
               {filteredNavItems.find(item => item.href === pathname)?.name || "Dashboard"}
             </h1>
             <div className="relative max-w-md w-full ml-4 z-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Quick search..." 
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl py-2.5 pl-10 pr-4 text-sm dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                />
             </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="h-10 w-10 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors relative">
               <Bell className="h-5 w-5" />
               <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
            </button>
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-indigo-200 dark:shadow-none cursor-pointer hover:scale-105 transition-transform">
              {session?.user?.name?.substring(0, 2).toUpperCase() || "US"}
            </div>
          </div>
        </header>
        
        <div className="p-8 md:p-12 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
