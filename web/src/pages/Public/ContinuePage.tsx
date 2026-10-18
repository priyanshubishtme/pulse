import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Check, ExternalLink, Link2, ShieldCheck } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const COUNTDOWN_SECONDS = 3;

export const ContinuePage = () => {
  const { alias = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [destination, setDestination] = useState('');
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);
  const [loading, setLoading] = useState(true);

  const destinationHost = useMemo(() => {
    try { return new URL(destination).hostname; } catch { return ''; }
  }, [destination]);

  useEffect(() => {
    let active = true;
    const sessionKey = `linkpulse:continue:${alias}`;
    let unlockedDestination = (location.state as { destinationUrl?: string } | null)?.destinationUrl || '';
    try { unlockedDestination ||= sessionStorage.getItem(sessionKey) || ''; } catch {}

    const resolveDestination = async () => {
      try {
        const url = unlockedDestination || (await axios.get(`/api/public/resolve/${encodeURIComponent(alias)}`)).data.destinationUrl;
        if (!/^https?:\/\//i.test(url)) throw new Error('Unsupported destination');
        if (active) {
          setDestination(url);
          setLoading(false);
          try { sessionStorage.setItem(sessionKey, url); } catch {}
        }
      } catch (error) {
        if (!active) return;
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        const code = axios.isAxiosError(error) ? error.response?.data?.error?.code : undefined;
        if (status === 423 || code === 'PASSWORD_REQUIRED') navigate(`/unlock/${encodeURIComponent(alias)}`, { replace: true });
        else if (status === 404 || code === 'NOT_FOUND') navigate('/status/not-found', { replace: true });
        else if (code === 'EXPIRED') navigate('/status/expired', { replace: true });
        else if (code === 'DISABLED') navigate('/status/disabled', { replace: true });
        else if (code === 'LIMIT_REACHED') navigate('/status/limit-reached', { replace: true });
        else navigate('/status/unavailable', { replace: true });
      }
    };

    void resolveDestination();
    return () => { active = false; };
  }, [alias, location.state, navigate]);

  useEffect(() => {
    if (!destination) return;
    if (seconds <= 0) {
      window.location.assign(destination);
      return;
    }
    const timer = window.setTimeout(() => setSeconds(value => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [destination, seconds]);

  const isQr = searchParams.get('source') === 'qr';

  return (
    <div className="min-h-screen bg-[#F4F1EC] px-5 py-8 text-[#092844] sm:px-10">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <Link to="/login" className="text-2xl font-extrabold tracking-[-0.06em]">Link<span className="text-[#FF6B12]">Pulse</span></Link>
        <div className="flex items-center gap-2 rounded-full border border-[#092844]/10 bg-white/70 px-3 py-2 text-xs font-semibold text-[#52677D]">
          <ShieldCheck className="h-4 w-4 text-[#1762E8]" /> LinkPulse safe redirect
        </div>
      </header>

      <main className="mx-auto flex min-h-[78vh] max-w-6xl items-center justify-center py-10">
        <section className="grid w-full max-w-5xl overflow-hidden rounded-[30px] bg-white shadow-[0_24px_80px_rgba(9,40,68,0.10)] md:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8EFFE] text-[#1762E8]"><Link2 className="h-7 w-7" /></div>
            <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-[#65798D]">{isQr ? 'QR destination' : 'You’re on your way'}</p>
            <h1 className="mt-3 max-w-xl text-3xl font-extrabold leading-tight tracking-[-0.045em] sm:text-4xl">Your link is ready.</h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-[#52677D]">We’re taking you to the destination. You can continue now or let the short countdown finish.</p>

            <div className="mt-8 rounded-2xl border border-[#D9E1EA] bg-[#FAF9F6] p-4 sm:p-5">
              <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#718196]">Destination</p>
              {loading ? <div className="mt-3 h-5 w-52 animate-pulse rounded bg-[#E6EAF0]" /> : (
                <div className="mt-2 flex items-center gap-2 break-all text-sm font-semibold text-[#092844]">
                  <ExternalLink className="h-4 w-4 shrink-0 text-[#1762E8]" /> {destinationHost}
                </div>
              )}
            </div>

            {destination && <a href={destination} className="mt-7 inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-[#1762E8] px-6 text-base font-bold text-white shadow-[0_8px_20px_rgba(23,98,232,0.20)] transition hover:-translate-y-0.5 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1762E8] focus-visible:ring-offset-2">
              Continue to destination <ArrowUpRight className="h-5 w-5" />
            </a>}
            <p className="mt-4 text-sm text-[#718196]" aria-live="polite">
              {loading ? 'Checking your link…' : `Automatic redirect in ${seconds} second${seconds === 1 ? '' : 's'}`}
            </p>
          </div>

          <div className="relative flex min-h-[320px] flex-col items-center justify-center overflow-hidden bg-[#082744] px-8 py-12 text-white sm:px-12">
            <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border border-white/10" />
            <div className="absolute -right-5 -top-9 h-44 w-44 rounded-full border border-white/10" />
            <div className="absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-[#1762E8]/20 blur-2xl" />
            <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-white/15 bg-white/[0.04]">
              <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white text-[#092844] shadow-xl">
                {loading ? <span className="text-sm font-semibold">Ready</span> : seconds > 0 ? <><span className="text-5xl font-extrabold tabular-nums">{seconds}</span><span className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em]">seconds</span></> : <Check className="h-10 w-10 text-[#1762E8]" />}
              </div>
            </div>
            <p className="relative mt-8 text-center text-lg font-bold">A clear path to every link.</p>
            <p className="relative mt-2 max-w-xs text-center text-sm leading-6 text-white/65">LinkPulse keeps the destination visible and puts you in control.</p>
          </div>
        </section>
      </main>
      <footer className="mx-auto max-w-6xl text-center text-xs text-[#718196]">LinkPulse link {alias ? `/${alias}` : ''} · {isQr ? 'QR scan' : 'Link visit'}</footer>
    </div>
  );
};
