import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { Users, Clock, Shield } from "lucide-react";
import { StaffList } from "@/components/dashboard/staff-list";
import { LeaveRequestsManager } from "@/components/dashboard/leave-requests-manager";
import { TeamHeader } from "@/components/dashboard/team-header";
import Link from "next/link";

export default async function StaffPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tenantId = (session.user as any).tenantId;
  const [staffMembers, users, pendingRequests, tenant, services] = await Promise.all([
    prisma.staff.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
      include: { 
        user: true,
        services: true
      }
    }),
    prisma.user.findMany({
      where: { 
        tenantId,
        staffProfile: null
      }
    }),
    prisma.leaveRequest.findMany({
      where: { 
        tenantId,
        status: "PENDING"
      },
      include: { 
        staff: {
          include: {
            bookings: {
              where: {
                status: { in: ["PENDING", "CONFIRMED"] }
              }
            }
          }
        } 
      },
      orderBy: { createdAt: "asc" }
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, planStatus: true }
    }),
    prisma.service.findMany({
      where: { tenantId },
      orderBy: { name: "asc" }
    })
  ]);

  const limits = { FREE: 1, TEAM: 5, PRO: 1000000 };
  let currentLimit = limits[tenant?.plan as keyof typeof limits] || 1;
  if (tenant?.planStatus === "TRIALING" && currentLimit < 5) currentLimit = 5;

  const isLimitExceeded = staffMembers.length > currentLimit;

  const requestsWithConflicts = pendingRequests.map(req => {
    const hasConflicts = req.staff.bookings.some(booking => {
      const bStart = new Date(booking.startTime);
      const bEnd = new Date(booking.endTime);
      return bStart < new Date(req.endTime) && bEnd > new Date(req.startTime);
    });
    return { ...req, hasConflicts };
  });

  return (
    <div className="h-full flex flex-col animate-fade-in p-4 md:p-6 lg:p-8">
      <div className="flex-1 bg-white dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-soft overflow-hidden flex flex-col p-8 md:p-10">
        <TeamHeader users={users} services={services} />

        <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-12">
          {/* Plan Limit Warning */}
          {isLimitExceeded && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-left">
                <div className="h-10 w-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                   <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-black text-amber-900 dark:text-amber-200 text-sm uppercase tracking-tight">Plan Limit Exceeded</h4>
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">Your {tenant?.plan === 'FREE' && tenant?.planStatus !== 'TRIALING' ? 'Free' : tenant?.plan} plan allows up to {currentLimit} staff member(s).</p>
                </div>
              </div>
              <Link href="/dashboard/settings" className="px-8 py-3 bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-700 transition-all shadow-xl shadow-amber-200 dark:shadow-none">
                 Upgrade Plan
              </Link>
            </div>
          )}

          <div className="space-y-6">
            <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-2xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                 <Clock className="h-5 w-5" />
               </div>
               <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Pending Leave Requests</h3>
               <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 text-[10px] font-black uppercase tracking-wider">
                 {pendingRequests.length}
               </span>
            </div>
            <LeaveRequestsManager initialRequests={requestsWithConflicts} />
          </div>

          <div className="w-full">
            {staffMembers.length === 0 ? (
              <div className="p-24 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center transition-colors">
                <Users className="h-16 w-16 text-slate-200 dark:text-slate-800 mb-6" />
                <p className="text-slate-400 dark:text-slate-500 font-bold max-w-sm">No team members added yet. Add your team to start taking appointments.</p>
              </div>
            ) : (
              <StaffList staffMembers={staffMembers} currentLimit={currentLimit} services={services} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
