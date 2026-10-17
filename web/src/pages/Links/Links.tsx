import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { CreateLinkWizard } from './CreateLinkWizard';

export const Links = () => {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const { data, refetch, isLoading } = useQuery({
    queryKey: ['links'],
    queryFn: async () => {
      const res = await apiClient.get('/links');
      return res.data.links;
    }
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-display font-bold">Links</h1>
        <button
          onClick={() => setIsWizardOpen(true)}
          className="bg-primary text-cream px-4 py-2 rounded-[10px] font-medium"
        >
          Create Link
        </button>
      </div>

      <div className="bg-cream rounded-2xl shadow-sm border border-line overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-textMuted">Loading links...</div>
        ) : data?.length === 0 ? (
          <div className="p-12 text-center text-textMuted">
            <p>No links yet. Create your first link!</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line bg-sand/50">
                <th className="p-4 font-medium">Destination</th>
                <th className="p-4 font-medium">Short URL</th>
                <th className="p-4 font-medium">Clicks</th>
                <th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((link: any) => (
                <tr key={link.id} className="border-b border-line last:border-b-0 hover:bg-sand/30">
                  <td className="p-4 max-w-xs truncate">{link.destinationUrl}</td>
                  <td className="p-4 font-mono text-primary flex items-center gap-2">
                    {window.location.origin}/{link.alias}
                    <button className="text-xs border border-line px-2 py-1 rounded" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/${link.alias}`)}>Copy</button>
                  </td>
                  <td className="p-4">{link.clickCount}</td>
                  <td className="p-4">
                    <span className="bg-success/10 text-success px-2 py-1 rounded-full text-xs font-medium uppercase">{link.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isWizardOpen && <CreateLinkWizard onClose={() => setIsWizardOpen(false)} onSuccess={() => { setIsWizardOpen(false); refetch(); }} />}
    </div>
  );
};
