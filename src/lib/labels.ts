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
  staffSlug: string;
  service: string;
  serviceLower: string;
  servicePlaceholder: string;
  serviceIcon: LucideIcon;
  serviceSlug: string;
  customer: string;
  customerLower: string;
  customerPlaceholder: string;
  customerIcon: LucideIcon;
  customerSlug: string;
  appointment: string;
  appointmentLower: string;
  appointmentSlug: string;
}

const labelsMap: Record<BusinessType, BusinessLabels> = {
  SALON: {
    businessTypeName: "Salon & Beauty",
    staff: "Team Member",
    staffLower: "team member",
    staffPlaceholder: "e.g., Jane Doe",
    staffIcon: Users,
    staffSlug: "team",
    service: "Service",
    serviceLower: "service",
    servicePlaceholder: "e.g., Haircut & Style",
    serviceIcon: Scissors,
    serviceSlug: "services",
    customer: "Client",
    customerLower: "client",
    customerPlaceholder: "e.g., Alice Smith",
    customerIcon: UserCircle,
    customerSlug: "clients",
    appointment: "Booking",
    appointmentLower: "booking",
    appointmentSlug: "bookings",
  },
  GYM: {
    businessTypeName: "Fitness & Gym",
    staff: "Trainer",
    staffLower: "trainer",
    staffPlaceholder: "e.g., Coach Mike",
    staffIcon: Users,
    staffSlug: "trainers",
    service: "Class",
    serviceLower: "class",
    servicePlaceholder: "e.g., Yoga Flow or HIIT",
    serviceIcon: Dumbbell,
    serviceSlug: "classes",
    customer: "Member",
    customerLower: "member",
    customerPlaceholder: "e.g., John Fit",
    customerIcon: UserCircle,
    customerSlug: "members",
    appointment: "Session",
    appointmentLower: "session",
    appointmentSlug: "sessions",
  },
  CLINIC: {
    businessTypeName: "Medical & Health",
    staff: "Practitioner",
    staffLower: "practitioner",
    staffPlaceholder: "e.g., Dr. Sarah White",
    staffIcon: Users,
    staffSlug: "practitioners",
    service: "Treatment",
    serviceLower: "treatment",
    servicePlaceholder: "e.g., Dental Checkup",
    serviceIcon: Stethoscope,
    serviceSlug: "treatments",
    customer: "Patient",
    customerLower: "patient",
    customerPlaceholder: "e.g., Robert Brown",
    customerIcon: UserCircle,
    customerSlug: "patients",
    appointment: "Appointment",
    appointmentLower: "appointment",
    appointmentSlug: "appointments",
  },
};

export function getLabels(type: BusinessType | null | undefined): BusinessLabels {
  return labelsMap[type || "SALON"];
}
