import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, ExternalLink, LoaderCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { QrDesigner } from '../../components/qr/QrDesigner';
import { Button, Card, EmptyState, Field, PageHeader, Select, TextInput } from '../../components/ui';
import { getQrUrl, getShortUrl } from '../../lib/publicLinks';

type QrPattern = 'square' | 'dots' | 'rounded';

export const QrCodes = () => {
  const navigate = useNavigate();
  const { data: links = [], isLoading, isError } = useQuery<any[]>({ queryKey: ['links'], queryFn: async () => (await apiClient.get('/links')).data.links });
  const [selectedId, setSelectedId] = useState('');
  const [pattern, setPattern] = useState<QrPattern>('square');
  const [color, setColor] = useState('#04213F');
  const [name, setName] = useState('');
  const selectedLink = useMemo(() => links.find((link) => link.id === selectedId) || links.find((link) => link.status === 'ACTIVE'), [links, selectedId]);
  const qrUrl = selectedLink ? getQrUrl(selectedLink.alias) : '';

  if (isLoading) return <div className="flex min-h-96 items-center justify-center text-sm text-textMuted"><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Loading your links…</div>;
  if (isError) return <div className="rounded-2xl bg-paleOrange p-6 text-sm text-danger" role="alert">We couldn’t load your links for the QR designer.</div>;

  return (
    <div>
      <PageHeader current="Create QR code" title="Make your next connection." description="Create a QR code that looks like you, and brings people to your link." actions={<Button variant="outline" onClick={() => navigate('/links')}><ArrowLeft className="h-4 w-4" />Back to links</Button>} />
      {links.length === 0 ? <Card><EmptyState title="No links to encode yet." description="Create a short link first, then turn its destination into a QR code." action={<Button onClick={() => navigate('/create-link')}>Create a link</Button>} /></Card> : <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(310px,1fr)]"><Card className="p-6 sm:p-8"><h2 className="text-2xl font-extrabold">Create a QR code</h2><div className="mt-8 space-y-6"><div><p className="mb-4 text-base font-extrabold">1. Destination and details</p><Field label="Destination URL *" hint="The QR code tracks the selected LinkPulse redirect."><Select value={selectedLink?.id || ''} onChange={(event) => setSelectedId(event.target.value)}>{links.map((link) => <option key={link.id} value={link.id}>{link.title || link.destinationUrl} · {getShortUrl(link.alias)}</option>)}</Select></Field></div><Field label="QR code name *" hint="A local label for this QR design."><TextInput value={name} onChange={(event) => setName(event.target.value)} placeholder={selectedLink?.title || 'e.g. Festive story'} /></Field><div className="border-t border-line pt-6"><p className="text-base font-extrabold">2. Make it yours</p><fieldset className="mt-5"><legend className="text-sm font-bold">QR style</legend><div className="mt-3 grid grid-cols-3 gap-3"><StyleButton active={pattern === 'square'} onClick={() => setPattern('square')} label="Classic" icon="▦" /><StyleButton active={pattern === 'dots'} onClick={() => setPattern('dots')} label="Rounded" icon="⠿" /><StyleButton active={pattern === 'rounded'} onClick={() => setPattern('rounded')} label="Soft" icon="▧" /></div></fieldset><fieldset className="mt-6"><legend className="text-sm font-bold">Foreground colour</legend><div className="mt-3 flex flex-wrap gap-3">{['#04213F', '#0F5BE6', '#206649', '#AD3534', '#F26B0F'].map((value) => <button type="button" key={value} onClick={() => setColor(value)} className={`h-10 w-10 rounded-full border-4 ${color === value ? 'border-ink' : 'border-transparent'}`} style={{ backgroundColor: value }} aria-label={`Use ${value}`} />)}<label className="flex h-10 items-center gap-2 rounded-xl border border-line px-3 text-xs font-bold"><input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-6 w-6 border-0 bg-transparent p-0" />Custom</label></div></fieldset></div></div><div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-line pt-6"><Button variant="outline" onClick={() => navigate('/links')}>Cancel</Button><Button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Create QR code <ExternalLink className="h-4 w-4" /></Button></div></Card><Card className="bg-sand p-6 sm:p-7"><p className="text-[11px] font-bold uppercase text-textMuted">Live preview</p><div className="mt-8 flex min-h-[300px] items-center justify-center rounded-2xl bg-sand/50 p-4"><QrDesigner url={qrUrl} pattern={pattern} color={color} size={240} /></div><div className="mt-7 border-t border-line pt-6"><h2 className="text-2xl font-extrabold">{name || selectedLink?.title || 'Your QR code'}</h2><p className="mt-3 break-all text-sm font-bold text-primary">{selectedLink ? `${getShortUrl(selectedLink.alias)}` : 'Choose a link to preview'}</p><p className="mt-3 text-xs leading-5 text-textMuted">{selectedLink?.campaign?.name || 'No campaign'} · {pattern} · {color.toUpperCase()}</p><div className="mt-6 flex items-start gap-2 border-t border-line pt-5 text-sm font-bold"><Check className="mt-0.5 h-4 w-4 text-success" />Always test your QR before printing.</div><p className="mt-3 text-xs leading-5 text-textMuted">Downloads are generated in the browser and do not send destination data to an external QR service.</p></div></Card></div>}
    </div>
  );
};

const StyleButton = ({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: string }) => <button type="button" onClick={onClick} className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-bold ${active ? 'border-primary bg-paleBlue text-primary' : 'border-line bg-cream text-ink hover:bg-sand'}`}><span className="text-2xl leading-none">{icon}</span>{label}</button>;
