import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const AdminOverview = () => {
  const { user } = useAuth();
  const [domain, setDomain] = useState('');
  const [reason, setReason] = useState('');

  const { data: stats } = useQuery({ queryKey: ['admin', 'overview'], queryFn: async () => (await apiClient.get('/admin/overview')).data.stats });
  const { data: links, refetch: refetchLinks } = useQuery({ queryKey: ['admin', 'links'], queryFn: async () => (await apiClient.get('/admin/links')).data.links });
  const { data: blocklist, refetch: refetchBlocks } = useQuery({ queryKey: ['admin', 'blocklist'], queryFn: async () => (await apiClient.get('/admin/blocklist')).data.domains });

  const handleDisable = async (id: string) => {
    const r = prompt('Reason for disabling this link?');
    if (!r) return;
    try {
      await apiClient.post(`/admin/links/${id}/disable`, { reason: r });
      refetchLinks();
    } catch (e) { alert('Failed'); }
  };

  const handleBlockDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/admin/blocklist', { domain, reason });
      setDomain('');
      setReason('');
      refetchBlocks();
    } catch (e) { alert('Failed to block domain'); }
  };

  const handleUnblock = async (id: string) => {
    try {
      await apiClient.delete(`/admin/blocklist/${id}`);
      refetchBlocks();
    } catch (e) { alert('Failed'); }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-danger mb-2">Platform Administration</h1>
        <p className="text-textMuted">Welcome {user?.name}. You have platform-wide access.</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-cream p-4 rounded-xl border border-danger/30 shadow-sm"><div className="text-sm text-textMuted">Total Users</div><div className="text-2xl font-bold">{stats?.totalUsers || 0}</div></div>
        <div className="bg-cream p-4 rounded-xl border border-danger/30 shadow-sm"><div className="text-sm text-textMuted">Total Links</div><div className="text-2xl font-bold">{stats?.totalLinks || 0}</div></div>
        <div className="bg-cream p-4 rounded-xl border border-danger/30 shadow-sm"><div className="text-sm text-textMuted">Human Clicks</div><div className="text-2xl font-bold">{stats?.totalClicks || 0}</div></div>
        <div className="bg-cream p-4 rounded-xl border border-danger/30 shadow-sm"><div className="text-sm text-textMuted">Bot Clicks</div><div className="text-2xl font-bold">{stats?.botClicks || 0}</div></div>
      </div>

      <div className="flex gap-8">
        <div className="flex-[2] bg-cream rounded-2xl shadow-sm border border-line p-6">
          <h2 className="text-xl font-bold mb-4">Recent Links</h2>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-sand/50 sticky top-0">
                <tr><th>Alias</th><th>Owner</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {links?.map((l: any) => (
                  <tr key={l.id} className="border-b border-line last:border-b-0">
                    <td className="p-2 font-mono text-primary">{l.alias}</td>
                    <td className="p-2">{l.owner.email}</td>
                    <td className="p-2"><span className="text-xs px-2 py-1 bg-sand rounded uppercase">{l.status}</span></td>
                    <td className="p-2">
                      {l.status !== 'DISABLED' && <button onClick={() => handleDisable(l.id)} className="text-danger hover:underline">Disable</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex-1 space-y-6">
          <div className="bg-cream rounded-2xl shadow-sm border border-line p-6">
             <h2 className="text-xl font-bold mb-4">Block a Domain</h2>
             <form onSubmit={handleBlockDomain} className="space-y-2">
               <input type="text" placeholder="example.com" value={domain} onChange={e => setDomain(e.target.value)} required className="w-full px-3 py-2 border border-line rounded text-sm" />
               <input type="text" placeholder="Reason" value={reason} onChange={e => setReason(e.target.value)} required className="w-full px-3 py-2 border border-line rounded text-sm" />
               <button className="w-full bg-danger text-cream py-2 rounded font-medium text-sm">Block Domain</button>
             </form>
          </div>

          <div className="bg-cream rounded-2xl shadow-sm border border-line p-6">
             <h2 className="text-xl font-bold mb-4">Blocklist</h2>
             <ul className="space-y-2 text-sm">
               {blocklist?.map((b: any) => (
                 <li key={b.id} className="flex justify-between items-center bg-sand p-2 rounded">
                   <div><div className="font-bold">{b.domain}</div><div className="text-xs text-textMuted">{b.reason}</div></div>
                   <button onClick={() => handleUnblock(b.id)} className="text-primary text-xs hover:underline">Remove</button>
                 </li>
               ))}
               {blocklist?.length === 0 && <li className="text-textMuted">No domains blocked.</li>}
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
