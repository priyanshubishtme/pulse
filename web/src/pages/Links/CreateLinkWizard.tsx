import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { clsx } from 'clsx';
import { useAuth } from '../../context/AuthContext';

export const CreateLinkWizard = ({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) => {
  const [step, setStep] = useState(1);
  const [url, setUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [title, setTitle] = useState('');
  const [password, setPassword] = useState('');
  const [clickLimit, setClickLimit] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  
  const [aliasStatus, setAliasStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [aliasReason, setAliasReason] = useState('');
  const [issues, setIssues] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!alias) {
      setAliasStatus('idle');
      return;
    }
    const timer = setTimeout(async () => {
      setAliasStatus('checking');
      try {
        const res = await apiClient.get(`/links/check-alias?alias=${alias}`);
        if (res.data.available) {
          setAliasStatus('available');
        } else {
          setAliasStatus('taken');
          setAliasReason(res.data.reason);
        }
      } catch (e) {
        setAliasStatus('taken');
        setAliasReason('Error checking alias');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [alias]);

  const validateStep1 = async () => {
    try {
      const res = await apiClient.post('/links/validate', { destinationUrl: url, alias: alias || undefined });
      const step1Issues = res.data.issues.filter((i: any) => i.field === 'destination' || i.field === 'alias');
      setIssues(step1Issues);
      if (!step1Issues.some((i: any) => i.level === 'error')) {
        setStep(2);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        destinationUrl: url,
        alias: alias || undefined,
        title: title || undefined,
        password: password || undefined,
        clickLimit: clickLimit ? parseInt(clickLimit, 10) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined
      };
      
      const valRes = await apiClient.post('/links/validate', payload);
      setIssues(valRes.data.issues);
      
      if (valRes.data.issues.some((i: any) => i.level === 'error')) {
        setIsSubmitting(false);
        return;
      }

      await apiClient.post('/links', payload);
      onSuccess();
    } catch (e: any) {
      if (e.response?.data?.error?.issues) {
        setIssues(e.response.data.error.issues);
      } else {
        alert(e.response?.data?.error?.message || 'Creation failed');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-navy-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-cream rounded-2xl w-full max-w-2xl overflow-hidden flex shadow-2xl">
        <div className="flex-1 p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-display font-bold">Create Link</h2>
            <button onClick={onClose} className="text-textMuted hover:text-navy-900">Close</button>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Destination URL *</label>
                <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/long-url"
                  className="w-full px-4 py-2 border border-line rounded-[10px] focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Custom Alias (optional)</label>
                <div className="flex items-center gap-2">
                  <span className="text-textMuted bg-sand px-3 py-2 rounded-[10px] border border-line">pulse.link/</span>
                  <input type="text" value={alias} onChange={e => setAlias(e.target.value)} placeholder="my-campaign"
                    className="flex-1 px-4 py-2 border border-line rounded-[10px] focus:ring-primary outline-none" />
                </div>
                {aliasStatus === 'checking' && <p className="text-xs text-textMuted mt-1">Checking...</p>}
                {aliasStatus === 'available' && <p className="text-xs text-success mt-1">Alias is available!</p>}
                {aliasStatus === 'taken' && <p className="text-xs text-danger mt-1">{aliasReason}</p>}
              </div>

              {issues.length > 0 && (
                <div className="bg-sand p-4 rounded-[10px] mt-4">
                  <h4 className="font-medium text-sm mb-2">Review issues:</h4>
                  <ul className="text-sm space-y-1">
                    {issues.map((i, idx) => (
                      <li key={idx} className={clsx(i.level === 'error' ? 'text-danger' : 'text-warning')}>
                        • {i.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button 
                onClick={validateStep1} 
                disabled={!url || aliasStatus === 'checking' || aliasStatus === 'taken'}
                className="w-full bg-primary text-cream py-3 rounded-[10px] font-medium mt-6 disabled:opacity-50"
              >
                Next Step
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title (optional)</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2 border border-line rounded-[10px] outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Click Limit</label>
                  <input type="number" min="0" value={clickLimit} onChange={e => setClickLimit(e.target.value)} placeholder="Unlimited" className="w-full px-4 py-2 border border-line rounded-[10px] outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Expiry Date</label>
                  <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="w-full px-4 py-2 border border-line rounded-[10px] outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password Protection</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank for public" className="w-full px-4 py-2 border border-line rounded-[10px] outline-none" />
              </div>

              {issues.length > 0 && (
                <div className="bg-sand p-4 rounded-[10px] mt-4">
                  <h4 className="font-medium text-sm mb-2">Review issues:</h4>
                  <ul className="text-sm space-y-1">
                    {issues.map((i, idx) => (
                      <li key={idx} className={clsx(i.level === 'error' ? 'text-danger' : 'text-warning')}>
                        • {i.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-4 mt-6">
                <button onClick={() => setStep(1)} className="flex-1 border border-line py-3 rounded-[10px] font-medium">Back</button>
                <button onClick={handleCreate} disabled={isSubmitting} className="flex-1 bg-primary text-cream py-3 rounded-[10px] font-medium disabled:opacity-50">
                  {isSubmitting ? 'Creating...' : 'Publish Link'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
