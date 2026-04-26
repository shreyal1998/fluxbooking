import { BusinessType } from "@prisma/client";

export interface BusinessLabels {
  staff: string;
  staffLower: string;
  service: string;
  serviceLower: string;
  customer: string;
  customerLower: string;
  appointment: string;
  appointmentLower: string;
}

const labelsMap: Record<BusinessType, BusinessLabels> = {
  SALON: {
    staff: "Team Member",
    staffLower: "team member",
    service: "Service",
    serviceLower: "service",
    customer: "Client",
    customerLower: "client",
    appointment: "Booking",
    appointmentLower: "booking",
  },
  GYM: {
    staff: "Team Member",
    staffLower: "team member",
    service: "Service",
    serviceLower: "service",
    customer: "Member",
    customerLower: "member",
    appointment: "Booking",
    appointmentLower: "booking",
  },
  CLINIC: {
    staff: "Team Member",
    staffLower: "team member",
    service: "Service",
    serviceLower: "service",
    customer: "Patient",
    customerLower: "patient",
    appointment: "Appointment",
    appointmentLower: "appointment",
  },
};

export function getLabels(type: BusinessType | null | undefined): BusinessLabels {
  return labelsMap[type || "SALON"];
}
