import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { SettingsClient } from "../settings-client";

export default async function SettingsTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const validTabs = ["business", "billing", "appearance", "security"];
  if (!validTabs.includes(tab)) {
    redirect("/settings/business");
  }

  const userRole = (session.user as any).role;
  if (userRole === "STAFF" && ["billing", "security"].includes(tab)) {
    redirect("/settings/business");
  }

  const tenantId = (session.user as any).tenantId;
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { locations: true }
  });

  return (
    <div className="flex-1 flex flex-col animate-fade-in pt-4 pb-6 px-6 md:pt-5 md:pb-8 md:px-8 lg:pt-6 lg:pb-10 lg:px-10 space-y-5 overflow-y-auto custom-scrollbar">
      <div className="flex-1 pb-8">
        <SettingsClient 
          tenant={tenant} 
          userRole={userRole} 
          sessionUser={session.user} 
        />
      </div>
    </div>
  );
}
