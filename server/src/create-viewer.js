const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const name = 'Viewer User';
  const phone = '8888888888';
  const password = 'viewer123';
  const role = 'viewer';

  console.log('Checking if viewer already exists...');
  const existing = await prisma.user.findUnique({
    where: { phone }
  });

  if (existing) {
    console.log(`User with phone ${phone} already exists.`);
    return;
  }

  console.log('Hashing password...');
  const password_hash = await bcrypt.hash(password, 10);

  console.log('Creating viewer user...');
  const user = await prisma.user.create({
    data: {
      name,
      phone,
      password_hash,
      role
    }
  });

  console.log(`Successfully created viewer:`);
  console.log(`Name: ${user.name}`);
  console.log(`Phone: ${user.phone}`);
  console.log(`Password: ${password}`);
  console.log(`Role: ${user.role}`);
}

main()
  .catch((e) => {
    console.error('Error creating viewer:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
