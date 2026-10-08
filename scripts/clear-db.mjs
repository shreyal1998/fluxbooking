import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function clearData() {
  const dbUrl = process.env.DATABASE_URL || "";

  if (process.env.NODE_ENV === "production") {
    console.error("❌ SAFETY ABORT: Cannot run db:clear in production environment!");
    process.exit(1);
  }

  // Detect non-local hostnames unless explicitly bypassed
  const isLocal = dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1") || dbUrl.includes("::1");
  const forceFlag = process.argv.includes("--force");

  if (!isLocal && !forceFlag) {
    console.warn("⚠️  WARNING: Your DATABASE_URL does not appear to point to localhost.");
    console.warn(`Target URL: ${dbUrl.replace(/:[^:@]+@/, ":****@")}`);
    console.error("❌ SAFETY ABORT: If you really intend to clear a remote/hosted database, run with '--force':");
    console.error("   node scripts/clear-db.mjs --force");
    process.exit(1);
  }

  console.log("Connecting to database and clearing all table records...");
  
  try {
    // Truncate all tables in PostgreSQL with CASCADE
    const tableNames = [
      "Invoice",
      "LeaveRequest",
      "BlockedSlot",
      "Booking",
      "Customer",
      "AvailabilityOverride",
      "Location",
      "Service",
      "Staff",
      "Session",
      "Account",
      "PasswordResetToken",
      "VerificationToken",
      "User",
      "Tenant"
    ];

    const quotedTables = tableNames.map(t => `"${t}"`).join(", ");
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quotedTables} CASCADE;`);

    console.log("Successfully cleared all data from the database!");
  } catch (error) {
    console.error("Error clearing database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

clearData();
