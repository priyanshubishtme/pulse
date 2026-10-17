import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { clsx } from 'clsx';

export const Shell = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinkClass = (path: string) => clsx(
    "block px-4 py-2 rounded font-medium",
    location.pathname.startsWith(path) ? "bg-primary text-cream" : "hover:bg-navy-800 text-cream"
  );

  return (
    <div className="flex min-h-screen bg-sand text-textPrimary font-body">
      <div className="w-64 bg-navy-900 text-cream flex flex-col p-4">
        <div className="text-2xl font-display font-bold mb-8 text-primary">LinkPulse</div>
        <nav className="flex-1 space-y-2">
          <Link to="/dashboard" className={navLinkClass('/dashboard')}>Dashboard</Link>
          <Link to="/links" className={navLinkClass('/links')}>Links</Link>
          <Link to="/campaigns" className={navLinkClass('/campaigns')}>Campaigns</Link>
          <Link to="/analytics" className={navLinkClass('/analytics')}>Analytics</Link>
          <Link to="/qr-codes" className={navLinkClass('/qr-codes')}>QR Codes</Link>
          <Link to="/import" className={navLinkClass('/import')}>Import CSV</Link>
          {user?.role === 'ADMIN' && (
            <Link to="/admin" className={clsx(navLinkClass('/admin'), "mt-8 text-accent border border-accent/30")}>Admin</Link>
          )}
        </nav>
        <button onClick={handleLogout} className="px-4 py-2 text-left hover:bg-navy-800 rounded mt-auto">
          Logout
        </button>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
};
