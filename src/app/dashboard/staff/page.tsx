import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { addStaff } from "@/app/actions/dashboard";
import { Users, UserPlus, Clock } from "lucide-react";
import { StaffList } from "@/components/dashboard/staff-list";
import { LeaveRequestsManager } from "@/components/dashboard/leave-requests-manager";

export default async function StaffPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tenantId = (session.user as any).tenantId;
  const [staffMembers, users, pendingRequests] = await Promise.all([
    prisma.staff.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: { user: true }
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
    })
  ]);

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

      {/* Leave Requests Section */}
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
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm sticky top-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-600" />
              Add Staff Member
            </h3>
            <form 
              action={async (formData) => {
                "use server";
                await addStaff(formData);
              }} 
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700">Full Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="e.g., Sarah Smith"
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Link User Account (Optional)</label>
                <select
                  name="userId"
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">None (Admin managed only)</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-slate-400 italic">Linking allows this person to log in and manage their own schedule.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Bio / Specialization</label>
                <textarea
                  name="bio"
                  rows={3}
                  placeholder="e.g., Expert colorist with 10 years experience"
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <p className="text-xs text-slate-400">Default availability: Mon-Fri, 9 AM - 5 PM. You can customize this later.</p>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Create Staff Member
              </button>
            </form>
          </div>
        </div>

        {/* Staff List */}
        <div className="lg:col-span-2 space-y-4">
          {staffMembers.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center">
              <Users className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500">No staff members added yet. Add your team to start taking appointments.</p>
            </div>
          ) : (
            <StaffList staffMembers={staffMembers} />
          )}
        </div>
      </div>
    </div>
  );
}
