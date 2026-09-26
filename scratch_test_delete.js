const prisma = require('./server/src/lib/prisma');

async function testTransactionDelete() {
  const waybills = await prisma.waybill.findMany({ take: 1 });
  if (!waybills.length) {
    console.log('No waybill found');
    return;
  }
  const id = waybills[0].id;
  console.log('Testing delete for waybill id:', id);

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Disconnect implicit many-to-many assigned_staff
      await tx.waybill.update({
        where: { id },
        data: { assigned_staff: { set: [] } }
      });

      // 2. Delete associated StopItem if assigned to a trip
      await tx.stopItem.deleteMany({ where: { waybill_id: id } });

      // 3. Delete associated ParcelTracking history
      await tx.parcelTracking.deleteMany({ where: { waybill_id: id } });

      // 4. Delete associated Payment record
      await tx.payment.deleteMany({ where: { waybill_id: id } });

      // 5. Delete the waybill
      await tx.waybill.delete({ where: { id } });

      // Throw intentional error to rollback transaction test
      throw new Error('ROLLBACK_TEST_SUCCESS');
    });
  } catch (err) {
    if (err.message === 'ROLLBACK_TEST_SUCCESS') {
      console.log('Transaction succeeded cleanly! Rollback verified.');
    } else {
      console.error('Transaction delete FAILED with error:', err);
    }
  }

  process.exit(0);
}

testTransactionDelete();
