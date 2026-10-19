import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: string[] }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-sand text-sm text-textMuted" role="status" aria-live="polite">Checking your session…</div>;

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <main className="flex min-h-screen items-center justify-center bg-sand px-6"><section className="max-w-md rounded-2xl bg-cream p-8 text-center shadow-sm"><h1 className="text-2xl font-extrabold">Access denied</h1><p className="mt-3 text-sm leading-6 text-textMuted">This area is reserved for LinkPulse super admins.</p></section></main>;
  }

  return <Outlet />;
};
