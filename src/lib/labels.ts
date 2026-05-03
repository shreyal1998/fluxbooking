import { BusinessType } from "@prisma/client";
import { 
  Scissors, 
  Users, 
  UserCircle, 
  Dumbbell, 
  Stethoscope,
  LucideIcon 
} from "lucide-react";

export interface BusinessLabels {
  businessTypeName: string;
  staff: string;
  staffLower: string;
  staffPlaceholder: string;
  staffIcon: LucideIcon;
  service: string;
  serviceLower: string;
  servicePlaceholder: string;
  serviceIcon: LucideIcon;
  customer: string;
  customerLower: string;
  customerPlaceholder: string;
  customerIcon: LucideIcon;
  appointment: string;
  appointmentLower: string;
}

const labelsMap: Record<BusinessType, BusinessLabels> = {
  SALON: {
    businessTypeName: "Salon & Beauty",
    staff: "Team Member",
    staffLower: "team member",
    staffPlaceholder: "e.g., Jane Doe",
    staffIcon: Users,
    service: "Service",
    serviceLower: "service",
    servicePlaceholder: "e.g., Haircut & Style",
    serviceIcon: Scissors,
    customer: "Client",
    customerLower: "client",
    customerPlaceholder: "e.g., Alice Smith",
    customerIcon: UserCircle,
    appointment: "Booking",
    appointmentLower: "booking",
  },
  GYM: {
    businessTypeName: "Fitness & Gym",
    staff: "Trainer",
    staffLower: "trainer",
    staffPlaceholder: "e.g., Coach Mike",
    staffIcon: Users,
    service: "Class",
    serviceLower: "class",
    servicePlaceholder: "e.g., Yoga Flow or HIIT",
    serviceIcon: Dumbbell,
    customer: "Member",
    customerLower: "member",
    customerPlaceholder: "e.g., John Fit",
    customerIcon: UserCircle,
    appointment: "Session",
    appointmentLower: "session",
  },
  CLINIC: {
    businessTypeName: "Medical & Health",
    staff: "Practitioner",
    staffLower: "practitioner",
    staffPlaceholder: "e.g., Dr. Sarah White",
    staffIcon: Users,
    service: "Treatment",
    serviceLower: "treatment",
    servicePlaceholder: "e.g., Dental Checkup",
    serviceIcon: Stethoscope,
    customer: "Patient",
    customerLower: "patient",
    customerPlaceholder: "e.g., Robert Brown",
    customerIcon: UserCircle,
    appointment: "Appointment",
    appointmentLower: "appointment",
  },
};

export function getLabels(type: BusinessType | null | undefined): BusinessLabels {
  return labelsMap[type || "SALON"];
}
