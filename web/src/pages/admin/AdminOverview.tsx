import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Ban, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, Link2, LoaderCircle, RefreshCw, Search, ShieldAlert, SlidersHorizontal, Users, XCircle } from 'lucide-react';
import axios from 'axios';
import { apiClient } from '../../api/client';
import { getShortUrl } from '../../lib/publicLinks';
import { Button, Card, EmptyState, Field, PageHeader, Select, StatCard, StatusBadge, TextInput } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

type AdminSection = 'overview' | 'links' | 'users' | 'activity' | 'blocklist';
type OverviewStats = { totalUsers: number; activeUsers: number; disabledUsers: number; totalLinks: number; totalClicks: number; botClicks: number };
type AdminLink = { id: string; alias: string; title?: string | null; destinationUrl: string; status: string; clickCount: number; createdAt: string; owner?: { email?: string; name?: string } };
type AdminUser = { id: string; email: string; name: string; role: string; isActive: boolean; timezone: string; createdAt: string; linkCount: number };
type ActivityItem = { id: string; type: 'CLICK' | 'BLOCKED_ATTEMPT'; occurredAt: string; source?: string; reason?: string; isBot: boolean; link?: { alias: string; owner?: { email?: string } } };
type BlockedDomain = { id: string; domain: string; reason?: string | null; createdAt: string };

const PAGE_SIZE = 10;
const sections: { id: AdminSection; label: string; icon: typeof Activity }[] = [
  { id: 'overview', label: 'Overview', icon: SlidersHorizontal },
  { id: 'links', label: 'Platform links', icon: Link2 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'activity', label: 'Activity log', icon: Activity },
  { id: 'blocklist', label: 'Blocklist', icon: Ban },
];

const errorMessage = (error: unknown) => axios.isAxiosError(error) ? error.response?.data?.error?.message || 'The server could not complete this request.' : 'The server could not complete this request.';
const formatDate = (value: string) => { try { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); } catch { return 'Unknown date'; } };

const QueryError = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="flex items-start gap-3 rounded-2xl border border-danger/20 bg-paleOrange p-5 text-sm text-danger" role="alert">
    <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
    <div className="flex-1"><p className="font-bold">Could not load this section</p><p className="mt-1 leading-6">{message}</p></div>
    {onRetry && <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>}
  </div>
);

const LoadingState = ({ label = 'Loading…' }: { label?: string }) => <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-textMuted" role="status"><LoaderCircle className="h-4 w-4 animate-spin" />{label}</div>;

const Pagination = ({ page, total, onPageChange }: { page: number; total: number; onPageChange: (page: number) => void }) => {
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pageCount <= 1) return null;
  return <div className="flex items-center justify-between border-t border-line px-2 pt-4 text-sm text-textMuted"><span>Page {page} of {pageCount} · {total.toLocaleString()} results</span><div className="flex gap-2"><Button variant="soft" size="sm" disabled={page === 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button><Button variant="soft" size="sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button></div></div>;
};

