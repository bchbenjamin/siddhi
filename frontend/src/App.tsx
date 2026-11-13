import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@fontsource-variable/inter';
import './styles/index.css';

import { AuthProvider, useAuth } from './app/AuthContext';
import { ProtectedRoute } from './app/ProtectedRoute';

// Auth pages
import LoginPage from './features/auth/LoginPage';
import ForgotPasswordPage from './features/auth/ForgotPasswordPage';
import ResetPasswordPage from './features/auth/ResetPasswordPage';

// Guardian
import GuardianDashboard from './features/guardian/GuardianDashboard';
import GuardianProfilePage from './features/guardian/GuardianProfilePage';

// Staff / students
import StaffDashboard from './features/students/StaffDashboard';
import StudentsListPage from './features/students/StudentsListPage';
import StudentProfilePage from './features/students/StudentProfilePage';

// IEP sections
import PLOPPage from './features/plop/PLOPPage';
import IEPPage from './features/iep/IEPPage';
import ProgressPage from './features/progress/ProgressPage';
import TherapyPage from './features/therapy/TherapyPage';
import AccommodationsPage from './features/accommodations/AccommodationsPage';
import CommunicationsPage from './features/communications/CommunicationsPage';
import AssessmentsPage from './features/assessments/AssessmentsPage';
import AttendancePage from './features/attendance/AttendancePage';
import ReviewsPage from './features/reviews/ReviewsPage';

// Reports
import ReportsPage from './features/reports/ReportsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.landing_route} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Root redirect */}
            <Route path="/" element={<RootRedirect />} />

            {/* Guardian routes */}
            <Route
              path="/guardian"
              element={
                <ProtectedRoute allowedRoles={['guardian']}>
                  <GuardianDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/guardian/profile"
              element={
                <ProtectedRoute allowedRoles={['guardian']}>
                  <GuardianProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Staff dashboard */}
            <Route
              path="/staff"
              element={
                <ProtectedRoute allowedRoles={['special_educator', 'therapist', 'psychologist', 'school_head', 'school_admin']}>
                  <StaffDashboard />
                </ProtectedRoute>
              }
            />

            {/* Students */}
            <Route
              path="/students"
              element={
                <ProtectedRoute allowedRoles={['special_educator', 'therapist', 'psychologist', 'school_head', 'school_admin']}>
                  <StudentsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students/:studentId"
              element={
                <ProtectedRoute>
                  <StudentProfilePage />
                </ProtectedRoute>
              }
            />

            {/* IEP sub-routes */}
            <Route
              path="/students/:studentId/plop"
              element={<ProtectedRoute><PLOPPage /></ProtectedRoute>}
            />
            <Route
              path="/students/:studentId/iep"
              element={<ProtectedRoute><IEPPage /></ProtectedRoute>}
            />
            <Route
              path="/students/:studentId/progress"
              element={<ProtectedRoute><ProgressPage /></ProtectedRoute>}
            />
            <Route
              path="/students/:studentId/therapy"
              element={<ProtectedRoute><TherapyPage /></ProtectedRoute>}
            />
            <Route
              path="/students/:studentId/accommodations"
              element={<ProtectedRoute><AccommodationsPage /></ProtectedRoute>}
            />
            <Route
              path="/students/:studentId/communications"
              element={<ProtectedRoute><CommunicationsPage /></ProtectedRoute>}
            />
            <Route
              path="/students/:studentId/assessments"
              element={<ProtectedRoute><AssessmentsPage /></ProtectedRoute>}
            />
            <Route
              path="/students/:studentId/attendance"
              element={<ProtectedRoute><AttendancePage /></ProtectedRoute>}
            />
            <Route
              path="/students/:studentId/reviews"
              element={<ProtectedRoute><ReviewsPage /></ProtectedRoute>}
            />

            {/* Reports */}
            <Route
              path="/reports"
              element={<ProtectedRoute><ReportsPage /></ProtectedRoute>}
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
