import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { TrafficChart } from '../../components/charts/TrafficChart';

export const CampaignDetail = () => {
  const { id } = useParams();
  const [range, setRange] = useState('30');

  const { data: campaign } = useQuery({ queryKey: ['campaign', id], queryFn: async () => (await apiClient.get('/campaigns')).data.campaigns.find((c: any) => c.id === id) });
  const { data: kpis } = useQuery({ queryKey: ['analytics', 'overview', id, range], queryFn: async () => (await apiClient.get(`/analytics/overview?range=${range}&campaignId=${id}`)).data });
  const { data: timeseries } = useQuery({ queryKey: ['analytics', 'timeseries', id, range], queryFn: async () => (await apiClient.get(`/analytics/timeseries?range=${range}&campaignId=${id}`)).data.series });

  if (!campaign) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-cream p-6 rounded-2xl shadow-sm border border-line">
        <div>
          <h1 className="text-2xl font-display font-bold mb-1">{campaign.name}</h1>
          <div className="text-sm text-textMuted uppercase">{campaign.category}</div>
        </div>
        <select value={range} onChange={e => setRange(e.target.value)} className="bg-sand border border-line rounded-[10px] px-4 py-2 outline-none text-sm">
          <option value="30">Last 30 days</option>
          <option value="all">All time</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-cream p-6 rounded-2xl border border-line shadow-sm">
          <div className="text-sm text-textMuted mb-2">Total Clicks</div>
          <div className="text-3xl font-display font-bold text-navy-900">{kpis?.clicks.current || 0}</div>
        </div>
        <div className="bg-cream p-6 rounded-2xl border border-line shadow-sm">
          <div className="text-sm text-textMuted mb-2">Unique Visitors</div>
          <div className="text-3xl font-display font-bold text-navy-900">{kpis?.uniqueVisitors.current || 0}</div>
        </div>
      </div>

      <div className="bg-cream p-6 rounded-2xl border border-line shadow-sm">
        <h2 className="text-lg font-display font-bold mb-4">Traffic over time</h2>
        {timeseries && <TrafficChart data={timeseries} />}
      </div>
    </div>
  );
};
