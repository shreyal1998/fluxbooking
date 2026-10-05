import { Mail, RefreshCw, XCircle, CheckCircle2, Shield, Send, Bell } from "lucide-react";
import Link from "next/link";

export default function NotificationsDocs() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
          Emails & <span className="text-indigo-600 dark:text-indigo-400">Self-Service Rescheduling</span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 font-normal leading-relaxed max-w-2xl">
          Automate all transactional communication with high-deliverability emails and secure tokenized self-service links.
        </p>
      </div>

      {/* Automated Email Workflows */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-600 dark:text-rose-400">
            <Mail className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Automated Transactional Emails</h2>
        </div>
        <p className="text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
          FluxBooking is integrated with Resend to send instant, beautifully formatted transactional emails:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all space-y-2">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Booking Confirmation</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
              Sent immediately to the client and assigned practitioner with appointment date, time, duration, and branch address.
            </p>
          </div>

          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all space-y-2">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Reschedule Notice</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
              Notifies both parties whenever an appointment time is modified, ensuring zero confusion.
            </p>
          </div>

          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-rose-300 dark:hover:border-rose-700 transition-all space-y-2">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Cancellation Receipt</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
              Acknowledges canceled bookings and instantly frees up the time slot on the calendar for new clients.
            </p>
          </div>
        </div>
      </section>

      {/* 1-Click Tokenized Rescheduling */}
      <section className="p-8 sm:p-10 rounded-[2.5rem] bg-indigo-600 text-white space-y-6">
        <div className="space-y-4">
          <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
            <RefreshCw className="h-6 w-6" />
            Tokenized Self-Service Links
          </h3>
          <p className="text-indigo-100 text-sm font-normal leading-relaxed max-w-xl">
            Every confirmation email contains encrypted, tokenized action links. Clients can reschedule their appointment or cancel without needing an account or login password.
          </p>
          <ul className="space-y-2.5 pt-2">
            {[
              "Encrypted action tokens ensure clients can only modify their own booking",
              "Live slot selector prevents double-booking during rescheduling",
              "Immediate calendar update and email receipt upon confirmation"
            ].map(item => (
              <li key={item} className="flex items-center gap-2 text-sm font-medium text-white/95">
                <CheckCircle2 className="h-4 w-4 text-white" /> {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="pt-12 border-t border-slate-100 dark:border-slate-800 flex justify-between">
        <Link href="/docs/customers" className="text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">← Patients & Customers</Link>
        <Link href="/docs/multi-tenancy" className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">Data Isolation →</Link>
      </div>
    </div>
  );
}
