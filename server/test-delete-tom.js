const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tomId = 'fb9bef3e-5e32-4a9d-bd80-75ba2ccfbfa1';
  try {
    const result = await prisma.staff.delete({ where: { id: tomId } });
    console.log("SUCCESS:", result);
  } catch (err) {
    console.error("ERROR DELETING TOM:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
