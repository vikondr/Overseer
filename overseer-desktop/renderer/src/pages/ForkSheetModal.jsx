import { useState } from 'react';

export default function ForkSheetModal({ projectId, sourceSheet, api, onClose, onDone }) {
  const [name, setName]       = useState(`${sourceSheet?.name ?? 'Sheet'} (fork)`);
  const [description, setDesc] = useState('');
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState('');

  const handleFork = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('Fork name is required.'); return; }
    if (trimmed === sourceSheet?.name) {
      setError('Pick a name different from the source sheet.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const created = await api.forkSheet(projectId, sourceSheet.id, {
        name: trimmed,
        description: description.trim() || undefined,
      });
      onDone(created);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={busy ? undefined : onClose} />

      <div
        className="relative w-full max-w-md border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0a1220 0%, #0f172a 100%)' }}
      >
        <div className="absolute top-0 left-0 w-48 h-48 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 0% 0%, rgba(167,139,250,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-48 h-48 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 100% 100%, rgba(244,114,182,0.08) 0%, transparent 70%)' }} />

        <div className="relative flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#a78bfa' }}>
              Fork sheet
            </p>
            <h2 className="text-white font-bold text-base leading-tight truncate" title={sourceSheet?.name}>
              from <span className="font-mono text-violet-300">{sourceSheet?.name}</span>
            </h2>
          </div>
          {!busy && (
            <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors text-xl ml-4 shrink-0">
              ×
            </button>
          )}
        </div>

        <div className="relative px-6 py-5 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
              Fork name
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleFork(); if (e.key === 'Escape' && !busy) onClose(); }}
              disabled={busy}
              maxLength={100}
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 text-white text-sm rounded-xl focus:outline-none focus:border-violet-500 placeholder:text-slate-700 transition-colors disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
              Description <span className="normal-case font-normal text-slate-700">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              disabled={busy}
              maxLength={500}
              placeholder="What is this fork for?"
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 text-white text-sm rounded-xl focus:outline-none focus:border-violet-500 placeholder:text-slate-700 transition-colors disabled:opacity-50 resize-none"
            />
          </div>

          <p className="text-slate-600 text-[11px] leading-relaxed">
            A fork copies the latest version of every file and stays in this project. The original sheet is unchanged.
          </p>

          {error && (
            <p className="text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="relative px-6 py-4 border-t border-slate-800/60 flex gap-3">
          <button
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 text-sm rounded-xl transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleFork}
            disabled={busy}
            className="flex-1 py-2 btn-primary text-sm rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Forking…
              </>
            ) : (
              'Create fork'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}