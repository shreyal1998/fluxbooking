import { Metadata } from "next";
import HelpClient from "./help-client";

export const metadata: Metadata = {
  title: "Help Center | FluxBooking",
  description: "Get assistance with your FluxBooking account, billing, and technical questions.",
};

export default function HelpPage() {
  return <HelpClient />;
}
