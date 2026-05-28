import { useEffect, useState } from 'react';

const VISIBILITIES = [
  { value: 'PRIVATE',  label: 'Private',  hint: 'Only you and the people you invite can see it.' },
  { value: 'UNLISTED', label: 'Unlisted', hint: "Anyone with the link can view, but it won't appear in Explore." },
  { value: 'PUBLIC',   label: 'Public',   hint: 'Visible in Explore. Anyone with read access can fork.' },
];

export default function CreateProjectModal({ api, onClose, onDone }) {
  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility]   = useState('PRIVATE');
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');

  // Esc closes the modal.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !submitting) onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [submitting, onClose]);

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError('');
    try {
      const created = await api.createProject({
        name: trimmed,
        description: description.trim() || undefined,
        visibility,
      });
      onDone?.(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => { if (!submitting) onClose?.(); }}
      />
      <form
        onSubmit={submit}
        className="relative w-full max-w-md border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0d1424 0%, #111827 100%)' }}
      >
        <div
          className="absolute top-0 right-0 w-40 h-40 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 100% 0%, rgba(96,165,250,0.12) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-32 h-32 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 0% 100%, rgba(167,139,250,0.10) 0%, transparent 70%)' }}
        />

        <div className="relative px-6 py-5">
          <div className="flex items-start justify-between mb-1 gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#60a5fa' }}>
                New project
              </p>
              <h3 className="text-white font-semibold text-base leading-tight">
                Create a project
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                An empty project starts with a default <span className="font-mono text-slate-400">main</span> sheet.
                Push files to it later.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { if (!submitting) onClose?.(); }}
              disabled={submitting}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors disabled:opacity-40"
              title="Close"
            >
              ✕
            </button>
          </div>

          <label className="block mt-4">
            <span className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Name</span>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="Project name"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white text-sm rounded-xl focus:outline-none focus:border-blue-500 placeholder:text-slate-700 transition-colors"
            />
          </label>

          <label className="block mt-4">
            <span className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
              Description <span className="normal-case font-normal text-slate-700">(optional)</span>
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="One-line summary that shows on cards and the explore page."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white text-sm rounded-xl focus:outline-none focus:border-blue-500 placeholder:text-slate-700 transition-colors resize-y"
            />
          </label>

          <fieldset className="mt-4">
            <legend className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
              Visibility
            </legend>
            <div className="space-y-1.5">
              {VISIBILITIES.map((v) => {
                const active = visibility === v.value;
                return (
                  <label
                    key={v.value}
                    className="flex items-start gap-3 px-3 py-2 rounded-xl border cursor-pointer transition-colors"
                    style={active
                      ? { borderColor: 'rgba(96,165,250,0.35)', background: 'rgba(96,165,250,0.08)' }
                      : { borderColor: 'rgba(30,41,59,0.8)', background: 'rgba(15,23,42,0.4)' }}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      value={v.value}
                      checked={active}
                      onChange={() => setVisibility(v.value)}
                      className="mt-0.5 accent-blue-500"
                    />
                    <div className="min-w-0">
                      <span className={`block text-sm font-medium ${active ? 'text-blue-200' : 'text-slate-300'}`}>
                        {v.label}
                      </span>
                      <span className="block text-[11px] text-slate-500 leading-snug">{v.hint}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {error && (
            <p className="mt-3 text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 mt-5">
            <button
              type="button"
              onClick={() => { if (!submitting) onClose?.(); }}
              disabled={submitting}
              className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-sm rounded-xl transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="flex-1 py-2 btn-primary text-sm rounded-xl font-semibold disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
