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
    <div className="h-full flex flex-col animate-fade-in p-4 md:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 px-4">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">Customers</h2>
          <p className="text-slate-900 dark:text-white font-normal mt-1 opacity-60">Manage your client relationships and notes.</p>
        </div>
        <div className="flex items-center gap-3 px-6 py-3 bg-white/70 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm self-start md:self-auto backdrop-blur-md">
          <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <span className="text-[10px] font-medium text-slate-900 dark:text-white uppercase tracking-widest">{customerCount} Total Clients</span>
        </div>
      </div>

      <div className="flex-1 pb-8">
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-8">
          <CustomerList initialCustomers={customers} userRole={userRole} />
        </div>
      </div>
    </div>
  );
}
