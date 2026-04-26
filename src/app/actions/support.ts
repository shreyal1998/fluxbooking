"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function sendSupportRequest(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = (session?.user as any)?.tenantId;
    
    let isPriority = false;
    if (tenantId) {
      const tenant = await prisma.tenant.findUnique({ 
        where: { id: tenantId },
        select: { plan: true }
      });
      if (tenant?.plan === "PRO") isPriority = true;
    }

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const subject = formData.get("subject") as string;
    const reason = formData.get("reason") as string;
    const message = formData.get("message") as string;

    // Basic validation
    if (!name || !email || !subject || !reason || !message) {
      return { error: "All fields are required" };
    }

    // LOGIC FOR EMAIL SERVICE GOES HERE (Resend, SendGrid, etc.)
    // For now, we simulate success and log the request
    console.log(`${isPriority ? "[PRIORITY] " : ""}Support Request Received:`, { name, email, subject, reason, message });

    // Simulate a slight delay
    await new Promise(resolve => setTimeout(resolve, 800));

    return { success: true };
  } catch (error) {
    console.error("Support action error:", error);
    return { error: "Failed to send message. Please try again later." };
  }
}
