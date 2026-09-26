import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';

// Pages
import LoginPage            from './pages/LoginPage';
import PublicTrackingPage   from './pages/PublicTrackingPage';
import DashboardPage        from './pages/DashboardPage';
import ReportsPage          from './pages/ReportsPage';
import ShipmentsPage        from './pages/ShipmentsPage';
import TripsPage            from './pages/TripsPage';
import TripBuilderPage      from './pages/TripBuilderPage';
import FleetStaffPage       from './pages/FleetStaffPage';
import PaymentsLedgerPage   from './pages/PaymentsLedgerPage';
import SalariesPage         from './pages/SalariesPage';
import UserManagementPage   from './pages/UserManagementPage';

// Sub-pages still accessible via internal navigation / deep-links
import StaffDetailsPage     from './pages/StaffDetailsPage';
import WaybillDetailsPage   from './pages/WaybillDetailsPage';
import EditBookingPage      from './pages/EditBookingPage';
import CompaniesPage        from './pages/CompaniesPage';
import CompanyStatementPage from './pages/CompanyStatementPage';

// Legacy routes kept alive (old sidebar links may still be in use)
import NewBookingPage       from './pages/NewBookingPage';
import WaybillsPage         from './pages/WaybillsPage';
import StaffPage            from './pages/StaffPage';
import VehiclesPage         from './pages/VehiclesPage';
import DailyLogsPage        from './pages/DailyLogsPage';
import DailyCollectionsPage from './pages/DailyCollectionsPage';
import PendingPaymentsPage  from './pages/PendingPaymentsPage';
import AssignTripsPage      from './pages/AssignTripsPage';

// Shorthand for guarded route with AppShell
function Shell({ children, roles, redirectTo }) {
  return (
    <ProtectedRoute roles={roles} redirectTo={redirectTo}>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── Public ──────────────────────────────────────────────────── */}
          <Route path="/login"                element={<LoginPage />} />
          <Route path="/track/:waybill_number" element={<PublicTrackingPage />} />

          {/* ── Overview ────────────────────────────────────────────────── */}
          <Route path="/dashboard" element={<Shell><DashboardPage /></Shell>} />
          <Route path="/reports"   element={<Shell roles={['admin','accountant','viewer']}><ReportsPage /></Shell>} />
          <Route path="/reports/companies/:companyId" element={<Shell roles={['admin','accountant','viewer']}><CompanyStatementPage /></Shell>} />

          {/* ── Operations ──────────────────────────────────────────────── */}
          {/* Shipments: "Create" + "All shipments" tabs */}
          <Route path="/shipments" element={<Shell roles={['admin','staff']}><ShipmentsPage /></Shell>} />

          {/* Trips list + builder */}
          <Route path="/trips"              element={<Shell roles={['admin','staff']}><TripsPage /></Shell>} />
          <Route path="/trips/new"          element={<Shell roles={['admin','staff']}><TripBuilderPage /></Shell>} />
          <Route path="/trips/:id"          element={<Shell roles={['admin','staff']}><TripBuilderPage /></Shell>} />
          {/* Legacy builder path kept alive */}
          <Route path="/trips/builder"      element={<Navigate to="/trips/new" replace />} />
          <Route path="/trips/builder/:id"  element={<Shell roles={['admin','staff']}><TripBuilderPage /></Shell>} />

          {/* Fleet & Staff: Vehicles + Staff sub-tabs */}
          <Route path="/fleet-staff" element={<Shell><FleetStaffPage /></Shell>} />
          {/* Staff detail still reachable via fleet-staff/staff deep-links */}
          <Route path="/staff/:id"   element={<Shell><StaffDetailsPage /></Shell>} />

          {/* ── Finance ─────────────────────────────────────────────────── */}
          {/* Payments: inflow/outflow toggle */}
          <Route path="/payments" element={<Shell><PaymentsLedgerPage /></Shell>} />
          {/* Payroll (formerly Salaries) */}
          <Route path="/payroll"  element={<Shell roles={['admin','accountant','viewer']}><SalariesPage /></Shell>} />
          {/* Legacy /salaries → redirect to /payroll */}
          <Route path="/salaries" element={<Navigate to="/payroll" replace />} />

          {/* ── Admin ───────────────────────────────────────────────────── */}
          <Route path="/users" element={<Shell roles={['admin']}><UserManagementPage /></Shell>} />

          {/* ── Internal / deep-link pages (not in sidebar) ─────────────── */}
          <Route path="/waybills/:id"        element={<Shell><WaybillDetailsPage /></Shell>} />
          <Route path="/bookings/edit/:id"   element={<Shell roles={['admin','staff']}><EditBookingPage /></Shell>} />
          <Route path="/companies"           element={<Shell roles={['admin','staff']}><CompaniesPage /></Shell>} />

          {/* ── Legacy routes (kept for bookmarks / external links) ──────── */}
          <Route path="/staff"             element={<Navigate to="/fleet-staff?tab=staff" replace />} />
          <Route path="/vehicles"          element={<Navigate to="/fleet-staff?tab=vehicles" replace />} />
          <Route path="/bookings/new"      element={<Navigate to="/shipments?tab=create" replace />} />
          <Route path="/waybills"          element={<Navigate to="/shipments" replace />} />
          <Route path="/daily-collections" element={<Shell><DailyCollectionsPage /></Shell>} />
          <Route path="/pending-payments"  element={<Shell><PendingPaymentsPage /></Shell>} />
          <Route path="/daily-logs"        element={<Shell><DailyLogsPage /></Shell>} />
          <Route path="/assign-trips"      element={<Shell roles={['admin','staff']}><AssignTripsPage /></Shell>} />

          {/* ── Fallbacks ───────────────────────────────────────────────── */}
          <Route path="/"  element={<Navigate to="/dashboard" replace />} />
          <Route path="*"  element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
