import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixTrial() {
  console.log("Checking for expired trials...");
  
  const now = new Date();
  const future = new Date();
  future.setDate(now.getDate() + 30); // 30 days from now

  const tenants = await prisma.tenant.findMany();
  
  if (tenants.length === 0) {
    console.log("No tenants found.");
    return;
  }

  for (const tenant of tenants) {
    console.log(`Checking tenant: ${tenant.name} (${tenant.slug})`);
    console.log(`- Current Status: ${tenant.planStatus}`);
    console.log(`- Trial Ends At: ${tenant.trialEndsAt}`);

    const isExpired = tenant.planStatus === "TRIALING" && tenant.trialEndsAt && tenant.trialEndsAt < now;
    const isPastDue = tenant.planStatus === "PAST_DUE";

    if (isExpired || isPastDue || !tenant.trialEndsAt) {
      console.log(`- Updating trial for ${tenant.name}...`);
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          planStatus: "TRIALING",
          trialEndsAt: future
        }
      });
      console.log(`- Trial extended to ${future}`);
    } else {
      console.log("- Trial is still active.");
    }
  }

  console.log("Trial fix complete.");
}

fixTrial()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
