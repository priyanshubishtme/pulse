import { useState } from 'react';
import type { FormEvent } from 'react';
import { Activity, ArrowRight, BarChart3, Link2, LoaderCircle, QrCode, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Field, TextInput } from '../components/ui';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login({ email: email.trim().toLowerCase(), password });
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const requestError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(requestError.response?.data?.error?.message || 'Could not reach LinkPulse. Check that the app and API are running, then try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-app text-ink">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <Link to="/login" className="text-[26px] font-extrabold tracking-[-0.07em]" aria-label="LinkPulse home">
          Link<span className="text-accent">Pulse</span>
        </Link>
        <p className="text-sm text-textMuted">New to LinkPulse? <Link to="/signup" className="ml-1 font-bold text-primary hover:underline">Create an account</Link></p>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-92px)] w-full max-w-6xl items-center gap-8 px-5 pb-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(390px,0.82fr)] lg:gap-16 lg:pb-20">
        <section className="relative overflow-hidden rounded-[28px] bg-navy-900 px-7 py-9 text-cream sm:px-10 sm:py-12 lg:min-h-[520px] lg:px-12 lg:py-14">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-4 -top-4 h-40 w-40 rounded-full border border-white/10" />
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white"><Activity className="h-6 w-6" aria-hidden="true" /></div>
            <p className="mt-9 text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Link operations, made clear</p>
            <h1 className="mt-4 max-w-xl text-4xl font-extrabold leading-[1.08] tracking-[-0.045em] sm:text-5xl">Every link has a journey.</h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">Bring your short links, campaigns, QR codes, and traffic insights into one calm workspace.</p>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><Link2 className="h-5 w-5 text-blue-300" aria-hidden="true" /><p className="mt-4 text-sm font-bold">Govern links</p><p className="mt-1 text-xs leading-5 text-slate-300">Set expiry and access rules.</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><BarChart3 className="h-5 w-5 text-blue-300" aria-hidden="true" /><p className="mt-4 text-sm font-bold">Read signals</p><p className="mt-1 text-xs leading-5 text-slate-300">Understand real traffic.</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><QrCode className="h-5 w-5 text-blue-300" aria-hidden="true" /><p className="mt-4 text-sm font-bold">Share anywhere</p><p className="mt-1 text-xs leading-5 text-slate-300">Make a QR code in app.</p></div>
            </div>
          </div>
        </section>

        <Card className="mx-auto w-full max-w-[480px] p-7 sm:p-10">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-paleBlue text-primary"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-[-0.04em]">Welcome back</h2>
          <p className="mt-2 text-sm leading-6 text-textMuted">Sign in with the email and password you used to create your account.</p>

          {error && <div className="mt-6 rounded-xl border border-danger/20 bg-paleOrange p-4 text-sm leading-6 text-danger" role="alert">{error}</div>}

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <Field label="Email address">
              <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required autoComplete="username" autoCapitalize="none" spellCheck={false} />
            </Field>
            <Field label="Password">
              <TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required autoComplete="current-password" />
            </Field>
            <Button type="submit" className="mt-2 w-full justify-center" disabled={isSubmitting}>
              {isSubmitting ? <><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Signing in…</> : <>Sign in <ArrowRight className="h-4 w-4" aria-hidden="true" /></>}
            </Button>
          </form>

          <p className="mt-7 text-center text-sm text-textMuted">Don’t have an account? <Link to="/signup" className="font-bold text-primary hover:underline">Create one</Link></p>
        </Card>
      </main>
    </div>
  );
};
