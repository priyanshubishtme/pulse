import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Copy, Download, MoreHorizontal, Search, X } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Button, Card, EmptyState, PageHeader, Select, StatusBadge, TextInput } from '../../components/ui';
import { useNavigate } from 'react-router-dom';

type LinkRecord = {
  id: string;
  alias: string;
  title?: string | null;
  destinationUrl: string;
  clickCount: number;
  status: string;
  expiresAt?: string | null;
  campaign?: { id: string; name: string } | null;
  tags?: { tag: { name: string } }[];
};

const PAGE_SIZE = 7;

const formatExpiry = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'No expiry';

const shortUrl = (alias: string) => `${window.location.origin}/${alias}`;

const ManageLinkModal = ({ link, onClose, onSaved }: { link: LinkRecord; onClose: () => void; onSaved: () => void }) => {
  const [title, setTitle] = useState(link.title || '');
  const [destinationUrl, setDestinationUrl] = useState(link.destinationUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setIsSaving(true);
    setError('');
    try {
      await apiClient.patch(`/links/${link.id}`, { title: title || undefined, destinationUrl });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Could not save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-navy-900/70 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="w-full max-w-[520px] rounded-[24px] bg-cream p-6 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="manage-link-title">
        <div className="flex items-start justify-between gap-4">
          <div><h2 id="manage-link-title" className="text-2xl font-extrabold">Manage link</h2><p className="mt-3 font-bold text-primary">lpul.se/{link.alias}</p></div>
          <button onClick={onClose} className="flex h-12 w-12 items-center justify-center rounded-xl bg-sand text-ink" aria-label="Close manage link dialog"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-7 space-y-5">
          <label className="block text-sm font-bold">Link title<TextInput value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2" /></label>
          <label className="block text-sm font-bold">Destination URL<TextInput type="url" value={destinationUrl} onChange={(event) => setDestinationUrl(event.target.value)} className="mt-2" /></label>
          <div className="grid gap-5 sm:grid-cols-2"><div><p className="text-sm font-bold">Status</p><div className="mt-2"><StatusBadge status={link.status} /></div></div><div><p className="text-sm font-bold">Expiry</p><p className="mt-3 text-sm text-textMuted">{formatExpiry(link.expiresAt)}</p></div></div>
        </div>
        <div className="mt-7 border-t border-line pt-5"><p className="text-xs leading-5 text-textMuted">Changes update the real link record. Analytics and redirect rules remain connected to this link.</p>{error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}<div className="mt-6 flex justify-between gap-3"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save changes'}</Button></div></div>
      </div>
    </div>
  );
};

export const Links = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'links' | 'qr'>('links');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [campaign, setCampaign] = useState('ALL');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState('');
  const [editing, setEditing] = useState<LinkRecord | null>(null);
  const { data: links = [], isLoading, isError, refetch } = useQuery<LinkRecord[]>({
    queryKey: ['links'],
    queryFn: async () => (await apiClient.get('/links')).data.links,
  });

  const campaigns = useMemo(() => Array.from(new Map(links.filter((link) => link.campaign).map((link) => [link.campaign!.id, link.campaign!.name])).entries()), [links]);
  const filteredLinks = useMemo(() => links.filter((link) => {
    const haystack = `${link.title || ''} ${link.alias} ${link.destinationUrl} ${(link.tags || []).map((tag) => tag.tag.name).join(' ')}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (status === 'ALL' || link.status === status) && (campaign === 'ALL' || link.campaign?.id === campaign);
  }), [campaign, links, search, status]);
  const visibleLinks = filteredLinks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(filteredLinks.length / PAGE_SIZE));

  const flash = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 3500); };
  const copyLink = async (alias: string) => {
    try { await navigator.clipboard.writeText(shortUrl(alias)); flash('Link copied to your clipboard.'); } catch { flash('Copy is not available in this browser.'); }
  };
  const exportCsv = () => {
    const header = ['destination', 'short_url', 'clicks', 'status', 'campaign', 'tags', 'expiry'];
    const rows = filteredLinks.map((link) => [link.destinationUrl, shortUrl(link.alias), link.clickCount, link.status, link.campaign?.name || '', (link.tags || []).map((tag) => tag.tag.name).join('|'), formatExpiry(link.expiresAt)]);
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'linkpulse-links.csv'; anchor.click(); URL.revokeObjectURL(url); flash('CSV export downloaded.');
  };

  const resetFilters = () => { setSearch(''); setStatus('ALL'); setCampaign('ALL'); setPage(1); };

  return (
    <div>
      <PageHeader current="Links" title="Short links. Long reach." description="Create, organise, and keep your best links moving." actions={<><Button variant="outline" onClick={() => navigate('/qr-codes')}>+ Create QR code</Button><Button onClick={() => navigate('/create-link')}>+ Create link</Button></>} />
      <Card className="overflow-hidden p-5 sm:p-6 lg:p-7">
        <div className="flex flex-wrap gap-3">
          <button onClick={() => { setActiveTab('links'); setPage(1); }} className={`rounded-[11px] px-6 py-3 text-sm font-bold ${activeTab === 'links' ? 'bg-primary text-cream' : 'bg-sand text-ink'}`}>Short links · {links.length}</button>
          <button onClick={() => setActiveTab('qr')} className={`rounded-[11px] px-6 py-3 text-sm font-bold ${activeTab === 'qr' ? 'bg-primary text-cream' : 'bg-sand text-ink'}`}>QR codes · {links.length}</button>
        </div>
        <p className="mt-3 text-xs text-textMuted">{activeTab === 'links' ? `${links.length} links in this list · ${links.filter((link) => link.status === 'ACTIVE').length} active across your workspace` : 'Every active link can be encoded and exported from the QR workspace.'}</p>

        {activeTab === 'qr' ? (
          <div className="mt-7 grid gap-6 rounded-2xl bg-sand p-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,1fr)]"><div><p className="text-[11px] font-bold uppercase text-textMuted">QR workspace</p><h2 className="mt-4 text-2xl font-extrabold">Ready for print and digital.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-textMuted">Choose one of your live links to design a QR code without changing its destination or redirect behavior.</p><Button className="mt-6" onClick={() => navigate('/qr-codes')}>Open QR designer</Button></div><div className="rounded-2xl bg-cream p-5"><p className="text-sm font-bold">Available destinations</p><div className="mt-4 space-y-3">{links.filter((link) => link.status === 'ACTIVE').slice(0, 4).map((link) => <button key={link.id} onClick={() => navigate('/qr-codes')} className="flex w-full items-center justify-between rounded-xl border border-line px-4 py-3 text-left hover:border-primary"><span className="truncate text-sm font-bold">lpul.se/{link.alias}</span><span className="text-xs text-primary">Design →</span></button>)}</div></div></div>
        ) : (
          <>
            <div className="mt-7 grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px_200px_190px]">
              <div className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted" aria-hidden="true" /><TextInput value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search destination, alias, or tag…" className="border-0 bg-sand pl-11" /></div>
              <Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="EXPIRED">Expired</option><option value="DISABLED">Disabled</option></Select>
              <Select value={campaign} onChange={(event) => { setCampaign(event.target.value); setPage(1); }}><option value="ALL">All campaigns</option>{campaigns.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</Select>
              <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" />Export CSV</Button>
            </div>

            {isLoading ? <div className="flex min-h-96 items-center justify-center text-sm text-textMuted">Loading your links…</div> : isError ? <div className="my-7 rounded-2xl bg-paleOrange p-6 text-sm text-danger" role="alert">We couldn’t load your links. Refresh to try again.</div> : filteredLinks.length === 0 ? <EmptyState title="No links in sight." description="Try another search, or clear your filters to find your links." action={<Button onClick={resetFilters}>Clear all filters</Button>} /> : <>
              <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[930px] border-collapse text-left"><thead><tr className="bg-sand text-[11px] text-textMuted"><th className="rounded-l-xl px-2 py-3 font-bold">Destination</th><th className="px-2 py-3 font-bold">Short URL</th><th className="px-2 py-3 font-bold">Clicks</th><th className="px-2 py-3 font-bold">Status</th><th className="px-2 py-3 font-bold">Campaign</th><th className="px-2 py-3 font-bold">Tags</th><th className="px-2 py-3 font-bold">Expiry</th><th className="rounded-r-xl px-2 py-3" aria-label="Actions" /></tr></thead><tbody>{visibleLinks.map((link) => <tr key={link.id} className="border-b border-line last:border-0"><td className="max-w-[250px] px-2 py-4"><p className="truncate text-sm font-bold">{link.title || 'Untitled link'}</p><p className="mt-1 truncate text-xs text-textMuted">{link.destinationUrl}</p></td><td className="px-2 py-4"><div className="flex items-center gap-2"><button onClick={() => copyLink(link.alias)} className="truncate text-sm font-bold text-primary hover:underline">lpul.se/{link.alias}</button><button onClick={() => copyLink(link.alias)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sand text-ink hover:bg-line" aria-label={`Copy ${link.alias}`}><Copy className="h-4 w-4" /></button></div></td><td className="px-2 py-4 text-sm font-extrabold">{link.clickCount.toLocaleString('en-IN')}</td><td className="px-2 py-4"><StatusBadge status={link.status} /></td><td className="px-2 py-4 text-sm">{link.campaign?.name || '—'}</td><td className="max-w-[130px] px-2 py-4 text-xs text-textMuted">{(link.tags || []).map((tag) => tag.tag.name).join(', ') || '—'}</td><td className="whitespace-nowrap px-2 py-4 text-xs text-textMuted">{formatExpiry(link.expiresAt)}</td><td className="px-2 py-4"><button onClick={() => setEditing(link)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-sand hover:bg-line" aria-label={`Manage ${link.alias}`}><MoreHorizontal className="h-4 w-4" /></button></td></tr>)}</tbody></table></div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-textMuted"><span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredLinks.length)} of {filteredLinks.length} links</span><div className="flex items-center gap-2"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="h-10 rounded-xl bg-sand px-4 font-bold text-ink disabled:opacity-40">←</button>{Array.from({ length: pageCount }, (_, index) => index + 1).slice(0, 3).map((value) => <button key={value} onClick={() => setPage(value)} className={`h-10 w-10 rounded-xl font-bold ${page === value ? 'bg-primary text-cream' : 'bg-sand text-ink'}`}>{value}</button>)}<button disabled={page === pageCount} onClick={() => setPage((value) => value + 1)} className="h-10 rounded-xl bg-sand px-4 font-bold text-ink disabled:opacity-40">→</button></div></div>
            </>}
          </>
        )}
      </Card>
      <p className="mt-8 text-xs text-textMuted">Live data from your LinkPulse workspace · Link destinations and click counts are not mocked.</p>
      {toast && <div className="fixed bottom-6 right-6 z-40 flex max-w-sm items-center gap-3 rounded-2xl bg-navy-900 px-5 py-4 text-sm font-bold text-cream shadow-xl" role="status"><Check className="h-4 w-4 text-paleGreen" />{toast}</div>}
      {editing && <ManageLinkModal link={editing} onClose={() => setEditing(null)} onSaved={() => { refetch(); flash('Changes saved.'); }} />}
    </div>
  );
};
