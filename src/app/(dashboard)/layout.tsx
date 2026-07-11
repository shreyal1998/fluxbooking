import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { InactivityTimeout } from "@/components/providers/inactivity-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tenantId = (session?.user as any)?.tenantId;
  if (!tenantId) redirect("/login");

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { planStatus: true, trialEndsAt: true, businessType: true, name: true, timeFormat: true }
  });

  if (!tenant) redirect("/login");

  return (
    <div id="dashboard-root" className="min-h-screen flex flex-col">
      <DashboardShell session={session} tenant={tenant}>{children}</DashboardShell>
      <InactivityTimeout />
    </div>
  );
}
