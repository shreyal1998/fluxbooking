import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function revertTrial() {
  console.log("Reverting trial extension to test expiration behavior...");
  
  const pastDate = new Date("2026-05-11T00:00:00Z");

  const tenants = await prisma.tenant.findMany();
  
  for (const tenant of tenants) {
    console.log(`Reverting tenant: ${tenant.name} (${tenant.slug})`);
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        planStatus: "TRIALING",
        trialEndsAt: pastDate
      }
    });
    console.log(`- Trial reset to past date: ${pastDate}`);
  }

  console.log("Revert complete. The public page should now be offline again.");
}

revertTrial()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
