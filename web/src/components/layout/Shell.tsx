import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const Shell = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-sand text-textPrimary font-body">
      <div className="w-64 bg-navy-900 text-cream flex flex-col p-4">
        <div className="text-2xl font-display font-bold mb-8 text-primary font-bold">LinkPulse</div>
        <nav className="flex-1 space-y-2">
          <Link to="/dashboard" className="block px-4 py-2 rounded hover:bg-navy-800">Dashboard</Link>
          <Link to="/links" className="block px-4 py-2 rounded hover:bg-navy-800">Links</Link>
          {user?.role === 'ADMIN' && (
            <Link to="/admin" className="block px-4 py-2 rounded hover:bg-navy-800 text-accent">Admin</Link>
          )}
        </nav>
        <button onClick={handleLogout} className="px-4 py-2 text-left hover:bg-navy-800 rounded">
          Logout
        </button>
      </div>
      
      <div className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
};
