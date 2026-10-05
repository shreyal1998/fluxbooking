import { format } from "date-fns";
import { formatInTimezone } from "./timezone-utils";
import { BusinessType } from "@prisma/client";
import { getLabels } from "./labels";

/**
 * EMAIL ENGINE (Simulation Mode)
 */
export async function sendEmail({
  to,
  subject,
  html,
  fromName = "FluxBooking",
}: {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
}) {
  try {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.log("-----------------------------------------");
      console.log("📧 [FLUXBOOKING EMAIL SIMULATOR]");
      console.log(`FROM:    ${fromName} <no-reply@fluxbooking.com>`);
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
        from: `${fromName} <no-reply@fluxbooking.com>`,
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

function getFooter(businessName?: string, marginTop: number = 24) {
  const behalfOf = businessName && businessName !== "FluxBooking" 
    ? ` on behalf of ${businessName}` 
    : "";
  return `
    <div style="margin-top: ${marginTop}px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center;">
      <p style="color: #94a3b8; font-size: 11px; line-height: 1.5; margin: 0 0 10px 0;">
        This is an automated notification from FluxBooking${behalfOf}.<br />Replies to this email address are not&nbsp;monitored.
      </p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/help" style="color: #4f46e5; font-size: 12px; font-weight: 600; text-decoration: none; display: inline-block; margin-bottom: 10px;">
        Visit Help Center
      </a>
      <p style="color: #94a3b8; font-size: 11px; font-weight: 600; margin: 0;">
        Powered by FluxBooking
      </p>
    </div>
  `;
}

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
  businessType,
  notes,
  staffName,
}: {
  customerName: string;
  customerEmail: string;
  serviceName: string;
  startTime: Date;
  businessName: string;
  businessSlug: string;
  bookingId: string;
  timezone?: string;
  businessType?: BusinessType;
  notes?: string | null;
  staffName?: string;
}) {
  const formattedDate = formatInTimezone(startTime, timezone, "EEEE, MMMM do 'at' h:mm a");
  const manageUrl = `${process.env.NEXT_PUBLIC_APP_URL}/b/${businessSlug}/manage/${bookingId}`;
  const labels = getLabels(businessType);
  
  const staffHtml = staffName
    ? `
      <p style="margin: 0; color: #000000; font-size: 14px; font-weight: 600;">With ${labels.staff}</p>
      <p style="margin: 4px 0 16px 0; color: #000000; font-size: 14px; font-weight: 400; line-height: 1.5;">${staffName}</p>
    `
    : "";

  const notesHtml = notes
    ? `
      <p style="margin: 16px 0 0 0; color: #000000; font-size: 14px; font-weight: 600;">Special Request / Notes</p>
      <p style="margin: 4px 0 0 0; color: #000000; font-size: 14px; font-weight: 400; white-space: pre-wrap; line-height: 1.5;">${notes}</p>
    `
    : "";

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; padding: 40px; background-color: #ffffff;">
      <h1 style="color: #4f46e5; font-size: 24px; font-weight: 600; margin-bottom: 8px;">${labels.appointment} Confirmed</h1>
      <p style="color: #000000; font-weight: 600; margin-bottom: 32px;">Hi ${customerName}, your visit to ${businessName} is all set.</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 16px; padding: 24px; margin-bottom: 32px;">
        <p style="margin: 0; color: #000000; font-size: 14px; font-weight: 600;">${labels.service}</p>
        <p style="margin: 4px 0 16px 0; color: #000000; font-size: 14px; font-weight: 400; line-height: 1.5;">${serviceName}</p>
        ${staffHtml}
        <p style="margin: 0; color: #000000; font-size: 14px; font-weight: 600;">When</p>
        <p style="margin: 4px 0 0 0; color: #000000; font-size: 14px; font-weight: 400; line-height: 1.5;">${formattedDate}</p>
        ${notesHtml}
      </div>

      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${manageUrl}" style="display: inline-block; min-width: 180px; text-align: center; background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 13px; margin: 4px; shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.2);">Reschedule ${labels.appointment}</a>
        <a href="${manageUrl}" style="display: inline-block; min-width: 180px; text-align: center; background-color: #ffffff; color: #ef4444; border: 1px solid #fecaca; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 13px; margin: 4px;">Cancel ${labels.appointment}</a>
      </div>

      ${getFooter(businessName)}
    </div>
  `;

  return sendEmail({ to: customerEmail, subject: `Booking Confirmed - ${serviceName}`, html, fromName: businessName });
}

/**
 * Template: Practitioner Booking Rescheduled Notification
 */
export async function sendPractitionerBookingRescheduledNotification({
  practitionerName,
  practitionerEmail,
  customerName,
  customerEmail,
  customerPhone,
  serviceName,
  newStartTime,
  businessName,
  timezone = "UTC",
  businessType,
  notes,
}: {
  practitionerName: string;
  practitionerEmail: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  serviceName: string;
  newStartTime: Date;
  businessName: string;
  timezone?: string;
  businessType?: BusinessType;
  notes?: string | null;
}) {
  const formattedDate = formatInTimezone(newStartTime, timezone, "EEEE, MMMM do 'at' h:mm a");
  const labels = getLabels(businessType);

  const notesHtml = notes
    ? `
      <p style="margin: 16px 0 0 0; color: #000000; font-size: 14px; font-weight: 600;">Special Request / Notes</p>
      <p style="margin: 4px 0 0 0; color: #000000; font-size: 14px; font-weight: 400; white-space: pre-wrap; line-height: 1.5;">${notes}</p>
    `
    : "";

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; padding: 40px; background-color: #ffffff;">
      <h1 style="color: #4f46e5; font-size: 24px; font-weight: 600; margin-bottom: 8px;">${labels.appointment} Rescheduled</h1>
      <p style="color: #000000; font-weight: 600; margin-bottom: 32px;">Hi ${practitionerName}, the ${labels.appointmentLower} with ${customerName} has been rescheduled.</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 16px; padding: 24px; margin-bottom: 32px;">
        <p style="margin: 0; color: #000000; font-size: 14px; font-weight: 600;">Client</p>
        <p style="margin: 4px 0 16px 0; color: #000000; font-size: 14px; font-weight: 400; line-height: 1.5;">${customerName} (${customerEmail}${customerPhone ? ` / ${customerPhone}` : ""})</p>
        
        <p style="margin: 0; color: #000000; font-size: 14px; font-weight: 600;">${labels.service}</p>
        <p style="margin: 4px 0 16px 0; color: #000000; font-size: 14px; font-weight: 400; line-height: 1.5;">${serviceName}</p>
        
        <p style="margin: 0; color: #000000; font-size: 14px; font-weight: 600;">New Time</p>
        <p style="margin: 4px 0 0 0; color: #000000; font-size: 14px; font-weight: 400; line-height: 1.5;">${formattedDate}</p>
        ${notesHtml}
      </div>

      ${getFooter(businessName)}
    </div>
  `;

  return sendEmail({ to: practitionerEmail, subject: `Booking Rescheduled - Client: ${customerName} - ${serviceName}`, html, fromName: businessName });
}

