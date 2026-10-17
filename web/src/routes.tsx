import { Routes, Route, Navigate } from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { Links } from './pages/Links/Links';
import { Campaigns } from './pages/Campaigns/Campaigns';
import { CampaignDetail } from './pages/Campaigns/CampaignDetail';
import { Analytics } from './pages/Analytics/Analytics';
import { QrCodes } from './pages/QrCodes/QrCodes';
import { Import } from './pages/Import/Import';
import { AdminOverview } from './pages/admin/AdminOverview';
import { StatusPage } from './pages/Public/StatusPage';
import { UnlockPage } from './pages/Public/UnlockPage';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/status/:reason" element={<StatusPage />} />
      <Route path="/unlock/:alias" element={<UnlockPage />} />

      <Route element={<ProtectedRoute allowedRoles={['USER', 'ADMIN']} />}>
        <Route element={<Shell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/links" element={<Links />} />
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
  );
};
