import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { ServicesClient } from "./services-client";

export default async function ServicesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tenantId = (session.user as any).tenantId;
  const userRole = (session.user as any).role;

  const services = await prisma.service.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="h-full flex flex-col animate-fade-in p-4 md:p-6 lg:p-8">
      <div className="flex-1 bg-white dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-soft overflow-hidden flex flex-col p-8 md:p-10">
        <ServicesClient 
          initialServices={services.map(s => ({ ...s, price: s.price.toString() }))} 
          userRole={userRole} 
        />
      </div>
    </div>
  );
}
