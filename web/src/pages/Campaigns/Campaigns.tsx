import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { clsx } from 'clsx';
import { CreateCampaignModal } from './CreateCampaignModal';
import { useNavigate } from 'react-router-dom';

export const Campaigns = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: campaigns, refetch, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const res = await apiClient.get('/campaigns');
      return res.data.campaigns;
    }
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-display font-bold">Campaigns</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-cream px-4 py-2 rounded-[10px] font-medium"
        >
          Create Campaign
        </button>
      </div>

      {isLoading ? (
        <div className="text-textMuted">Loading campaigns...</div>
      ) : campaigns?.length === 0 ? (
        <div className="bg-cream p-12 text-center text-textMuted rounded-2xl shadow-sm border border-line">
          No campaigns found. Group your links to track aggregate performance!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((c: any) => (
            <div key={c.id} onClick={() => navigate(`/campaigns/${c.id}`)} className="bg-cream rounded-2xl shadow-sm border border-line p-6 flex flex-col cursor-pointer hover:border-primary transition-colors">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-display font-bold text-lg text-navy-900 truncate">{c.name}</h3>
                <span className={clsx("text-xs font-medium px-2 py-1 rounded-full uppercase",
                  c.state === 'ACTIVE' && "bg-success/10 text-success",
                  c.state === 'UPCOMING' && "bg-primary/10 text-primary",
                  c.state === 'ENDED' && "bg-textMuted/10 text-textMuted",
                  c.state === 'ARCHIVED' && "bg-line text-textMuted"
                )}>
                  {c.state}
                </span>
              </div>
              <div className="text-sm text-textMuted mb-6 flex-1 line-clamp-2">
                {c.description || 'No description provided.'}
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-xs text-textMuted mb-1">Links</div>
                  <div className="font-medium text-lg text-navy-900">{c.linksCount}</div>
                </div>
                <div className="flex gap-2">
                   <button className="text-xs text-textMuted hover:text-primary border border-line px-2 py-1 rounded"
                    onClick={async (e) => { e.stopPropagation(); await apiClient.post(`/campaigns/${c.id}/${c.state === 'ARCHIVED' ? 'unarchive' : 'archive'}`); refetch(); }}
                   >
                     {c.state === 'ARCHIVED' ? 'Unarchive' : 'Archive'}
                   </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && <CreateCampaignModal onClose={() => setIsModalOpen(false)} onSuccess={() => { setIsModalOpen(false); refetch(); }} />}
    </div>
  );
};
