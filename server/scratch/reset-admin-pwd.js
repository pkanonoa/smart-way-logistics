const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const password = 'admin123';
  const password_hash = await bcrypt.hash(password, 12);
  
  // Reset password for '1234567890'
  await prisma.user.updateMany({
    where: {
      phone: '1234567890'
    },
    data: {
      password_hash
    }
  });

  // Reset password for '9876543210'
  await prisma.user.updateMany({
    where: {
      phone: '9876543210'
    },
    data: {
      password_hash
    }
  });

  // Reset password for '+919876543210'
  await prisma.user.updateMany({
    where: {
      phone: '+919876543210'
    },
    data: {
      password_hash
    }
  });

  // Reset password for '8888888888' (viewer) to 'viewer123'
  const viewerHash = await bcrypt.hash('viewer123', 12);
  await prisma.user.updateMany({
    where: {
      phone: '8888888888'
    },
    data: {
      password_hash: viewerHash
    }
  });

  console.log("Passwords successfully reset!");
  console.log("Admin accounts (phone: 1234567890, 9876543210) password set to: admin123");
  console.log("Viewer account (phone: 8888888888) password set to: viewer123");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
