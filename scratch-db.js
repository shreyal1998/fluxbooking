const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== BLOCKED SLOTS ===");
  const blocks = await prisma.blockedSlot.findMany();
  blocks.forEach(b => {
    console.log(`Block ID: ${b.id}, Staff ID: ${b.staffId}, Start: ${b.startTime.toISOString()}, End: ${b.endTime.toISOString()}, Reason: ${b.reason}`);
  });

  console.log("\n=== LEAVE REQUESTS ===");
  const leaves = await prisma.leaveRequest.findMany();
  leaves.forEach(l => {
    console.log(`Leave ID: ${l.id}, Staff ID: ${l.staffId}, Status: ${l.status}, Start: ${l.startTime.toISOString()}, End: ${l.endTime.toISOString()}, Reason: ${l.reason}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
