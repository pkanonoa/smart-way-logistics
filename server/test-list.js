const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const staffs = await prisma.staff.findMany({
      orderBy: { name: 'asc' },
    });
    console.log("SUCCESS:", staffs);
  } catch (err) {
    console.error("FAILED WITH ERROR:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
