import React, { useState } from 'react';
import { ArrowRight, LockKeyhole, LoaderCircle } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { apiClient } from '../../api/client';
import { Button, Card, Field, TextInput } from '../../components/ui';

export const UnlockPage = () => {
  const { alias = '' } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await apiClient.post(`/public/unlock/${encodeURIComponent(alias)}`, { password });
      const destinationUrl = response.data.destinationUrl;
      const continueToken = response.data.continueToken;
      const query = continueToken ? `?token=${encodeURIComponent(continueToken)}` : '';
      navigate(`/continue/${encodeURIComponent(alias)}${query}`, { replace: true, state: { destinationUrl } });
    } catch (requestError) {
      const status = axios.isAxiosError(requestError) ? requestError.response?.status : undefined;
      const code = axios.isAxiosError(requestError) ? requestError.response?.data?.error?.code : undefined;
      if (code === 'EXPIRED' || code === 'DISABLED' || code === 'LIMIT_REACHED') {
        navigate(`/status/${code.toLowerCase().replace('_', '-')}`, { replace: true });
      } else if (status === 404 || code === 'NOT_FOUND') {
        navigate('/status/not-found', { replace: true });
      } else if (code === 'RATE_LIMIT_EXCEEDED') {
        setError('Too many attempts. Please wait a minute and try again.');
      } else {
        setError(axios.isAxiosError(requestError) ? requestError.response?.data?.error?.message || 'Incorrect password' : 'We could not unlock this destination.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-900 px-5 py-8 text-cream sm:px-10">
      <header><Link to="/login" className="text-2xl font-extrabold tracking-[-0.06em]">Link<span className="text-accent">Pulse</span></Link></header>
      <main className="mx-auto flex min-h-[75vh] max-w-md items-center justify-center">
        <Card className="w-full p-8 text-ink sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-paleBlue text-primary"><LockKeyhole className="h-6 w-6" /></div>
          <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-textMuted">Protected destination</p>
          <h1 className="mt-3 text-2xl font-extrabold">Password required</h1>
          <p className="mt-3 text-sm leading-6 text-textMuted">Enter the password for <strong className="text-ink">/{alias}</strong> to review its destination before continuing.</p>
          {error && <div id="unlock-error" className="mt-6 rounded-xl bg-paleOrange p-4 text-sm text-danger" role="alert">{error}</div>}
          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <Field label="Password"><TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" required autoComplete="current-password" aria-describedby={error ? 'unlock-error' : undefined} /></Field>
            <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? <><LoaderCircle className="h-4 w-4 animate-spin" />Checking…</> : <>Unlock destination <ArrowRight className="h-4 w-4" /></>}</Button>
          </form>
          <p className="mt-5 text-xs leading-5 text-textMuted">Your password is sent securely to LinkPulse and is never displayed on the redirect page.</p>
        </Card>
      </main>
    </div>
  );
};
