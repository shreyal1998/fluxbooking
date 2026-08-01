import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { InactivityTimeout } from "@/components/providers/inactivity-provider";
import { LockedStaffScreen } from "@/components/dashboard/locked-staff-screen";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tenantId = (session?.user as any)?.tenantId;
  const userId = (session?.user as any)?.id;
  const userRole = (session?.user as any)?.role;
  if (!tenantId || !userId) redirect("/login");

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true, planStatus: true, trialEndsAt: true, businessType: true, name: true, timeFormat: true }
  });

  if (!tenant) redirect("/login");

  // If user is a staff member, check if their practitioner slot is locked under the current plan limit
  if (userRole === "STAFF") {
    const staffList = await prisma.staff.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
      select: { id: true, userId: true }
    });
    const staffIndex = staffList.findIndex(s => s.userId === userId);

    const limits = { FREE: 1, STARTER: 5, PRO: 1000000 };
    const baseLimit = limits[tenant.plan as keyof typeof limits] || 1;
    const isTrialActive = tenant.planStatus === "TRIALING" && tenant.trialEndsAt && new Date(tenant.trialEndsAt) > new Date();
    const currentLimit = isTrialActive ? Math.max(baseLimit, 5) : baseLimit;

    if (staffIndex === -1 || staffIndex >= currentLimit) {
      return <LockedStaffScreen tenantName={tenant.name} />;
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { theme: true }
  });
  const dbTheme = user?.theme || "light";

  const cookieStore = await cookies();
  const isCollapsed = (cookieStore.get(`sidebar-collapsed-${userId}`)?.value || cookieStore.get("sidebar-collapsed")?.value) === "true";

  return (
    <div id="dashboard-root" className="min-h-screen flex flex-col">
      <DashboardShell 
        session={session} 
        tenant={tenant} 
        dbTheme={dbTheme}
        initialCollapsed={isCollapsed}
      >
        {children}
      </DashboardShell>
      <InactivityTimeout />
    </div>
  );
}
