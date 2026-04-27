import { PrismaClient } from "@prisma/client";

async function test() {
  const url = "postgresql://postgres:postgres@localhost:5432/postgres?schema=public";
  console.log("Testing connection with hard-coded URL...");
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: url,
      },
    },
  });

  try {
    await prisma.$connect();
    console.log("SUCCESS: Connected to local database!");
    
    // Try a simple query
    const count = await prisma.user.count();
    console.log(`Current user count: ${count}`);
    
  } catch (error) {
    console.error("FAILURE: Could not connect.", error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
