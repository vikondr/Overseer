import { useEffect, useState } from 'react';
import Modal from './Modal';
import { getFileVersions } from '../api/files';
import { diffImages, fetchFileBlob } from '../api/pixeldiff';

export default function CompareVersionsModal({ open, onClose, file, sheetId }) {
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
    getFileVersions(sheetId, file.fileName)
      .then((vs) => {
        const sorted = [...vs].sort((x, y) => y.version - x.version);
        setVersions(sorted);
        setBId(sorted[0]?.id ?? '');
        setAId(sorted[1]?.id ?? sorted[0]?.id ?? '');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingVersions(false));
  }, [open, file, sheetId]);

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
      const [a, b] = await Promise.all([fetchFileBlob(aId), fetchFileBlob(bId)]);
      const data = await diffImages(a, b);
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
    <Modal open={open} onClose={onClose} maxWidth="max-w-3xl">
      <div className="flex items-start justify-between mb-1 gap-3">
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
          <div className="grid grid-cols-2 gap-3 mt-4">
            <VersionPicker label="Before" value={aId} onChange={setAId} versions={versions} />
            <VersionPicker label="After" value={bId} onChange={setBId} versions={versions} />
          </div>

          <button
            onClick={runDiff}
            disabled={running || !aId || !bId || aId === bId}
            className="w-full mt-4 py-2 btn-primary text-sm rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? 'Comparing…' : 'Compare these versions'}
          </button>

          {error && (
            <p className="mt-3 text-red-400 text-xs">{error}</p>
          )}

          {result && (
            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-800/70 bg-slate-950/40">
                <span className="text-2xl font-black tabular-nums" style={{ color: scoreColor }}>
                  {scorePct}%
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="text-xs text-slate-400 font-medium">match</span>
                  <span className="text-[11px] text-slate-500">{scoreLabel}</span>
                </div>
                <span className="ml-auto text-xs text-slate-600">
                  {result.width}×{result.height}
                </span>
              </div>
              <div className="rounded-xl border border-slate-800/70 overflow-hidden bg-slate-950/40">
                <img
                  src={`data:image/png;base64,${result.diff_image}`}
                  alt="Highlighted changes between the two versions"
                  className="w-full max-h-[60vh] object-contain"
                />
                <p className="px-4 py-2 text-[11px] text-slate-500 border-t border-slate-800/70">
                  Coloured areas highlight what changed between the two versions.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
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