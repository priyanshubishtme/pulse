import { useState } from 'react';
import type { ChangeEvent } from 'react';
import Papa from 'papaparse';
import { apiClient } from '../../api/client';

export const Import = () => {
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [campaignId, setCampaignId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      Papa.parse(e.target.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          // Auto-map based on common headers
          const mapped = results.data.map((row: any) => ({
            url: row.destination || row.url || row.Destination || row.URL,
            alias: row.alias || row.Alias || null,
            tags: row.tags || row.Tags || null,
          })).filter(r => !!r.url);
          setParsedData(mapped);
        }
      });
    }
  };

  const handleCommit = async () => {
    if (parsedData.length === 0) return alert('No valid data rows found.');
    setIsUploading(true);
    try {
      const res = await apiClient.post('/import/commit', {
        rows: parsedData,
        campaignId: campaignId || undefined
      });
      setResult(res.data);
    } catch (e: any) {
      alert(e.response?.data?.error?.message || 'Import failed');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadErrors = () => {
    if (!result) return;
    const errs = result.rows.filter((r: any) => r.outcome !== 'ADDED');
    const csv = Papa.unparse(errs);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import-errors.csv';
    a.click();
  };

  return (
    <div>
      <h1 className="text-3xl font-display font-bold mb-6">Bulk Import</h1>

      {!result ? (
        <div className="bg-cream p-8 rounded-2xl shadow-sm border border-line max-w-2xl">
          <p className="text-textMuted mb-6">Upload a CSV or TSV file to bulk create links. Ensure your file has a header row with at least a `url` column. Optional columns: `alias`, `tags` (separated by semicolons).</p>

          <input type="file" accept=".csv,.tsv" onChange={handleFileChange} className="mb-6 block w-full text-sm text-textMuted
            file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium
            file:bg-primary file:text-cream hover:file:bg-primary/90 cursor-pointer" />

          {parsedData.length > 0 && (
            <div className="mb-6">
              <div className="text-sm font-bold text-success mb-2">Found {parsedData.length} valid rows.</div>
              <div className="max-h-48 overflow-y-auto bg-sand p-4 rounded text-xs font-mono">
                {parsedData.slice(0, 3).map((r, i) => (
                  <div key={i} className="mb-2">URL: {r.url} | Alias: {r.alias || 'Auto'} | Tags: {r.tags || 'None'}</div>
                ))}
                {parsedData.length > 3 && <div className="text-textMuted">...and {parsedData.length - 3} more.</div>}
              </div>
            </div>
          )}

          <div className="mb-6">
             <label className="block text-sm font-medium mb-2">Optional: Add all to campaign</label>
             <input type="text" placeholder="Campaign ID (leave blank to skip)" value={campaignId} onChange={e => setCampaignId(e.target.value)}
                className="w-full px-4 py-2 border border-line rounded outline-none" />
          </div>

          <button
            onClick={handleCommit}
            disabled={parsedData.length === 0 || isUploading}
            className="bg-primary text-cream px-6 py-3 rounded-[10px] font-medium disabled:opacity-50"
          >
            {isUploading ? 'Importing...' : 'Commit Import'}
          </button>
        </div>
      ) : (
        <div className="bg-cream p-8 rounded-2xl shadow-sm border border-line max-w-2xl">
          <h2 className="text-2xl font-display font-bold text-navy-900 mb-6">Import Complete</h2>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-success/10 p-4 rounded-xl text-center">
              <div className="text-3xl font-bold text-success">{result.added}</div>
              <div className="text-sm text-success font-medium">Added</div>
            </div>
            <div className="bg-warning/10 p-4 rounded-xl text-center">
               <div className="text-3xl font-bold text-warning">{result.duplicates}</div>
               <div className="text-sm text-warning font-medium">Duplicates</div>
            </div>
            <div className="bg-danger/10 p-4 rounded-xl text-center">
               <div className="text-3xl font-bold text-danger">{result.rejected}</div>
               <div className="text-sm text-danger font-medium">Rejected</div>
            </div>
          </div>

          <div className="flex gap-4">
             {(result.duplicates > 0 || result.rejected > 0) && (
                <button onClick={downloadErrors} className="flex-1 bg-sand border border-line text-textPrimary py-3 rounded-[10px] font-medium">
                  Download Error Report
                </button>
             )}
             <button onClick={() => setResult(null)} className="flex-1 bg-primary text-cream py-3 rounded-[10px] font-medium">
               Import Another
             </button>
          </div>
        </div>
      )}
    </div>
  );
};
