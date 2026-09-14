import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StaffPage from './pages/StaffPage';
import VehiclesPage from './pages/VehiclesPage';
import NewBookingPage from './pages/NewBookingPage';
import EditBookingPage from './pages/EditBookingPage';
import SalariesPage from './pages/SalariesPage';
import StaffDetailsPage from './pages/StaffDetailsPage';
import DailyLogsPage from './pages/DailyLogsPage';
import WaybillsPage from './pages/WaybillsPage';
import WaybillDetailsPage from './pages/WaybillDetailsPage';
import PublicTrackingPage from './pages/PublicTrackingPage';
import DailyCollectionsPage from './pages/DailyCollectionsPage';
import PendingPaymentsPage from './pages/PendingPaymentsPage';
import ReportsPage from './pages/ReportsPage';
import UserManagementPage from './pages/UserManagementPage';
import AssignTripsPage from './pages/AssignTripsPage';
import ShipmentsPage from './pages/ShipmentsPage';
import TripsPage from './pages/TripsPage';
import TripBuilderPage from './pages/TripBuilderPage';
import FleetStaffPage from './pages/FleetStaffPage';
import PaymentsLedgerPage from './pages/PaymentsLedgerPage';
import CompaniesPage from './pages/CompaniesPage';
import CompanyStatementPage from './pages/CompanyStatementPage';
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/track/:waybill_number" element={<PublicTrackingPage />} />

          {/* Protected routes wrapped in AppShell */}
          <Route path="/dashboard" element={<ProtectedRoute><AppShell><DashboardPage /></AppShell></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute roles={['admin', 'accountant', 'viewer']}><AppShell><ReportsPage /></AppShell></ProtectedRoute>} />

          {/* Operations */}
          <Route path="/shipments" element={<ProtectedRoute roles={['admin', 'staff']}><AppShell><ShipmentsPage /></AppShell></ProtectedRoute>} />
          <Route path="/trips" element={<ProtectedRoute roles={['admin', 'staff']}><AppShell><TripsPage /></AppShell></ProtectedRoute>} />
          <Route path="/trips/builder" element={<ProtectedRoute roles={['admin', 'staff']}><AppShell><TripBuilderPage /></AppShell></ProtectedRoute>} />
          <Route path="/trips/builder/:id" element={<ProtectedRoute roles={['admin', 'staff']}><AppShell><TripBuilderPage /></AppShell></ProtectedRoute>} />
          <Route path="/fleet-staff" element={<ProtectedRoute><AppShell><FleetStaffPage /></AppShell></ProtectedRoute>} />

          {/* Finance */}
          <Route path="/payments" element={<ProtectedRoute><AppShell><PaymentsLedgerPage /></AppShell></ProtectedRoute>} />
          <Route path="/daily-collections" element={<ProtectedRoute><AppShell><DailyCollectionsPage /></AppShell></ProtectedRoute>} />
          <Route path="/pending-payments" element={<ProtectedRoute><AppShell><PendingPaymentsPage /></AppShell></ProtectedRoute>} />
          <Route path="/salaries" element={<ProtectedRoute roles={['admin', 'accountant']}><AppShell><SalariesPage /></AppShell></ProtectedRoute>} />

          {/* Standalone operations & admin */}
          <Route path="/staff" element={<ProtectedRoute><AppShell><StaffPage /></AppShell></ProtectedRoute>} />
          <Route path="/staff/:id" element={<ProtectedRoute><AppShell><StaffDetailsPage /></AppShell></ProtectedRoute>} />
          <Route path="/vehicles" element={<ProtectedRoute><AppShell><VehiclesPage /></AppShell></ProtectedRoute>} />
          <Route path="/bookings/new" element={<ProtectedRoute roles={['admin', 'staff']}><AppShell><NewBookingPage /></AppShell></ProtectedRoute>} />
          <Route path="/bookings/edit/:id" element={<ProtectedRoute roles={['admin', 'staff']}><AppShell><EditBookingPage /></AppShell></ProtectedRoute>} />
          <Route path="/daily-logs" element={<ProtectedRoute><AppShell><DailyLogsPage /></AppShell></ProtectedRoute>} />
          <Route path="/assign-trips" element={<ProtectedRoute roles={['admin', 'staff']}><AppShell><AssignTripsPage /></AppShell></ProtectedRoute>} />
          <Route path="/waybills" element={<ProtectedRoute><AppShell><WaybillsPage /></AppShell></ProtectedRoute>} />
          <Route path="/waybills/:id" element={<ProtectedRoute><AppShell><WaybillDetailsPage /></AppShell></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute roles={['admin']}><AppShell><UserManagementPage /></AppShell></ProtectedRoute>} />
          <Route path="/companies" element={<ProtectedRoute roles={['admin', 'staff']}><AppShell><CompaniesPage /></AppShell></ProtectedRoute>} />
          <Route path="/reports/companies/:companyId" element={<ProtectedRoute roles={['admin', 'accountant', 'viewer']}><AppShell><CompanyStatementPage /></AppShell></ProtectedRoute>} />
          {/* Fallbacks */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
