import React from 'react';
import { useAuth } from '../../context/AuthContext';

export const AdminOverview = () => {
  const { user } = useAuth();
  
  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-danger mb-4">Admin Overview</h1>
      <div className="bg-cream p-6 rounded-2xl shadow-sm border border-line">
        <p>Welcome to the admin area, {user?.name}. Only users with ADMIN role can see this.</p>
      </div>
    </div>
  );
};
