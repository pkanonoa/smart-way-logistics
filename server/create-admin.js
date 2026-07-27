const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
  const hash = await bcrypt.hash('password123', 12);
  const u = await prisma.user.create({
    data: {
      name: 'Admin',
      phone: '1234567890',
      password_hash: hash,
      role: 'admin'
    }
  });
  console.log('created admin', u);
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
