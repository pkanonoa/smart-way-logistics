const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting company backfill script...');
  const waybills = await prisma.waybill.findMany();
  let senderMatched = 0;
  let receiverMatched = 0;
  let companiesCreated = 0;

  for (const wb of waybills) {
    let updateData = {};

    if (wb.consignor_name && wb.consignor_name.trim() !== '') {
      const name = wb.consignor_name.trim();
      let company = await prisma.company.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } }
      });

      if (!company) {
        try {
          // Ensure exact casing on creation for the first time
          company = await prisma.company.create({
            data: { name: name }
          });
          companiesCreated++;
        } catch (error) {
          // If unique constraint fails due to concurrent creation (or subtle case differences not caught by findFirst in some DBs)
          company = await prisma.company.findFirst({
            where: { name: { equals: name, mode: 'insensitive' } }
          });
        }
      }
      if (company) {
         updateData.sender_company_id = company.id;
         senderMatched++;
      }
    }

    if (wb.consignee_name && wb.consignee_name.trim() !== '') {
      const name = wb.consignee_name.trim();
      let company = await prisma.company.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } }
      });

      if (!company) {
        try {
          company = await prisma.company.create({
            data: { name: name }
          });
          companiesCreated++;
        } catch (error) {
          company = await prisma.company.findFirst({
            where: { name: { equals: name, mode: 'insensitive' } }
          });
        }
      }
      if (company) {
         updateData.receiver_company_id = company.id;
         receiverMatched++;
      }
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.waybill.update({
        where: { id: wb.id },
        data: updateData
      });
    }
  }

  console.log(`Backfill complete.`);
  console.log(`Companies created: ${companiesCreated}`);
  console.log(`Waybills updated as sender: ${senderMatched}`);
  console.log(`Waybills updated as receiver: ${receiverMatched}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
