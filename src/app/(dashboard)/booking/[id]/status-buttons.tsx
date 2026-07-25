"use client";

import { useState } from "react";
import { updateBookingStatus, deleteBooking } from "@/app/actions/booking";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Undo, ArrowLeft, CheckCircle2, Trash2 } from "lucide-react";
import { ManualBooking } from "@/components/dashboard/manual-booking";
import { getLabels } from "@/lib/labels";
import { Tooltip } from "@/components/ui/tooltip";

interface StatusButtonsProps {
  booking: any;
  services: any[];
  staff: any[];
  tenant: any;
  iconOnly?: boolean;
}

export function StatusButtons({ booking, services, staff, tenant, iconOnly = false }: StatusButtonsProps) {
  const [loading, setLoading] = useState(false);
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

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this booking? This action cannot be undone.")) return;
    setLoading(true);
    try {
      const res = await deleteBooking(bookingId);
      if (res.success) {
        toast.success("Booking deleted successfully!");
        router.push(`/${appointmentSlug}`);
      } else {
        toast.error(res.error || "Failed to delete booking");
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
      {(currentStatus === "PENDING" || currentStatus === "CONFIRMED" || currentStatus === "COMPLETED") && (
        iconOnly ? (
          <Tooltip content="Edit Booking" position="bottom">
            {editButton}
          </Tooltip>
        ) : editButton
      )}

      {currentStatus === "PENDING" && (
        <>
          {iconOnly ? (
            <Tooltip content="Complete Booking" position="bottom">
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
          )}

          {iconOnly ? (
            <Tooltip content="Cancel Booking" position="bottom">
              <button
                disabled={loading}
                onClick={() => handleUpdate("CANCELLED")}
                className="h-9 w-9 flex items-center justify-center bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all disabled:opacity-50 shadow-sm active:scale-95 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </Tooltip>
          ) : (
            <button
              disabled={loading}
              onClick={() => handleUpdate("CANCELLED")}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-2xl font-bold text-xs transition-all disabled:opacity-50 shadow-sm active:scale-95 cursor-pointer"
            >
              <X className="h-4 w-4" />
              Cancel Booking
            </button>
          )}
        </>
      )}

      {currentStatus === "CONFIRMED" && (
        <>
          {iconOnly ? (
            <Tooltip content="Complete Booking" position="bottom">
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
          )}

          {iconOnly ? (
            <Tooltip content="Cancel Booking" position="bottom">
              <button
                disabled={loading}
                onClick={() => handleUpdate("CANCELLED")}
                className="h-9 w-9 flex items-center justify-center bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all disabled:opacity-50 shadow-sm active:scale-95 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </Tooltip>
          ) : (
            <button
              disabled={loading}
              onClick={() => handleUpdate("CANCELLED")}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-2xl font-bold text-xs transition-all disabled:opacity-50 shadow-sm active:scale-95 cursor-pointer"
            >
              <X className="h-4 w-4" />
              Cancel Booking
            </button>
          )}
        </>
      )}

      {currentStatus === "COMPLETED" && (
        iconOnly ? (
          <Tooltip content="Cancel Booking" position="bottom">
            <button
              disabled={loading}
              onClick={() => handleUpdate("CANCELLED")}
              className="h-9 w-9 flex items-center justify-center bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all disabled:opacity-50 shadow-sm active:scale-95 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </Tooltip>
        ) : (
          <button
            disabled={loading}
            onClick={() => handleUpdate("CANCELLED")}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-2xl font-bold text-xs transition-all disabled:opacity-50 shadow-sm active:scale-95 cursor-pointer"
          >
            <X className="h-4 w-4" />
            Cancel Booking
          </button>
        )
      )}

      {currentStatus === "CANCELLED" && (
        iconOnly ? (
          <Tooltip content="Restore to Pending" position="bottom">
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

      {/* Delete button: always available */}
      {iconOnly ? (
        <Tooltip content="Delete Booking" position="bottom">
          <button
            disabled={loading}
            onClick={handleDelete}
            className="h-9 w-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-rose-600 dark:text-rose-400 rounded-xl transition-all disabled:opacity-50 shadow-sm active:scale-95 cursor-pointer border border-rose-100/50 dark:border-rose-900/30"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </Tooltip>
      ) : (
        <button
          disabled={loading}
          onClick={handleDelete}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-rose-600 dark:text-rose-400 px-6 py-2.5 rounded-2xl font-bold text-xs transition-all disabled:opacity-50 shadow-sm active:scale-95 cursor-pointer border border-rose-100/50 dark:border-rose-900/30"
        >
          <Trash2 className="h-4 w-4" />
          Delete Booking
        </button>
      )}
    </div>
  );
}
