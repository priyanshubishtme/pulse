import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, LoaderCircle, Sparkles } from 'lucide-react';
import { apiClient } from '../api/client';
import { TrafficChart } from '../components/charts/TrafficChart';
import { Button, Card, PageHeader, Select, StatCard } from '../components/ui';
import { useNavigate } from 'react-router-dom';

type AlertItem = string;

const formatNumber = (value?: number) => (value ?? 0).toLocaleString('en-IN');

export const Dashboard = () => {
  const navigate = useNavigate();
  const [range, setRange] = useState('30');

  const { data: kpis, isLoading: isKpisLoading, isError: isKpisError } = useQuery({
    queryKey: ['analytics', 'overview', range],
    queryFn: async () => (await apiClient.get(`/analytics/overview?range=${range}`)).data,
  });
  const { data: timeseries, isLoading: isSeriesLoading } = useQuery({
    queryKey: ['analytics', 'timeseries', range],
    queryFn: async () => (await apiClient.get(`/analytics/timeseries?range=${range}`)).data.series,
  });
  const { data: breakdowns } = useQuery({
    queryKey: ['analytics', 'breakdowns', range],
    queryFn: async () => (await apiClient.get(`/analytics/breakdowns?range=${range}`)).data,
  });
  const { data: alerts } = useQuery({
    queryKey: ['analytics', 'alerts'],
    queryFn: async () => (await apiClient.get('/analytics/alerts')).data.alerts as AlertItem[],
  });

  const topChannel = useMemo(() => {
    const channel = [...(breakdowns?.channels || [])].sort((a: { count: number }, b: { count: number }) => b.count - a.count)[0];
    return channel?.name ? String(channel.name).replace('_', ' ') : '—';
  }, [breakdowns]);

  const delta = (current = 0, previous = 0) => {
    if (!previous) return 'New in this period';
    const value = Math.round(((current - previous) / previous) * 100);
    return `${value >= 0 ? '+' : ''}${value}% vs previous period`;
  };

  const loading = isKpisLoading || isSeriesLoading;

  return (
    <div>
      <PageHeader
        current="Dashboard"
        title="Every click tells a story."
        description="Your links, your audience, and the signals worth acting on."
        actions={(
          <>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted" aria-hidden="true" />
              <Select value={range} onChange={(event) => setRange(event.target.value)} className="w-[170px] pl-11">
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="all">All time</option>
              </Select>
            </div>
            <Button onClick={() => navigate('/create-link')}>+ Create link</Button>
          </>
        )}
      />

      {isKpisError ? (
        <Card className="mb-6 border border-danger/20 bg-paleOrange p-6 text-sm text-danger">
          We couldn’t load your overview right now. Refresh the page to try again.
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Clicks" value={loading ? <LoaderCircle className="h-7 w-7 animate-spin" /> : formatNumber(kpis?.clicks?.current)} delta={kpis ? delta(kpis.clicks.current, kpis.clicks.previous) : undefined} helper="Human clicks in this period" highlight />
        <StatCard label="Unique visitors" value={loading ? <LoaderCircle className="h-7 w-7 animate-spin" /> : formatNumber(kpis?.uniqueVisitors?.current)} delta={kpis ? delta(kpis.uniqueVisitors.current, kpis.uniqueVisitors.previous) : undefined} helper="Distinct visitor hashes" />
        <StatCard label="Active links" value={loading ? <LoaderCircle className="h-7 w-7 animate-spin" /> : formatNumber(kpis?.activeLinks)} delta="Live right now" helper="Across this workspace" />
        <StatCard label="Top channel" value={topChannel} delta="From current period" helper="Based on recorded clicks" />
        <StatCard label="Bot traffic" value="—" delta="Not in overview API" helper="Use Analytics for human traffic" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Card className="p-6 sm:p-7">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold">Traffic over time</h2>
              <p className="mt-1 text-xs text-textMuted">Daily clicks · bot traffic excluded</p>
            </div>
            <span className="rounded-[10px] bg-sand px-4 py-3 text-xs font-bold text-ink">All clicks</span>
          </div>
          {isSeriesLoading ? <div className="flex h-64 items-center justify-center text-sm text-textMuted"><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Loading traffic…</div> : <TrafficChart data={timeseries || []} />}
        </Card>
        <div className="space-y-6">
          <Card className="bg-paleOrange p-6">
            <p className="text-[11px] font-bold uppercase text-accent">The big signal</p>
            <h2 className="mt-4 text-lg font-extrabold">{topChannel === '—' ? 'Your traffic story is taking shape.' : `Your audience is on ${topChannel}.`}</h2>
            <p className="mt-3 text-sm leading-6 text-ink/80">{topChannel === '—' ? 'Keep sharing links to collect enough activity for a useful channel signal.' : `${topChannel} is your strongest recorded channel in this period.`}</p>
          </Card>
          <Card className="bg-sand p-6">
            <p className="text-[11px] font-bold uppercase text-textMuted">Keep an eye on it</p>
            <h2 className="mt-4 text-lg font-extrabold">{alerts?.length ? `${alerts.length} signal${alerts.length === 1 ? '' : 's'} need attention.` : 'Everything looks calm.'}</h2>
            <p className="mt-3 text-sm leading-6 text-textMuted">Review the latest link and traffic alerts below.</p>
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <Card className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div><h2 className="text-lg font-extrabold">A heads-up for you</h2><p className="mt-1 text-xs text-textMuted">Smart alerts from your workspace</p></div>
            <Sparkles className="h-5 w-5 text-accent" aria-hidden="true" />
          </div>
          <div className="mt-5 divide-y divide-line">
            {alerts?.length ? alerts.map((alert, index) => <div key={`${alert}-${index}`} className="py-4 first:pt-0 last:pb-0"><p className="text-sm font-bold">{alert}</p><button onClick={() => navigate('/links')} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary">Review links <ArrowRight className="h-3.5 w-3.5" /></button></div>) : <div className="py-6 text-sm text-textMuted">No alerts have been recorded yet.</div>}
          </div>
        </Card>
        <Card className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-extrabold">The click stream</h2><p className="mt-1 text-xs text-textMuted">Live activity is available in Analytics</p></div><Button variant="soft" size="sm" onClick={() => navigate('/analytics')}>Open Analytics <ArrowRight className="h-4 w-4" /></Button></div>
          <div className="mt-5 flex min-h-32 items-center justify-center rounded-2xl bg-sand/60 px-6 text-center text-sm leading-6 text-textMuted">The current API exposes aggregate traffic here, not individual click events. Open Analytics for the full signal.</div>
        </Card>
      </div>
    </div>
  );
};
