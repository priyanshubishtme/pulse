import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { StatusPage } from './pages/Public/StatusPage';
import { UnlockPage } from './pages/Public/UnlockPage';
import { ContinuePage } from './pages/Public/ContinuePage';

// Keep the initial bundle focused on authentication, the shell, and public
// status pages. Workspace screens load only when the visitor navigates to them.
const Dashboard = lazy(() => import('./pages/Dashboard').then(({ Dashboard }) => ({ default: Dashboard })));
const Links = lazy(() => import('./pages/Links/Links').then(({ Links }) => ({ default: Links })));
const CreateLinkWizard = lazy(() => import('./pages/Links/CreateLinkWizard').then(({ CreateLinkWizard }) => ({ default: CreateLinkWizard })));
const Campaigns = lazy(() => import('./pages/Campaigns/Campaigns').then(({ Campaigns }) => ({ default: Campaigns })));
const CampaignDetail = lazy(() => import('./pages/Campaigns/CampaignDetail').then(({ CampaignDetail }) => ({ default: CampaignDetail })));
const Analytics = lazy(() => import('./pages/Analytics/Analytics').then(({ Analytics }) => ({ default: Analytics })));
const QrCodes = lazy(() => import('./pages/QrCodes/QrCodes').then(({ QrCodes }) => ({ default: QrCodes })));
const Import = lazy(() => import('./pages/Import/Import').then(({ Import }) => ({ default: Import })));
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview').then(({ AdminOverview }) => ({ default: AdminOverview })));

const PageLoading = () => (
  <div className="flex min-h-[40vh] items-center justify-center text-sm text-textMuted" role="status" aria-live="polite">
    Loading workspace…
  </div>
);

export const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/status/:reason" element={<StatusPage />} />
        <Route path="/unlock/:alias" element={<UnlockPage />} />
        <Route path="/continue/:alias" element={<ContinuePage />} />

        <Route element={<ProtectedRoute allowedRoles={['USER', 'ADMIN']} />}>
          <Route element={<Shell />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/links" element={<Links />} />
            <Route path="/create-link" element={<CreateLinkWizard standalone />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/campaigns/:id" element={<CampaignDetail />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/qr-codes" element={<QrCodes />} />
            <Route path="/import" element={<Import />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route element={<Shell />}>
            <Route path="/admin" element={<AdminOverview />} />
          </Route>
        </Route>

      </Routes>
    </Suspense>
  );
};
