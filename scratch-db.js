const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      staffProfile: true
    }
  });
  console.log("Users and their staff profiles:", JSON.stringify(users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    hasStaffProfile: !!u.staffProfile,
    staffProfileId: u.staffProfile?.id
  })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
