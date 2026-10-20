import { Link } from 'react-router-dom';
import { ArrowLeft, SearchX } from 'lucide-react';
import { Card } from '../components/ui';

export const NotFound = () => (
  <main className="flex min-h-screen items-center justify-center bg-app px-4 py-10 text-ink">
    <Card className="w-full max-w-xl border border-line p-7 sm:p-10">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-paleBlue text-primary"><SearchX aria-hidden="true" /></div>
      <p className="mt-7 text-xs font-bold uppercase tracking-[0.14em] text-textMuted">404 · Page not found</p>
      <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">This link goes nowhere.</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-textMuted">The address may be out of date or typed incorrectly. Head back to LinkPulse and choose a page from the workspace.</p>
      <Link to="/" className="app-button mt-7 inline-flex bg-primary text-cream hover:bg-blue-700"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to LinkPulse</Link>
    </Card>
  </main>
);
