import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { CustomerList } from "@/components/dashboard/customer-list";
import { CustomerHeader } from "@/components/dashboard/customer-header";
import { getLabels } from "@/lib/labels";

export default async function CustomersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tenantId = (session.user as any).tenantId;
  const userRole = (session.user as any).role;

  const [customers, customerCount, tenant] = await Promise.all([
    prisma.customer.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    }),
    prisma.customer.count({
        where: { tenantId }
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { businessType: true }
    })
  ]);

  return (
    <div className="flex-1 flex flex-col animate-fade-in p-4 md:p-6 lg:p-8">
      <CustomerHeader tenantId={tenantId} customerCount={customerCount} businessType={tenant?.businessType} />

      <div className="flex-1 pb-8">
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm p-8 overflow-hidden">
          <CustomerList initialCustomers={customers} userRole={userRole} businessType={tenant?.businessType} />
        </div>
      </div>
    </div>
  );
}
