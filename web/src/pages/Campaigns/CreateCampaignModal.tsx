import React, { useState } from 'react';
import { apiClient } from '../../api/client';

const CATEGORIES = [
  'EMAIL', 'SOCIAL_MEDIA', 'PAID_ADS', 'SEO', 'PARTNERSHIPS', 'EVENTS', 'OTHER'
];

export const CreateCampaignModal = ({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('OTHER');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/campaigns', {
        name,
        category,
        description: description || undefined,
        startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create campaign');
    }
  };

  return (
    <div className="fixed inset-0 bg-navy-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-cream rounded-2xl w-full max-w-md p-8 shadow-2xl">
        <h2 className="text-2xl font-display font-bold mb-6">New Campaign</h2>
        {error && <div className="text-danger mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Campaign Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              className="w-full px-4 py-2 border border-line rounded-[10px] outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category *</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full px-4 py-2 border border-line rounded-[10px] outline-none">
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={500}
              className="w-full px-4 py-2 border border-line rounded-[10px] outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} className="w-full px-2 py-2 border border-line rounded-[10px] text-sm outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} className="w-full px-2 py-2 border border-line rounded-[10px] text-sm outline-none" />
            </div>
          </div>
          <div className="flex gap-4 mt-6">
            <button type="button" onClick={onClose} className="flex-1 border border-line py-3 rounded-[10px] font-medium">Cancel</button>
            <button type="submit" className="flex-1 bg-primary text-cream py-3 rounded-[10px] font-medium">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
};
