import React from 'react';
import { useAuth } from '../context/AuthContext';

export const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-3xl font-display font-bold mb-4">Welcome back, {user?.name}</h1>
      <div className="bg-cream p-6 rounded-2xl shadow-sm border border-line">
        <p>This is the placeholder dashboard.</p>
        <p className="mt-4 text-sm text-textMuted">Role: {user?.role} | Timezone: {user?.timezone}</p>
      </div>
    </div>
  );
};
