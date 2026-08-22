"use client";

import { useState } from "react";
import { updateBookingStatus } from "@/app/actions/booking";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Undo, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { ManualBooking } from "@/components/dashboard/manual-booking";
import { getLabels } from "@/lib/labels";
import { Tooltip } from "@/components/ui/tooltip";
import { Portal } from "@/components/ui/portal";

interface StatusButtonsProps {
  booking: any;
  services: any[];
  staff: any[];
  tenant: any;
  iconOnly?: boolean;
}

export function StatusButtons({ booking, services, staff, tenant, iconOnly = false }: StatusButtonsProps) {
  const [loading, setLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const router = useRouter();
  const currentStatus = booking.status;
  const bookingId = booking.id;
  
  const labels = getLabels(tenant?.businessType);
  const appointmentSlug = labels.appointmentSlug;

  const handleUpdate = async (status: string) => {
    setLoading(true);
    try {
      const res = await updateBookingStatus(bookingId, status);
      if (res.success) {
        toast.success(`Booking status updated to ${status.toLowerCase()}!`);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update booking status");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const proceedCancel = async () => {
    setLoading(true);
    try {
      const res = await updateBookingStatus(bookingId, "CANCELLED");
      if (res.success) {
        toast.success("Booking cancelled successfully!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to cancel booking");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const editButton = (
    <ManualBooking 
      tenantId={tenant.id}
      services={services}
      staff={staff}
      mode="edit"
      initialData={booking}
      businessType={tenant.businessType}
      currency={tenant.currency || "USD"}
      timeFormat={tenant.timeFormat || "12h"}
      timezone={tenant.timezone || "UTC"}
      triggerIconOnly={iconOnly}
    />
  );

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Edit: PENDING, CONFIRMED, COMPLETED */}
      {(currentStatus === "PENDING" || currentStatus === "CONFIRMED" || currentStatus === "COMPLETED") && (
        iconOnly ? (
          <Tooltip content="Edit" position="bottom">
            {editButton}
          </Tooltip>
        ) : editButton
      )}

      {/* Complete: PENDING */}
      {currentStatus === "PENDING" && (
        iconOnly ? (
          <Tooltip content="Complete" position="bottom">
            <button
              disabled={loading}
              onClick={() => handleUpdate("COMPLETED")}
              className="h-9 w-9 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all disabled:opacity-50 shadow-sm active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
            </button>
          </Tooltip>
        ) : (
          <button
            disabled={loading}
            onClick={() => handleUpdate("COMPLETED")}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-2xl font-bold text-xs transition-all disabled:opacity-50 shadow-sm active:scale-95 cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4" />
            Complete Booking
          </button>
        )
      )}

      {/* Complete: CONFIRMED */}
      {currentStatus === "CONFIRMED" && (
        iconOnly ? (
          <Tooltip content="Complete" position="bottom">
            <button
              disabled={loading}
              onClick={() => handleUpdate("COMPLETED")}
              className="h-9 w-9 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all disabled:opacity-50 shadow-sm active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
            </button>
          </Tooltip>
        ) : (
          <button
            disabled={loading}
            onClick={() => handleUpdate("COMPLETED")}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-2xl font-bold text-xs transition-all disabled:opacity-50 shadow-sm active:scale-95 cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4" />
            Complete Booking
          </button>
        )
      )}

      {/* Restore: COMPLETED or CANCELLED */}
      {(currentStatus === "CANCELLED" || currentStatus === "COMPLETED") && (
        iconOnly ? (
          <Tooltip content="Restore" position="bottom">
            <button
              disabled={loading}
              onClick={() => handleUpdate("PENDING")}
              className="h-9 w-9 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all disabled:opacity-50 shadow-sm active:scale-95 cursor-pointer"
            >
              <Undo className="h-4 w-4" />
            </button>
          </Tooltip>
        ) : (
          <button
            disabled={loading}
            onClick={() => handleUpdate("PENDING")}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-2xl font-bold text-xs transition-all disabled:opacity-50 shadow-sm active:scale-95 cursor-pointer"
          >
            <Undo className="h-4 w-4" />
            Restore to Pending
          </button>
        )
      )}

      {/* Cancel: always last, only when not already cancelled */}
      {currentStatus !== "CANCELLED" && (
        iconOnly ? (
          <Tooltip content="Cancel" position="bottom">
            <button
              disabled={loading}
              onClick={() => setShowCancelConfirm(true)}
              className="h-9 w-9 flex items-center justify-center bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all disabled:opacity-50 shadow-sm active:scale-95 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </Tooltip>
        ) : (
          <button
            disabled={loading}
            onClick={() => setShowCancelConfirm(true)}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-2xl font-bold text-xs transition-all disabled:opacity-50 shadow-sm active:scale-95 cursor-pointer"
          >
            <X className="h-4 w-4" />
            Cancel Booking
          </button>
        )
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <Portal>
          <div className="fixed inset-0 z-[2147483647] absolute-top flex items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-glass-pulse" 
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="p-8 space-y-6 text-center">
                <div className="mx-auto h-16 w-16 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-500 dark:text-amber-400 animate-bounce">
                  <AlertCircle className="h-8 w-8" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Cancel Booking?</h3>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Are you sure you want to cancel this booking? This will free up the slot for other customers.
                  </p>
                </div>

                <div className="flex gap-4 pt-2">
                  <button 
                    onClick={() => setShowCancelConfirm(false)}
                    className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    No, Keep it
                  </button>
                  <button 
                    disabled={loading}
                    onClick={async () => {
                      setShowCancelConfirm(false);
                      await proceedCancel();
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    Cancel Booking
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
