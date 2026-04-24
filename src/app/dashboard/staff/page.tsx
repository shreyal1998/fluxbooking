import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { Users, Clock, Shield } from "lucide-react";
import { StaffList } from "@/components/dashboard/staff-list";
import { LeaveRequestsManager } from "@/components/dashboard/leave-requests-manager";
import { AddStaffForm } from "@/components/dashboard/add-staff-form";
import Link from "next/link";

export default async function StaffPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tenantId = (session.user as any).tenantId;
  const [staffMembers, users, pendingRequests, tenant, services] = await Promise.all([
    prisma.staff.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" }, // Order by creation to determine who is "active"
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

  // ENFORCE PLAN LIMITS FOR UI
  const limits = { FREE: 1, TEAM: 5, PRO: 1000 };
  let currentLimit = limits[tenant?.plan as keyof typeof limits] || 1;
  if (tenant?.planStatus === "TRIALING" && currentLimit < 5) currentLimit = 5;

  const isLimitExceeded = staffMembers.length > currentLimit;

  // Enhance requests with conflict flags
  const requestsWithConflicts = pendingRequests.map(req => {
    const hasConflicts = req.staff.bookings.some(booking => {
      const bStart = new Date(booking.startTime);
      const bEnd = new Date(booking.endTime);
      return bStart < new Date(req.endTime) && bEnd > new Date(req.startTime);
    });
    return { ...req, hasConflicts };
  });

  return (
    <div className="space-y-12 max-w-7xl animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Staff Management</h2>
          <p className="text-slate-500 font-medium mt-1">Manage your team, roles, and leave requests.</p>
        </div>
      </div>

      {/* Plan Limit Warning */}
      {isLimitExceeded && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-left">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
               <Shield className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 text-sm">Plan Limit Exceeded</h4>
              <p className="text-xs text-amber-700">Your {tenant?.plan === 'FREE' && tenant?.planStatus !== 'TRIALING' ? 'Free' : tenant?.plan} plan allows up to {currentLimit} staff member(s). Only your first {currentLimit} staff member(s) are active for bookings.</p>
            </div>
          </div>
          <Link href="/dashboard/settings" className="px-6 py-2 bg-amber-600 text-white text-xs font-black rounded-xl hover:bg-amber-700 transition-all shadow-lg shadow-amber-200">
             Upgrade Plan
          </Link>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center gap-3">
           <div className="h-8 w-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
             <Clock className="h-4 w-4" />
           </div>
           <h3 className="text-xl font-bold text-slate-900">Pending Leave Requests</h3>
           <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black">
             {pendingRequests.length}
           </span>
        </div>
        <LeaveRequestsManager initialRequests={requestsWithConflicts} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Add Staff Form */}
        <div className="lg:col-span-1">
          <AddStaffForm users={users} services={services} />
        </div>

        {/* Staff List */}
        <div className="lg:col-span-2 space-y-4">
          {staffMembers.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center">
              <Users className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500">No staff members added yet. Add your team to start taking appointments.</p>
            </div>
          ) : (
            <StaffList staffMembers={staffMembers} currentLimit={currentLimit} services={services} />
          )}
        </div>
      </div>
    </div>
  );
}