export const AdminOverview = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<AdminSection>('overview');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState('');
  const [domain, setDomain] = useState('');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const overviewQuery = useQuery({ queryKey: ['admin', 'overview'], queryFn: async () => (await apiClient.get('/admin/overview')).data.stats as OverviewStats });
  const linksQuery = useQuery({
    queryKey: ['admin', 'links', search, status, sort, order, page],
    queryFn: async () => (await apiClient.get('/admin/links', { params: { search: search || undefined, status: status === 'all' ? undefined : status, sort, order, page, pageSize: PAGE_SIZE } })).data as { links: AdminLink[]; pagination: { total: number } },
    enabled: section === 'links',
  });
  const usersQuery = useQuery({
    queryKey: ['admin', 'users', search, status, page],
    queryFn: async () => (await apiClient.get('/admin/users', { params: { search: search || undefined, status, page, pageSize: PAGE_SIZE } })).data as { users: AdminUser[]; pagination: { total: number } },
    enabled: section === 'users',
  });
  const activityQuery = useQuery({ queryKey: ['admin', 'activity'], queryFn: async () => (await apiClient.get('/admin/activity', { params: { limit: 50 } })).data.activity as ActivityItem[], enabled: section === 'activity' });
  const blocklistQuery = useQuery({ queryKey: ['admin', 'blocklist'], queryFn: async () => (await apiClient.get('/admin/blocklist')).data.domains as BlockedDomain[], enabled: section === 'blocklist' });

  const stats = overviewQuery.data;
  const filteredSectionLabel = useMemo(() => sections.find(item => item.id === section)?.label || 'Overview', [section]);

  const selectSection = (next: AdminSection) => { setSection(next); setPage(1); setSearch(''); setStatus(next === 'users' ? 'all' : 'all'); setActionError(''); };
  const refresh = () => { setActionError(''); void queryClient.invalidateQueries({ queryKey: ['admin', section] }); };
  const handleLinkStatus = async (link: AdminLink) => {
    setActionError('');
    const nextStatus = link.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
    const disableReason = nextStatus === 'DISABLED' ? window.prompt('Reason for disabling this link (optional):') : undefined;
    if (nextStatus === 'DISABLED' && disableReason === null) return;
    setIsSaving(true);
    try { await apiClient.patch(`/admin/links/${link.id}/status`, { status: nextStatus, reason: disableReason || undefined }); await linksQuery.refetch(); await overviewQuery.refetch(); } catch (error) { setActionError(errorMessage(error)); } finally { setIsSaving(false); }
  };
  const handleUserStatus = async (target: AdminUser) => {
    setActionError('');
    setIsSaving(true);
    try { await apiClient.patch(`/admin/users/${target.id}/status`, { isActive: !target.isActive }); await usersQuery.refetch(); await overviewQuery.refetch(); } catch (error) { setActionError(errorMessage(error)); } finally { setIsSaving(false); }
  };
  const handleBlockDomain = async (event: FormEvent) => {
    event.preventDefault();
    setActionError('');
    setIsSaving(true);
    try { await apiClient.post('/admin/blocklist', { domain, reason: reason || undefined }); setDomain(''); setReason(''); await blocklistQuery.refetch(); } catch (error) { setActionError(errorMessage(error)); } finally { setIsSaving(false); }
  };
  const handleUnblock = async (id: string) => {
    setActionError('');
    setIsSaving(true);
    try { await apiClient.delete(`/admin/blocklist/${id}`); await blocklistQuery.refetch(); } catch (error) { setActionError(errorMessage(error)); } finally { setIsSaving(false); }
  };

  if (!user || user.role !== 'ADMIN') return <QueryError message="This workspace is limited to the platform super-admin role." />;

  return <div>
    <PageHeader current="Super admin" title="Control the LinkPulse platform." description={`Welcome ${user.name}. Monitor every workspace and apply platform-wide controls from one place.`} />
    <Card className="mb-6 border border-danger/20 bg-paleOrange p-5"><div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-danger" /><p className="text-sm leading-6 text-danger"><strong>Super-admin controls.</strong> Changes here affect other workspaces and can immediately change redirect availability.</p></div></Card>
    <div className="mb-7 flex flex-wrap gap-2" role="tablist" aria-label="Super admin sections">{sections.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={section === id} onClick={() => selectSection(id)} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition ${section === id ? 'bg-primary text-cream' : 'bg-cream text-textMuted hover:bg-paleBlue hover:text-primary'}`}><Icon className="h-4 w-4" />{label}</button>)}</div>
    {actionError && <div className="mb-5"><QueryError message={actionError} /></div>}

    {section === 'overview' && <section aria-labelledby="overview-heading">
      <h2 id="overview-heading" className="sr-only">Platform overview</h2>
      {overviewQuery.isLoading ? <LoadingState label="Loading platform overview…" /> : overviewQuery.isError ? <QueryError message={errorMessage(overviewQuery.error)} onRetry={() => void overviewQuery.refetch()} /> : <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Total users" value={stats?.totalUsers.toLocaleString() || '0'} helper={`${stats?.activeUsers || 0} active accounts`} /><StatCard label="Total links" value={stats?.totalLinks.toLocaleString() || '0'} helper="Across every workspace" highlight /><StatCard label="Human clicks" value={stats?.totalClicks.toLocaleString() || '0'} helper={`${stats?.botClicks || 0} bot events excluded`} /><StatCard label="Disabled users" value={stats?.disabledUsers.toLocaleString() || '0'} helper="Access currently paused" /></div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2"><Card className="p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-textMuted">Platform health</p><h2 className="mt-2 text-xl font-extrabold">Keep redirects trustworthy.</h2></div><CheckCircle2 className="h-7 w-7 text-success" /></div><p className="mt-4 text-sm leading-6 text-textMuted">Use the link controls to pause harmful destinations, user controls to protect account access, and the activity log to understand traffic patterns.</p><div className="mt-6 flex flex-wrap gap-3"><Button size="sm" onClick={() => selectSection('links')}>Review links</Button><Button size="sm" variant="soft" onClick={() => selectSection('activity')}>View activity</Button></div></Card><Card className="p-6"><p className="text-xs font-bold uppercase tracking-[0.14em] text-textMuted">Available controls</p><div className="mt-4 space-y-3 text-sm"><div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-success" /> Search and manage platform links</div><div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-success" /> Activate or deactivate user accounts</div><div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-success" /> Review click and blocked-attempt activity</div><div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-success" /> Maintain the destination blocklist</div></div></Card></div>
      </>}
    </section>}

    {section === 'links' && <section aria-labelledby="links-heading"><div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="links-heading" className="text-2xl font-extrabold">Platform links</h2><p className="mt-1 text-sm text-textMuted">Search and sort links owned by every workspace.</p></div><Button variant="soft" size="sm" onClick={refresh}><RefreshCw className="h-4 w-4" />Refresh</Button></div><Card className="p-5"><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_170px_180px_130px]"><div className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted" /><TextInput className="pl-11" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search alias, title, URL, or owner" aria-label="Search platform links" /></div><Select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} aria-label="Filter links by status"><option value="all">All statuses</option><option value="ACTIVE">Active</option><option value="DISABLED">Disabled</option><option value="EXPIRED">Expired</option></Select><Select value={sort} onChange={event => { setSort(event.target.value); setPage(1); }} aria-label="Sort platform links"><option value="createdAt">Created date</option><option value="updatedAt">Updated date</option><option value="alias">Alias</option><option value="clickCount">Click count</option><option value="status">Status</option></Select><Select value={order} onChange={event => { setOrder(event.target.value); setPage(1); }} aria-label="Sort order"><option value="desc">Descending</option><option value="asc">Ascending</option></Select></div></Card>{linksQuery.isLoading ? <LoadingState label="Loading platform links…" /> : linksQuery.isError ? <div className="mt-5"><QueryError message={errorMessage(linksQuery.error)} onRetry={() => void linksQuery.refetch()} /></div> : linksQuery.data?.links.length === 0 ? <Card className="mt-5"><EmptyState title="No links match these filters." description="Try a different search or clear one of the filters." /></Card> : <Card className="mt-5 overflow-hidden p-5"><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left"><thead><tr className="border-b border-line text-xs text-textMuted"><th className="px-2 py-3 font-bold">Link</th><th className="px-2 py-3 font-bold">Owner</th><th className="px-2 py-3 font-bold">Clicks</th><th className="px-2 py-3 font-bold">Status</th><th className="px-2 py-3 font-bold">Action</th></tr></thead><tbody>{linksQuery.data?.links.map(link => <tr key={link.id} className="border-b border-line last:border-0"><td className="max-w-[330px] px-2 py-4"><p className="truncate text-sm font-bold">{link.title || getShortUrl(link.alias)}</p><p className="mt-1 truncate text-xs text-textMuted">{link.destinationUrl}</p><p className="mt-1 text-xs font-bold text-primary">{getShortUrl(link.alias)}</p></td><td className="px-2 py-4 text-sm">{link.owner?.email || 'Unknown owner'}</td><td className="px-2 py-4 text-sm font-extrabold">{link.clickCount.toLocaleString()}</td><td className="px-2 py-4"><StatusBadge status={link.status} /></td><td className="px-2 py-4"><Button size="sm" variant="soft" disabled={isSaving || link.status === 'EXPIRED'} onClick={() => void handleLinkStatus(link)}>{link.status === 'DISABLED' ? 'Activate' : 'Disable'}</Button></td></tr>)}</tbody></table></div><div className="mt-5"><Pagination page={page} total={linksQuery.data?.pagination.total || 0} onPageChange={setPage} /></div></Card>}</section>}

    {section === 'users' && <section aria-labelledby="users-heading"><div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="users-heading" className="text-2xl font-extrabold">Users</h2><p className="mt-1 text-sm text-textMuted">Manage account access without changing a user’s role.</p></div><Button variant="soft" size="sm" onClick={refresh}><RefreshCw className="h-4 w-4" />Refresh</Button></div><Card className="p-5"><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]"><div className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted" /><TextInput className="pl-11" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search name or email" aria-label="Search users" /></div><Select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} aria-label="Filter users by status"><option value="all">All users</option><option value="active">Active</option><option value="inactive">Inactive</option></Select></div></Card>{usersQuery.isLoading ? <LoadingState label="Loading users…" /> : usersQuery.isError ? <div className="mt-5"><QueryError message={errorMessage(usersQuery.error)} onRetry={() => void usersQuery.refetch()} /></div> : usersQuery.data?.users.length === 0 ? <Card className="mt-5"><EmptyState title="No users match this search." description="Try searching by a different name or email address." /></Card> : <Card className="mt-5 overflow-hidden p-5"><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left"><thead><tr className="border-b border-line text-xs text-textMuted"><th className="px-2 py-3 font-bold">User</th><th className="px-2 py-3 font-bold">Role</th><th className="px-2 py-3 font-bold">Links</th><th className="px-2 py-3 font-bold">Status</th><th className="px-2 py-3 font-bold">Action</th></tr></thead><tbody>{usersQuery.data?.users.map(target => <tr key={target.id} className="border-b border-line last:border-0"><td className="px-2 py-4"><p className="text-sm font-bold">{target.name}</p><p className="mt-1 text-xs text-textMuted">{target.email}</p></td><td className="px-2 py-4"><span className="text-xs font-bold">{target.role === 'ADMIN' ? 'Super admin' : 'User'}</span></td><td className="px-2 py-4 text-sm">{target.linkCount.toLocaleString()}</td><td className="px-2 py-4"><StatusBadge status={target.isActive ? 'ACTIVE' : 'DISABLED'} /></td><td className="px-2 py-4"><Button size="sm" variant="soft" disabled={isSaving || target.id === user.id} onClick={() => void handleUserStatus(target)}>{target.isActive ? 'Deactivate' : 'Activate'}</Button></td></tr>)}</tbody></table></div><div className="mt-5"><Pagination page={page} total={usersQuery.data?.pagination.total || 0} onPageChange={setPage} /></div></Card>}</section>}

    {section === 'activity' && <section aria-labelledby="activity-heading"><div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="activity-heading" className="text-2xl font-extrabold">Activity log</h2><p className="mt-1 text-sm text-textMuted">Recent clicks and blocked attempts across the platform.</p></div><Button variant="soft" size="sm" onClick={refresh}><RefreshCw className="h-4 w-4" />Refresh</Button></div>{activityQuery.isLoading ? <LoadingState label="Loading activity…" /> : activityQuery.isError ? <QueryError message={errorMessage(activityQuery.error)} onRetry={() => void activityQuery.refetch()} /> : !activityQuery.data?.length ? <Card><EmptyState title="No activity yet." description="Traffic and blocked attempts will appear here as the platform is used." /></Card> : <Card className="p-5"><div className="space-y-1">{activityQuery.data.map(event => <article key={`${event.type}-${event.id}`} className="flex flex-col gap-3 border-b border-line py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${event.type === 'CLICK' ? 'bg-paleBlue text-primary' : 'bg-paleOrange text-danger'}`}>{event.type === 'CLICK' ? <Activity className="h-4 w-4" /> : <Ban className="h-4 w-4" />}</span><div><p className="text-sm font-bold">{event.type === 'CLICK' ? 'Link visited' : 'Visit blocked'} {event.link?.alias ? <span className="text-primary">/{event.link.alias}</span> : ''}</p><p className="mt-1 text-xs text-textMuted">{event.type === 'CLICK' ? `Source: ${event.source || 'unknown'}` : `Reason: ${event.reason || 'policy'}`} · {event.link?.owner?.email || 'Unknown owner'}</p></div></div><div className="flex items-center gap-3 text-xs text-textMuted"><span>{event.isBot ? 'Bot' : 'Human'}</span><time dateTime={event.occurredAt}>{formatDate(event.occurredAt)}</time></div></article>)}</div></Card>}</section>}

    {section === 'blocklist' && <section aria-labelledby="blocklist-heading"><div className="mb-5"><h2 id="blocklist-heading" className="text-2xl font-extrabold">Destination blocklist</h2><p className="mt-1 text-sm text-textMuted">Block a hostname for all future links and redirect visits.</p></div><div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"><Card className="p-6"><h3 className="text-lg font-extrabold">Add a domain</h3><form className="mt-5 space-y-5" onSubmit={event => void handleBlockDomain(event)}><Field label="Hostname" hint="Use a hostname such as example.com. Protocols are normalized by the server."><TextInput value={domain} onChange={event => setDomain(event.target.value)} placeholder="example.com" required /></Field><Field label="Reason (optional)"><TextInput value={reason} onChange={event => setReason(event.target.value)} placeholder="Policy violation" /></Field><Button type="submit" disabled={isSaving || !domain.trim()}>{isSaving ? <><LoaderCircle className="h-4 w-4 animate-spin" />Saving…</> : <>Block domain <Ban className="h-4 w-4" /></>}</Button></form></Card><Card className="p-6">{blocklistQuery.isLoading ? <LoadingState label="Loading blocklist…" /> : blocklistQuery.isError ? <QueryError message={errorMessage(blocklistQuery.error)} onRetry={() => void blocklistQuery.refetch()} /> : !blocklistQuery.data?.length ? <EmptyState title="The blocklist is clear." description="Blocked destinations will appear here for review." /> : <div><div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-extrabold">Blocked domains</h3><Button variant="soft" size="sm" onClick={refresh}><RefreshCw className="h-4 w-4" />Refresh</Button></div><div className="space-y-3">{blocklistQuery.data.map(item => <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-line p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-bold">{item.domain}</p><p className="mt-1 text-xs text-textMuted">{item.reason || 'No reason provided'} · {formatDate(item.createdAt)}</p></div><Button variant="outline" size="sm" disabled={isSaving} onClick={() => void handleUnblock(item.id)}><XCircle className="h-4 w-4" />Unblock</Button></div>)}</div></div>}</Card></div></section>}

    <p className="mt-8 flex items-center gap-2 text-xs text-textMuted"><ShieldAlert className="h-4 w-4" /> You are viewing {filteredSectionLabel.toLowerCase()} as a platform super admin.</p>
  </div>;
};
