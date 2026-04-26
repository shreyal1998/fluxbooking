import { format } from "date-fns";

const SUPPORT_EMAIL = "support@fluxbooking.com";

/**
 * EMAIL ENGINE (Simulation Mode)
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey || process.env.NODE_ENV === "development") {
      console.log("-----------------------------------------");
      console.log("📧 [FLUXBOOKING EMAIL SIMULATOR]");
      console.log(`FROM:    no-reply@fluxbooking.com`);
      console.log(`TO:      ${to}`);
      console.log(`SUBJECT: ${subject}`);
      console.log("-----------------------------------------");
      return { success: true, id: "sim_mail_123" };
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "FluxBooking <no-reply@fluxbooking.com>",
        to,
        subject,
        html,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, id: data.id };
    }
    return { success: false };
  } catch (error) {
    return { success: false, error };
  }
}

const NO_REPLY_FOOTER = `
  <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e2e8f0; text-align: center;">
    <p style="color: #94a3b8; font-size: 11px; line-height: 1.6; margin-bottom: 16px;">
      This is an automated notification from FluxBooking. Replies to this email address are not monitored.
    </p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/help" style="color: #4f46e5; font-size: 12px; font-weight: 800; text-decoration: none; text-transform: uppercase; letter-spacing: 0.1em;">
      Visit Help Center
    </a>
  </div>
`;

/**
 * Template: Booking Confirmation (Enhanced with Self-Service)
 */
export async function sendBookingConfirmation({
  customerName,
  customerEmail,
  serviceName,
  startTime,
  businessName,
  businessSlug,
  bookingId,
}: {
  customerName: string;
  customerEmail: string;
  serviceName: string;
  startTime: Date;
  businessName: string;
  businessSlug: string;
  bookingId: string;
}) {
  const formattedDate = format(startTime, "PPPP 'at' p");
  const manageUrl = `${process.env.NEXT_PUBLIC_APP_URL}/b/${businessSlug}/manage/${bookingId}`;
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; padding: 40px; background-color: #ffffff;">
      <h1 style="color: #0f172a; font-size: 24px; font-weight: 900; margin-bottom: 8px;">Appointment Confirmed</h1>
      <p style="color: #64748b; margin-bottom: 32px;">Hi ${customerName}, your visit to ${businessName} is all set.</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 16px; padding: 24px; margin-bottom: 32px;">
        <p style="margin: 0; color: #94a3b8; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;">Service</p>
        <p style="margin: 4px 0 16px 0; color: #0f172a; font-size: 16px; font-weight: 700;">${serviceName}</p>
        <p style="margin: 0; color: #94a3b8; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;">When</p>
        <p style="margin: 4px 0 0 0; color: #0f172a; font-size: 16px; font-weight: 700;">${formattedDate}</p>
      </div>

      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${manageUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 16px 32px; border-radius: 14px; text-decoration: none; font-weight: 800; font-size: 14px; shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.2);">Reschedule Appointment</a>
      </div>

      <p style="color: #64748b; font-size: 14px; text-align: center;">Need to cancel or see other available times? <a href="${manageUrl}" style="color: #4f46e5; font-weight: 700;">Manage my booking</a></p>

      ${NO_REPLY_FOOTER}
    </div>
  `;

  return sendEmail({ to: customerEmail, subject: `Confirmed: ${serviceName}`, html });
}

/**
 * Template: Booking Rescheduled (Enhanced)
 */
export async function sendBookingRescheduledEmail({
  customerName,
  customerEmail,
  serviceName,
  newStartTime,
  businessName,
  businessSlug,
  bookingId,
}: {
  customerName: string;
  customerEmail: string;
  serviceName: string;
  newStartTime: Date;
  businessName: string;
  businessSlug: string;
  bookingId: string;
}) {
  const formattedDate = format(newStartTime, "PPPP 'at' p");
  const manageUrl = `${process.env.NEXT_PUBLIC_APP_URL}/b/${businessSlug}/manage/${bookingId}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; padding: 40px;">
      <h1 style="color: #4f46e5; font-size: 24px; font-weight: 900;">Schedule Updated</h1>
      <p style="color: #64748b; margin-bottom: 32px;">Hi ${customerName}, your appointment for ${serviceName} has been moved to a new time.</p>
      
      <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 16px; padding: 24px; margin-bottom: 32px;">
        <p style="margin: 0; color: #7c3aed; font-size: 11px; font-weight: 800; text-transform: uppercase;">New Appointment Time</p>
        <p style="margin: 8px 0 0 0; color: #2e1065; font-size: 18px; font-weight: 800;">${formattedDate}</p>
      </div>

      <div style="text-align: center;">
        <a href="${manageUrl}" style="color: #4f46e5; font-weight: 800; font-size: 13px; text-decoration: none; text-transform: uppercase; letter-spacing: 0.05em;">View or Change again →</a>
      </div>

      ${NO_REPLY_FOOTER}
    </div>
  `;

  return sendEmail({ to: customerEmail, subject: `Updated: ${serviceName} at ${businessName}`, html });
}

/**
 * Template: Booking Cancelled
 */
export async function sendBookingCancelledEmail({
  customerName,
  customerEmail,
  serviceName,
  startTime,
  businessName,
}: {
  customerName: string;
  customerEmail: string;
  serviceName: string;
  startTime: Date;
  businessName: string;
}) {
  const formattedDate = format(startTime, "PPPP 'at' p");
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; padding: 40px;">
      <h1 style="color: #ef4444; font-size: 24px; font-weight: 900;">Appointment Cancelled</h1>
      <p style="color: #64748b; margin-bottom: 32px;">Hi ${customerName}, your appointment for ${serviceName} on ${formattedDate} has been cancelled.</p>
      <p style="color: #94a3b8; font-size: 12px; text-align: center; line-height: 1.6;">If this was a mistake, please visit our booking page to schedule a new time.</p>
      ${NO_REPLY_FOOTER}
    </div>
  `;
  return sendEmail({ to: customerEmail, subject: `Cancelled: ${serviceName} at ${businessName}`, html });
}

/**
 * Template: Admin Welcome
 */
export async function sendWelcomeEmail({
  adminName,
  adminEmail,
  businessName,
}: {
  adminName: string;
  adminEmail: string;
  businessName: string;
}) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; padding: 40px;">
      <h1 style="color: #4f46e5; font-size: 28px; font-weight: 900; margin-bottom: 16px;">Welcome to FluxBooking!</h1>
      <p style="color: #64748b;">Hi ${adminName}, <strong>${businessName}</strong> is now live.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 800; margin: 32px 0;">Go to Dashboard</a>
      ${NO_REPLY_FOOTER}
    </div>
  `;
  return sendEmail({ to: adminEmail, subject: `Welcome to FluxBooking, ${adminName}!`, html });
}

/**
 * Template: Staff Invitation
 */
export async function sendStaffWelcomeEmail({
  staffName,
  staffEmail,
  businessName,
}: {
  staffName: string;
  staffEmail: string;
  businessName: string;
}) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; padding: 40px;">
      <h1 style="color: #0f172a; font-size: 24px; font-weight: 900; margin-bottom: 16px;">You've been added to the team!</h1>
      <p style="color: #64748b;">Hi ${staffName}, you've been added to <strong>${businessName}</strong>.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 700; margin: 32px 0;">Login to FluxBooking</a>
      ${NO_REPLY_FOOTER}
    </div>
  `;
  return sendEmail({ to: staffEmail, subject: `Invitation: Join ${businessName} on FluxBooking`, html });
}
