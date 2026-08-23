"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/mail";

export async function sendSupportRequest(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = session?.user.tenantId;
    
    let isPriority = false;
    if (tenantId) {
      const tenant = await prisma.tenant.findUnique({ 
        where: { id: tenantId },
        select: { plan: true, timeFormat: true }
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

    const priorityBadge = isPriority ? "🔴 [PRIORITY - PRO USER] " : "";

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; padding: 40px; background-color: #ffffff;">
        <h1 style="color: #4f46e5; font-size: 22px; font-weight: 700; margin-bottom: 4px;">
          ${isPriority ? "🔴 Priority " : ""}Support Request
        </h1>
        <p style="color: #64748b; font-size: 13px; margin-bottom: 32px;">Received via FluxBooking Help Center</p>

        <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
          <p style="margin: 0; color: #000; font-size: 14px; font-weight: 600;">From</p>
          <p style="margin: 4px 0 16px 0; color: #000; font-size: 14px;">${name} &lt;${email}&gt;</p>

          <p style="margin: 0; color: #000; font-size: 14px; font-weight: 600;">Category</p>
          <p style="margin: 4px 0 16px 0; color: #000; font-size: 14px;">${reason}</p>

          <p style="margin: 0; color: #000; font-size: 14px; font-weight: 600;">Subject</p>
          <p style="margin: 4px 0 0 0; color: #000; font-size: 14px;">${subject}</p>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 16px; padding: 24px;">
          <p style="margin: 0 0 8px 0; color: #000; font-size: 14px; font-weight: 600;">Message</p>
          <p style="margin: 0; color: #000; font-size: 14px; white-space: pre-wrap; line-height: 1.6;">${message}</p>
        </div>

        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 32px;">FluxBooking Support System · Reply directly to this email to respond to the user</p>
      </div>
    `;

    await sendEmail({
      to: "support@fluxbooking.com",
      subject: `${priorityBadge}[${reason}] ${subject}`,
      html,
      fromName: "FluxBooking Support",
    });

    return { success: true };
  } catch (error) {
    console.error("Support action error:", error);
    return { error: "Failed to send message. Please try again later." };
  }
}
