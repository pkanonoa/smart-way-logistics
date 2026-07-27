const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const name = 'Manager Viewer';
  const phone = '8888888888';
  const password = 'manager123';
  const role = 'manager';

  console.log('Checking if manager already exists...');
  const existing = await prisma.user.findUnique({
    where: { phone }
  });

  if (existing) {
    console.log(`User with phone ${phone} already exists.`);
    return;
  }

  console.log('Hashing password...');
  const password_hash = await bcrypt.hash(password, 10);

  console.log('Creating manager user...');
  const user = await prisma.user.create({
    data: {
      name,
      phone,
      password_hash,
      role
    }
  });

  console.log(`Successfully created manager:`);
  console.log(`Name: ${user.name}`);
  console.log(`Phone: ${user.phone}`);
  console.log(`Password: ${password}`);
  console.log(`Role: ${user.role}`);
}

main()
  .catch((e) => {
    console.error('Error creating manager:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
