import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { Role } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper-white">
        <div className="text-slate-gray text-sm">Loading…</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.active_role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper-white">
        <div className="text-center">
          <p className="text-xl font-medium text-ink-black mb-2">Access Denied</p>
          <p className="text-slate-gray text-sm">Your role does not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
