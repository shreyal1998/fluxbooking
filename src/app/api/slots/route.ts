import { NextRequest, NextResponse } from "next/request";
import { getAvailableSlots } from "@/app/actions/booking";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId");
  const serviceId = searchParams.get("serviceId");
  const date = searchParams.get("date");
  const staffId = searchParams.get("staffId") || undefined;

  if (!tenantId || !serviceId || !date) {
    return Response.json({ error: "Missing required parameters" }, { status: 400 });
  }

  try {
    const slots = await getAvailableSlots(tenantId, serviceId, date, staffId);
    return Response.json({ slots });
  } catch (error) {
    console.error("Slots API error:", error);
    return Response.json({ error: "Failed to fetch slots" }, { status: 500 });
  }
}
