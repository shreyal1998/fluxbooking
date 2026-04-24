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
    staff: "Stylist",
    staffLower: "stylist",
    service: "Service",
    serviceLower: "service",
    customer: "Client",
    customerLower: "client",
    appointment: "Booking",
    appointmentLower: "booking",
  },
  GYM: {
    staff: "Coach",
    staffLower: "coach",
    service: "Session",
    serviceLower: "session",
    customer: "Member",
    customerLower: "member",
    appointment: "Session",
    appointmentLower: "session",
  },
  CLINIC: {
    staff: "Practitioner",
    staffLower: "practitioner",
    service: "Consultation",
    serviceLower: "consultation",
    customer: "Patient",
    customerLower: "patient",
    appointment: "Appointment",
    appointmentLower: "appointment",
  },
};

export function getLabels(type: BusinessType | null | undefined): BusinessLabels {
  return labelsMap[type || "SALON"];
}
