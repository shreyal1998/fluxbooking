import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { 
  Users, 
  Scissors, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  ArrowUpRight,
  Clock,
  CheckCircle2
} from "lucide-react";
import { format } from "date-fns";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tenantId = (session.user as any).tenantId;
  const userRole = (session.user as any).role;
  const userId = (session.user as any).id;

  // For staff, we need their staff profile ID
  const staffProfile = userRole === "STAFF" 
    ? await prisma.staff.findUnique({ where: { userId } })
    : null;

  const staffFilter = userRole === "STAFF" && staffProfile ? { staffId: staffProfile.id } : {};

  const [servicesCount, staffCount, bookingsCount, tenant, recentBookings, completedBookings] = await Promise.all([
    prisma.service.count({ where: { tenantId } }),
    prisma.staff.count({ where: { tenantId } }),
    prisma.booking.count({ 
      where: { 
        tenantId,
        status: { in: ["PENDING", "CONFIRMED"] },
        ...staffFilter
      } 
    }),
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.booking.findMany({
      where: { tenantId, ...staffFilter },
      include: { service: true, staff: true },
      orderBy: { startTime: "desc" },
      take: 5
    }),
    prisma.booking.findMany({
      where: { 
        tenantId, 
        status: "COMPLETED",
        ...staffFilter
      },
      include: { service: true }
    })
  ]);

  // Calculate Real Revenue
  const totalRevenue = completedBookings.reduce((sum, booking) => {
    return sum + Number(booking.service.price);
  }, 0);

  const stats = [
    { name: "Services", value: servicesCount, icon: Scissors, color: "text-blue-600", bg: "bg-blue-50/50", trend: "Active", hidden: userRole === "STAFF" },
    { name: "Team Members", value: staffCount, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50/50", trend: "Total", hidden: userRole === "STAFF" },
    { name: userRole === "STAFF" ? "My Active Bookings" : "Pending Bookings", value: bookingsCount, icon: CalendarIcon, color: "text-rose-600", bg: "bg-rose-50/50", trend: "Waiting" },
    { name: userRole === "STAFF" ? "My Revenue" : "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50/50", trend: "Real-time" },
  ].filter(s => !s.hidden);

  return (
    <div className="space-y-10 animate-fade-in transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Welcome back, {session.user?.name}</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Here's what's happening at <span className="text-indigo-600 dark:text-indigo-400 font-bold">{tenant?.name}</span> today.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Live Insights</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-soft group hover:shadow-xl hover:shadow-indigo-500/5 transition-all">
            <div className="flex items-center justify-between mb-6">
              <div className={`p-4 rounded-2xl ${stat.bg} dark:bg-slate-800`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="flex items-center gap-1 text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-lg">
                 <ArrowUpRight className="h-3 w-3" />
                 <span className="text-[10px] font-black uppercase tracking-tighter">{stat.trend}</span>
              </div>
            </div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">{stat.name}</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-soft">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Activity</h3>
              <a href="/dashboard/appointments" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">View all</a>
            </div>
            <div className="space-y-6">
              {recentBookings.length === 0 ? (
                <p className="text-center text-slate-400 py-8 italic text-sm">No recent activity.</p>
              ) : (
                recentBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between group transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-indigo-600 font-black text-xs group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        {booking.customerName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{booking.customerName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{booking.service.name} • with {booking.staff.name}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{format(new Date(booking.startTime), "h:mm a")}</p>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">{format(new Date(booking.startTime), "MMM d")}</p>
                      </div>
                      {booking.status === 'COMPLETED' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-soft">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              {userRole === "ADMIN" ? (
                <>
                  <a href="/dashboard/services" className="flex flex-col items-center justify-center p-6 rounded-3xl border border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-100 transition-all group">
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm mb-3 group-hover:scale-110 transition-transform">
                      <Scissors className="h-5 w-5 text-slate-400 group-hover:text-indigo-600" />
                    </div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-indigo-900 dark:group-hover:text-indigo-300 uppercase tracking-tighter">Services</span>
                  </a>
                  <a href="/dashboard/my-schedule" className="flex flex-col items-center justify-center p-6 rounded-3xl border border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-100 transition-all group">
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm mb-3 group-hover:scale-110 transition-transform">
                      <Clock className="h-5 w-5 text-slate-400 group-hover:text-indigo-600" />
                    </div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-indigo-900 dark:group-hover:text-indigo-300 uppercase tracking-tighter">My Schedule</span>
                  </a>
                </>
              ) : (
                <>
                  <a href="/dashboard/my-schedule" className="flex flex-col items-center justify-center p-6 rounded-3xl border border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-100 transition-all group">
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm mb-3 group-hover:scale-110 transition-transform">
                      <CalendarIcon className="h-5 w-5 text-slate-400 group-hover:text-indigo-600" />
                    </div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-indigo-900 dark:group-hover:text-indigo-300 uppercase tracking-tighter">My Schedule</span>
                  </a>
                  <a href="/dashboard/appointments" className="flex flex-col items-center justify-center p-6 rounded-3xl border border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-100 transition-all group">
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm mb-3 group-hover:scale-110 transition-transform">
                      <CalendarIcon className="h-5 w-5 text-slate-400 group-hover:text-indigo-600" />
                    </div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-indigo-900 dark:group-hover:text-indigo-300 uppercase tracking-tighter">Bookings</span>
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
