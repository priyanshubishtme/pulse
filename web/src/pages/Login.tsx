import { useState } from 'react';
import type { FormEvent } from 'react';
import { Activity, ArrowRight, BarChart3, Eye, EyeOff, Link2, LoaderCircle, QrCode, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Field, TextInput } from '../components/ui';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8 sm:py-6">
        <Link to="/login" className="text-[26px] font-extrabold tracking-[-0.07em]" aria-label="LinkPulse home">
          Link<span className="text-accent">Pulse</span>
        </Link>
        <p className="text-sm text-textMuted">New to LinkPulse? <Link to="/signup" className="ml-1 font-bold text-primary hover:underline">Create an account</Link></p>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-6xl items-center gap-6 px-5 pb-10 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.78fr)] lg:gap-12 lg:pb-16">
        <section className="relative isolate overflow-hidden rounded-[26px] bg-navy-900 px-6 py-8 text-cream sm:px-10 sm:py-11 lg:min-h-[540px] lg:px-12 lg:py-14">
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full border border-white/10" />
          <div className="relative z-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white"><Activity className="h-6 w-6" aria-hidden="true" /></div>
            <p className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-slate-300">Link operations, made clear</p>
            <h1 className="mt-3 max-w-xl text-[34px] font-extrabold leading-[1.08] tracking-[-0.045em] sm:text-5xl">Every link has a journey.</h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">Bring short links, campaigns, QR codes, and traffic insights into one calm workspace.</p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:mt-10">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><Link2 className="h-5 w-5 text-blue-300" aria-hidden="true" /><p className="mt-4 text-sm font-bold">Govern links</p><p className="mt-1 text-xs leading-5 text-slate-300">Set expiry and access rules.</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><BarChart3 className="h-5 w-5 text-blue-300" aria-hidden="true" /><p className="mt-4 text-sm font-bold">Read signals</p><p className="mt-1 text-xs leading-5 text-slate-300">Understand real traffic.</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><QrCode className="h-5 w-5 text-blue-300" aria-hidden="true" /><p className="mt-4 text-sm font-bold">Share anywhere</p><p className="mt-1 text-xs leading-5 text-slate-300">Make a QR code in app.</p></div>
            </div>
          </div>
        </section>

        <Card className="mx-auto w-full max-w-[480px] border border-line p-6 shadow-[0_18px_55px_rgba(9,40,68,0.07)] sm:p-9 lg:p-10">
          <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-paleBlue text-primary"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></div><span className="text-xs font-bold text-textMuted">SECURE WORKSPACE</span></div>
          <h2 className="mt-6 text-[30px] font-extrabold tracking-[-0.04em] sm:text-3xl">Welcome back</h2>
          <p className="mt-2 text-sm leading-6 text-textMuted">Sign in with the email and password you used to create your account.</p>

          {error && <div className="mt-6 rounded-xl border border-danger/20 bg-paleOrange p-4 text-sm leading-6 text-danger" role="alert">{error}</div>}

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <Field label="Email address" htmlFor="login-email">
              <TextInput id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required autoComplete="username" autoCapitalize="none" spellCheck={false} />
            </Field>
            <Field label="Password" htmlFor="login-password">
              <div className="relative"><TextInput id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required autoComplete="current-password" className="pr-12" /><button type="button" onClick={() => setShowPassword(show => !show)} className="absolute inset-y-0 right-1 flex min-h-11 min-w-11 items-center justify-center rounded-lg text-textMuted hover:bg-sand hover:text-ink" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}</button></div>
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
