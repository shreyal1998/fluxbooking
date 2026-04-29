import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tenantId = (session.user as any).tenantId;
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { locations: true }
  });

  const userRole = (session.user as any).role;

  return (
    <div className="h-full flex flex-col animate-fade-in p-4 md:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
      <div className="mb-10 px-4">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Settings</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Manage your business profile and preferences.</p>
      </div>

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
