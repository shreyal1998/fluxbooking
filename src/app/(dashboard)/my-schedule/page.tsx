import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { EditStaffForm } from "@/components/dashboard/edit-staff-form";
import { LeaveRequestForm } from "@/components/dashboard/leave-request-form";
import { QuickBlockForm } from "@/components/dashboard/quick-block-form";
import { Clock, Calendar, History, Ban, Sparkles, ChevronRight, User } from "lucide-react";
import { LeaveHistoryList } from "@/components/dashboard/leave-history-list";
import { ShareableLink } from "@/components/dashboard/shareable-link";
import { ActiveBlocksList } from "@/components/dashboard/active-blocks-list";
import { format } from "date-fns";
import { getLabels } from "@/lib/labels";
import Link from "next/link";

export default async function MySchedulePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = (session.user as any).id;
  const tenantId = (session.user as any).tenantId;
  const userRole = (session.user as any).role;
  
  const [staffProfile, services, nextAppointment, tenant] = await Promise.all([
    prisma.staff.findUnique({
      where: { userId },
      include: {
        user: true,
        services: true,
        leaveRequests: {
          orderBy: { createdAt: "desc" },
          take: 20
        },
        blockedSlots: {
          where: {
            endTime: { gte: new Date() },
            NOT: {
              reason: { startsWith: "Leave:" }
            }
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
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { businessType: true, timeFormat: true, weekStart: true, slug: true }
    })  ]);

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

  const labels = getLabels(tenant?.businessType);
  const timeFormat = tenant?.timeFormat || "12h";
  const timeDisplayFormat = timeFormat === "24h" ? "HH:mm" : "hh:mm a";

  return (
    <div className="flex-1 flex flex-col animate-fade-in pt-4 pb-6 px-6 md:pt-5 md:pb-8 md:px-8 lg:pt-6 lg:pb-10 lg:px-10 space-y-5">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div>
          <h2 className="text-xl font-medium text-slate-900 dark:text-slate-200 tracking-tight">My Schedule</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 px-6 py-3.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-[1.25rem] border border-emerald-100/50 dark:border-emerald-900/30 shadow-sm">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Active Status</span>
          </div>
        </div>
      </div>

      {/* Bottom Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Next Appointment & Quick Block */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Next Appointment Card */}
          {nextAppointment && (
            <div className="bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/10 dark:to-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-all duration-500 pointer-events-none">
                <Sparkles className="h-24 w-24 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <div className="px-3.5 py-1 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest shadow-sm">Next {labels.appointment}</div>
                  <span className="text-xs font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest pl-1">{format(new Date(nextAppointment.startTime), "EEEE, MMM do")}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-white dark:bg-slate-800 shadow-md flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-800 shrink-0">
                      <User className="h-7 w-7" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{nextAppointment.customerName}</h4>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-wider mt-1">{nextAppointment.service.name} • {format(new Date(nextAppointment.startTime), timeDisplayFormat)}</p>
                    </div>
                  </div>
                  <Link href={`/${labels.appointmentSlug}`} className="flex items-center justify-center gap-2 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm border border-slate-200 dark:border-slate-800 active:scale-95 transition-all">
                    Booking Calendar
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          )}
          {/* Quick Block Section */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative z-30">
            <div className="py-5 px-8 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5 bg-transparent">
              <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Ban className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-200 tracking-wide">Quick Block</span>
            </div>
            <div className="p-6 md:p-8">
              <QuickBlockForm 
                staffId={staffProfile.id} 
                existingBlocks={staffProfile.blockedSlots} 
                leaveRequests={staffProfile.leaveRequests.filter(l => l.status === "APPROVED")}
                timeFormat={tenant?.timeFormat || "12h"}
                weekStart={tenant?.weekStart || "sunday"}
              />
            </div>
          </div>

          {/* Leave Request Form */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl py-6 px-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative z-25">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-8 w-8 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-455 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-200 tracking-wide">Request Time Off</span>
            </div>
            <LeaveRequestForm isAdmin={userRole === "ADMIN"} timeFormat={tenant?.timeFormat || "12h"} weekStart={tenant?.weekStart || "sunday"} />
          </div>
        </div>

        {/* Right Side: Shareable Link & Leave History */}
        <div className="space-y-6">
          
          {/* Shareable Booking Link */}
          <ShareableLink 
            tenantSlug={tenant?.slug || ""} 
            staffId={staffProfile.id} 
            staffName={staffProfile.name} 
          />

          {/* Active Blocks */}
          <ActiveBlocksList 
            existingBlocks={staffProfile.blockedSlots} 
            timeFormat={tenant?.timeFormat || "12h"} 
          />

          {/* Leave History */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative z-10">
            <div className="py-5 px-8 border-b border-slate-200 dark:border-slate-800 bg-transparent">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <History className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-200 tracking-wide">Recent Leave History</span>
              </div>
            </div>
            <div className="p-6">
              <LeaveHistoryList leaveRequests={staffProfile.leaveRequests} timeFormat={tenant?.timeFormat || "12h"} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
