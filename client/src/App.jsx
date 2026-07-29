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
import { useAuth } from './context/AuthContext';

function ShellRoute({ children }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}

function AdminShellRoute({ children }) {
  const { user } = useAuth();
  if (user && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return <ShellRoute>{children}</ShellRoute>;
}

function WriteShellRoute({ children }) {
  const { user } = useAuth();
  if (user && user.role === 'viewer') {
    return <Navigate to="/dashboard" replace />;
  }
  return <ShellRoute>{children}</ShellRoute>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/track/:waybill_number" element={<PublicTrackingPage />} />

          {/* Protected — inside AppShell */}
          <Route path="/dashboard"    element={<ShellRoute><DashboardPage /></ShellRoute>} />
          <Route path="/staff"        element={<ShellRoute><StaffPage /></ShellRoute>} />
          <Route path="/staff/:id"    element={<ShellRoute><StaffDetailsPage /></ShellRoute>} />
          <Route path="/vehicles"     element={<ShellRoute><VehiclesPage /></ShellRoute>} />
          <Route path="/salaries"     element={<ShellRoute><SalariesPage /></ShellRoute>} />
          <Route path="/bookings/new" element={<WriteShellRoute><NewBookingPage /></WriteShellRoute>} />
          <Route path="/bookings/edit/:id" element={<WriteShellRoute><EditBookingPage /></WriteShellRoute>} />
          <Route path="/daily-logs"   element={<ShellRoute><DailyLogsPage /></ShellRoute>} />
          <Route path="/daily-collections" element={<ShellRoute><DailyCollectionsPage /></ShellRoute>} />
          <Route path="/assign-trips" element={<WriteShellRoute><AssignTripsPage /></WriteShellRoute>} />
          <Route path="/reports"      element={<ShellRoute><ReportsPage /></ShellRoute>} />

          {/* Waybills */}
          <Route path="/waybills"     element={<ShellRoute><WaybillsPage /></ShellRoute>} />
          <Route path="/waybills/:id" element={<ShellRoute><WaybillDetailsPage /></ShellRoute>} />
          <Route path="/payments"     element={<ShellRoute><PendingPaymentsPage /></ShellRoute>} />
          <Route path="/users"        element={<AdminShellRoute><UserManagementPage /></AdminShellRoute>} />

          {/* Default redirects */}
          <Route path="/"  element={<Navigate to="/dashboard" replace />} />
          <Route path="*"  element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
