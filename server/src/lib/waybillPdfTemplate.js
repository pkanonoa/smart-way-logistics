/**
 * Generates the HTML string for a Smart Way Logistics waybill receipt.
 * @param {object} waybill - Full waybill object from Prisma (with consignors, payment)
 * @param {boolean} isDuplicate - If true, overlays "DUPLICATE COPY" watermark
 */
function generateWaybillHtml(waybill, isDuplicate = false) {
  const fmt = (n) => Number(n || 0).toFixed(2);
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const assignedStaff = waybill.assigned_staff || [];
  const payment = waybill.payment || {};
  const mode = (waybill.payment_mode || '').toLowerCase();

  const charge = (label, value) => Number(value || 0) > 0
    ? `<tr><td class="ch-label">${label}</td><td class="ch-value">₹${fmt(value)}</td></tr>`
    : `<tr><td class="ch-label">${label}</td><td class="ch-value">—</td></tr>`;

  const checkBox = (label, checked) =>
    `<span class="pay-option ${checked ? 'checked' : ''}">${checked ? '☑' : '☐'} ${label}</span>`;

  const ewayRow = waybill.eway_bill_number
    ? `<div class="eway-box">
        <div><span class="eway-label">E-WAY BILL NO.</span> <span class="eway-val">${waybill.eway_bill_number}</span></div>
        ${waybill.eway_bill_valid_until ? `<div><span class="eway-label">VALID UNTIL</span> <span class="eway-val">${fmtDate(waybill.eway_bill_valid_until)}</span></div>` : ''}
       </div>`
    : `<div class="eway-box eway-missing">No E-Way Bill${Number(waybill.grand_total) >= 50000 ? ' — <strong>REQUIRED</strong>' : ''}</div>`;

  const consignorText = `
    <div class="party-row">
      <b>${waybill.consignor_name || '—'}</b><br>
      ${waybill.consignor_contact || '—'}
      ${waybill.consignor_address ? `<br><span class="party-addr">${waybill.consignor_address}</span>` : ''}
      ${waybill.consignor_gst ? `<div class="party-gst">GST: ${waybill.consignor_gst}</div>` : ''}
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Waybill ${waybill.waybill_number}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 11px;
    color: #1a1a1a;
    background: white;
    padding: 18px 22px;
    max-width: 210mm;
    position: relative;
  }

  ${isDuplicate ? `
  body::before {
    content: "DUPLICATE COPY";
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-40deg);
    font-size: 72px;
    font-weight: 900;
    color: rgba(220, 40, 40, 0.12);
    white-space: nowrap;
    pointer-events: none;
    z-index: 9999;
    letter-spacing: 6px;
  }
  ` : ''}

  /* ─── Header ─── */
  .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 2.5px solid #1a1a1a; padding-bottom: 10px; margin-bottom: 8px; }
  .company-name { font-size: 20px; font-weight: 900; letter-spacing: 1px; line-height: 1.1; }
  .company-tag { font-size: 9px; color: #555; letter-spacing: 2px; margin-top: 2px; }
  .company-addr { font-size: 9px; color: #444; margin-top: 6px; line-height: 1.5; text-align: right; }
  .wb-box { border: 1.5px solid #1a1a1a; padding: 6px 12px; text-align: center; min-width: 160px; }
  .wb-box-label { font-size: 8px; font-weight: 700; letter-spacing: 1.5px; color: #555; }
  .wb-number { font-size: 20px; font-weight: 900; letter-spacing: 2px; color: #c2410c; margin: 2px 0; }
  .wb-date { font-size: 9px; color: #444; }

  /* ─── E-Way Bill ─── */
  .eway-box { border: 1px solid #aaa; padding: 5px 10px; margin-bottom: 8px; display: flex; gap: 24px; font-size: 9.5px; background: #fafafa; border-radius: 3px; }
  .eway-box.eway-missing { color: #888; font-style: italic; }
  .eway-label { font-weight: 700; color: #555; letter-spacing: 0.5px; }
  .eway-val { font-weight: 600; font-family: monospace; font-size: 10px; }

  /* ─── From / To ─── */
  .from-to { display: flex; gap: 0; border: 1.5px solid #1a1a1a; margin-bottom: 8px; }
  .from-to-cell { flex: 1; padding: 6px 10px; }
  .from-to-cell + .from-to-cell { border-left: 1.5px solid #1a1a1a; }
  .ft-label { font-size: 8px; font-weight: 700; letter-spacing: 1.5px; color: #555; margin-bottom: 3px; }
  .ft-value { font-size: 13px; font-weight: 700; }

  /* ─── Parties + Charges ─── */
  .parties-charges { display: flex; gap: 8px; margin-bottom: 8px; }
  .parties { flex: 1.6; }
  .parties-grid { display: flex; gap: 0; border: 1.5px solid #1a1a1a; height: 100%; }
  .party-box { flex: 1; padding: 7px 10px; }
  .party-box + .party-box { border-left: 1.5px solid #1a1a1a; }
  .party-box-label { font-size: 8px; font-weight: 700; letter-spacing: 1.5px; color: #555; margin-bottom: 5px; }
  .party-row { font-size: 10px; line-height: 1.5; }
  .party-addr { color: #444; font-size: 9.5px; }
  .party-sep { border: none; border-top: 1px dashed #ccc; margin: 5px 0; }
  .party-gst { font-size: 9px; color: #555; margin-top: 3px; }
  .muted { color: #999; }

  .charges { flex: 1; }
  .charges-table { width: 100%; border-collapse: collapse; border: 1.5px solid #1a1a1a; }
  .charges-table th { background: #1a1a1a; color: white; font-size: 8px; letter-spacing: 1px; padding: 5px 8px; text-align: center; }
  .charges-table td { padding: 4px 8px; font-size: 10px; border-bottom: 1px solid #e5e5e5; }
  .ch-label { color: #444; }
  .ch-value { text-align: right; font-weight: 500; }
  .grand-total-row td { border-top: 2px solid #1a1a1a; font-weight: 800; font-size: 11.5px; padding-top: 6px; }
  .grand-total-row .ch-value { color: #c2410c; }

  /* ─── Parcel Info ─── */
  .parcel-row { display: flex; gap: 0; border: 1.5px solid #1a1a1a; margin-bottom: 8px; }
  .parcel-cell { flex: 1; padding: 6px 10px; text-align: center; }
  .parcel-cell + .parcel-cell { border-left: 1.5px solid #1a1a1a; }
  .parcel-label { font-size: 8px; font-weight: 700; letter-spacing: 1px; color: #555; margin-bottom: 3px; }
  .parcel-value { font-size: 12px; font-weight: 700; }
  .parcel-desc { flex: 2.5; text-align: left; }

  /* ─── Payment Mode ─── */
  .payment-row { display: flex; align-items: center; gap: 12px; border: 1.5px solid #1a1a1a; padding: 6px 12px; margin-bottom: 8px; }
  .payment-label { font-size: 8px; font-weight: 700; letter-spacing: 1.5px; color: #555; margin-right: 8px; }
  .pay-option { font-size: 11px; font-weight: 600; }
  .pay-option.checked { color: #c2410c; font-weight: 800; }

  /* ─── Declaration ─── */
  .declaration { border: 1.5px solid #aaa; padding: 8px 12px; font-size: 9px; color: #555; line-height: 1.6; margin-bottom: 10px; background: #fafafa; border-radius: 2px; }
  .declaration b { color: #1a1a1a; }

  /* ─── Footer ─── */
  .footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1.5px solid #1a1a1a; padding-top: 8px; }
  .footer-wb { font-size: 18px; font-weight: 900; letter-spacing: 3px; color: #c2410c; }
  .footer-sig { text-align: right; font-size: 9px; color: #555; }
  .sig-line { border-top: 1px solid #aaa; margin-top: 20px; padding-top: 3px; }
  ${isDuplicate ? `.footer-wb::after { content: " (DUPLICATE)"; font-size: 9px; color: #888; }` : ''}
</style>
</head>
<body>

<!-- Header -->
<div class="header">
  <div>
    <div class="company-name">SMART WAY LOGISTICS</div>
    <div class="company-tag">CONSIGNMENT NOTE / WAYBILL</div>
  </div>
  <div class="company-addr">
    Smart Way Logistics<br>
    Ph: Contact Office
  </div>
  <div class="wb-box">
    <div class="wb-box-label">WAYBILL NUMBER</div>
    <div class="wb-number">${waybill.waybill_number}</div>
    <div class="wb-date">Date: ${fmtDate(waybill.booking_date)}</div>
  </div>
</div>

<!-- E-Way Bill -->
${ewayRow}

<!-- From / To -->
<div class="from-to">
  <div class="from-to-cell">
    <div class="ft-label">FROM</div>
    <div class="ft-value">${waybill.from_location}</div>
  </div>
  <div class="from-to-cell">
    <div class="ft-label">TO</div>
    <div class="ft-value">${waybill.to_location}</div>
  </div>
</div>

<!-- Consignor / Consignee + Charges -->
<div class="parties-charges">
  <div class="parties">
    <div class="parties-grid">
      <div class="party-box">
        <div class="party-box-label">CONSIGNOR (SENDER)</div>
        ${consignorText}
      </div>
      <div class="party-box">
        <div class="party-box-label">CONSIGNEE (RECEIVER)</div>
        <div class="party-row">
          <b>${waybill.consignee_name}</b><br>
          ${waybill.consignee_mobile}
          ${waybill.consignee_address ? `<br><span class="party-addr">${waybill.consignee_address}</span>` : ''}
          ${waybill.consignee_gst ? `<div class="party-gst">GST: ${waybill.consignee_gst}</div>` : ''}
        </div>
      </div>
    </div>
  </div>

  <div class="charges">
    <table class="charges-table">
      <thead><tr><th colspan="2">CHARGES</th></tr></thead>
      <tbody>
        ${charge('Freight', waybill.freight)}
        ${charge('Handling Charges', waybill.handling_charges)}
        ${charge('SGST', waybill.sgst)}
        ${charge('CGST', waybill.cgst)}
        ${charge('IGST', waybill.igst)}
        <tr class="grand-total-row">
          <td class="ch-label">GRAND TOTAL</td>
          <td class="ch-value">₹${fmt(waybill.grand_total)}</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<!-- Parcel Info -->
<div class="parcel-row">
  <div class="parcel-cell">
    <div class="parcel-label">NO. OF PKGS</div>
    <div class="parcel-value">${waybill.no_of_packages}</div>
  </div>
  <div class="parcel-cell">
    <div class="parcel-label">TYPE OF PACKING</div>
    <div class="parcel-value">${waybill.package_type}</div>
  </div>
  <div class="parcel-cell">
    <div class="parcel-label">WEIGHT (KG)</div>
    <div class="parcel-value">${Number(waybill.weight).toFixed(2)}</div>
  </div>
  <div class="parcel-cell">
    <div class="parcel-label">VOLUME (CM³)</div>
    <div class="parcel-value">${waybill.volume ? Number(waybill.volume).toFixed(2) : '—'}</div>
  </div>
  <div class="parcel-cell parcel-desc">
    <div class="parcel-label">DESCRIPTION</div>
    <div style="font-size:10px;">${waybill.description || '—'}</div>
  </div>
</div>

<!-- Payment Mode -->
<div class="payment-row">
  <span class="payment-label">MODE OF PAYMENT</span>
  ${checkBox('PAID', mode === 'paid')}
  ${checkBox('TO PAY', mode === 'topay')}
  ${checkBox('CREDIT', mode === 'credit')}
</div>

<!-- Assigned Staff / Drivers -->
<div style="display: flex; align-items: center; gap: 12px; border: 1.5px solid #1a1a1a; padding: 6px 12px; margin-bottom: 8px;">
  <span class="payment-label" style="margin-right: 8px;">ASSIGNED STAFF/DRIVERS</span>
  <span style="font-size: 11px; font-weight: 600;">${assignedStaff.map(s => {
    const roleStr = s.role ? ` - ${s.role === 'other' ? s.role_other_specify || 'Other' : s.role.replace('_', ' ')}` : '';
    return `${s.name} (${s.phone}${roleStr})`;
  }).join(', ') || '—'}</span>
</div>

<!-- Declaration -->
<div class="declaration">
  <b>Declaration:</b> The goods mentioned above are accepted for carriage subject to the company's terms and conditions.
  Consignor declares that the goods are correctly described and no prohibited articles are included.
  Smart Way Logistics shall not be liable for any loss or damage arising from improper packing, acts of God, or unforeseen circumstances.
  Any claims must be lodged within 7 days of delivery. Jurisdiction: Local courts only.
</div>

<!-- Footer -->
<div class="footer">
  <div>
    <div style="font-size:8px;color:#555;margin-bottom:4px;">WAYBILL NO.</div>
    <div class="footer-wb">${waybill.waybill_number}</div>
  </div>
  <div class="footer-sig">
    <div>Received the above goods in good condition</div>
    <div class="sig-line">Consignee Signature &amp; Date</div>
  </div>
</div>

</body>
</html>`;
}

module.exports = { generateWaybillHtml };
