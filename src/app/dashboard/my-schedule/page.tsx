import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { AvailabilityEditor } from "@/components/dashboard/availability-editor";
import { LeaveRequestForm } from "@/components/dashboard/leave-request-form";
import { Clock, Calendar, History } from "lucide-react";
import { format } from "date-fns";

export default async function MySchedulePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = (session.user as any).id;
  const staffProfile = await prisma.staff.findUnique({
    where: { userId },
    include: {
      leaveRequests: {
        orderBy: { createdAt: "desc" },
        take: 5
      }
    }
  });

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

  return (
    <div className="space-y-10 max-w-5xl animate-fade-in transition-colors">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">My Schedule</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Manage your availability and time off.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Availability Section */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-soft overflow-hidden">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Weekly Working Hours</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Standard weekly availability.</p>
              </div>
            </div>
            <div className="p-8">
              <AvailabilityEditor 
                staffId={staffProfile.id} 
                initialAvailability={staffProfile.availabilityJson} 
              />
            </div>
          </div>

          {/* Leave History */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-soft overflow-hidden">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="h-10 w-10 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                <History className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">Recent Leave Requests</h3>
            </div>
            <div className="p-8">
              {staffProfile.leaveRequests.length === 0 ? (
                <p className="text-center text-slate-400 dark:text-slate-600 text-sm py-4 italic">No recent requests.</p>
              ) : (
                <div className="space-y-4">
                  {staffProfile.leaveRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/30">
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{request.type}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-500 font-medium mt-0.5">
                          {format(new Date(request.startTime), "MMM d, h:mm a")} - {format(new Date(request.endTime), "h:mm a")}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider border ${
                        request.status === 'APPROVED' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' :
                        request.status === 'REJECTED' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30' :
                        'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30'
                      }`}>
                        {request.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Leave Request Form */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-soft sticky top-28">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-2xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <Calendar className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">Request Time Off</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">Submit your request for sick leave or vacation. Admin approval is required to block these hours.</p>
            <LeaveRequestForm />
          </div>
        </div>
      </div>
    </div>
  );
}
