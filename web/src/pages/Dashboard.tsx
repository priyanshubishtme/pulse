import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { TrafficChart } from '../components/charts/TrafficChart';

export const Dashboard = () => {
  const { user } = useAuth();
  const [range, setRange] = useState('30');

  const { data: kpis } = useQuery({
    queryKey: ['analytics', 'overview', range],
    queryFn: async () => (await apiClient.get(`/analytics/overview?range=${range}`)).data
  });

  const { data: timeseries } = useQuery({
    queryKey: ['analytics', 'timeseries', range],
    queryFn: async () => (await apiClient.get(`/analytics/timeseries?range=${range}`)).data.series
  });

  const { data: alerts } = useQuery({
    queryKey: ['analytics', 'alerts'],
    queryFn: async () => (await apiClient.get('/analytics/alerts')).data.alerts
  });

  const formatDelta = (current: number, previous: number) => {
    if (previous === 0) return { text: 'New', positive: true };
    const pct = Math.round(((current - previous) / previous) * 100);
    return { text: `${pct > 0 ? '+' : ''}${pct}%`, positive: pct >= 0 };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-display font-bold">Dashboard</h1>
        <select value={range} onChange={e => setRange(e.target.value)} className="bg-cream border border-line rounded-[10px] px-4 py-2 outline-none font-medium">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="all">All time</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-cream p-6 rounded-2xl border border-line shadow-sm">
          <div className="text-sm text-textMuted mb-2">Total Clicks</div>
          <div className="text-3xl font-display font-bold text-navy-900 flex items-baseline gap-3">
            {kpis?.clicks.current || 0}
            {kpis && <span className={`text-sm font-medium ${formatDelta(kpis.clicks.current, kpis.clicks.previous).positive ? 'text-success' : 'text-danger'}`}>
              {formatDelta(kpis.clicks.current, kpis.clicks.previous).text}
            </span>}
          </div>
        </div>
        <div className="bg-cream p-6 rounded-2xl border border-line shadow-sm">
          <div className="text-sm text-textMuted mb-2">Unique Visitors</div>
          <div className="text-3xl font-display font-bold text-navy-900 flex items-baseline gap-3">
            {kpis?.uniqueVisitors.current || 0}
            {kpis && <span className={`text-sm font-medium ${formatDelta(kpis.uniqueVisitors.current, kpis.uniqueVisitors.previous).positive ? 'text-success' : 'text-danger'}`}>
              {formatDelta(kpis.uniqueVisitors.current, kpis.uniqueVisitors.previous).text}
            </span>}
          </div>
        </div>
        <div className="bg-cream p-6 rounded-2xl border border-line shadow-sm">
          <div className="text-sm text-textMuted mb-2">Active Links</div>
          <div className="text-3xl font-display font-bold text-navy-900 flex items-baseline gap-3">
            {kpis?.activeLinks || 0}
          </div>
        </div>
      </div>

      <div className="bg-cream p-6 rounded-2xl border border-line shadow-sm">
        <h2 className="text-lg font-display font-bold mb-4">Traffic over time</h2>
        {timeseries ? <TrafficChart data={timeseries} /> : <div className="h-64 flex items-center justify-center text-textMuted">Loading chart...</div>}
      </div>

      {alerts && alerts.length > 0 && (
        <div className="bg-cream p-6 rounded-2xl border border-warning/50 shadow-sm">
          <h2 className="text-lg font-display font-bold mb-4 text-warning flex items-center gap-2">
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
             Smart Alerts
          </h2>
          <ul className="space-y-2 text-sm text-textPrimary">
            {alerts.map((a: string, i: number) => <li key={i}>• {a}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};
