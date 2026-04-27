import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function checkUser() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.log("Usage: npx ts-node check-user.ts <email> <password>");
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.log("User not found in database.");
    return;
  }

  console.log("User found:", {
    id: user.id,
    email: user.email,
    role: user.role,
    hasPassword: !!user.password,
  });

  if (user.password) {
    const isValid = await bcrypt.compare(password, user.password);
    console.log("Password is valid:", isValid);
  } else {
    console.log("User has no password (maybe logged in with GitHub).");
  }
}

checkUser()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
