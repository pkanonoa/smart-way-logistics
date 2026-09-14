const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('🧹 Clearing all data from the database...');

  try {
    console.log('Deleting StopItems...');
    await prisma.stopItem.deleteMany();

    console.log('Deleting Stops...');
    await prisma.stop.deleteMany();

    console.log('Deleting Trips...');
    await prisma.trip.deleteMany();

    console.log('Deleting ParcelTracking...');
    await prisma.parcelTracking.deleteMany();

    console.log('Deleting Payments...');
    await prisma.payment.deleteMany();

    console.log('Deleting Waybills...');
    await prisma.waybill.deleteMany();

    console.log('Deleting DailyCollections...');
    await prisma.dailyCollection.deleteMany();

    console.log('Deleting StaffAdvances...');
    await prisma.staffAdvance.deleteMany();

    console.log('Deleting SalaryPayments...');
    await prisma.salaryPayment.deleteMany();

    console.log('Deleting SalaryAdjustments...');
    await prisma.salaryAdjustment.deleteMany();

    console.log('Deleting SalaryWeeks...');
    await prisma.salaryWeek.deleteMany();

    console.log('Deleting Attendances...');
    await prisma.attendance.deleteMany();

    console.log('Deleting ActivityLogs...');
    await prisma.activityLog.deleteMany();

    console.log('Deleting Companies...');
    await prisma.company.deleteMany();

    console.log('Deleting Vehicles...');
    await prisma.vehicle.deleteMany();

    console.log('Deleting Staff...');
    await prisma.staff.deleteMany();

    console.log('Deleting Users...');
    await prisma.user.deleteMany();

    console.log('Resetting WaybillCounter...');
    await prisma.waybillCounter.deleteMany();

    console.log('✨ Database successfully cleared! It is now clean for production.');
  } catch (err) {
    console.error('❌ Error clearing database:', err);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();
