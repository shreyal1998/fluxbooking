import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { CustomerList } from "@/components/dashboard/customer-list";
import { Users } from "lucide-react";

export default async function CustomersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tenantId = (session.user as any).tenantId;
  const userRole = (session.user as any).role;

  const [customers, customerCount] = await Promise.all([
    prisma.customer.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    }),
    prisma.customer.count({
        where: { tenantId }
    })
  ]);

  return (
    <div className="space-y-10 animate-fade-in transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Customers</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Manage your client relationships and notes.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{customerCount} Total Clients</span>
        </div>
      </div>

      <CustomerList initialCustomers={customers} userRole={userRole} />
    </div>
  );
}
