import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { Settings as SettingsIcon, Building, Globe, Mail, Shield, Clock, Palette } from "lucide-react";
import { AvailabilityEditor } from "@/components/dashboard/availability-editor";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { BillingSettings } from "@/components/dashboard/billing-settings";
import { BrandingSettings } from "@/components/dashboard/branding-settings";
import { LocationList } from "@/components/dashboard/location-list";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tenantId = (session.user as any).tenantId;
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { locations: true }
  });

  const userRole = (session.user as any).role;

  return (
    <div className="space-y-8 max-w-4xl animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h2>
        <p className="text-slate-500 dark:text-slate-200">Manage your business profile and preferences.</p>
      </div>

      {/* Subscription Section - ONLY for ADMIN */}
      {userRole === "ADMIN" && (
        <BillingSettings 
          currentPlan={tenant?.plan || "FREE"} 
          planInterval={tenant?.planInterval || "MONTH"} 
        />
      )}

      {/* Branding Section - ONLY for ADMIN */}
      {userRole === "ADMIN" && (
        <BrandingSettings 
          initialColor={tenant?.primaryColor || "#6366f1"} 
          initialLogo={tenant?.logoUrl || null} 
        />
      )}

      {/* Locations Section - ONLY for ADMIN */}
      {userRole === "ADMIN" && (
        <LocationList 
          locations={tenant?.locations || []} 
          isPro={tenant?.plan === "PRO"} 
        />
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <Building className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-bold text-slate-900 dark:text-white">Business Profile</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Business Name</label>
              <input
                type="text"
                disabled
                value={tenant?.name}
                className="mt-1 block w-full rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-500 dark:text-slate-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Business Type</label>
              <input
                type="text"
                disabled
                value={tenant?.businessType}
                className="mt-1 block w-full rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-500 dark:text-slate-300"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Public URL Slug</label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 text-slate-500 dark:text-slate-300 text-sm">
                {process.env.NEXT_PUBLIC_APP_URL || 'fluxbooking.com'}/b/
              </span>
              <input
                type="text"
                disabled
                value={tenant?.slug}
                className="block w-full min-w-0 flex-1 rounded-none rounded-r-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-500 dark:text-slate-300"
              />
            </div>
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">Your unique identifier used for your public booking page.</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-bold text-slate-900 dark:text-white">Business Hours</h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-500 dark:text-slate-200 mb-6">Define the general opening and closing hours for your venue. These act as the master constraints for all bookings.</p>
          <AvailabilityEditor 
            initialAvailability={tenant?.businessHoursJson || {
              monday: { start: "09:00", end: "17:00" },
              tuesday: { start: "09:00", end: "17:00" },
              wednesday: { start: "09:00", end: "17:00" },
              thursday: { start: "09:00", end: "17:00" },
              friday: { start: "09:00", end: "17:00" },
            }} 
            isBusiness={true} 
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <Palette className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-bold text-slate-900 dark:text-white">Appearance</h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-500 dark:text-slate-200 mb-6">Customize how FluxBooking looks on your device.</p>
          <ThemeToggle />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-bold text-slate-900 dark:text-white">Account Security</h3>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Admin Email</label>
            <input
              type="text"
              disabled
              value={session.user?.email || ""}
              className="mt-1 block w-full rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-500 dark:text-slate-300"
            />
          </div>
          <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
            Change Password
          </button>
        </div>
      </div>

      <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-xl border border-red-100 dark:border-red-900/30">
        <h4 className="text-red-800 dark:text-red-400 font-bold mb-1">Danger Zone</h4>
        <p className="text-red-600 dark:text-red-400/70 text-sm mb-4">Deleting your business will remove all data, including appointments and staff lists. This action is irreversible.</p>
        <button className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-red-700 transition-colors">
          Delete Business
        </button>
      </div>
    </div>
  );
}