/**
 * Template: Practitioner Booking Cancelled Notification
 */
export async function sendPractitionerBookingCancelledNotification({
  practitionerName,
  practitionerEmail,
  customerName,
  customerEmail,
  serviceName,
  startTime,
  businessName,
  timezone = "UTC",
  businessType,
}: {
  practitionerName: string;
  practitionerEmail: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  startTime: Date;
  businessName: string;
  timezone?: string;
  businessType?: BusinessType;
}) {
  const formattedDate = formatInTimezone(startTime, timezone, "EEEE, MMMM do 'at' h:mm a");
  const labels = getLabels(businessType);

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; padding: 40px; background-color: #ffffff;">
      <h1 style="color: #ef4444; font-size: 24px; font-weight: 600; margin-bottom: 8px;">${labels.appointment} Cancelled</h1>
      <p style="color: #000000; font-weight: 600; margin-bottom: 32px;">Hi ${practitionerName}, the ${labels.appointmentLower} with ${customerName} has been cancelled.</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 16px; padding: 24px; margin-bottom: 32px;">
        <p style="margin: 0; color: #000000; font-size: 14px; font-weight: 600;">Client</p>
        <p style="margin: 4px 0 16px 0; color: #000000; font-size: 14px; font-weight: 400; line-height: 1.5;">${customerName} (${customerEmail})</p>
        
        <p style="margin: 0; color: #000000; font-size: 14px; font-weight: 600;">${labels.service}</p>
        <p style="margin: 4px 0 16px 0; color: #000000; font-size: 14px; font-weight: 400; line-height: 1.5;">${serviceName}</p>
        
        <p style="margin: 0; color: #000000; font-size: 14px; font-weight: 600;">Cancelled Slot</p>
        <p style="margin: 4px 0 0 0; color: #000000; font-size: 14px; font-weight: 400; line-height: 1.5;">${formattedDate}</p>
      </div>

      ${getFooter(businessName)}
    </div>
  `;

  return sendEmail({ to: practitionerEmail, subject: `Booking Cancelled - Client: ${customerName} - ${serviceName}`, html, fromName: businessName });
}

/**
 * Template: Practitioner Booking Confirmed Notification
 */
export async function sendPractitionerBookingConfirmedNotification({
  practitionerName,
  practitionerEmail,
  customerName,
  customerEmail,
  customerPhone,
  serviceName,
  startTime,
  businessName,
  timezone = "UTC",
  businessType,
  notes,
}: {
  practitionerName: string;
  practitionerEmail: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  serviceName: string;
  startTime: Date;
  businessName: string;
  timezone?: string;
  businessType?: BusinessType;
  notes?: string | null;
}) {
  const formattedDate = formatInTimezone(startTime, timezone, "EEEE, MMMM do 'at' h:mm a");
  const labels = getLabels(businessType);

  const notesHtml = notes
    ? `
      <p style="margin: 16px 0 0 0; color: #000000; font-size: 14px; font-weight: 600;">Special Request / Notes</p>
      <p style="margin: 4px 0 0 0; color: #000000; font-size: 14px; font-weight: 400; white-space: pre-wrap; line-height: 1.5;">${notes}</p>
    `
    : "";

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; padding: 40px; background-color: #ffffff;">
      <h1 style="color: #4f46e5; font-size: 24px; font-weight: 600; margin-bottom: 8px;">${labels.appointment} Confirmed</h1>
      <p style="color: #000000; font-weight: 600; margin-bottom: 32px;">Hi ${practitionerName}, the ${labels.appointmentLower} with ${customerName} has been confirmed.</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 16px; padding: 24px; margin-bottom: 32px;">
        <p style="margin: 0; color: #000000; font-size: 14px; font-weight: 600;">Client</p>
        <p style="margin: 4px 0 16px 0; color: #000000; font-size: 14px; font-weight: 400; line-height: 1.5;">${customerName} (${customerEmail}${customerPhone ? ` / ${customerPhone}` : ""})</p>
        
        <p style="margin: 0; color: #000000; font-size: 14px; font-weight: 600;">${labels.service}</p>
        <p style="margin: 4px 0 16px 0; color: #000000; font-size: 14px; font-weight: 400; line-height: 1.5;">${serviceName}</p>
        
        <p style="margin: 0; color: #000000; font-size: 14px; font-weight: 600;">When</p>
        <p style="margin: 4px 0 0 0; color: #000000; font-size: 14px; font-weight: 400; line-height: 1.5;">${formattedDate}</p>
        ${notesHtml}
      </div>

      ${getFooter(businessName)}
    </div>
  `;

  return sendEmail({ to: practitionerEmail, subject: `Booking Confirmed - Client: ${customerName} - ${serviceName}`, html, fromName: businessName });
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
  businessType,
  notes,
  staffName,
}: {
  customerName: string;
  customerEmail: string;
  serviceName: string;
  newStartTime: Date;
  businessName: string;
  businessSlug: string;
  bookingId: string;
  timezone?: string;
  businessType?: BusinessType;
  notes?: string | null;
  staffName?: string;
}) {
  const formattedDate = formatInTimezone(newStartTime, timezone, "EEEE, MMMM do 'at' h:mm a");
  const manageUrl = `${process.env.NEXT_PUBLIC_APP_URL}/b/${businessSlug}/manage/${bookingId}`;
  const labels = getLabels(businessType);

  const staffHtml = staffName
    ? `
      <p style="margin: 0; color: #000000; font-size: 14px; font-weight: 600;">With ${labels.staff}</p>
      <p style="margin: 4px 0 16px 0; color: #000000; font-size: 14px; font-weight: 400; line-height: 1.5;">${staffName}</p>
    `
    : "";

  const notesHtml = notes
    ? `
      <p style="margin: 16px 0 0 0; color: #000000; font-size: 14px; font-weight: 600;">Special Request / Notes</p>
      <p style="margin: 4px 0 0 0; color: #000000; font-size: 14px; font-weight: 400; white-space: pre-wrap; line-height: 1.5;">${notes}</p>
    `
    : "";

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; padding: 40px; background-color: #ffffff;">
      <h1 style="color: #4f46e5; font-size: 24px; font-weight: 600; margin-bottom: 8px;">${labels.appointment} Rescheduled</h1>
      <p style="color: #000000; font-weight: 600; margin-bottom: 32px;">Hi ${customerName}, your ${labels.appointmentLower} at ${businessName} has been moved.</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 16px; padding: 24px; margin-bottom: 32px;">
        <p style="margin: 0; color: #000000; font-size: 14px; font-weight: 600;">${labels.service}</p>
        <p style="margin: 4px 0 16px 0; color: #000000; font-size: 14px; font-weight: 400; line-height: 1.5;">${serviceName}</p>
        ${staffHtml}
        <p style="margin: 0; color: #000000; font-size: 14px; font-weight: 600;">New Time</p>
        <p style="margin: 4px 0 0 0; color: #000000; font-size: 14px; font-weight: 400; line-height: 1.5;">${formattedDate}</p>
        ${notesHtml}
      </div>

      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${manageUrl}" style="display: inline-block; min-width: 180px; text-align: center; background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 13px; margin: 4px; shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.2);">Reschedule ${labels.appointment}</a>
        <a href="${manageUrl}" style="display: inline-block; min-width: 180px; text-align: center; background-color: #ffffff; color: #ef4444; border: 1px solid #fecaca; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 13px; margin: 4px;">Cancel ${labels.appointment}</a>
      </div>

      ${getFooter(businessName)}
    </div>
  `;

  return sendEmail({ to: customerEmail, subject: `Booking Rescheduled - ${serviceName}`, html, fromName: businessName });
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
  businessSlug,
  timezone = "UTC",
  businessType,
  staffName,
}: {
  customerName: string;
  customerEmail: string;
  serviceName: string;
  startTime: Date;
  businessName: string;
  businessSlug: string;
  timezone?: string;
  businessType?: BusinessType;
  staffName?: string;
}) {
  const formattedDate = formatInTimezone(startTime, timezone, "EEEE, MMMM do 'at' h:mm a");
  const labels = getLabels(businessType);
  const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/b/${businessSlug}`;

  const staffHtml = staffName
    ? `
      <p style="margin: 0; color: #000000; font-size: 14px; font-weight: 600;">With ${labels.staff}</p>
      <p style="margin: 4px 0 16px 0; color: #000000; font-size: 14px; font-weight: 400; line-height: 1.5;">${staffName}</p>
    `
    : "";

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; padding: 40px; background-color: #ffffff;">
      <h1 style="color: #ef4444; font-size: 24px; font-weight: 600; margin-bottom: 8px;">${labels.appointment} Cancelled</h1>
      <p style="color: #000000; font-weight: 600; margin-bottom: 32px;">Hi ${customerName}, your ${labels.appointmentLower} at ${businessName} has been cancelled.</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 16px; padding: 24px; margin-bottom: 32px;">
        <p style="margin: 0; color: #000000; font-size: 14px; font-weight: 600;">${labels.service}</p>
        <p style="margin: 4px 0 16px 0; color: #000000; font-size: 14px; font-weight: 400; line-height: 1.5;">${serviceName}</p>
        ${staffHtml}
        <p style="margin: 0; color: #000000; font-size: 14px; font-weight: 600;">Original Time</p>
        <p style="margin: 4px 0 0 0; color: #000000; font-size: 14px; font-weight: 400; line-height: 1.5;">${formattedDate}</p>
      </div>

      <p style="color: #94a3b8; font-size: 13px; text-align: center; line-height: 1.6; margin-bottom: 20px;">If this was a mistake, please visit our booking page to schedule a new time.</p>
      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${bookingUrl}" style="color: #4f46e5; font-size: 14px; font-weight: 700; text-decoration: underline;">Book a new treatment with ${businessName}</a>
      </div>

      ${getFooter(businessName)}
    </div>
  `;
  return sendEmail({ to: customerEmail, subject: `Booking Cancelled - ${serviceName}`, html, fromName: businessName });
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
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          @media only screen and (max-width: 600px) {
            .btn-responsive {
              padding: 14px 28px !important;
              font-size: 15px !important;
              font-weight: 700 !important;
              border-radius: 12px !important;
            }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc;">
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; padding: 40px; background-color: #ffffff;">
          <h1 style="color: #4f46e5; font-size: 24px; font-weight: 600; margin-bottom: 16px;">Welcome to FluxBooking!</h1>
          <p style="color: #64748b; font-size: 15px; line-height: 24px; margin-bottom: 6px;">Hi ${adminName},</p>
          <p style="color: #64748b; font-size: 15px; line-height: 24px; margin-bottom: 20px;"><strong>${businessName}</strong> is now live on FluxBooking.</p>
          <div style="text-align: center; margin: 18px 0 4px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/overview" class="btn-responsive" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 10px 22px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 13.5px; box-shadow: 0 2px 8px rgba(79, 70, 229, 0.2);">Go to Dashboard</a>
          </div>
          ${getFooter(businessName, 18)}
        </div>
      </body>
    </html>
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
  staffId,
}: {
  staffName: string;
  staffEmail: string;
  businessName: string;
  staffId?: string;
}) {
  const loginUrl = staffId 
    ? `${process.env.NEXT_PUBLIC_APP_URL}/login?staffId=${staffId}` 
    : `${process.env.NEXT_PUBLIC_APP_URL}/login`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          @media only screen and (max-width: 600px) {
            .btn-responsive {
              padding: 14px 28px !important;
              font-size: 15px !important;
              font-weight: 700 !important;
              border-radius: 12px !important;
            }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc;">
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; padding: 40px; background-color: #ffffff;">
          <h1 style="color: #0f172a; font-size: 24px; font-weight: 600; margin-bottom: 16px;">You've been added to the team!</h1>
          <p style="color: #64748b; font-size: 15px; line-height: 24px; margin-bottom: 6px;">Hi ${staffName},</p>
          <p style="color: #64748b; font-size: 15px; line-height: 24px; margin-bottom: 20px;">You have been invited to join the team at <strong>${businessName}</strong>.</p>
          <div style="text-align: center; margin: 18px 0;">
            <a href="${loginUrl}" class="btn-responsive" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 10px 22px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 13.5px; box-shadow: 0 2px 8px rgba(79, 70, 229, 0.2);">Log in</a>
          </div>
          ${getFooter(businessName, 18)}
        </div>
      </body>
    </html>
  `;
  return sendEmail({ to: staffEmail, subject: `Invitation: Join ${businessName}`, html, fromName: businessName });
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
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          @media only screen and (max-width: 600px) {
            .btn-responsive {
              padding: 14px 28px !important;
              font-size: 15px !important;
              font-weight: 700 !important;
              border-radius: 12px !important;
            }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc;">
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; padding: 40px; background-color: #ffffff;">
          <h1 style="color: #0f172a; font-size: 24px; font-weight: 600; margin-bottom: 16px; text-align: center;">Reset your password</h1>
          <p style="color: #64748b; font-size: 16px; line-height: 24px; margin-bottom: 24px;">
            We received a request to reset the password for your FluxBooking account. Click the button below to choose a new password. This link is valid for 2 hours.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${resetUrl}" class="btn-responsive" style="display: inline-block; background-color: #6366f1; color: #ffffff; padding: 10px 22px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 13.5px; box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);">
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
          ${getFooter()}
        </div>
      </body>
    </html>
  `;
  
  return sendEmail({
    to: email,
    subject: "Reset your FluxBooking Password",
    html,
  });
}
