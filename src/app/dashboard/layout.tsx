import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { TrialBanner } from "@/components/dashboard/trial-banner";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tenantId = (session.user as any).tenantId;
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { planStatus: true, trialEndsAt: true, businessType: true, name: true }
  });

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <DashboardShell session={session} tenant={tenant}>{children}</DashboardShell>
    </div>
  );
}
