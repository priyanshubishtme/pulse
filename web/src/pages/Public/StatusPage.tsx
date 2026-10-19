import { ArrowLeft, CircleAlert, RefreshCw } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Button, Card } from '../../components/ui';

const messages: Record<string, { title: string; detail: string; tone: string }> = {
  'not-found': { title: 'This short link does not exist.', detail: 'The address may be incorrect or the link may have been removed.', tone: 'Check the spelling of the short link and try again.' },
  disabled: { title: 'This short link is disabled.', detail: 'The link owner has paused this destination.', tone: 'The owner can re-enable it from their LinkPulse workspace.' },
  expired: { title: 'This short link has expired.', detail: 'The link owner set an expiry date that has passed.', tone: 'Ask the link owner for an updated destination.' },
  'limit-reached': { title: 'This short link has reached its click limit.', detail: 'The destination is no longer accepting new visits.', tone: 'Ask the link owner for a fresh link.' },
  unavailable: { title: 'This destination is temporarily unavailable.', detail: 'LinkPulse could not verify the destination right now.', tone: 'Please try again in a moment.' },
};

export const StatusPage = () => {
  const { reason = 'unavailable' } = useParams();
  const location = useLocation();
  const copy = messages[reason] || messages.unavailable;

  return (
    <div className="min-h-screen bg-navy-900 px-5 py-8 text-cream sm:px-10">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link to="/login" className="text-2xl font-extrabold tracking-[-0.06em]">Link<span className="text-accent">Pulse</span></Link>
        <Link to="/login" className="app-button min-h-10 rounded-[10px] bg-primary px-4 text-xs text-cream hover:bg-blue-700">Open workspace</Link>
      </header>
      <main className="mx-auto flex min-h-[75vh] max-w-2xl items-center justify-center py-10">
        <Card className="w-full p-8 text-center sm:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-paleOrange text-danger"><CircleAlert className="h-7 w-7" /></div>
          <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-textMuted">LinkPulse status</p>
          <h1 className="mt-4 text-3xl font-extrabold">{copy.title}</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-textMuted">{copy.detail}</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-textMuted">{copy.tone}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {location.key !== 'default' && <Button variant="outline" onClick={() => window.history.back()}><ArrowLeft className="h-4 w-4" />Go back</Button>}
            <Link to="/login" className="app-button border border-slate-500/80 bg-cream text-ink hover:bg-sand"><ArrowLeft className="h-4 w-4" />Go to LinkPulse</Link>
            {reason === 'unavailable' && <Button onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4" />Try again</Button>}
          </div>
        </Card>
      </main>
    </div>
  );
};
