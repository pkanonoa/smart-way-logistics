import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasRole } from '../utils/rbac';

/**
 * Route guard: enforces authentication AND optional role-based access.
 *
 * Usage:
 *   // Any authenticated user
 *   <ProtectedRoute><DashboardPage /></ProtectedRoute>
 *
 *   // Only admin
 *   <ProtectedRoute roles={['admin']}><UserManagementPage /></ProtectedRoute>
 *
 *   // Admin or Staff
 *   <ProtectedRoute roles={['admin','staff']}><ShipmentsPage /></ProtectedRoute>
 *
 * Props:
 *   children    — content to render when access is granted
 *   roles       — optional string[]; if omitted, any authenticated user may pass
 *   redirectTo  — where to send unauthorized (but authenticated) users; default '/dashboard'
 */
export default function ProtectedRoute({ children, roles, redirectTo = '/dashboard' }) {
  const { user, isAuthenticated, loading } = useAuth();

  // While restoring session from localStorage, show a spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in → login page
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Logged in but wrong role → redirect to dashboard (or custom target)
  if (roles && !hasRole(user, ...roles)) return <Navigate to={redirectTo} replace />;

  return children;
}
