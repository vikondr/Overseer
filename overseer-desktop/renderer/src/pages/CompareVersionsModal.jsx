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

  const scorePct = result ? Math.round(result.score * 100) : null;
  const scoreColor = result
    ? result.score > 0.95 ? '#34d399'
    : result.score > 0.8  ? '#60a5fa'
    : result.score > 0.5  ? '#a78bfa'
    : '#f472b6'
    : '#64748b';
  const scoreLabel = result
    ? result.score > 0.99 ? 'Nearly identical'
    : result.score > 0.95 ? 'Very similar'
    : result.score > 0.8  ? 'Mostly similar'
    : result.score > 0.5  ? 'Noticeably different'
    : 'Very different'
    : '';

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
              <VersionPicker label="Before" value={aId} onChange={setAId} versions={versions} />
              <VersionPicker label="After" value={bId} onChange={setBId} versions={versions} />
            </div>

            <button
              onClick={runDiff}
              disabled={running || !aId || !bId || aId === bId}
              className="relative w-full mt-4 py-2 btn-primary text-sm rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? 'Comparing…' : 'Compare these versions'}
            </button>

            {error && (
              <p className="relative mt-3 text-red-400 text-xs">{error}</p>
            )}

            {result && (
              <div className="relative mt-5 space-y-3">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-800/70 bg-slate-950/40">
                  <span className="text-2xl font-black tabular-nums" style={{ color: scoreColor }}>
                    {scorePct}%
                  </span>
                  <div className="flex flex-col leading-tight">
                    <span className="text-xs text-slate-400 font-medium">match</span>
                    <span className="text-[11px] text-slate-500">{scoreLabel}</span>
                  </div>
                  <DiffDimensions result={result} />
                </div>
                <div className="flex gap-3 items-stretch">
                  <div className="flex-1 min-w-0 rounded-xl border border-slate-800/70 overflow-hidden bg-slate-950/40">
                    <img
                      src={`data:image/png;base64,${result.diff_image}`}
                      alt="Highlighted changes between the two versions"
                      className="w-full max-h-[60vh] object-contain"
                    />
                    <p className="px-4 py-2 text-[11px] text-slate-500 border-t border-slate-800/70">
                      Coloured areas highlight what changed between the two versions.
                    </p>
                  </div>
                  <ChangeLegend />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DiffDimensions({ result }) {
  if (!result.resized) {
    return (
      <span className="ml-auto text-xs text-slate-600">
        {result.width}×{result.height}
      </span>
    );
  }
  const a = result.original_a;
  const b = result.original_b;
  return (
    <span
      className="ml-auto text-right text-[11px] text-slate-600 leading-tight"
      title={`Inputs differed in size — both scaled onto a shared ${result.width}×${result.height} canvas (aspect preserved) before comparing.`}
    >
      <span className="text-amber-500/80 font-medium">resized · </span>
      {a.width}×{a.height} vs {b.width}×{b.height}
      <br />
      <span className="text-slate-700">compared at {result.width}×{result.height}</span>
    </span>
  );
}

function ChangeLegend() {
  return (
    <div className="shrink-0 flex flex-col items-center py-2 px-1 select-none">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
        Change
      </span>
      <div className="flex gap-2 flex-1 min-h-[120px]">
        <div
          className="w-3 rounded-full"
          style={{
            // matches build_diff_image palette: pink (major) → violet → blue (minor)
            background: 'linear-gradient(to bottom, #f472b6 0%, #a78bfa 50%, #60a5fa 100%)',
          }}
        />
        <div className="flex flex-col justify-between text-[10px] text-slate-500 leading-none">
          <span>Major</span>
          <span className="text-slate-600">Minor</span>
        </div>
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