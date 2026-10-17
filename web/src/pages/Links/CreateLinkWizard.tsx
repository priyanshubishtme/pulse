import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Check, CircleAlert, LoaderCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Button, Card, Field, PageHeader, Select, TextInput } from '../../components/ui';

type Issue = { field: string; level: 'error' | 'warning' | 'info'; message: string };

export const CreateLinkWizard = ({ onClose, onSuccess, standalone = false }: { onClose?: () => void; onSuccess?: () => void; standalone?: boolean }) => {
  const navigate = useNavigate();
  const close = onClose || (() => navigate('/links'));
  const success = onSuccess || (() => navigate('/links'));
  const [step, setStep] = useState(1);
  const [url, setUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [title, setTitle] = useState('');
  const [password, setPassword] = useState('');
  const [clickLimit, setClickLimit] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [aliasStatus, setAliasStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [aliasReason, setAliasReason] = useState('');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: campaigns } = useQuery({ queryKey: ['campaigns'], queryFn: async () => (await apiClient.get('/campaigns')).data.campaigns });
  const { data: tags } = useQuery({ queryKey: ['tags'], queryFn: async () => (await apiClient.get('/tags')).data.tags });

  useEffect(() => {
    if (!alias) { setAliasStatus('idle'); setAliasReason(''); return; }
    const timer = window.setTimeout(async () => {
      setAliasStatus('checking');
      try {
        const response = await apiClient.get(`/links/check-alias?alias=${encodeURIComponent(alias)}`);
        if (response.data.available) { setAliasStatus('available'); setAliasReason(''); } else { setAliasStatus('taken'); setAliasReason(response.data.reason || 'This alias is already taken.'); }
      } catch { setAliasStatus('taken'); setAliasReason('We could not check this alias.'); }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [alias]);

  const payload = useMemo(() => ({
    destinationUrl: url,
    alias: alias || undefined,
    title: title || undefined,
    password: password || undefined,
    clickLimit: clickLimit ? Number.parseInt(clickLimit, 10) : undefined,
    expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    campaignId: campaignId || undefined,
    tagIds: tagIds.length ? tagIds : undefined,
  }), [alias, campaignId, clickLimit, expiresAt, password, tagIds, title, url]);

  const validateStep1 = async () => {
    try {
      const response = await apiClient.post('/links/validate', payload);
      const step1Issues: Issue[] = response.data.issues.filter((issue: Issue) => issue.field === 'destination' || issue.field === 'destinationUrl' || issue.field === 'alias');
      setIssues(step1Issues);
      if (!step1Issues.some((issue) => issue.level === 'error') && aliasStatus !== 'taken') setStep(2);
    } catch (error: any) {
      setSubmitError(error.response?.data?.error?.message || 'We could not validate this destination.');
    }
  };

  const handleCreate = async () => {
    setIsSubmitting(true); setSubmitError('');
    try {
      const validation = await apiClient.post('/links/validate', payload);
      const nextIssues: Issue[] = validation.data.issues;
      setIssues(nextIssues);
      if (nextIssues.some((issue) => issue.level === 'error')) return;
      await apiClient.post('/links', payload);
      success();
    } catch (error: any) {
      if (error.response?.data?.error?.issues) setIssues(error.response.data.error.issues);
      setSubmitError(error.response?.data?.error?.message || 'Creation failed. Check the fields and try again.');
    } finally { setIsSubmitting(false); }
  };

  const toggleTag = (id: string) => setTagIds((current) => current.includes(id) ? current.filter((tagId) => tagId !== id) : current.length < 10 ? [...current, id] : current);
  const aliasError = aliasStatus === 'taken' ? aliasReason : issues.find((issue) => issue.field === 'alias' && issue.level === 'error')?.message;
  const hasErrors = issues.some((issue) => issue.level === 'error');

  const preview = (
    <div className="space-y-6">
      <Card className="bg-sand p-6 sm:p-7">
        <p className="text-[11px] font-bold uppercase text-textMuted">Your link, reimagined</p>
        <div className="mt-12 flex items-center justify-center gap-4"><div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-cream text-xl font-extrabold">www</div><div className="h-px w-16 bg-textMuted" /><div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-cream"><ArrowUpRight className="h-8 w-8" /></div></div>
        <div className="mt-10 rounded-2xl bg-cream p-5"><p className="text-[11px] font-bold uppercase text-textMuted">Short, sweet, shareable</p><p className="mt-4 break-all text-xl font-extrabold text-primary">lpul.se/{alias || 'festive-story'}</p><p className="mt-5 text-sm text-textMuted">Every click is a new insight.</p></div>
      </Card>
      <div className="px-1"><h3 className="text-base font-extrabold">A good alias goes a long way.</h3><p className="mt-4 text-sm leading-6 text-textMuted">Keep it short, recognisable, and relevant. Think “festive-story”, not “x7k2z”.</p></div>
    </div>
  );

  const form = (
    <Card className="p-6 sm:p-8">
      <div className="flex items-center gap-4 border-b border-line pb-6 text-sm"><span className={step === 1 ? 'font-bold text-primary' : 'font-semibold text-success'}>{step > 1 ? '✓ ' : '1 '}Destination & alias</span><span className="h-px flex-1 bg-line" /><span className={step === 2 ? 'font-bold text-primary' : 'text-textMuted'}>2 Details & review</span></div>
      {step === 1 ? <div className="pt-8"><h2 className="text-2xl font-extrabold">Where are we heading?</h2><p className="mt-2 text-sm leading-6 text-textMuted">Start with your destination. We’ll take care of the short part.</p><div className="mt-9 space-y-6"><Field label="Destination URL *" hint="The full URL people visit when they click your link."><TextInput type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/your-destination" required /></Field><Field label="Custom alias *" hint={aliasStatus === 'available' ? 'Available. Make it yours.' : '3–32 letters, numbers or hyphens.'} error={aliasError}><div className="relative"><TextInput value={alias} onChange={(event) => setAlias(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="lpul.se / festive-story" className={aliasError ? 'border-danger' : aliasStatus === 'available' ? 'border-success' : ''} /><span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">{aliasStatus === 'checking' ? <LoaderCircle className="h-4 w-4 animate-spin text-textMuted" /> : aliasStatus === 'available' ? <Check className="h-4 w-4 text-success" /> : null}</span></div></Field></div>{issues.length > 0 && <IssueList issues={issues} />}{submitError && <p className="mt-5 text-sm text-danger" role="alert">{submitError}</p>}<div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6"><button onClick={() => { setUrl(''); setAlias(''); setIssues([]); }} className="text-sm font-bold text-primary">Clear form</button><Button onClick={validateStep1} disabled={!url || aliasStatus === 'checking' || aliasStatus === 'taken'}>Continue to details →</Button></div><p className="mt-7 text-xs text-textMuted">Your link won’t be created until you review and confirm.</p></div> : <div className="pt-8"><h2 className="text-2xl font-extrabold">The details make it yours.</h2><p className="mt-2 text-sm leading-6 text-textMuted">A little organisation now. A lot of clarity later.</p><div className="mt-9 space-y-6"><Field label="Campaign · optional"><Select value={campaignId} onChange={(event) => setCampaignId(event.target.value)}><option value="">No campaign</option>{campaigns?.filter((campaign: any) => campaign.state !== 'ARCHIVED').map((campaign: any) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</Select></Field><Field label="Tags · optional" hint="Select up to 10 tags."><div className="flex min-h-12 flex-wrap gap-2 rounded-[11px] border border-slate-500/70 bg-cream p-2">{tags?.map((tag: any) => <button type="button" key={tag.id} onClick={() => toggleTag(tag.id)} className={`rounded-lg px-3 py-2 text-xs font-bold ${tagIds.includes(tag.id) ? 'bg-primary text-cream' : 'bg-sand text-textMuted'}`}>{tag.name}</button>)}</div></Field><Field label="Link title · optional" hint="Give the link a name you can recognise later."><TextInput value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Festive story" /></Field><div className="grid gap-6 sm:grid-cols-2"><Field label="Expiry date · optional" hint="Leave blank for no expiry."><TextInput type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></Field><Field label="Click limit · optional" hint="Leave blank for unlimited clicks."><TextInput type="number" min="0" value={clickLimit} onChange={(event) => setClickLimit(event.target.value)} placeholder="Unlimited" /></Field></div><Field label="Password · optional" hint="Use at least 6 characters."><TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Set an optional password" /></Field></div><div className="mt-8 rounded-2xl bg-sand p-5"><h3 className="text-base font-extrabold">{hasErrors ? `Review: ${issues.filter((issue) => issue.level === 'error').length} error${issues.filter((issue) => issue.level === 'error').length === 1 ? '' : 's'} to fix` : 'Review before you go'}</h3><p className="mt-3 truncate text-xs text-textMuted">lpul.se/{alias || 'generated-alias'} → {url || 'destination URL'}</p>{hasErrors ? <IssueList issues={issues} compact /> : <p className="mt-5 text-sm font-semibold text-success">✓ No errors. Your link is ready to create.</p>}{issues.some((issue) => issue.level === 'warning') && <p className="mt-3 text-xs text-accent">Warnings are shown for review but will not block creation.</p>}</div>{submitError && <p className="mt-5 text-sm text-danger" role="alert">{submitError}</p>}<div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6"><Button variant="outline" onClick={() => { setStep(1); setIssues([]); }}>Back</Button><Button onClick={handleCreate} disabled={isSubmitting || hasErrors}>{isSubmitting ? 'Creating…' : '+ Create link'}</Button></div></div>}
    </Card>
  );

  const content = <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">{form}{preview}</div>;
  return standalone ? <div><PageHeader current="Create link" title="A small link. A big possibility." description="Give your destination a memorable address, then make it your own." actions={<Button onClick={() => navigate('/qr-codes')}>Create QR code</Button>} />{content}<p className="mt-8 text-xs text-textMuted">Live link creation · review and validation stay connected to the LinkPulse API.</p></div> : <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-900/70 p-4 sm:p-8" role="dialog" aria-modal="true" aria-label="Create link"><div className="mx-auto max-w-6xl rounded-[24px] bg-app p-5 sm:p-8"><div className="mb-6 flex justify-end"><button onClick={close} className="flex h-10 w-10 items-center justify-center rounded-xl bg-sand" aria-label="Close create link"><X className="h-4 w-4" /></button></div>{content}</div></div>;
};

const IssueList = ({ issues, compact = false }: { issues: Issue[]; compact?: boolean }) => <div className={`mt-6 rounded-2xl bg-sand p-4 ${compact ? 'mt-4' : ''}`}><ul className="space-y-2 text-sm">{issues.map((issue, index) => <li key={`${issue.field}-${index}`} className={`flex items-start gap-2 ${issue.level === 'error' ? 'text-danger' : issue.level === 'warning' ? 'text-accent' : 'text-textMuted'}`}><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{issue.message}</li>)}</ul></div>;
