const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for Smart Way Logistics...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // Users
  console.log('Creating test users...');
  const adminUser = await prisma.user.upsert({
    where: { phone: '9876543210' },
    update: { password_hash: passwordHash, role: 'admin' },
    create: { name: 'Admin User', phone: '9876543210', password_hash: passwordHash, role: 'admin' }
  });

  const staffUser = await prisma.user.upsert({
    where: { phone: '8888888888' },
    update: { password_hash: passwordHash, role: 'staff' },
    create: { name: 'Staff User', phone: '8888888888', password_hash: passwordHash, role: 'staff' }
  });

  const accountantUser = await prisma.user.upsert({
    where: { phone: '7777777777' },
    update: { password_hash: passwordHash, role: 'accountant' },
    create: { name: 'Accountant User', phone: '7777777777', password_hash: passwordHash, role: 'accountant' }
  });

  const viewerUser = await prisma.user.upsert({
    where: { phone: '6666666666' },
    update: { password_hash: passwordHash, role: 'viewer' },
    create: { name: 'Viewer User', phone: '6666666666', password_hash: passwordHash, role: 'viewer' }
  });

  // Staff Members
  console.log('Creating staff members...');
  const staffList = [
    { name: 'Ramesh Kumar', phone: '9876543210', role: 'driver' },
    { name: 'Suresh Patil', phone: '9876543211', role: 'driver' },
    { name: 'Vikram Singh', phone: '9876543212', role: 'driver' },
    { name: 'Rajesh Verma', phone: '9876543215', role: 'driver' },
    { name: 'Amit Sharma', phone: '9876543213', role: 'staff' },
    { name: 'Priya Nair', phone: '9876543214', role: 'office_staff' },
  ];

  const dbStaff = [];
  for (const s of staffList) {
    const created = await prisma.staff.upsert({
      where: { phone: s.phone },
      update: { name: s.name, role: s.role },
      create: { name: s.name, phone: s.phone, role: s.role }
    });
    dbStaff.push(created);
  }

  // Vehicles
  console.log('Creating vehicles...');
  const vehiclesList = [
    { vehicle_number: 'MH-04-AB-1234', vehicle_name: 'Eicher 14ft Container', capacity_kg: 3500 },
    { vehicle_number: 'MH-12-CD-5678', vehicle_name: 'Tata Ace Gold', capacity_kg: 1200 },
    { vehicle_number: 'MH-46-EF-9012', vehicle_name: 'BharatBenz 24ft Truck', capacity_kg: 10000 },
    { vehicle_number: 'DL-01-AX-4321', vehicle_name: 'Mahindra Bolero Pickup', capacity_kg: 1500 },
    { vehicle_number: 'KA-03-MG-7890', vehicle_name: 'Ashok Leyland Dost', capacity_kg: 2000 },
  ];

  const dbVehicles = [];
  for (const v of vehiclesList) {
    const created = await prisma.vehicle.upsert({
      where: { vehicle_number: v.vehicle_number },
      update: { vehicle_name: v.vehicle_name, capacity_kg: v.capacity_kg },
      create: {
        vehicle_number: v.vehicle_number,
        vehicle_name: v.vehicle_name,
        capacity_kg: v.capacity_kg,
        insurance_expiry: new Date(Date.now() + 180 * 86400000),
        rc_expiry: new Date(Date.now() + 365 * 86400000),
        pollution_expiry: new Date(Date.now() + 90 * 86400000)
      }
    });
    dbVehicles.push(created);
  }

  // Companies
  console.log('Creating companies...');
  const companiesList = [
    { name: 'Apex Logistics Pvt Ltd', phone: '9820011223', district: 'Mumbai', address: 'Andheri East Industrial Area, Mumbai' },
    { name: 'Reliance Electronics', phone: '9820022334', district: 'Mumbai', address: 'MIDC Rabale, Navi Mumbai' },
    { name: 'Tata Motors Spares', phone: '9820033445', district: 'Pune', address: 'Chakan Industrial Hub, Pune' },
    { name: 'Blue Dart Express Depot', phone: '9820044556', district: 'Delhi', address: 'Okhla Phase III, New Delhi' },
    { name: 'Sun Pharma Distributors', phone: '9820055667', district: 'Ahmedabad', address: 'Sanand GIDC, Ahmedabad' },
    { name: 'Infosys Tech Supplies', phone: '9820066778', district: 'Bengaluru', address: 'Electronic City, Bengaluru' },
  ];

  const dbCompanies = [];
  for (const c of companiesList) {
    const existing = await prisma.company.findFirst({ where: { name: c.name } });
    if (existing) {
      dbCompanies.push(existing);
    } else {
      const created = await prisma.company.create({ data: c });
      dbCompanies.push(created);
    }
  }

  // WaybillCounter
  console.log('Setting up WaybillCounter...');
  await prisma.waybillCounter.upsert({
    where: { id: 1 },
    update: { seq: 525 },
    create: { id: 1, seq: 501 }
  });

  // Bulk Waybills
  console.log('Creating bulk waybills...');
  const waybillsData = [
    {
      waybill_number: 'SWL501',
      booking_date: new Date(Date.now() - 10 * 86400000),
      from_location: 'Mumbai',
      to_location: 'Pune',
      consignor_name: 'Apex Logistics Pvt Ltd',
      consignor_contact: '9820011223',
      consignor_address: 'Andheri East, Mumbai',
      consignor_gst: '27AAAAA0000A1Z5',
      consignee_name: 'Tata Motors Spares',
      consignee_mobile: '9820033445',
      consignee_address: 'Chakan MIDC, Pune',
      consignee_gst: '27CCCCA2222C1Z9',
      no_of_packages: 10,
      package_type: 'Wooden Crates',
      weight: 450,
      volume: 2.5,
      description: 'Auto Spare Parts',
      freight: 4500,
      handling_charges: 250,
      sgst: 225,
      cgst: 225,
      igst: 0,
      grand_total: 5200,
      payment_mode: 'paid',
      status: 'delivered',
      created_by: adminUser.id,
      sender_company_id: dbCompanies[0].id,
      receiver_company_id: dbCompanies[2].id,
    },
    {
      waybill_number: 'SWL502',
      booking_date: new Date(Date.now() - 8 * 86400000),
      from_location: 'Mumbai',
      to_location: 'Pune',
      consignor_name: 'Reliance Electronics',
      consignor_contact: '9820022334',
      consignor_address: 'MIDC Rabale, Navi Mumbai',
      consignor_gst: '27BBBCA1111B1Z2',
      consignee_name: 'Vijay Sales Pune',
      consignee_mobile: '9890123456',
      consignee_address: 'JM Road, Pune',
      no_of_packages: 25,
      package_type: 'Corrugated Boxes',
      weight: 320,
      volume: 1.8,
      description: 'Consumer Electronics & Accessories',
      freight: 3200,
      handling_charges: 150,
      sgst: 160,
      cgst: 160,
      igst: 0,
      grand_total: 3680,
      payment_mode: 'topay',
      status: 'in_transit',
      created_by: adminUser.id,
      sender_company_id: dbCompanies[1].id,
    },
    {
      waybill_number: 'SWL503',
      booking_date: new Date(Date.now() - 6 * 86400000),
      from_location: 'Thane',
      to_location: 'Pune',
      consignor_name: 'Godrej Storage Systems',
      consignor_contact: '9833445566',
      consignor_address: 'Vikhroli West, Mumbai',
      consignee_name: 'Cummins India Depot',
      consignee_mobile: '9844556677',
      consignee_address: 'Kothrud, Pune',
      no_of_packages: 5,
      package_type: 'Steel Racks',
      weight: 850,
      volume: 5.0,
      description: 'Heavy Industrial Shelving',
      freight: 7500,
      handling_charges: 500,
      sgst: 375,
      cgst: 375,
      igst: 0,
      grand_total: 8750,
      payment_mode: 'credit',
      status: 'booked',
      created_by: staffUser.id,
    },
    {
      waybill_number: 'SWL504',
      booking_date: new Date(Date.now() - 5 * 86400000),
      from_location: 'Delhi',
      to_location: 'Ahmedabad',
      consignor_name: 'Blue Dart Express Depot',
      consignor_contact: '9820044556',
      consignor_address: 'Okhla Phase III, Delhi',
      consignor_gst: '07DDDDA3333D1Z6',
      consignee_name: 'Sun Pharma Distributors',
      consignee_mobile: '9820055667',
      consignee_address: 'Sanand GIDC, Ahmedabad',
      consignee_gst: '24EEEEA4444E1Z3',
      no_of_packages: 40,
      package_type: 'Carton Boxes',
      weight: 1200,
      volume: 6.2,
      description: 'Pharmaceutical Consignments',
      freight: 14000,
      handling_charges: 800,
      sgst: 0,
      cgst: 0,
      igst: 2664,
      grand_total: 17464,
      payment_mode: 'paid',
      status: 'in_transit',
      created_by: staffUser.id,
      sender_company_id: dbCompanies[3].id,
      receiver_company_id: dbCompanies[4].id,
    },
    {
      waybill_number: 'SWL505',
      booking_date: new Date(Date.now() - 4 * 86400000),
      from_location: 'Delhi',
      to_location: 'Ahmedabad',
      consignor_name: 'Havells India Ltd',
      consignor_contact: '9811223344',
      consignor_address: 'Rajouri Garden, Delhi',
      consignee_name: 'Gujarat Electricals',
      consignee_mobile: '9822334455',
      consignee_address: 'CG Road, Ahmedabad',
      no_of_packages: 18,
      package_type: 'Wire Drums',
      weight: 950,
      volume: 4.1,
      description: 'Copper Cables & Electrical Fittings',
      freight: 9500,
      handling_charges: 400,
      sgst: 0,
      cgst: 0,
      igst: 1782,
      grand_total: 11682,
      payment_mode: 'topay',
      status: 'loaded',
      created_by: staffUser.id,
    },
    {
      waybill_number: 'SWL506',
      booking_date: new Date(Date.now() - 3 * 86400000),
      from_location: 'Bengaluru',
      to_location: 'Chennai',
      consignor_name: 'Infosys Tech Supplies',
      consignor_contact: '9820066778',
      consignor_address: 'Electronic City, Bengaluru',
      consignor_gst: '29FFFFA5555F1Z0',
      consignee_name: 'TNS Logistics Depot',
      consignee_mobile: '9877889900',
      consignee_address: 'Guindy Industrial Estate, Chennai',
      no_of_packages: 15,
      package_type: 'Pallet Cases',
      weight: 680,
      volume: 3.2,
      description: 'IT Hardware & Monitors',
      freight: 6800,
      handling_charges: 300,
      sgst: 0,
      cgst: 0,
      igst: 1278,
      grand_total: 8378,
      payment_mode: 'paid',
      status: 'delivered',
      created_by: adminUser.id,
      sender_company_id: dbCompanies[5].id,
    },
    {
      waybill_number: 'SWL507',
      booking_date: new Date(Date.now() - 2 * 86400000),
      from_location: 'Bengaluru',
      to_location: 'Chennai',
      consignor_name: 'Wipro Hardware Cell',
      consignor_contact: '9888990011',
      consignor_address: 'Sarjapur Road, Bengaluru',
      consignee_name: 'HCL Tech Facility',
      consignee_mobile: '9899001122',
      consignee_address: 'OMR Road, Chennai',
      no_of_packages: 8,
      package_type: 'Wooden Boxes',
      weight: 420,
      volume: 2.0,
      description: 'Server Rack Enclosures',
      freight: 4200,
      handling_charges: 200,
      sgst: 0,
      cgst: 0,
      igst: 792,
      grand_total: 5192,
      payment_mode: 'credit',
      status: 'arrived',
      created_by: staffUser.id,
    },
    {
      waybill_number: 'SWL508',
      booking_date: new Date(Date.now() - 1 * 86400000),
      from_location: 'Hyderabad',
      to_location: 'Mumbai',
      consignor_name: 'Dr Reddys Labs',
      consignor_contact: '9866554433',
      consignor_address: 'Banjara Hills, Hyderabad',
      consignee_name: 'Reliance Life Sciences',
      consignee_mobile: '9855443322',
      consignee_address: 'Ghansoli, Navi Mumbai',
      no_of_packages: 30,
      package_type: 'Insulated Coolers',
      weight: 750,
      volume: 3.8,
      description: 'Temperature Controlled Pharma Samples',
      freight: 12000,
      handling_charges: 600,
      sgst: 0,
      cgst: 0,
      igst: 2268,
      grand_total: 14868,
      payment_mode: 'paid',
      status: 'booked',
      created_by: adminUser.id,
    },
    {
      waybill_number: 'SWL509',
      booking_date: new Date(),
      from_location: 'Pune',
      to_location: 'Bengaluru',
      consignor_name: 'Tata Motors Spares',
      consignor_contact: '9820033445',
      consignor_address: 'Chakan MIDC, Pune',
      consignor_gst: '27CCCCA2222C1Z9',
      consignee_name: 'Infosys Tech Supplies',
      consignee_mobile: '9820066778',
      consignee_address: 'Electronic City, Bengaluru',
      consignee_gst: '29FFFFA5555F1Z0',
      no_of_packages: 12,
      package_type: 'Steel Crates',
      weight: 1100,
      volume: 4.5,
      description: 'Industrial Machined Castings',
      freight: 11000,
      handling_charges: 500,
      sgst: 0,
      cgst: 0,
      igst: 2070,
      grand_total: 13570,
      payment_mode: 'credit',
      status: 'booked',
      created_by: staffUser.id,
      sender_company_id: dbCompanies[2].id,
      receiver_company_id: dbCompanies[5].id,
    },
    {
      waybill_number: 'SWL510',
      booking_date: new Date(),
      from_location: 'Mumbai',
      to_location: 'Delhi',
      consignor_name: 'Apex Logistics Pvt Ltd',
      consignor_contact: '9820011223',
      consignor_address: 'Andheri East, Mumbai',
      consignee_name: 'Blue Dart Express Depot',
      consignee_mobile: '9820044556',
      consignee_address: 'Okhla Phase III, Delhi',
      no_of_packages: 50,
      package_type: 'Cartons',
      weight: 2100,
      volume: 11.0,
      description: 'E-commerce Merchandise Parcels',
      freight: 21000,
      handling_charges: 1000,
      sgst: 0,
      cgst: 0,
      igst: 3960,
      grand_total: 25960,
      payment_mode: 'topay',
      status: 'booked',
      created_by: adminUser.id,
      sender_company_id: dbCompanies[0].id,
      receiver_company_id: dbCompanies[3].id,
    }
  ];

  const dbWaybills = [];
  for (const w of waybillsData) {
    const existing = await prisma.waybill.findUnique({ where: { waybill_number: w.waybill_number } });
    if (existing) {
      dbWaybills.push(existing);
    } else {
      const created = await prisma.waybill.create({
        data: {
          ...w,
          payment: {
            create: {
              amount: w.grand_total,
              status: w.payment_mode === 'paid' ? 'paid' : w.payment_mode === 'credit' ? 'credit' : 'pending'
            }
          }
        }
      });
      dbWaybills.push(created);
    }
  }

  // Trips & Stops
  console.log('Creating trips and route stops...');
  const existingTrip1 = await prisma.trip.findFirst({ where: { district: 'Mumbai-Pune Zone' } });
  if (!existingTrip1 && dbWaybills.length >= 3) {
    await prisma.trip.create({
      data: {
        district: 'Mumbai-Pune Zone',
        status: 'in_progress',
        trip_date: new Date(),
        vehicle_id: dbVehicles[0].id,
        driver_id: dbStaff[0].id,
        stops: {
          create: [
            {
              location: 'Mumbai',
              role: 'pickup',
              sequence: 1,
              items: {
                create: [
                  { waybill_id: dbWaybills[0].id, weight: 450 },
                  { waybill_id: dbWaybills[1].id, weight: 320 }
                ]
              }
            },
            {
              location: 'Thane',
              role: 'pickup',
              sequence: 2,
              items: {
                create: [
                  { waybill_id: dbWaybills[2].id, weight: 850 }
                ]
              }
            },
            {
              location: 'Pune',
              role: 'drop',
              sequence: 3,
              items: {
                create: [
                  { waybill_id: dbWaybills[3].id, weight: 1200 }
                ]
              }
            }
          ]
        }
      }
    });
  }

  const existingTrip2 = await prisma.trip.findFirst({ where: { district: 'North Zone' } });
  if (!existingTrip2 && dbWaybills.length >= 5) {
    await prisma.trip.create({
      data: {
        district: 'North Zone',
        status: 'draft',
        trip_date: new Date(Date.now() + 86400000),
        vehicle_id: dbVehicles[2].id,
        driver_id: dbStaff[2].id,
        stops: {
          create: [
            {
              location: 'Delhi',
              role: 'pickup',
              sequence: 1,
              items: {
                create: [
                  { waybill_id: dbWaybills[4].id, weight: 950 }
                ]
              }
            },
            {
              location: 'Ahmedabad',
              role: 'drop',
              sequence: 2,
              items: {
                create: [
                  { waybill_id: dbWaybills[5].id, weight: 680 }
                ]
              }
            }
          ]
        }
      }
    });
  }

  // Daily Collection
  console.log('Creating daily collection sheet entry...');
  const existingColl = await prisma.dailyCollection.findFirst({ where: { route: 'Mumbai -> Pune Route 4' } });
  if (!existingColl) {
    await prisma.dailyCollection.create({
      data: {
        date: new Date(),
        route: 'Mumbai -> Pune Route 4',
        staff_id: dbStaff[0].id,
        helper_id: dbStaff[4].id,
        vehicle_id: dbVehicles[0].id,
        start_km: 14500,
        end_km: 14680,
        total_km: 180,
        fuel_expense_cash: 1500,
        fuel_expense_owner: 0,
        vehicle_rent: 2000,
        driver_wage: 500,
        helper_wage: 300,
        advance: 1000,
        other_expenses: 600,
        cash_collection: 3680,
        upi_collection: 1200,
        credit_collection: 500,
        total_collection: 5380,
        total_expense: 4900,
        balance: 480
      }
    });
  }

  console.log('✅ Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
