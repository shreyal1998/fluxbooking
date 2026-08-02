import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function validatePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null; // Phone is optional
  const parts = phone.trim().split(" ");
  if (parts.length < 2) {
    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length > 0 && digitsOnly.length < 7) {
      return "Phone number must be at least 7 digits";
    }
    return null;
  }
  const dialCode = parts[0];
  const localNumber = parts.slice(1).join("").replace(/\D/g, "");
  
  if (dialCode === "+91" || dialCode === "+1" || dialCode === "+44") {
    if (localNumber.length > 0 && localNumber.length < 10) {
      return `Phone number must be exactly 10 digits for country code ${dialCode}`;
    }
  } else if (dialCode === "+61") {
    if (localNumber.length > 0 && localNumber.length < 9) {
      return `Phone number must be exactly 9 digits for country code ${dialCode}`;
    }
  } else {
    if (localNumber.length > 0 && localNumber.length < 7) {
      return "Phone number must be at least 7 digits";
    }
  }
  return null;
}
