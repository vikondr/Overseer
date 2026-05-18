import { useEffect, useMemo, useState } from 'react';

const KINDS = {
  MODIFIED_IN_BOTH: { label: 'Modified',  color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)' },
  ONLY_IN_FORK:     { label: 'New in fork', color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)' },
  ONLY_IN_PARENT:   { label: 'Missing in fork', color: '#f472b6', bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.3)' },
  UNCHANGED:        { label: 'Unchanged', color: '#475569', bg: 'rgba(30,41,59,0.5)', border: 'rgba(51,65,85,0.4)' },
};

function defaultResolution(kind) {
  // MODIFIED_IN_BOTH → bring the fork's change in (the merge intent).
  // ONLY_IN_FORK     → add the file to the parent (per design's "auto-take").
  // ONLY_IN_PARENT   → keep the parent's file (safer; ambiguous between "deleted in fork" and "added in parent").
  if (kind === 'ONLY_IN_PARENT') return 'TAKE_PARENT';
  return 'TAKE_FORK';
}

function resolutionLabels(kind) {
  switch (kind) {
    case 'MODIFIED_IN_BOTH': return { TAKE_FORK: 'Use fork',         TAKE_PARENT: 'Keep parent' };
    case 'ONLY_IN_FORK':     return { TAKE_FORK: 'Add to parent',    TAKE_PARENT: 'Skip' };
    case 'ONLY_IN_PARENT':   return { TAKE_FORK: 'Delete from parent', TAKE_PARENT: 'Keep' };
    default:                 return { TAKE_FORK: 'Take fork',        TAKE_PARENT: 'Keep parent' };
  }
}

