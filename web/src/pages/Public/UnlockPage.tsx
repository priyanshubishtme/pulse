import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

export const UnlockPage = () => {
  const { alias } = useParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(`/api/public/unlock/${alias}`, { password });
      window.location.href = res.data.destinationUrl; // Follow redirect directly
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Incorrect password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand text-center p-4">
      <div className="bg-cream p-8 rounded-[24px] shadow-sm max-w-md w-full border border-line">
        <h1 className="text-2xl font-display font-bold text-navy-900 mb-6">Password Required</h1>
        <p className="text-textMuted mb-6">Enter the correct password to continue.</p>

        {error && <div className="text-danger mb-4 p-3 bg-red-50 rounded-lg">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full px-4 py-2 border border-line rounded-[10px] focus:ring-primary outline-none"
          />
          <button type="submit" className="w-full bg-primary text-cream py-3 rounded-[10px] font-medium">
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
};
