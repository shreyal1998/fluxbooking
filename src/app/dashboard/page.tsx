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
import { getLabels } from "@/lib/labels";
import { format } from "date-fns";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tenantId = (session.user as any).tenantId;
  const userRole = (session.user as any).role;
  const userId = (session.user as any).id;

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const labels = getLabels(tenant?.businessType);

  // For staff, we need their staff profile ID
  const staffProfile = userRole === "STAFF" 
    ? await prisma.staff.findUnique({ where: { userId } })
    : null;

  const staffFilter = userRole === "STAFF" && staffProfile ? { staffId: staffProfile.id } : {};

  const [servicesCount, staffCount, bookingsCount, recentBookings, completedBookings] = await Promise.all([
    prisma.service.count({ where: { tenantId } }),
    prisma.staff.count({ where: { tenantId } }),
    prisma.booking.count({ 
      where: { 
        tenantId,
        status: { in: ["PENDING", "CONFIRMED"] },
        ...staffFilter
      } 
    }),
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
    { name: labels.service + "s", value: servicesCount, icon: Scissors, color: "text-blue-600", bg: "bg-blue-50/50", trend: "Active", hidden: userRole === "STAFF" },
    { name: labels.staff + " Team", value: staffCount, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50/50", trend: "Total", hidden: userRole === "STAFF" },
    { name: userRole === "STAFF" ? `My Active ${labels.appointment}s` : `Pending ${labels.appointment}s`, value: bookingsCount, icon: CalendarIcon, color: "text-rose-600", bg: "bg-rose-50/50", trend: "Waiting" },
    { name: userRole === "STAFF" ? "My Revenue" : "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50/50", trend: "Real-time" },
  ].filter(s => !s.hidden);

  return (
    <div className="h-full flex flex-col animate-fade-in p-4 md:p-6 lg:p-8">
      <div className="flex-1 bg-white dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-soft overflow-hidden flex flex-col p-8 md:p-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Welcome back, {session.user?.name}</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Here's what's happening at <span className="text-indigo-600 dark:text-indigo-400 font-bold">{tenant?.name}</span> today.</p>
          </div>
          <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm self-start md:self-auto">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
            <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Live Insights</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-10">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.name} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-soft group hover:shadow-xl hover:shadow-indigo-500/5 transition-all">
                <div className="flex items-center justify-between mb-6">
                  <div className={`p-4 rounded-2xl ${stat.bg} dark:bg-slate-800`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-lg">
                     <ArrowUpRight className="h-3 w-3" />
                     <span className="text-[10px] font-black uppercase tracking-tighter">{stat.trend}</span>
                  </div>
                </div>
                <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{stat.name}</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stat.value}</h3>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Main Feed */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-soft h-full">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Recent Activity</h3>
                  <a href="/dashboard/appointments" className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:text-indigo-700 transition-colors">View all</a>
                </div>
                <div className="space-y-8">
                  {recentBookings.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="h-10 w-10 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                      <p className="text-slate-400 dark:text-slate-500 font-bold italic text-sm">No recent activity.</p>
                    </div>
                  ) : (
                    recentBookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between group transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-white font-black text-sm group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                            {booking.customerName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 dark:text-white">{booking.customerName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{booking.service.name} • with {booking.staff.name}</p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-6">
                          <div>
                            <p className="text-sm font-black text-slate-900 dark:text-white">{format(new Date(booking.startTime), "h:mm a")}</p>
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{format(new Date(booking.startTime), "MMM d")}</p>
                          </div>
                          {booking.status === 'COMPLETED' ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-slate-100 dark:border-slate-800" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-10">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-soft">
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-8">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-4">
                  {userRole === "ADMIN" ? (
                    <>
                      <a href="/dashboard/services" className="flex flex-col items-center justify-center p-6 rounded-[2rem] border border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-100 transition-all group">
                        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform border border-slate-100 dark:border-slate-800">
                          <Scissors className="h-5 w-5 text-slate-400 dark:text-slate-200 group-hover:text-indigo-600" />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 uppercase tracking-widest">Services</span>
                      </a>
                      <a href="/dashboard/my-schedule" className="flex flex-col items-center justify-center p-6 rounded-[2rem] border border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-100 transition-all group">
                        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform border border-slate-100 dark:border-slate-800">
                          <Clock className="h-5 w-5 text-slate-400 dark:text-slate-200 group-hover:text-indigo-600" />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 uppercase tracking-widest">Schedule</span>
                      </a>
                    </>
                  ) : (
                    <>
                      <a href="/dashboard/my-schedule" className="flex flex-col items-center justify-center p-6 rounded-[2rem] border border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-100 transition-all group">
                        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform border border-slate-100 dark:border-slate-800">
                          <CalendarIcon className="h-5 w-5 text-slate-400 dark:text-slate-200 group-hover:text-indigo-600" />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 uppercase tracking-widest">Schedule</span>
                      </a>
                      <a href="/dashboard/appointments" className="flex flex-col items-center justify-center p-6 rounded-[2rem] border border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-100 transition-all group">
                        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform border border-slate-100 dark:border-slate-800">
                          <CalendarIcon className="h-5 w-5 text-slate-400 dark:text-slate-200 group-hover:text-indigo-600" />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 uppercase tracking-widest">Bookings</span>
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
