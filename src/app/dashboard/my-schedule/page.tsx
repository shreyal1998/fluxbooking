import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { AvailabilityEditor } from "@/components/dashboard/availability-editor";
import { EditStaffForm } from "@/components/dashboard/edit-staff-form";
import { LeaveRequestForm } from "@/components/dashboard/leave-request-form";
import { QuickBlockForm } from "@/components/dashboard/quick-block-form";
import { Clock, Calendar, History, Ban, Sparkles, ChevronRight, User } from "lucide-react";
import { format, differenceInMinutes, parse, startOfToday, endOfToday } from "date-fns";

export default async function MySchedulePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = (session.user as any).id;
  const tenantId = (session.user as any).tenantId;
  
  const [staffProfile, services, nextAppointment] = await Promise.all([
    prisma.staff.findUnique({
      where: { userId },
      include: {
        user: true,
        services: true,
        leaveRequests: {
          orderBy: { createdAt: "desc" },
          take: 5
        },
        blockedSlots: {
          where: {
            endTime: { gte: new Date() }
          },
          orderBy: { startTime: "asc" }
        }
      }
    }),
    prisma.service.findMany({
      where: { tenantId }
    }),
    prisma.booking.findFirst({
        where: {
            staff: { userId },
            startTime: { gte: new Date() },
            status: { in: ["PENDING", "CONFIRMED"] }
        },
        include: { service: true },
        orderBy: { startTime: "asc" }
    })
  ]);

  if (!staffProfile) {
    return (
      <div className="max-w-4xl mx-auto mt-20 text-center animate-fade-in">
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-8 rounded-3xl">
          <Clock className="h-12 w-12 text-amber-500 dark:text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-amber-900 dark:text-amber-200 mb-2">No Staff Profile Linked</h2>
          <p className="text-amber-700 dark:text-amber-400/80">
            Your user account is not yet linked to a staff profile. 
            Please ask your administrator to link your account in the Staff management section.
          </p>
        </div>
      </div>
    );
  }

  // Calculate total weekly hours
  const availability = typeof staffProfile.availabilityJson === 'string' 
    ? JSON.parse(staffProfile.availabilityJson) 
    : staffProfile.availabilityJson;
  
  let totalMinutes = 0;
  Object.values(availability).forEach((day: any) => {
    if (day && day.start && day.end) {
        const start = parse(day.start, "HH:mm", new Date());
        const end = parse(day.end, "HH:mm", new Date());
        totalMinutes += differenceInMinutes(end, start);
    }
  });
  const totalHours = Math.floor(totalMinutes / 60);

  return (
    <div className="h-full flex flex-col animate-fade-in p-4 md:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 px-4">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">My Schedule</h2>
          <p className="text-slate-900 dark:text-white font-normal mt-1 opacity-60">Manage your personal availability and time off.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 px-6 py-3 bg-white/70 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm backdrop-blur-md">
            <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-[10px] font-medium text-slate-900 dark:text-white uppercase tracking-widest">{totalHours} Weekly Hours</span>
          </div>
          <div className="hidden md:flex items-center gap-3 px-6 py-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 shadow-sm">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Active Status</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          
          {/* Next Appointment Card */}
          {nextAppointment && (
            <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-slate-900 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/50 p-8 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
                    <Sparkles className="h-24 w-24 text-indigo-600" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="px-3 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest">Next Appointment</div>
                        <span className="text-xs font-bold text-indigo-400">{format(new Date(nextAppointment.startTime), "EEEE, MMM do")}</span>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-white dark:bg-slate-800 shadow-md flex items-center justify-center text-indigo-600 border border-slate-100 dark:border-slate-700">
                                <User className="h-7 w-7" />
                            </div>
                            <div>
                                <h4 className="text-xl font-semibold text-slate-900 dark:text-white">{nextAppointment.customerName}</h4>
                                <p className="text-sm font-medium text-slate-900 dark:text-white opacity-60">{nextAppointment.service.name} • {format(new Date(nextAppointment.startTime), "h:mm a")}</p>
                            </div>
                        </div>
                        <a href="/dashboard/appointments" className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm border border-slate-100 dark:border-slate-700 hover:bg-slate-50 transition-all">
                            View Bookings
                            <ChevronRight className="h-4 w-4" />
                        </a>
                    </div>
                </div>
            </div>
          )}

          {/* Availability Section */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-soft overflow-hidden">
            <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Weekly Working Hours</h3>
                <p className="text-xs text-slate-900 dark:text-white font-normal opacity-60">Standard weekly availability.</p>
              </div>
            </div>
            <div className="p-8">
              <AvailabilityEditor 
                staffId={staffProfile.id} 
                initialAvailability={staffProfile.availabilityJson} 
              />
            </div>
          </div>

          {/* Quick Block Section */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-soft overflow-hidden">
            <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="h-10 w-10 rounded-2xl bg-slate-900 dark:bg-slate-800 flex items-center justify-center text-white">
                <Ban className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Quick Block</h3>
                <p className="text-xs text-slate-900 dark:text-white font-normal opacity-60">Temporarily block specific hours from your calendar.</p>
              </div>
            </div>
            <div className="p-8">
              <QuickBlockForm staffId={staffProfile.id} existingBlocks={staffProfile.blockedSlots} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-10">
          {/* Leave Request Form */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-soft">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-2xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <Calendar className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white leading-tight">Request Time Off</h3>
            </div>
            <p className="text-sm text-slate-900 dark:text-white font-normal opacity-60 mb-6 leading-relaxed">Submit your request for sick leave or vacation. Admin approval is required.</p>
            <LeaveRequestForm />
          </div>

          {/* Leave History */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-soft overflow-hidden">
            <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                <History className="h-4 w-4 text-slate-400" />
                Recent History
              </h3>
            </div>
            <div className="p-6">
              {staffProfile.leaveRequests.length === 0 ? (
                <p className="text-center text-slate-400 dark:text-slate-500 text-xs py-4 italic">No recent requests.</p>
              ) : (
                <div className="space-y-4">
                  {staffProfile.leaveRequests.map((request) => (
                    <div key={request.id} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-950/30">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-slate-900 dark:text-white">{request.type}</p>
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black tracking-wider border ${
                                request.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                request.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                'bg-amber-50 text-amber-600 border-amber-100'
                            }`}>
                                {request.status}
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-900 dark:text-white font-medium opacity-60">
                            {format(new Date(request.startTime), "MMM d")} - {format(new Date(request.endTime), "MMM d")}
                        </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
