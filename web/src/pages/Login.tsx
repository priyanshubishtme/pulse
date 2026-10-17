import React, { useState } from 'react';
import { ArrowRight, Link2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Field, TextInput } from '../components/ui';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const handleSubmit = async (event: React.FormEvent) => { event.preventDefault(); setError(''); try { await login({ email, password }); navigate('/dashboard'); } catch (err: any) { setError(err.response?.data?.error?.message || 'Login failed'); } };

  return <div className="min-h-screen bg-navy-900 px-5 py-8 text-cream sm:px-10"><header className="flex items-center justify-between"><Link to="/login" className="text-2xl font-extrabold tracking-[-0.06em]">Link<span className="text-accent">Pulse</span></Link><Link to="/signup" className="text-sm font-bold text-slate-300 hover:text-cream">Create account</Link></header><main className="mx-auto grid max-w-5xl items-center gap-12 py-16 lg:grid-cols-[1fr_420px] lg:py-24"><div><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary"><Link2 className="h-6 w-6" /></div><p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Link operations, made clear</p><h1 className="mt-5 max-w-xl text-4xl font-extrabold leading-tight sm:text-5xl">One destination. Every channel.</h1><p className="mt-6 max-w-lg text-base leading-7 text-slate-300">Sign in to create governed links, understand your audience, and keep every click moving with purpose.</p></div><Card className="p-7 text-ink sm:p-9"><h2 className="text-2xl font-extrabold">Welcome back.</h2><p className="mt-2 text-sm text-textMuted">Sign in to your LinkPulse workspace.</p>{error && <div className="mt-6 rounded-xl bg-paleOrange p-4 text-sm text-danger" role="alert">{error}</div>}<form onSubmit={handleSubmit} className="mt-7 space-y-5"><Field label="Email"><TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></Field><Field label="Password"><TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /></Field><Button type="submit" className="w-full">Log in <ArrowRight className="h-4 w-4" /></Button></form><p className="mt-7 text-center text-sm text-textMuted">Don’t have an account? <Link to="/signup" className="font-bold text-primary hover:underline">Sign up</Link></p></Card></main></div>;
};
