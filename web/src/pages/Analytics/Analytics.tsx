import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { TrafficChart } from '../../components/charts/TrafficChart';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#0F5BE6', '#F26B0F', '#1E8E4E', '#E8A317', '#D93025', '#04213F', '#5B6B7F'];

export const Analytics = () => {
  const [range, setRange] = useState('30');

  const { data: kpis } = useQuery({ queryKey: ['analytics', 'overview', range], queryFn: async () => (await apiClient.get(`/analytics/overview?range=${range}`)).data });
  const { data: timeseries } = useQuery({ queryKey: ['analytics', 'timeseries', range], queryFn: async () => (await apiClient.get(`/analytics/timeseries?range=${range}`)).data.series });
  const { data: breakdowns } = useQuery({ queryKey: ['analytics', 'breakdowns', range], queryFn: async () => (await apiClient.get(`/analytics/breakdowns?range=${range}`)).data });
  const { data: geo } = useQuery({ queryKey: ['analytics', 'geo', range], queryFn: async () => (await apiClient.get(`/analytics/geo?range=${range}`)).data });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-cream p-4 rounded-2xl shadow-sm border border-line">
        <h1 className="text-xl font-display font-bold">Analytics Showcase</h1>
        <div className="flex gap-4 items-center">
          <select value={range} onChange={e => setRange(e.target.value)} className="bg-sand border border-line rounded-[10px] px-4 py-2 outline-none text-sm">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      <div className="bg-cream p-6 rounded-2xl border border-line shadow-sm">
        <h2 className="text-lg font-display font-bold mb-4">Traffic over time</h2>
        {timeseries ? <TrafficChart data={timeseries} /> : <div className="h-64 flex items-center justify-center text-textMuted">Loading chart...</div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-cream p-6 rounded-2xl border border-line shadow-sm">
          <h2 className="text-sm font-bold text-navy-900 mb-4">Channels</h2>
          <div className="h-48 w-full">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={breakdowns?.channels} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="count">
                  {breakdowns?.channels.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-cream p-6 rounded-2xl border border-line shadow-sm">
          <h2 className="text-sm font-bold text-navy-900 mb-4">Devices</h2>
          <div className="h-48 w-full">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={breakdowns?.devices} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="count">
                  {breakdowns?.devices.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-cream p-6 rounded-2xl border border-line shadow-sm">
          <h2 className="text-sm font-bold text-navy-900 mb-4">Browsers</h2>
          <div className="h-48 w-full">
            <ResponsiveContainer>
              <BarChart data={breakdowns?.browsers} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EDE9E3" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#5B6B7F', fontSize: 12 }} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{fill: '#EDE9E3'}} />
                <Bar dataKey="count" fill="#F26B0F" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-cream p-6 rounded-2xl border border-line shadow-sm">
        <h2 className="text-lg font-display font-bold mb-4">Top Countries</h2>
        <div className="space-y-3">
          {geo?.countries.sort((a: any,b: any)=>b.count - a.count).slice(0, 5).map((c: any) => (
             <div key={c.country} className="flex justify-between items-center">
                <span className="text-sm font-medium">{c.country}</span>
                <span className="text-sm text-textMuted">{c.count} clicks</span>
             </div>
          ))}
          {geo?.countries.length === 0 && <div className="text-sm text-textMuted">No geo data recorded yet.</div>}
        </div>
      </div>
    </div>
  );
};
