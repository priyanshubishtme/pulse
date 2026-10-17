import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { QrDesigner } from '../../components/qr/QrDesigner';

export const QrCodes = () => {
  const { data: links, isLoading } = useQuery({
    queryKey: ['links'],
    queryFn: async () => (await apiClient.get('/links')).data.links
  });

  const [selectedLink, setSelectedLink] = useState<any>(null);
  const [pattern, setPattern] = useState<'square' | 'dots' | 'rounded'>('square');
  const [color, setColor] = useState('#04213F');

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-display font-bold mb-6">QR Codes</h1>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Gallery */}
        <div className="flex-1 bg-cream rounded-2xl p-6 shadow-sm border border-line">
          <h2 className="text-lg font-bold mb-4">Your Links</h2>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
            {links?.length === 0 && <p className="text-textMuted text-sm">No links found.</p>}
            {links?.map((link: any) => (
              <button
                key={link.id}
                onClick={() => setSelectedLink(link)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedLink?.id === link.id ? 'border-primary bg-primary/5' : 'border-line hover:border-textMuted'
                }`}
              >
                <div className="font-medium truncate">{link.title || link.destinationUrl}</div>
                <div className="text-sm text-primary">/{link.alias}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Designer */}
        <div className="flex-1 bg-cream rounded-2xl p-6 shadow-sm border border-line">
          <h2 className="text-lg font-bold mb-6">QR Designer</h2>
          {selectedLink ? (
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1 space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Pattern</label>
                  <select value={pattern} onChange={e => setPattern(e.target.value as any)} className="w-full px-3 py-2 border border-line rounded">
                    <option value="square">Square</option>
                    <option value="dots">Dots</option>
                    <option value="rounded">Rounded</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Color</label>
                  <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-full h-10 rounded border border-line" />
                </div>
              </div>
              <div className="flex-1 flex justify-center border-l border-line pl-8">
                 <QrDesigner
                   url={`${window.location.origin}/qr/${selectedLink.alias}`}
                   pattern={pattern}
                   color={color}
                 />
              </div>
            </div>
          ) : (
            <div className="text-textMuted h-64 flex items-center justify-center border-2 border-dashed border-line rounded-lg">
              Select a link to design its QR code
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
