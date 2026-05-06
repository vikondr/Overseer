import { useEffect, useState } from 'react';

export default function CompareVersionsModal({ open, onClose, file, sheetId, api }) {
  const [versions, setVersions] = useState([]);
  const [aId, setAId] = useState('');
  const [bId, setBId] = useState('');
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open || !file || !sheetId) return;
    setError('');
    setResult(null);
    setVersions([]);
    setLoadingVersions(true);
    api.getFileVersions(sheetId, file.fileName)
      .then((vs) => {
        const sorted = [...vs].sort((x, y) => y.version - x.version);
        setVersions(sorted);
        setBId(sorted[0]?.id ?? '');
        setAId(sorted[1]?.id ?? sorted[0]?.id ?? '');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingVersions(false));
  }, [open, file, sheetId, api]);

  if (!open) return null;

  const runDiff = async () => {
    if (!aId || !bId) return;
    if (aId === bId) {
      setError('Pick two different versions to compare.');
      return;
    }
    setRunning(true);
    setError('');
    setResult(null);
    try {
      const [a, b] = await Promise.all([api.fetchFileBlob(aId), api.fetchFileBlob(bId)]);
      const data = await api.diffImages(a, b);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const scorePct = result ? (result.score * 100).toFixed(2) : null;
  const scoreColor = result
    ? result.score > 0.95 ? '#34d399'
    : result.score > 0.8  ? '#60a5fa'
    : result.score > 0.5  ? '#a78bfa'
    : '#f472b6'
    : '#64748b';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-slate-700/50 rounded-2xl shadow-2xl p-6"
        style={{ background: 'linear-gradient(135deg, #0d1424 0%, #111827 100%)' }}
      >
        <div className="absolute top-0 right-0 w-36 h-36 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 100% 0%, rgba(96,165,250,0.1) 0%, transparent 70%)' }} />

        <div className="relative flex items-start justify-between mb-1 gap-3">
          <div className="min-w-0">
            <h3 className="text-white font-semibold text-base">Compare versions</h3>
            <p className="text-slate-600 text-xs font-mono truncate">{file?.fileName}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>

        {loadingVersions ? (
          <div className="py-8 text-slate-600 text-sm animate-pulse text-center">Loading versions…</div>
        ) : versions.length < 2 ? (
          <div className="py-8 text-slate-500 text-sm text-center">
            Only one version exists — push another commit to compare.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mt-4 relative">
              <VersionPicker label="Base (A)" value={aId} onChange={setAId} versions={versions} />
              <VersionPicker label="Compare (B)" value={bId} onChange={setBId} versions={versions} />
            </div>

            <button
              onClick={runDiff}
              disabled={running || !aId || !bId || aId === bId}
              className="relative w-full mt-4 py-2 btn-primary text-sm rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? 'Running diff…' : 'Run pixel diff'}
            </button>

            {error && (
              <p className="relative mt-3 text-red-400 text-xs">{error}</p>
            )}

            {result && (
              <div className="relative mt-5 space-y-3">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-800/70 bg-slate-950/40">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">SSIM</span>
                  <span className="text-2xl font-black tabular-nums" style={{ color: scoreColor }}>
                    {scorePct}%
                  </span>
                  <span className="ml-auto text-xs text-slate-600 font-mono">
                    {result.width}×{result.height}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-800/70 overflow-hidden bg-slate-950/40">
                  <img
                    src={`data:image/png;base64,${result.diff_image}`}
                    alt="Pixel diff"
                    className="w-full max-h-[60vh] object-contain"
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function VersionPicker({ label, value, onChange, versions }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white text-sm rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
      >
        {versions.map((v) => (
          <option key={v.id} value={v.id}>
            v{v.version}{v.commitMessage ? ` — ${v.commitMessage}` : ''}
          </option>
        ))}
      </select>
    </label>
  );
}