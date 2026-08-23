import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import SupportClient from "./support-client";

export default async function SupportPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = session.user as any;

  return (
    <div className="flex-1 flex flex-col animate-fade-in p-4 md:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
      <SupportClient
        userName={user?.name || ""}
        userEmail={user?.email || ""}
      />
    </div>
  );
}