export default function MergeSheetModal({
  projectId,
  forkSheet,
  parentSheet,
  canMerge,
  api,
  onClose,
  onDone,
}) {
  const [preview, setPreview]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [resolutions, setRes]   = useState({}); // fileName → 'TAKE_FORK' | 'TAKE_PARENT'
  const [diffOpen, setDiffOpen] = useState({}); // fileName → boolean
  const [diffs, setDiffs]       = useState({}); // fileName → { score, diff_image, width, height } | { error }
  const [diffLoading, setDiffLoading] = useState({}); // fileName → bool
  const [commitMsg, setCommitMsg] = useState('');
  const [committing, setCommitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.previewMerge(projectId, forkSheet.id)
      .then((data) => {
        if (cancelled) return;
        setPreview(data);
        const initial = {};
        for (const f of data.files || []) {
          if (f.kind !== 'UNCHANGED') initial[f.fileName] = defaultResolution(f.kind);
        }
        setRes(initial);
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [api, projectId, forkSheet.id]);

  const buckets = useMemo(() => {
    const b = { MODIFIED_IN_BOTH: [], ONLY_IN_FORK: [], ONLY_IN_PARENT: [], UNCHANGED: [] };
    for (const f of preview?.files || []) b[f.kind].push(f);
    return b;
  }, [preview]);

  const actionableCount =
    (buckets.MODIFIED_IN_BOTH?.length || 0) +
    (buckets.ONLY_IN_FORK?.length || 0) +
    (buckets.ONLY_IN_PARENT?.length || 0);

  const toggleDiff = async (file) => {
    const name = file.fileName;
    setDiffOpen((s) => ({ ...s, [name]: !s[name] }));
    if (diffs[name] || diffLoading[name]) return;
    if (!file.parentFile?.id || !file.forkFile?.id) return;
    setDiffLoading((s) => ({ ...s, [name]: true }));
    try {
      const [a, b] = await Promise.all([
        api.fetchFileBlob(file.parentFile.id),
        api.fetchFileBlob(file.forkFile.id),
      ]);
      const result = await api.diffImages(a, b);
      setDiffs((s) => ({ ...s, [name]: result }));
    } catch (e) {
      setDiffs((s) => ({ ...s, [name]: { error: e.message } }));
    } finally {
      setDiffLoading((s) => ({ ...s, [name]: false }));
    }
  };

  const handleCommit = async () => {
    setCommitting(true);
    setError('');
    try {
      const payload = {
        commitMessage: commitMsg.trim() || undefined,
        resolutions: Object.entries(resolutions).map(([fileName, resolution]) => ({ fileName, resolution })),
      };
      const result = await api.commitMerge(projectId, forkSheet.id, payload);
      onDone(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={committing ? undefined : onClose} />

      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0a1220 0%, #0f172a 100%)' }}
      >
        <div className="absolute top-0 left-0 w-48 h-48 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 0% 0%, rgba(167,139,250,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-48 h-48 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 100% 100%, rgba(96,165,250,0.08) 0%, transparent 70%)' }} />

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 py-4 border-b border-slate-800/60 shrink-0">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#a78bfa' }}>
              Merge fork
            </p>
            <h2 className="text-white font-bold text-base leading-tight truncate">
              <span className="font-mono text-violet-300">{forkSheet.name}</span>
              <span className="mx-2 text-slate-600">→</span>
              <span className="font-mono text-blue-300">{parentSheet?.name ?? 'parent'}</span>
            </h2>
          </div>
          {!committing && (
            <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors text-xl ml-4 shrink-0">
              ×
            </button>
          )}
        </div>

        {/* Body */}
        <div className="relative flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {loading ? (
            <div className="py-12 text-slate-600 text-sm animate-pulse text-center">Computing diff…</div>
          ) : !preview ? (
            <p className="text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-xl px-3 py-2">
              {error || 'Failed to load preview.'}
            </p>
          ) : actionableCount === 0 ? (
            <div className="py-10 text-center">
              <p className="text-slate-300 text-sm font-semibold">Already up to date</p>
              <p className="text-slate-600 text-xs mt-1">
                The fork has no changes relative to the parent sheet.
              </p>
            </div>
          ) : (
            <>
              {/* Summary chips */}
              <div className="flex flex-wrap gap-2">
                {['MODIFIED_IN_BOTH', 'ONLY_IN_FORK', 'ONLY_IN_PARENT', 'UNCHANGED'].map((k) => {
                  const n = buckets[k]?.length || 0;
                  if (n === 0) return null;
                  const cfg = KINDS[k];
                  return (
                    <span
                      key={k}
                      className="text-[11px] font-semibold px-2 py-1 rounded-md"
                      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
                    >
                      {n} {cfg.label.toLowerCase()}
                    </span>
                  );
                })}
              </div>

              {/* Conflict groups */}
              {['MODIFIED_IN_BOTH', 'ONLY_IN_FORK', 'ONLY_IN_PARENT'].map((kind) => {
                const rows = buckets[kind] || [];
                if (rows.length === 0) return null;
                return (
                  <FileGroup
                    key={kind}
                    kind={kind}
                    rows={rows}
                    resolutions={resolutions}
                    onResolve={(name, value) => setRes((s) => ({ ...s, [name]: value }))}
                    diffOpen={diffOpen}
                    diffs={diffs}
                    diffLoading={diffLoading}
                    onToggleDiff={toggleDiff}
                  />
                );
              })}

              {/* Unchanged collapsed list */}
              {(buckets.UNCHANGED?.length || 0) > 0 && (
                <details className="rounded-xl border border-slate-800/70 bg-slate-950/40">
                  <summary className="cursor-pointer px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-slate-600 hover:text-slate-400">
                    {buckets.UNCHANGED.length} unchanged
                  </summary>
                  <ul className="px-3 pb-2 text-xs text-slate-600 font-mono">
                    {buckets.UNCHANGED.map((f) => (
                      <li key={f.fileName} className="py-0.5 truncate">{f.fileName}</li>
                    ))}
                  </ul>
                </details>
              )}

              {/* Role gate notice */}
              {!canMerge && (
                <p className="text-amber-300 text-xs bg-amber-900/15 border border-amber-700/30 rounded-xl px-3 py-2">
                  You need EDITOR or OWNER access to commit a merge. You can review the diff here, but the Merge button is disabled.
                </p>
              )}

              {/* Commit message */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
                  Merge commit message <span className="normal-case font-normal text-slate-700">(optional)</span>
                </label>
                <input
                  value={commitMsg}
                  onChange={(e) => setCommitMsg(e.target.value)}
                  disabled={committing || !canMerge}
                  maxLength={500}
                  placeholder={`Merged from fork '${forkSheet.name}'`}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 text-white text-sm rounded-xl focus:outline-none focus:border-violet-500 placeholder:text-slate-700 transition-colors disabled:opacity-50"
                />
              </div>
            </>
          )}

          {error && !loading && (
            <p className="text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="relative px-6 py-4 border-t border-slate-800/60 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={committing}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 text-sm rounded-xl transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleCommit}
            disabled={committing || loading || !preview || actionableCount === 0 || !canMerge}
            className="flex-1 py-2 btn-primary text-sm rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {committing ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Merging…
              </>
            ) : (
              `Merge ${actionableCount} file${actionableCount === 1 ? '' : 's'}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────── */

function FileGroup({ kind, rows, resolutions, onResolve, diffOpen, diffs, diffLoading, onToggleDiff }) {
  const cfg = KINDS[kind];
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
        <span className="text-slate-700 text-[11px]">({rows.length})</span>
      </div>
      <div className="border border-slate-800/70 rounded-xl overflow-hidden">
        {rows.map((file, i) => (
          <FileRow
            key={file.fileName}
            file={file}
            kind={kind}
            last={i === rows.length - 1}
            resolution={resolutions[file.fileName]}
            onResolve={(v) => onResolve(file.fileName, v)}
            isDiffOpen={!!diffOpen[file.fileName]}
            diff={diffs[file.fileName]}
            diffLoading={!!diffLoading[file.fileName]}
            onToggleDiff={() => onToggleDiff(file)}
          />
        ))}
      </div>
    </div>
  );
}

function FileRow({ file, kind, last, resolution, onResolve, isDiffOpen, diff, diffLoading, onToggleDiff }) {
  const labels = resolutionLabels(kind);
  const canDiff = kind === 'MODIFIED_IN_BOTH';
  const isImage = (file.forkFile?.mimeType || file.parentFile?.mimeType || '').startsWith('image/');

  return (
    <div className={!last ? 'border-b border-slate-800/40' : ''}>
      <div className="flex items-center gap-3 px-3 py-2">
        <span className="flex-1 font-mono text-xs text-slate-300 truncate" title={file.fileName}>
          {file.fileName}
        </span>

        {canDiff && isImage && (
          <button
            onClick={onToggleDiff}
            className="text-[11px] text-violet-300 hover:text-violet-200 underline-offset-2 hover:underline shrink-0"
          >
            {isDiffOpen ? 'Hide diff' : 'View diff'}
          </button>
        )}

        <ResolutionToggle value={resolution} labels={labels} onChange={onResolve} />
      </div>

      {isDiffOpen && (
        <div className="px-3 pb-3">
          {diffLoading ? (
            <div className="text-slate-600 text-xs animate-pulse py-3">Running pixel diff…</div>
          ) : diff?.error ? (
            <p className="text-red-400 text-xs">{diff.error}</p>
          ) : diff ? (
            <div className="rounded-lg border border-slate-800/70 overflow-hidden bg-slate-950/40">
              <div className="flex items-center gap-3 px-3 py-2 border-b border-slate-800/60 text-[11px]">
                <span className="font-semibold uppercase tracking-widest text-slate-500">SSIM</span>
                <span className="font-black tabular-nums" style={{ color: scoreColor(diff.score) }}>
                  {(diff.score * 100).toFixed(2)}%
                </span>
                <span className="ml-auto text-slate-600 font-mono">{diff.width}×{diff.height}</span>
              </div>
              <img
                src={`data:image/png;base64,${diff.diff_image}`}
                alt="Pixel diff"
                className="w-full max-h-[40vh] object-contain bg-slate-950"
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ResolutionToggle({ value, labels, onChange }) {
  return (
    <div className="flex items-center gap-1 shrink-0 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
      {['TAKE_FORK', 'TAKE_PARENT'].map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className="px-2 py-1 rounded-md text-[11px] font-semibold transition-colors"
            style={active
              ? { background: 'rgba(167,139,250,0.18)', color: '#c4b5fd' }
              : { color: '#475569' }}
          >
            {labels[opt]}
          </button>
        );
      })}
    </div>
  );
}

function scoreColor(score) {
  if (score > 0.95) return '#34d399';
  if (score > 0.8)  return '#60a5fa';
  if (score > 0.5)  return '#a78bfa';
  return '#f472b6';
}