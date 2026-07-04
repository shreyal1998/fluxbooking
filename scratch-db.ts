import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany();
  console.log("=== TENANTS TIMEZONE ===");
  tenants.forEach(t => {
    console.log(`Tenant ID: ${t.id}, Name: ${t.name}, Timezone: ${t.timezone}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
