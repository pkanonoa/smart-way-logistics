const { PrismaClient } = require('@prisma/client');

// Create a singleton Prisma client instance shared across the app
const prisma = new PrismaClient();

module.exports = prisma;
