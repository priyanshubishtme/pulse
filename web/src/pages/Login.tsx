import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand">
      <div className="bg-cream p-8 rounded-[24px] shadow-sm max-w-md w-full border border-line">
        <h1 className="text-3xl font-display font-bold text-navy-900 mb-6">Log in</h1>
        {error && <div className="text-danger mb-4 p-3 bg-red-50 rounded-lg">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-4 py-2 border border-line rounded-[10px] focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full px-4 py-2 border border-line rounded-[10px] focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <button type="submit" className="w-full bg-primary text-cream py-3 rounded-[10px] font-medium mt-4">
            Log In
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-textMuted">
          Don't have an account? <Link to="/signup" className="text-primary hover:underline">Sign up</Link>
        </div>
      </div>
    </div>
  );
};
