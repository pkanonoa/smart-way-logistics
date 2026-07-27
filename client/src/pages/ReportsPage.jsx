import { useState, useEffect } from 'react';
import { getstaffs } from '../api/staffApi';
import { getVehicles } from '../api/vehiclesApi';
import {
  getBookingsReport,
  getSendersReport,
  getPendingPaymentsReport,
  getParcelsReport,
  getStaffReport,
  getVehiclesReport,
  getExpensesReport,
  getIncomeReport,
  downloadReportBlob
} from '../api/reportsApi';

const INR = (amount) => Number(amount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 });

const REPORT_TABS = [
  { id: 'bookings', name: 'Bookings' },
  { id: 'senders', name: 'Senders' },
  { id: 'pending-payments', name: 'Pending Payments' },
  { id: 'parcels', name: 'Parcels Status' },
  { id: 'staff', name: 'Staff Performance' },
  { id: 'vehicles', name: 'Vehicles Performance' },
  { id: 'expenses', name: 'Expenses' },
  { id: 'income', name: 'Realized Income' }
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('bookings');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState(null);

  // Filters
  const [range, setRange] = useState('monthly'); // daily | monthly
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().substring(0, 10));
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Dropdown lists
  const [staffList, setStaffList] = useState([]);
  const [vehicleList, setVehicleList] = useState([]);

  // Fetch dropdown data
  useEffect(() => {
    async function fetchDropdowns() {
      try {
        const staff = await getstaffs();
        setStaffList(staff || []);
        if (staff.length > 0) setSelectedStaffId(staff[0].id);

        const vehicles = await getVehicles();
        setVehicleList(vehicles || []);
        if (vehicles.length > 0) setSelectedVehicleId(vehicles[0].id);
      } catch (err) {
        console.error('Failed to load filter choices:', err);
      }
    }
    fetchDropdowns();
  }, []);

  // Fetch report data when active tab or filters change
  useEffect(() => {
    async function loadReport() {
      setLoading(true);
      setReportData(null);
      try {
        let data = null;
        const params = { range, date: selectedDate };

        switch (activeTab) {
          case 'bookings':
            data = await getBookingsReport(params);
            break;
          case 'senders':
            if (selectedStaffId) data = await getSendersReport(selectedStaffId);
            break;
          case 'pending-payments':
            data = await getPendingPaymentsReport();
            break;
          case 'parcels':
            data = await getParcelsReport(selectedStatus);
            break;
          case 'staff':
            if (selectedStaffId) data = await getStaffReport(selectedStaffId);
            break;
          case 'vehicles':
            if (selectedVehicleId) data = await getVehiclesReport(selectedVehicleId);
            break;
          case 'expenses':
            data = await getExpensesReport(params);
            break;
          case 'income':
            data = await getIncomeReport(params);
            break;
          default:
            break;
        }
        setReportData(data);
      } catch (err) {
        console.error('Failed to load report:', err);
      } finally {
        setLoading(false);
      }
    }

    loadReport();
  }, [activeTab, range, selectedDate, selectedStaffId, selectedVehicleId, selectedStatus]);

  // Export handlers
  const handleExport = async (format) => {
    setExporting(true);
    try {
      let endpoint = '';
      const params = { range, date: selectedDate };

      switch (activeTab) {
        case 'bookings':
          endpoint = '/reports/bookings';
          break;
        case 'senders':
          endpoint = `/reports/senders/${selectedStaffId}`;
          break;
        case 'pending-payments':
          endpoint = '/reports/pending-payments';
          break;
        case 'parcels':
          endpoint = '/reports/parcels';
          params.status = selectedStatus;
          break;
        case 'staff':
          endpoint = `/reports/staff/${selectedStaffId}`;
          break;
        case 'vehicles':
          endpoint = `/reports/vehicles/${selectedVehicleId}`;
          break;
        case 'expenses':
          endpoint = '/reports/expenses';
          break;
        case 'income':
          endpoint = '/reports/income';
          break;
        default:
          break;
      }

      if (!endpoint) return;

      const blob = await downloadReportBlob(endpoint, params, format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${activeTab}-report.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export report data');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 relative">
      <div className="fixed top-0 right-0 w-[500px] h-[400px] bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports &amp; Analytics</h1>
          <p className="text-sm text-slate-400 mt-1">Read-only operational performance logs and financial summaries</p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleExport('excel')}
            disabled={exporting || loading || !reportData}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 hover:text-white px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export to Excel
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting || loading || !reportData}
            className="flex items-center gap-2 bg-orange-550 hover:bg-orange-400 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors shadow-lg shadow-orange-500/20 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Export to PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800 mb-8 overflow-x-auto">
        <nav className="flex space-x-6 min-w-max pb-1">
          {REPORT_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setReportData(null);
              }}
              className={`pb-4 px-1 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters Section */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5 mb-8 flex flex-wrap items-end gap-5">
        {/* Date Filters (for time-based reports) */}
        {['bookings', 'expenses', 'income'].includes(activeTab) && (
          <>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Range</label>
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setRange('daily')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    range === 'daily' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setRange('monthly')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    range === 'monthly' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Target Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-orange-500/50 h-[38px] [color-scheme:dark]"
              />
            </div>
          </>
        )}

        {/* Staff/Sender Dropdown */}
        {['senders', 'staff'].includes(activeTab) && (
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Select Staff</label>
            <select
              value={selectedStaffId}
              onChange={e => setSelectedStaffId(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-orange-500/50 h-[38px] min-w-[200px]"
            >
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
              ))}
            </select>
          </div>
        )}

        {/* Vehicle Dropdown */}
        {activeTab === 'vehicles' && (
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Select Vehicle</label>
            <select
              value={selectedVehicleId}
              onChange={e => setSelectedVehicleId(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-orange-500/50 h-[38px] min-w-[200px]"
            >
              {vehicleList.map(v => (
                <option key={v.id} value={v.id}>{v.vehicle_number} - {v.vehicle_name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Parcels Status Dropdown */}
        {activeTab === 'parcels' && (
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Status Filter</label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-orange-500/50 h-[38px] min-w-[180px]"
            >
              <option value="">All Statuses</option>
              <option value="booked">Booked</option>
              <option value="loaded">Loaded</option>
              <option value="in_transit">In Transit</option>
              <option value="arrived">Arrived</option>
              <option value="out_for_delivery">Out For Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="returned">Returned</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex justify-center items-center py-24">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !reportData ? (
        <div className="bg-slate-900/20 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm">
          No report data matches the selected criteria.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {activeTab === 'bookings' && (
              <>
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Bookings</span>
                  <p className="text-white text-2xl font-bold mt-1">{reportData.summary.totalCount}</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Packages Booked</span>
                  <p className="text-white text-2xl font-bold mt-1">{reportData.summary.totalPackages}</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Weight</span>
                  <p className="text-white text-2xl font-bold mt-1">{reportData.summary.totalWeight.toFixed(2)} KG</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Freight Value</span>
                  <p className="text-orange-400 text-2xl font-bold mt-1">{INR(reportData.summary.totalRevenue)}</p>
                </div>
              </>
            )}

            {activeTab === 'senders' && (
              <>
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Shipments</span>
                  <p className="text-white text-2xl font-bold mt-1">{reportData.summary.totalCount}</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Packages Sent</span>
                  <p className="text-white text-2xl font-bold mt-1">{reportData.summary.totalPackages}</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Freight Revenue</span>
                  <p className="text-orange-400 text-2xl font-bold mt-1">{INR(reportData.summary.totalRevenue)}</p>
                </div>
              </>
            )}

            {activeTab === 'pending-payments' && (
              <>
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pending Bookings</span>
                  <p className="text-white text-2xl font-bold mt-1">{reportData.summary.totalCount}</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Outstanding</span>
                  <p className="text-red-400 text-2xl font-bold mt-1">{INR(reportData.summary.totalPendingAmount)}</p>
                </div>
              </>
            )}

            {activeTab === 'parcels' && (
              <>
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Consignments</span>
                  <p className="text-white text-2xl font-bold mt-1">{reportData.summary.totalCount}</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Packages Count</span>
                  <p className="text-white text-2xl font-bold mt-1">{reportData.summary.totalPackages}</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cumulative Weight</span>
                  <p className="text-white text-2xl font-bold mt-1">{reportData.summary.totalWeight.toFixed(2)} KG</p>
                </div>
              </>
            )}

            {activeTab === 'staff' && (
              <>
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Assigned Bookings</span>
                  <p className="text-white text-2xl font-bold mt-1">{reportData.summary.bookingsCount}</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Present Days</span>
                  <p className="text-white text-2xl font-bold mt-1">{reportData.summary.attendance.presentCount} Days</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-semibold">Active Advances</span>
                  <p className="text-red-400 text-2xl font-bold mt-1">{INR(reportData.summary.totalAdvancesOutstanding)}</p>
                </div>
              </>
            )}

            {activeTab === 'vehicles' && (
              <>
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Collection Volume</span>
                  <p className="text-emerald-400 text-2xl font-bold mt-1">{INR(reportData.summary.totalCollectionsValue)}</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Logged Trips</span>
                  <p className="text-white text-2xl font-bold mt-1">{reportData.summary.collectionsCount}</p>
                </div>
              </>
            )}

            {activeTab === 'expenses' && (
              <>
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-black">Grand Total Expenses</span>
                  <p className="text-red-450 text-2xl font-bold mt-1">{INR(reportData.summary.grandTotalExpenses)}</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Fuel Costs</span>
                  <p className="text-white text-2xl font-bold mt-1">{INR(reportData.summary.totalFuel)}</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Wages (Drivers/Helpers)</span>
                  <p className="text-white text-2xl font-bold mt-1">{INR(reportData.summary.totalDriverWage + reportData.summary.totalHelperWage)}</p>
                </div>
              </>
            )}

            {activeTab === 'income' && (
              <>
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Realized Cash Volume</span>
                  <p className="text-emerald-400 text-2xl font-bold mt-1">{INR(reportData.summary.totalIncomeValue)}</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Accounts Realized</span>
                  <p className="text-white text-2xl font-bold mt-1">{reportData.summary.totalCount} paid invoices</p>
                </div>
              </>
            )}
          </div>

          {/* Simple Chart Visualization */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Visual Analytics Summary</h3>
            {/* SVG/div bar chart */}
            <div className="space-y-4">
              {activeTab === 'expenses' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: 'Fuel Costs', val: reportData.summary.totalFuel },
                    { name: 'Rent', val: reportData.summary.totalRent },
                    { name: 'Driver Wages', val: reportData.summary.totalDriverWage },
                    { name: 'Helper Wages', val: reportData.summary.totalHelperWage },
                    { name: 'Advances', val: reportData.summary.totalAdvance },
                    { name: 'Other', val: reportData.summary.totalOther }
                  ].map(item => {
                    const percent = reportData.summary.grandTotalExpenses > 0 ? (item.val / reportData.summary.grandTotalExpenses) * 100 : 0;
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">{item.name}</span>
                          <span className="text-slate-200 font-bold">{INR(item.val)} ({percent.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                          <div className="bg-red-500 h-full rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === 'bookings' && (
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Monthly Target Metric</span>
                    <span className="text-orange-400 font-bold">Volume: {reportData.summary.totalCount} packages</span>
                  </div>
                  <div className="w-full bg-slate-950 h-4 rounded-full overflow-hidden border border-slate-800 relative">
                    <div className="bg-orange-500 h-full rounded-full" style={{ width: `${Math.min((reportData.summary.totalCount / 50) * 100, 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-500">Benchmark: 50 shipments per period target.</span>
                </div>
              )}

              {activeTab !== 'expenses' && activeTab !== 'bookings' && (
                <div className="py-6 text-center text-xs text-slate-500">
                  Detailed analytics logs rendered below in structural table format.
                </div>
              )}
            </div>
          </div>

          {/* Details Table */}
          <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Detailed Report Entries</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                    {activeTab === 'bookings' && (
                      <>
                        <th className="px-6 py-3">Waybill No</th>
                        <th className="px-6 py-3">Booking Date</th>
                        <th className="px-6 py-3">Consignee</th>
                        <th className="px-6 py-3">Route</th>
                        <th className="px-6 py-3 text-right">Packages</th>
                        <th className="px-6 py-3 text-right">Weight (KG)</th>
                        <th className="px-6 py-3 text-right">Freight</th>
                        <th className="px-6 py-3">Payment</th>
                      </>
                    )}
                    {activeTab === 'senders' && (
                      <>
                        <th className="px-6 py-3">Waybill No</th>
                        <th className="px-6 py-3">Booking Date</th>
                        <th className="px-6 py-3">Consignee</th>
                        <th className="px-6 py-3">Route</th>
                        <th className="px-6 py-3 text-right">Packages</th>
                        <th className="px-6 py-3 text-right">Weight</th>
                        <th className="px-6 py-3 text-right">Freight</th>
                        <th className="px-6 py-3">Payment</th>
                      </>
                    )}
                    {activeTab === 'pending-payments' && (
                      <>
                        <th className="px-6 py-3">Waybill No</th>
                        <th className="px-6 py-3">Booking Date</th>
                        <th className="px-6 py-3">Consignee</th>
                        <th className="px-6 py-3">Mobile</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Outstanding</th>
                        <th className="px-6 py-3">Due Date</th>
                      </>
                    )}
                    {activeTab === 'parcels' && (
                      <>
                        <th className="px-6 py-3">Waybill No</th>
                        <th className="px-6 py-3">Booking Date</th>
                        <th className="px-6 py-3">Consignee</th>
                        <th className="px-6 py-3">Route</th>
                        <th className="px-6 py-3 text-right">Packages</th>
                        <th className="px-6 py-3 text-right">Weight</th>
                        <th className="px-6 py-3">Status</th>
                      </>
                    )}
                    {activeTab === 'staff' && (
                      <>
                        <th className="px-6 py-3">Week Period</th>
                        <th className="px-6 py-3 text-right">Base Wage</th>
                        <th className="px-6 py-3 text-right">Paid Wage</th>
                      </>
                    )}
                    {activeTab === 'vehicles' && (
                      <>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Driver</th>
                        <th className="px-6 py-3 text-right">Fuel Expense</th>
                        <th className="px-6 py-3 text-right">Driver Wage</th>
                        <th className="px-6 py-3 text-right">Collection</th>
                      </>
                    )}
                    {activeTab === 'expenses' && (
                      <>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Vehicle</th>
                        <th className="px-6 py-3">Driver</th>
                        <th className="px-6 py-3 text-right">Fuel</th>
                        <th className="px-6 py-3 text-right">Wages</th>
                        <th className="px-6 py-3 text-right">Advance</th>
                        <th className="px-6 py-3 text-right">Other</th>
                        <th className="px-6 py-3 text-right">Total</th>
                      </>
                    )}
                    {activeTab === 'income' && (
                      <>
                        <th className="px-6 py-3">Waybill No</th>
                        <th className="px-6 py-3">Paid Date</th>
                        <th className="px-6 py-3">Consignee</th>
                        <th className="px-6 py-3">Payment Method</th>
                        <th className="px-6 py-3 text-right">Amount</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-350 font-medium">
                  {activeTab === 'bookings' && reportData?.rows?.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-850/40">
                      <td className="px-6 py-3 font-bold text-white">{row.waybill_number}</td>
                      <td className="px-6 py-3">{row.booking_date}</td>
                      <td className="px-6 py-3">{row.consignee_name}</td>
                      <td className="px-6 py-3">{row.from_location} &rarr; {row.to_location}</td>
                      <td className="px-6 py-3 text-right">{row.packages}</td>
                      <td className="px-6 py-3 text-right">{row.weight.toFixed(2)}</td>
                      <td className="px-6 py-3 text-right font-bold text-white">{INR(row.grand_total)}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          row.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' : 'bg-orange-500/10 text-orange-450 border border-orange-500/20'
                        }`}>{row.payment_status}</span>
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'senders' && reportData?.rows?.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-850/40">
                      <td className="px-6 py-3 font-bold text-white">{row.waybill_number}</td>
                      <td className="px-6 py-3">{row.booking_date}</td>
                      <td className="px-6 py-3">{row.consignee_name}</td>
                      <td className="px-6 py-3">{row.from_location} &rarr; {row.to_location}</td>
                      <td className="px-6 py-3 text-right">{row.packages}</td>
                      <td className="px-6 py-3 text-right">{row.weight.toFixed(2)}</td>
                      <td className="px-6 py-3 text-right font-bold text-white">{INR(row.grand_total)}</td>
                      <td className="px-6 py-3">
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">{row.payment_status}</span>
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'pending-payments' && reportData?.rows?.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-850/40">
                      <td className="px-6 py-3 font-bold text-white">{row.waybill_number}</td>
                      <td className="px-6 py-3">{row.booking_date}</td>
                      <td className="px-6 py-3">{row.consignee_name}</td>
                      <td className="px-6 py-3">{row.consignee_mobile}</td>
                      <td className="px-6 py-3 text-red-400 uppercase font-bold">{row.payment_status}</td>
                      <td className="px-6 py-3 text-right font-bold text-red-400">{INR(row.amount)}</td>
                      <td className="px-6 py-3">{row.due_date || 'N/A'}</td>
                    </tr>
                  ))}
                  {activeTab === 'parcels' && reportData?.rows?.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-850/40">
                      <td className="px-6 py-3 font-bold text-white">{row.waybill_number}</td>
                      <td className="px-6 py-3">{row.booking_date}</td>
                      <td className="px-6 py-3">{row.consignee_name}</td>
                      <td className="px-6 py-3">{row.from_location} &rarr; {row.to_location}</td>
                      <td className="px-6 py-3 text-right">{row.packages}</td>
                      <td className="px-6 py-3 text-right">{row.weight.toFixed(2)}</td>
                      <td className="px-6 py-3">
                        <span className="inline-flex px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 capitalize">{row.status}</span>
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'staff' && reportData?.salaryHistory?.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-850/40">
                      <td className="px-6 py-3 text-white">{row.week}</td>
                      <td className="px-6 py-3 text-right">{INR(row.base_amount)}</td>
                      <td className="px-6 py-3 text-right font-bold text-emerald-400">{INR(row.paid_amount)}</td>
                    </tr>
                  ))}
                  {activeTab === 'vehicles' && reportData?.collections?.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-850/40">
                      <td className="px-6 py-3">{row.date}</td>
                      <td className="px-6 py-3 text-white">{row.driver_name}</td>
                      <td className="px-6 py-3 text-right">{INR(row.fuel_expense)}</td>
                      <td className="px-6 py-3 text-right">{INR(row.driver_wage)}</td>
                      <td className="px-6 py-3 text-right font-bold text-emerald-400">{INR(row.total_collection)}</td>
                    </tr>
                  ))}
                  {activeTab === 'expenses' && reportData?.rows?.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-850/40">
                      <td className="px-6 py-3">{row.date}</td>
                      <td className="px-6 py-3 font-semibold text-white">{row.vehicle_number}</td>
                      <td className="px-6 py-3">{row.driver_name}</td>
                      <td className="px-6 py-3 text-right">{INR(row.fuel)}</td>
                      <td className="px-6 py-3 text-right">{INR(row.driver_wage + row.helper_wage)}</td>
                      <td className="px-6 py-3 text-right">{INR(row.advance)}</td>
                      <td className="px-6 py-3 text-right">{INR(row.other)}</td>
                      <td className="px-6 py-3 text-right font-bold text-red-400">{INR(row.total)}</td>
                    </tr>
                  ))}
                  {activeTab === 'income' && reportData?.rows?.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-850/40">
                      <td className="px-6 py-3 font-bold text-white">{row.waybill_number}</td>
                      <td className="px-6 py-3">{row.paid_date}</td>
                      <td className="px-6 py-3">{row.consignee_name}</td>
                      <td className="px-6 py-3 capitalize">{row.payment_method}</td>
                      <td className="px-6 py-3 text-right font-bold text-emerald-400">{INR(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
