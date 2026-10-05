import { Metadata } from "next";
import { HomeClient } from "../home-client";

export const metadata: Metadata = {
  title: "Features | FluxBooking - Modern Booking & Practice Management",
  description: "Explore the complete feature suite of FluxBooking: adaptive terminology for healthcare and salons, practitioner scheduling, multi-location support, automated emails, and self-service booking.",
};

export default function FeaturesPage() {
  return <HomeClient />;
}
