import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const services = await prisma.service.findMany();
  console.log("=== SERVICES ===");
  services.forEach(s => {
    console.log(`Service ID: ${s.id}, Name: ${s.name}, Color: "${s.color}"`);
  });

  const bookings = await prisma.booking.findMany({
    include: {
      service: true
    }
  });
  console.log("=== BOOKINGS ===");
  bookings.forEach(b => {
    console.log(`Booking ID: ${b.id}, Customer: ${b.customerName}, Status: ${b.status}, Service Color: "${b.service.color}"`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
