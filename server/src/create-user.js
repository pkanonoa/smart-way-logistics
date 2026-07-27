const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const name = 'Admin User';
  const phone = '9876543210';
  const password = 'password123';
  const role = 'admin';

  console.log('Checking if user already exists...');
  const existing = await prisma.user.findUnique({
    where: { phone }
  });

  if (existing) {
    console.log(`User with phone ${phone} already exists.`);
    return;
  }

  console.log('Hashing password...');
  const password_hash = await bcrypt.hash(password, 10);

  console.log('Creating user...');
  const user = await prisma.user.create({
    data: {
      name,
      phone,
      password_hash,
      role
    }
  });

  console.log(`Successfully created user:`);
  console.log(`Name: ${user.name}`);
  console.log(`Phone: ${user.phone}`);
  console.log(`Password: ${password}`);
  console.log(`Role: ${user.role}`);
}

main()
  .catch((e) => {
    console.error('Error creating user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
