const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');
const puppeteer = require('puppeteer');

const router = express.Router();
router.use(authenticateToken);

// Helper: Format INR
const INR = (val) => Number(val || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });

// Helper: Format Date
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '';

// Helper: Render HTML to PDF and stream
async function streamPdfResponse(res, title, htmlContent, filename) {
  try {
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 20px; font-size: 12px; }
          .header { display: flex; justify-content: space-between; border-b: 2px solid #f97316; padding-bottom: 10px; margin-bottom: 20px; }
          .logo-area { font-weight: bold; font-size: 18px; color: #f97316; }
          .title-area { text-align: right; }
          .report-title { font-size: 16px; font-weight: bold; margin: 0; }
          .report-meta { color: #64748b; font-size: 10px; margin-top: 5px; }
          .summary-grid { display: flex; gap: 15px; margin-bottom: 25px; }
          .summary-card { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #f8fafc; }
          .summary-label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold; }
          .summary-val { font-size: 16px; font-weight: bold; margin-top: 4px; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-weight: bold; border-bottom: 1px solid #cbd5e1; font-size: 10px; text-transform: uppercase; }
          td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
          tr:nth-child(even) td { background: #fafafa; }
          .text-right { text-align: right; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; background: #e2e8f0; color: #475569; text-transform: uppercase; }
          .badge-paid { background: #dcfce7; color: #15803d; }
          .badge-pending { background: #fef9c3; color: #a16207; }
          .badge-credit { background: #fee2e2; color: #b91c1c; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-area">
            Smart Way Logistics
            <div style="font-size: 10px; font-weight: normal; color: #64748b; margin-top: 2px;">Reliable Transport Solutions</div>
          </div>
          <div class="title-area">
            <h1 class="report-title">${title}</h1>
            <div class="report-meta">Generated on ${formatDate(new Date())}</div>
          </div>
        </div>
        ${htmlContent}
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
    });
    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`
    });
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF generation error:', err);
    return res.status(500).json({ error: 'Failed to generate PDF' });
  }
}

// Helper: Stream Excel sheet using exceljs
async function streamExcelResponse(res, filename, columns, rows) {
  try {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    worksheet.columns = columns.map(c => ({ header: c.header, key: c.key, width: c.width || 18 }));

    rows.forEach(r => {
      worksheet.addRow(r);
    });

    // Formatting headers
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF97316' } // Orange accent
    };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    return res.end();
  } catch (err) {
    console.error('Excel generation error:', err);
    return res.status(500).json({ error: 'Failed to generate Excel' });
  }
}

// ─── 1. BOOKINGS REPORT ────────────────────────────────────────────────────────
router.get('/bookings', async (req, res) => {
  const { range, date } = req.query; // range: daily|monthly
  const targetDate = date ? new Date(date) : new Date();

  let start = new Date(targetDate);
  let end = new Date(targetDate);

  if (range === 'daily') {
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);
  } else {
    // monthly
    start.setDate(1);
    start.setHours(0,0,0,0);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    end.setHours(23,59,59,999);
  }

  try {
    const waybills = await prisma.waybill.findMany({
      where: {
        booking_date: { gte: start, lte: end }
      },
      orderBy: { booking_date: 'desc' },
      include: { payment: true }
    });

    const totalCount = waybills.length;
    const totalPackages = waybills.reduce((sum, w) => sum + w.no_of_packages, 0);
    const totalWeight = waybills.reduce((sum, w) => sum + Number(w.weight), 0);
    const totalRevenue = waybills.reduce((sum, w) => sum + Number(w.grand_total), 0);

    const reportData = {
      summary: { totalCount, totalPackages, totalWeight, totalRevenue },
      rows: waybills.map(w => ({
        waybill_number: w.waybill_number,
        booking_date: formatDate(w.booking_date),
        consignee_name: w.consignee_name,
        from_location: w.from_location,
        to_location: w.to_location,
        packages: w.no_of_packages,
        weight: Number(w.weight),
        grand_total: Number(w.grand_total),
        payment_status: w.payment?.status || 'pending',
        status: w.status
      }))
    };

    if (req.query.format === 'pdf') {
      const html = `
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-label">Total Bookings</div>
            <div class="summary-val">${totalCount}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total Packages</div>
            <div class="summary-val">${totalPackages}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total Weight (KG)</div>
            <div class="summary-val">${totalWeight.toFixed(2)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total Freight Revenue</div>
            <div class="summary-val">${INR(totalRevenue)}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Waybill No</th>
              <th>Booking Date</th>
              <th>Consignee</th>
              <th>Route</th>
              <th class="text-right">Pkgs</th>
              <th class="text-right">Weight</th>
              <th class="text-right">Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.rows.map(r => `
              <tr>
                <td style="font-weight:bold;">${r.waybill_number}</td>
                <td>${r.booking_date}</td>
                <td>${r.consignee_name}</td>
                <td>${r.from_location} &rarr; ${r.to_location}</td>
                <td class="text-right">${r.packages}</td>
                <td class="text-right">${r.weight.toFixed(2)}</td>
                <td class="text-right" style="font-weight:bold;">${INR(r.grand_total)}</td>
                <td><span class="badge badge-${r.payment_status}">${r.payment_status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      return streamPdfResponse(res, `Bookings Report (${range || 'monthly'})`, html, 'bookings-report.pdf');
    }

    if (req.query.format === 'excel') {
      const cols = [
        { header: 'Waybill Number', key: 'waybill_number' },
        { header: 'Booking Date', key: 'booking_date' },
        { header: 'Consignee Name', key: 'consignee_name' },
        { header: 'From Location', key: 'from_location' },
        { header: 'To Location', key: 'to_location' },
        { header: 'Packages', key: 'packages' },
        { header: 'Weight (KG)', key: 'weight' },
        { header: 'Grand Total', key: 'grand_total' },
        { header: 'Payment Status', key: 'payment_status' },
        { header: 'Shipment Status', key: 'status' }
      ];
      return streamExcelResponse(res, 'bookings-report.xlsx', cols, reportData.rows);
    }

    return res.json(reportData);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// ─── 2. SENDERS REPORT ─────────────────────────────────────────────────────────
router.get('/senders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const staff = await prisma.staff.findUnique({
      where: { id }
    });
    if (!staff) return res.status(404).json({ error: 'Sender/Staff not found' });

    const waybills = await prisma.waybill.findMany({
      where: {
        assigned_staff: { some: { id } }
      },
      orderBy: { booking_date: 'desc' },
      include: { payment: true }
    });

    const totalCount = waybills.length;
    const totalPackages = waybills.reduce((sum, w) => sum + w.no_of_packages, 0);
    const totalWeight = waybills.reduce((sum, w) => sum + Number(w.weight), 0);
    const totalRevenue = waybills.reduce((sum, w) => sum + Number(w.grand_total), 0);

    const reportData = {
      sender: { name: staff.name, phone: staff.phone, role: staff.role },
      summary: { totalCount, totalPackages, totalWeight, totalRevenue },
      rows: waybills.map(w => ({
        waybill_number: w.waybill_number,
        booking_date: formatDate(w.booking_date),
        consignee_name: w.consignee_name,
        from_location: w.from_location,
        to_location: w.to_location,
        packages: w.no_of_packages,
        weight: Number(w.weight),
        grand_total: Number(w.grand_total),
        payment_status: w.payment?.status || 'pending',
        status: w.status
      }))
    };

    if (req.query.format === 'pdf') {
      const html = `
        <div style="margin-bottom: 20px; font-size: 13px;">
          <strong>Sender Name:</strong> ${staff.name} <br/>
          <strong>Phone:</strong> ${staff.phone} <br/>
          <strong>Role:</strong> ${staff.role}
        </div>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-label">Total Shipments</div>
            <div class="summary-val">${totalCount}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Packages Shipped</div>
            <div class="summary-val">${totalPackages}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total Weight (KG)</div>
            <div class="summary-val">${totalWeight.toFixed(2)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total Freight Revenue</div>
            <div class="summary-val">${INR(totalRevenue)}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Waybill No</th>
              <th>Booking Date</th>
              <th>Consignee</th>
              <th>Route</th>
              <th class="text-right">Pkgs</th>
              <th class="text-right">Weight</th>
              <th class="text-right">Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.rows.map(r => `
              <tr>
                <td style="font-weight:bold;">${r.waybill_number}</td>
                <td>${r.booking_date}</td>
                <td>${r.consignee_name}</td>
                <td>${r.from_location} &rarr; ${r.to_location}</td>
                <td class="text-right">${r.packages}</td>
                <td class="text-right">${r.weight.toFixed(2)}</td>
                <td class="text-right" style="font-weight:bold;">${INR(r.grand_total)}</td>
                <td><span class="badge badge-${r.payment_status}">${r.payment_status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      return streamPdfResponse(res, `Sender Report - ${staff.name}`, html, 'sender-report.pdf');
    }

    if (req.query.format === 'excel') {
      const cols = [
        { header: 'Waybill Number', key: 'waybill_number' },
        { header: 'Booking Date', key: 'booking_date' },
        { header: 'Consignee Name', key: 'consignee_name' },
        { header: 'From Location', key: 'from_location' },
        { header: 'To Location', key: 'to_location' },
        { header: 'Packages', key: 'packages' },
        { header: 'Weight (KG)', key: 'weight' },
        { header: 'Grand Total', key: 'grand_total' },
        { header: 'Payment Status', key: 'payment_status' }
      ];
      return streamExcelResponse(res, 'sender-report.xlsx', cols, reportData.rows);
    }

    return res.json(reportData);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// ─── 3. PENDING PAYMENTS REPORT ───────────────────────────────────────────────
router.get('/pending-payments', async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: {
        status: { in: ['pending', 'credit'] }
      },
      include: {
        waybill: true
      },
      orderBy: { due_date: 'asc' }
    });

    const totalCount = payments.length;
    const totalPendingAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    const reportData = {
      summary: { totalCount, totalPendingAmount },
      rows: payments.map(p => ({
        waybill_number: p.waybill.waybill_number,
        booking_date: formatDate(p.waybill.booking_date),
        consignee_name: p.waybill.consignee_name,
        consignee_mobile: p.waybill.consignee_mobile,
        payment_status: p.status,
        amount: Number(p.amount),
        due_date: formatDate(p.due_date)
      }))
    };

    if (req.query.format === 'pdf') {
      const html = `
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-label">Pending Accounts</div>
            <div class="summary-val">${totalCount}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total Outstanding</div>
            <div class="summary-val">${INR(totalPendingAmount)}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Waybill No</th>
              <th>Booking Date</th>
              <th>Consignee</th>
              <th>Mobile</th>
              <th>Status</th>
              <th class="text-right">Outstanding Amount</th>
              <th>Due Date</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.rows.map(r => `
              <tr>
                <td style="font-weight:bold;">${r.waybill_number}</td>
                <td>${r.booking_date}</td>
                <td>${r.consignee_name}</td>
                <td>${r.consignee_mobile}</td>
                <td><span class="badge badge-${r.payment_status}">${r.payment_status}</span></td>
                <td class="text-right" style="font-weight:bold; color: #b91c1c;">${INR(r.amount)}</td>
                <td>${r.due_date || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      return streamPdfResponse(res, 'Pending Payments Summary', html, 'pending-payments.pdf');
    }

    if (req.query.format === 'excel') {
      const cols = [
        { header: 'Waybill Number', key: 'waybill_number' },
        { header: 'Booking Date', key: 'booking_date' },
        { header: 'Consignee Name', key: 'consignee_name' },
        { header: 'Consignee Mobile', key: 'consignee_mobile' },
        { header: 'Payment Status', key: 'payment_status' },
        { header: 'Outstanding Amount', key: 'amount' },
        { header: 'Due Date', key: 'due_date' }
      ];
      return streamExcelResponse(res, 'pending-payments.xlsx', cols, reportData.rows);
    }

    return res.json(reportData);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// ─── 4. PARCELS REPORT ─────────────────────────────────────────────────────────
router.get('/parcels', async (req, res) => {
  const { status } = req.query;
  const where = {};
  if (status) where.status = status;

  try {
    const waybills = await prisma.waybill.findMany({
      where,
      orderBy: { booking_date: 'desc' }
    });

    const totalCount = waybills.length;
    const totalPackages = waybills.reduce((sum, w) => sum + w.no_of_packages, 0);
    const totalWeight = waybills.reduce((sum, w) => sum + Number(w.weight), 0);

    const reportData = {
      summary: { totalCount, totalPackages, totalWeight },
      rows: waybills.map(w => ({
        waybill_number: w.waybill_number,
        booking_date: formatDate(w.booking_date),
        consignee_name: w.consignee_name,
        from_location: w.from_location,
        to_location: w.to_location,
        packages: w.no_of_packages,
        weight: Number(w.weight),
        status: w.status
      }))
    };

    if (req.query.format === 'pdf') {
      const html = `
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-label">Total Shipments</div>
            <div class="summary-val">${totalCount}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total Packages</div>
            <div class="summary-val">${totalPackages}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total Weight</div>
            <div class="summary-val">${totalWeight.toFixed(2)} KG</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Waybill No</th>
              <th>Booking Date</th>
              <th>Consignee</th>
              <th>Route</th>
              <th class="text-right">Packages</th>
              <th class="text-right">Weight (KG)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.rows.map(r => `
              <tr>
                <td style="font-weight:bold;">${r.waybill_number}</td>
                <td>${r.booking_date}</td>
                <td>${r.consignee_name}</td>
                <td>${r.from_location} &rarr; ${r.to_location}</td>
                <td class="text-right">${r.packages}</td>
                <td class="text-right">${r.weight.toFixed(2)}</td>
                <td><span class="badge">${r.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      return streamPdfResponse(res, `Parcels Report (${status || 'All'})`, html, 'parcels-report.pdf');
    }

    if (req.query.format === 'excel') {
      const cols = [
        { header: 'Waybill Number', key: 'waybill_number' },
        { header: 'Booking Date', key: 'booking_date' },
        { header: 'Consignee Name', key: 'consignee_name' },
        { header: 'From Location', key: 'from_location' },
        { header: 'To Location', key: 'to_location' },
        { header: 'Packages', key: 'packages' },
        { header: 'Weight (KG)', key: 'weight' },
        { header: 'Status', key: 'status' }
      ];
      return streamExcelResponse(res, 'parcels-report.xlsx', cols, reportData.rows);
    }

    return res.json(reportData);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// ─── 5. STAFF REPORT ──────────────────────────────────────────────────────────
router.get('/staff/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const staff = await prisma.staff.findUnique({
      where: { id }
    });
    if (!staff) return res.status(404).json({ error: 'Staff member not found' });

    // 1. Waybills shipped
    const waybills = await prisma.waybill.findMany({
      where: { assigned_staff: { some: { id } } },
      orderBy: { booking_date: 'desc' }
    });

    // 2. Attendance history
    const attendances = await prisma.attendance.findMany({
      where: { staff_id: id },
      orderBy: { date: 'desc' }
    });

    // 3. Salaries paid
    const salaryWeeks = await prisma.salaryWeek.findMany({
      where: { staff_id: id },
      include: { payments: true },
      orderBy: { week_start_date: 'desc' }
    });

    // 4. Advances outstanding
    const advances = await prisma.staffAdvance.findMany({
      where: { staff_id: id, is_recovered: false },
      orderBy: { date: 'desc' }
    });

    const presentCount = attendances.filter(a => a.status === 'present').length;
    const absentCount = attendances.filter(a => a.status === 'absent').length;
    const halfDayCount = attendances.filter(a => a.status === 'half_day').length;

    const totalAdvancesOutstanding = advances.reduce((sum, a) => sum + Number(a.amount), 0);

    const reportData = {
      staff: { name: staff.name, phone: staff.phone, role: staff.role },
      summary: {
        bookingsCount: waybills.length,
        attendance: { presentCount, absentCount, halfDayCount },
        totalAdvancesOutstanding
      },
      waybills: waybills.map(w => ({
        waybill_number: w.waybill_number,
        booking_date: formatDate(w.booking_date),
        consignee_name: w.consignee_name,
        grand_total: Number(w.grand_total),
        status: w.status
      })),
      attendanceHistory: attendances.map(a => ({
        date: formatDate(a.date),
        status: a.status
      })),
      salaryHistory: salaryWeeks.map(sw => ({
        week: `${formatDate(sw.week_start_date)} - ${formatDate(sw.week_end_date)}`,
        base_amount: Number(sw.base_amount),
        paid_amount: sw.payments.reduce((sum, p) => sum + Number(p.amount), 0)
      })),
      activeAdvances: advances.map(a => ({
        date: formatDate(a.date),
        amount: Number(a.amount),
        reason: a.reason
      }))
    };

    if (req.query.format === 'pdf') {
      const html = `
        <div style="margin-bottom: 20px; font-size: 13px;">
          <strong>Staff Name:</strong> ${staff.name} <br/>
          <strong>Phone:</strong> ${staff.phone} <br/>
          <strong>Role:</strong> ${staff.role}
        </div>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-label">Assigned Waybills</div>
            <div class="summary-val">${waybills.length}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Attendance (P/A/H)</div>
            <div class="summary-val">${presentCount} / ${absentCount} / ${halfDayCount}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Advances Outstanding</div>
            <div class="summary-val">${INR(totalAdvancesOutstanding)}</div>
          </div>
        </div>
        
        <h3>Outstanding Advances</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.activeAdvances.length === 0 
              ? '<tr><td colspan="3">No active advances</td></tr>' 
              : reportData.activeAdvances.map(a => `
                <tr>
                  <td>${a.date}</td>
                  <td style="font-weight:bold; color: #b91c1c;">${INR(a.amount)}</td>
                  <td>${a.reason}</td>
                </tr>
              `).join('')}
          </tbody>
        </table>

        <h3>Salaries Summary</h3>
        <table>
          <thead>
            <tr>
              <th>Week Period</th>
              <th class="text-right">Base Amount</th>
              <th class="text-right">Paid Amount</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.salaryHistory.length === 0 
              ? '<tr><td colspan="3">No salary history recorded</td></tr>' 
              : reportData.salaryHistory.map(s => `
                <tr>
                  <td>${s.week}</td>
                  <td class="text-right">${INR(s.base_amount)}</td>
                  <td class="text-right" style="font-weight:bold;">${INR(s.paid_amount)}</td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      `;
      return streamPdfResponse(res, `Staff Performance - ${staff.name}`, html, 'staff-report.pdf');
    }

    if (req.query.format === 'excel') {
      const cols = [
        { header: 'Staff Name', key: 'staff_name' },
        { header: 'Week/Period', key: 'week' },
        { header: 'Base Wage', key: 'base_amount' },
        { header: 'Paid Wage', key: 'paid_amount' }
      ];
      const rows = reportData.salaryHistory.map(s => ({
        staff_name: staff.name,
        week: s.week,
        base_amount: s.base_amount,
        paid_amount: s.paid_amount
      }));
      return streamExcelResponse(res, 'staff-salaries-report.xlsx', cols, rows);
    }

    return res.json(reportData);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// ─── 6. VEHICLES REPORT ───────────────────────────────────────────────────────
router.get('/vehicles/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id }
    });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    // 1. Collections history
    const collections = await prisma.dailyCollection.findMany({
      where: { vehicle_id: id },
      include: { driver: true },
      orderBy: { date: 'desc' }
    });

    const totalCollectionsValue = collections.reduce((sum, c) => sum + Number(c.total_collection), 0);

    const reportData = {
      vehicle: {
        number: vehicle.vehicle_number,
        name: vehicle.vehicle_name,
        rc_expiry: formatDate(vehicle.rc_expiry),
        insurance_expiry: formatDate(vehicle.insurance_expiry),
        pollution_expiry: formatDate(vehicle.pollution_expiry)
      },
      summary: {
        totalCollectionsValue,
        collectionsCount: collections.length
      },
      collections: collections.map(c => ({
        date: formatDate(c.date),
        driver_name: c.driver?.name || 'N/A',
        total_collection: Number(c.total_collection),
        fuel_expense: Number(c.fuel_expense_cash || 0) + Number(c.fuel_expense_owner || 0),
        driver_wage: Number(c.driver_wage),
        other_expenses: Number(c.other_expenses)
      }))
    };

    if (req.query.format === 'pdf') {
      const html = `
        <div style="margin-bottom: 20px; font-size: 13px;">
          <strong>Vehicle Number:</strong> ${vehicle.vehicle_number} <br/>
          <strong>Vehicle Name:</strong> ${vehicle.vehicle_name} <br/>
          <strong>RC Expiry:</strong> ${reportData.vehicle.rc_expiry || 'N/A'} <br/>
          <strong>Insurance Expiry:</strong> ${reportData.vehicle.insurance_expiry || 'N/A'}
        </div>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-label">Collections Logged</div>
            <div class="summary-val">${collections.length} Trips</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total Collections</div>
            <div class="summary-val">${INR(totalCollectionsValue)}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Trip Date</th>
              <th>Driver</th>
              <th class="text-right">Fuel Expense</th>
              <th class="text-right">Driver Wage</th>
              <th class="text-right">Collection</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.collections.length === 0 
              ? '<tr><td colspan="5">No trip logs recorded</td></tr>' 
              : reportData.collections.map(c => `
                <tr>
                  <td>${c.date}</td>
                  <td>${c.driver_name}</td>
                  <td class="text-right">${INR(c.fuel_expense)}</td>
                  <td class="text-right">${INR(c.driver_wage)}</td>
                  <td class="text-right" style="font-weight:bold; color: #16a34a;">${INR(c.total_collection)}</td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      `;
      return streamPdfResponse(res, `Vehicle Performance - ${vehicle.vehicle_number}`, html, 'vehicle-report.pdf');
    }

    if (req.query.format === 'excel') {
      const cols = [
        { header: 'Vehicle Number', key: 'vehicle_number' },
        { header: 'Trip Date', key: 'date' },
        { header: 'Driver Name', key: 'driver_name' },
        { header: 'Collection Amount', key: 'total_collection' },
        { header: 'Fuel Expense', key: 'fuel_expense' }
      ];
      const rows = reportData.collections.map(c => ({
        vehicle_number: vehicle.vehicle_number,
        date: c.date,
        driver_name: c.driver_name,
        total_collection: c.total_collection,
        fuel_expense: c.fuel_expense
      }));
      return streamExcelResponse(res, 'vehicle-report.xlsx', cols, rows);
    }

    return res.json(reportData);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// ─── 7. EXPENSES REPORT ───────────────────────────────────────────────────────
router.get('/expenses', async (req, res) => {
  const { range, date } = req.query;
  const targetDate = date ? new Date(date) : new Date();

  let start = new Date(targetDate);
  let end = new Date(targetDate);

  if (range === 'daily') {
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);
  } else {
    // monthly
    start.setDate(1);
    start.setHours(0,0,0,0);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    end.setHours(23,59,59,999);
  }

  try {
    const logs = await prisma.dailyCollection.findMany({
      where: {
        date: { gte: start, lte: end }
      },
      include: { vehicle: true, driver: true },
      orderBy: { date: 'desc' }
    });

    const totalFuel = logs.reduce((sum, l) => sum + Number(l.fuel_expense_cash || 0) + Number(l.fuel_expense_owner || 0), 0);
    const totalRent = logs.reduce((sum, l) => sum + Number(l.vehicle_rent || 0), 0);
    const totalDriverWage = logs.reduce((sum, l) => sum + Number(l.driver_wage || 0), 0);
    const totalHelperWage = logs.reduce((sum, l) => sum + Number(l.helper_wage || 0), 0);
    const totalAdvance = logs.reduce((sum, l) => sum + Number(l.advance || 0), 0);
    const totalOther = logs.reduce((sum, l) => sum + Number(l.other_expenses || 0), 0);
    const grandTotalExpenses = totalFuel + totalRent + totalDriverWage + totalHelperWage + totalAdvance + totalOther;

    const reportData = {
      summary: { totalFuel, totalRent, totalDriverWage, totalHelperWage, totalAdvance, totalOther, grandTotalExpenses },
      rows: logs.map(l => ({
        date: formatDate(l.date),
        vehicle_number: l.vehicle?.vehicle_number || 'N/A',
        driver_name: l.driver?.name || 'N/A',
        fuel: Number(l.fuel_expense_cash || 0) + Number(l.fuel_expense_owner || 0),
        rent: Number(l.vehicle_rent || 0),
        driver_wage: Number(l.driver_wage || 0),
        helper_wage: Number(l.helper_wage || 0),
        advance: Number(l.advance || 0),
        other: Number(l.other_expenses || 0),
        total: Number(l.fuel_expense_cash || 0) + Number(l.fuel_expense_owner || 0) + Number(l.vehicle_rent || 0) + Number(l.driver_wage || 0) + Number(l.helper_wage || 0) + Number(l.advance || 0) + Number(l.other_expenses || 0)
      }))
    };

    if (req.query.format === 'pdf') {
      const html = `
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-label">Grand Total Expenses</div>
            <div class="summary-val" style="color: #b91c1c;">${INR(grandTotalExpenses)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Fuel Expenses</div>
            <div class="summary-val">${INR(totalFuel)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Wages Paid</div>
            <div class="summary-val">${INR(totalDriverWage + totalHelperWage)}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Vehicle</th>
              <th>Driver</th>
              <th class="text-right">Fuel</th>
              <th class="text-right">Wages</th>
              <th class="text-right">Advance</th>
              <th class="text-right">Other</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.rows.map(r => `
              <tr>
                <td>${r.date}</td>
                <td>${r.vehicle_number}</td>
                <td>${r.driver_name}</td>
                <td class="text-right">${INR(r.fuel)}</td>
                <td class="text-right">${INR(r.driver_wage + r.helper_wage)}</td>
                <td class="text-right">${INR(r.advance)}</td>
                <td class="text-right">${INR(r.other)}</td>
                <td class="text-right" style="font-weight:bold; color: #b91c1c;">${INR(r.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      return streamPdfResponse(res, `Expenses Report (${range || 'monthly'})`, html, 'expenses-report.pdf');
    }

    if (req.query.format === 'excel') {
      const cols = [
        { header: 'Date', key: 'date' },
        { header: 'Vehicle Number', key: 'vehicle_number' },
        { header: 'Driver', key: 'driver_name' },
        { header: 'Fuel Expense', key: 'fuel' },
        { header: 'Rent', key: 'rent' },
        { header: 'Driver Wage', key: 'driver_wage' },
        { header: 'Helper Wage', key: 'helper_wage' },
        { header: 'Advance', key: 'advance' },
        { header: 'Other', key: 'other' },
        { header: 'Total Expense', key: 'total' }
      ];
      return streamExcelResponse(res, 'expenses-report.xlsx', cols, reportData.rows);
    }

    return res.json(reportData);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// ─── 8. INCOME REPORT ─────────────────────────────────────────────────────────
router.get('/income', async (req, res) => {
  const { range, date } = req.query;
  const targetDate = date ? new Date(date) : new Date();

  let start = new Date(targetDate);
  let end = new Date(targetDate);

  if (range === 'daily') {
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);
  } else {
    // monthly
    start.setDate(1);
    start.setHours(0,0,0,0);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    end.setHours(23,59,59,999);
  }

  try {
    // Income pulls ONLY from Payments where status = 'paid' and paid_date is in range
    const payments = await prisma.payment.findMany({
      where: {
        status: 'paid',
        paid_date: { gte: start, lte: end }
      },
      include: { waybill: true },
      orderBy: { paid_date: 'desc' }
    });

    const totalIncomeValue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    const reportData = {
      summary: { totalCount: payments.length, totalIncomeValue },
      rows: payments.map(p => ({
        waybill_number: p.waybill.waybill_number,
        paid_date: formatDate(p.paid_date),
        consignee_name: p.waybill.consignee_name,
        payment_method: p.payment_method || 'N/A',
        amount: Number(p.amount)
      }))
    };

    if (req.query.format === 'pdf') {
      const html = `
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-label">Collections Volume</div>
            <div class="summary-val">${payments.length} Payments</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total Realized Income</div>
            <div class="summary-val" style="color: #16a34a;">${INR(totalIncomeValue)}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Waybill No</th>
              <th>Paid Date</th>
              <th>Consignee</th>
              <th>Payment Method</th>
              <th class="text-right">Income Received</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.rows.length === 0 
              ? '<tr><td colspan="5">No income receipts recorded</td></tr>' 
              : reportData.rows.map(r => `
                <tr>
                  <td style="font-weight:bold;">${r.waybill_number}</td>
                  <td>${r.paid_date}</td>
                  <td>${r.consignee_name}</td>
                  <td>${r.payment_method}</td>
                  <td class="text-right" style="font-weight:bold; color: #16a34a;">${INR(r.amount)}</td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      `;
      return streamPdfResponse(res, `Income Report (${range || 'monthly'})`, html, 'income-report.pdf');
    }

    if (req.query.format === 'excel') {
      const cols = [
        { header: 'Waybill Number', key: 'waybill_number' },
        { header: 'Paid Date', key: 'paid_date' },
        { header: 'Consignee Name', key: 'consignee_name' },
        { header: 'Payment Method', key: 'payment_method' },
        { header: 'Income Amount', key: 'amount' }
      ];
      return streamExcelResponse(res, 'income-report.xlsx', cols, reportData.rows);
    }

    return res.json(reportData);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
