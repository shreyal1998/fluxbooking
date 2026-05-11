import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { CustomersClient } from "./customers-client";

export default async function CustomersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tenantId = (session.user as any).tenantId;
  const userRole = (session.user as any).role;

  const [customers, tenant] = await Promise.all([
    prisma.customer.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { businessType: true }
    })
  ]);

  return (
    <CustomersClient 
      initialCustomers={customers} 
      tenantId={tenantId}
      userRole={userRole} 
      businessType={tenant?.businessType} 
    />
  );
}

