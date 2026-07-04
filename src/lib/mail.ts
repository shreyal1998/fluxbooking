import { format } from "date-fns";
import { formatInTimezone } from "./timezone-utils";

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
  timezone = "UTC",
}: {
  customerName: string;
  customerEmail: string;
  serviceName: string;
  startTime: Date;
  businessName: string;
  businessSlug: string;
  bookingId: string;
  timezone?: string;
}) {
  const formattedDate = formatInTimezone(startTime, timezone, "EEEE, MMMM do 'at' h:mm a");
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
  timezone = "UTC",
}: {
  customerName: string;
  customerEmail: string;
  serviceName: string;
  newStartTime: Date;
  businessName: string;
  businessSlug: string;
  bookingId: string;
  timezone?: string;
}) {
  const formattedDate = formatInTimezone(newStartTime, timezone, "EEEE, MMMM do 'at' h:mm a");
  const manageUrl = `${process.env.NEXT_PUBLIC_APP_URL}/b/${businessSlug}/manage/${bookingId}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; padding: 40px; background-color: #ffffff;">
      <h1 style="color: #0f172a; font-size: 24px; font-weight: 900; margin-bottom: 8px;">Appointment Rescheduled</h1>
      <p style="color: #64748b; margin-bottom: 32px;">Hi ${customerName}, your appointment at ${businessName} has been moved.</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 16px; padding: 24px; margin-bottom: 32px;">
        <p style="margin: 0; color: #94a3b8; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;">New Time</p>
        <p style="margin: 4px 0 0 0; color: #0f172a; font-size: 16px; font-weight: 700;">${formattedDate}</p>
      </div>

      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${manageUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 16px 32px; border-radius: 14px; text-decoration: none; font-weight: 800; font-size: 14px;">Manage Appointment</a>
      </div>

      ${NO_REPLY_FOOTER}
    </div>
  `;

  return sendEmail({ to: customerEmail, subject: `Rescheduled: ${serviceName} at ${businessName}`, html });
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
  timezone = "UTC"
}: {
  customerName: string;
  customerEmail: string;
  serviceName: string;
  startTime: Date;
  businessName: string;
  timezone?: string;
}) {
  const formattedDate = formatInTimezone(startTime, timezone, "EEEE, MMMM do 'at' h:mm a");
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; padding: 40px; background-color: #ffffff;">
      <h1 style="color: #ef4444; font-size: 24px; font-weight: 900; margin-bottom: 8px;">Appointment Cancelled</h1>
      <p style="color: #64748b; margin-bottom: 32px;">Hi ${customerName}, your appointment for ${serviceName} at ${businessName} on ${formattedDate} has been cancelled.</p>
      <p style="color: #94a3b8; font-size: 13px; text-align: center; line-height: 1.6;">If this was a mistake, please visit our booking page to schedule a new time.</p>
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
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/overview" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 800; margin: 32px 0;">Go to Dashboard</a>
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

/**
 * Template: Password Reset
 */
export async function sendPasswordResetEmail({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; padding: 40px; background-color: #ffffff;">
      <h1 style="color: #0f172a; font-size: 24px; font-weight: 900; margin-bottom: 16px; text-align: center;">Reset your password</h1>
      <p style="color: #64748b; font-size: 16px; line-height: 24px; margin-bottom: 24px;">
        We received a request to reset the password for your FluxBooking account. Click the button below to choose a new password. This link is valid for 2 hours.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="display: inline-block; background-color: #6366f1; color: #ffffff; padding: 16px 32px; border-radius: 16px; text-decoration: none; font-weight: 800; font-size: 16px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);">
          Reset Password
        </a>
      </div>
      <p style="color: #94a3b8; font-size: 12px; line-height: 18px; margin-bottom: 24px; text-align: center;">
        If you didn't request a password reset, you can safely ignore this email. Your password will remain secure.
      </p>
      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-bottom: 8px;">
        Or copy and paste this URL into your browser:
      </p>
      <p style="color: #6366f1; font-size: 11px; word-break: break-all; text-align: center; margin-bottom: 32px;">
        <a href="${resetUrl}" style="color: #6366f1; text-decoration: underline;">${resetUrl}</a>
      </p>
      ${NO_REPLY_FOOTER}
    </div>
  `;
  
  return sendEmail({
    to: email,
    subject: "Reset your FluxBooking Password",
    html,
  });
}
