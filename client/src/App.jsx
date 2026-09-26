import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';

// Lazy-loaded Pages for lightweight bundle size & fast route transitions
const LoginPage            = lazy(() => import('./pages/LoginPage'));
const PublicTrackingPage   = lazy(() => import('./pages/PublicTrackingPage'));
const DashboardPage        = lazy(() => import('./pages/DashboardPage'));
const ReportsPage          = lazy(() => import('./pages/ReportsPage'));
const ShipmentsPage        = lazy(() => import('./pages/ShipmentsPage'));
const TripsPage            = lazy(() => import('./pages/TripsPage'));
const TripBuilderPage      = lazy(() => import('./pages/TripBuilderPage'));
const FleetStaffPage       = lazy(() => import('./pages/FleetStaffPage'));
const PaymentsLedgerPage   = lazy(() => import('./pages/PaymentsLedgerPage'));
const SalariesPage         = lazy(() => import('./pages/SalariesPage'));
const UserManagementPage   = lazy(() => import('./pages/UserManagementPage'));

// Sub-pages still accessible via internal navigation / deep-links
const StaffDetailsPage     = lazy(() => import('./pages/StaffDetailsPage'));
const WaybillDetailsPage   = lazy(() => import('./pages/WaybillDetailsPage'));
const EditBookingPage      = lazy(() => import('./pages/EditBookingPage'));
const CompaniesPage        = lazy(() => import('./pages/CompaniesPage'));
const CompanyStatementPage = lazy(() => import('./pages/CompanyStatementPage'));

// Legacy routes kept alive
const DailyLogsPage        = lazy(() => import('./pages/DailyLogsPage'));
const DailyCollectionsPage = lazy(() => import('./pages/DailyCollectionsPage'));
const PendingPaymentsPage  = lazy(() => import('./pages/PendingPaymentsPage'));
const AssignTripsPage      = lazy(() => import('./pages/AssignTripsPage'));

const PageLoader = () => (
  <div className="flex justify-center items-center min-h-[60vh]">
    <div className="w-10 h-10 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin"></div>
  </div>
);

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
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ── Public ──────────────────────────────────────────────────── */}
            <Route path="/login"                element={<LoginPage />} />
            <Route path="/track/:waybill_number" element={<PublicTrackingPage />} />

            {/* ── Overview ────────────────────────────────────────────────── */}
            <Route path="/dashboard" element={<Shell><DashboardPage /></Shell>} />
            <Route path="/reports"   element={<Shell roles={['admin','accountant','viewer']}><ReportsPage /></Shell>} />
            <Route path="/reports/companies/:companyId" element={<Shell roles={['admin','accountant','viewer']}><CompanyStatementPage /></Shell>} />

            {/* ── Operations ──────────────────────────────────────────────── */}
            <Route path="/shipments" element={<Shell roles={['admin','staff']}><ShipmentsPage /></Shell>} />

            {/* Trips list + builder */}
            <Route path="/trips"              element={<Shell roles={['admin','staff']}><TripsPage /></Shell>} />
            <Route path="/trips/new"          element={<Shell roles={['admin','staff']}><TripBuilderPage /></Shell>} />
            <Route path="/trips/:id"          element={<Shell roles={['admin','staff']}><TripBuilderPage /></Shell>} />
            <Route path="/trips/builder"      element={<Navigate to="/trips/new" replace />} />
            <Route path="/trips/builder/:id"  element={<Shell roles={['admin','staff']}><TripBuilderPage /></Shell>} />

            {/* Fleet & Staff */}
            <Route path="/fleet-staff" element={<Shell><FleetStaffPage /></Shell>} />
            <Route path="/staff/:id"   element={<Shell><StaffDetailsPage /></Shell>} />

            {/* ── Finance ─────────────────────────────────────────────────── */}
            <Route path="/payments" element={<Shell><PaymentsLedgerPage /></Shell>} />
            <Route path="/payroll"  element={<Shell roles={['admin','accountant','viewer']}><SalariesPage /></Shell>} />
            <Route path="/salaries" element={<Navigate to="/payroll" replace />} />

            {/* ── Admin ───────────────────────────────────────────────────── */}
            <Route path="/users" element={<Shell roles={['admin']}><UserManagementPage /></Shell>} />

            {/* ── Internal / deep-link pages ──────────────────────────────── */}
            <Route path="/waybills/:id"        element={<Shell><WaybillDetailsPage /></Shell>} />
            <Route path="/bookings/edit/:id"   element={<Shell roles={['admin','staff']}><EditBookingPage /></Shell>} />
            <Route path="/companies"           element={<Shell roles={['admin','staff']}><CompaniesPage /></Shell>} />

            {/* ── Legacy routes ────────────────────────────────────────────── */}
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
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
