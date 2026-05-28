import { useEffect, useMemo, useState } from 'react';
import MembersPanel from './MembersPanel';

const VISIBILITIES = [
  { value: 'PRIVATE',  label: 'Private',  hint: 'Only you and the people you invite can see it.' },
  { value: 'UNLISTED', label: 'Unlisted', hint: "Anyone with the link can view, but it won't appear in Explore." },
  { value: 'PUBLIC',   label: 'Public',   hint: 'Visible in Explore. Anyone with read access can fork.' },
];

const SECTION_ACCENT = '#60a5fa';

/**
 * One stop for everything a project owner/editor wants to manage:
 * name, description, visibility, tags, and collaborators.
 * Replaces the old standalone Members modal + inline rename in the banner.
 */
export default function ProjectSettingsModal({ project, myRole, api, onClose, onSaved }) {
  const canEdit  = myRole === 'OWNER' || myRole === 'EDITOR';
  const isOwner  = myRole === 'OWNER';

  const initial = useMemo(() => ({
    name:        project.name ?? '',
    description: project.description ?? '',
    visibility:  project.visibility ?? 'PRIVATE',
    tagsText:    (project.tags ?? []).join(', '),
  }), [project]);

  const [form, setForm]       = useState(initial);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);

  // Reset the form when switching projects without unmounting.
  useEffect(() => { setForm(initial); setError(''); setSuccess(false); }, [initial]);

  // Esc closes the modal (only when no save is in flight).
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [saving, onClose]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const dirty = (
    form.name !== initial.name
    || form.description !== initial.description
    || form.visibility !== initial.visibility
    || form.tagsText !== initial.tagsText
  );

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canEdit || !dirty) return;
    setSaving(true);
    setError('');
    setSuccess(false);

    const tags = form.tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const payload = {
        name:        form.name.trim() !== initial.name ? form.name.trim() : undefined,
        description: form.description !== initial.description ? form.description : undefined,
        visibility:  form.visibility !== initial.visibility ? form.visibility : undefined,
        tags:        form.tagsText !== initial.tagsText ? tags : undefined,
      };
      const updated = await api.updateProject(project.id, payload);
      onSaved?.(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => { if (!saving) onClose?.(); }}
      />
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0a1220 0%, #0f172a 100%)' }}
      >
        <div
          className="absolute top-0 right-0 w-48 h-48 pointer-events-none"
          style={{ background: `radial-gradient(circle at 100% 0%, ${SECTION_ACCENT}1c 0%, transparent 70%)` }}
        />
        <div
          className="absolute bottom-0 left-0 w-48 h-48 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 0% 100%, rgba(167,139,250,0.10) 0%, transparent 70%)' }}
        />

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 py-4 border-b border-slate-800/60 shrink-0">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: SECTION_ACCENT }}>
              Project settings
            </p>
            <h2 className="text-white font-bold text-base leading-tight truncate">{project.name}</h2>
          </div>
          <button
            type="button"
            onClick={() => { if (!saving) onClose?.(); }}
            disabled={saving}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors disabled:opacity-40"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="relative flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── General ───────────────────────────────────────── */}
          <Section accent={SECTION_ACCENT} label="General">
            <form onSubmit={handleSave} className="space-y-4">
              <Field label="Name">
                <input
                  type="text"
                  value={form.name}
                  onChange={set('name')}
                  disabled={!canEdit || saving}
                  maxLength={100}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white text-sm rounded-xl focus:outline-none focus:border-blue-500 placeholder:text-slate-700 transition-colors disabled:opacity-60"
                />
              </Field>

              <Field label="Description" hint="Shown on project cards and the explore page.">
                <textarea
                  value={form.description}
                  onChange={set('description')}
                  disabled={!canEdit || saving}
                  rows={3}
                  maxLength={2000}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white text-sm rounded-xl focus:outline-none focus:border-blue-500 placeholder:text-slate-700 transition-colors resize-y disabled:opacity-60"
                />
              </Field>

              <Field label="Visibility">
                <div className="space-y-1.5">
                  {VISIBILITIES.map((v) => {
                    const active = form.visibility === v.value;
                    return (
                      <label
                        key={v.value}
                        className={`flex items-start gap-3 px-3 py-2 rounded-xl border transition-colors ${canEdit && !saving ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
                        style={active
                          ? { borderColor: 'rgba(96,165,250,0.35)', background: 'rgba(96,165,250,0.08)' }
                          : { borderColor: 'rgba(30,41,59,0.8)', background: 'rgba(15,23,42,0.4)' }}
                      >
                        <input
                          type="radio"
                          name="visibility"
                          value={v.value}
                          checked={active}
                          disabled={!canEdit || saving}
                          onChange={() => setForm((f) => ({ ...f, visibility: v.value }))}
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
              </Field>

              <Field label="Tags" hint="Comma-separated. Used on cards and tag filters.">
                <input
                  type="text"
                  value={form.tagsText}
                  onChange={set('tagsText')}
                  disabled={!canEdit || saving}
                  placeholder="branding, print, magazine"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white text-sm rounded-xl focus:outline-none focus:border-blue-500 placeholder:text-slate-700 transition-colors disabled:opacity-60"
                />
              </Field>

              {error && (
                <p className="text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}
              {success && !error && (
                <p className="text-emerald-400 text-xs bg-emerald-900/20 border border-emerald-800/40 rounded-xl px-3 py-2">
                  Saved.
                </p>
              )}

              {canEdit && (
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!dirty || saving}
                    className="px-4 py-2 btn-primary text-sm rounded-xl font-semibold disabled:opacity-40"
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              )}
              {!canEdit && (
                <p className="text-[11px] text-slate-600">
                  Only the project owner or editors can change these settings.
                </p>
              )}
            </form>
          </Section>

          {/* ── Collaborators ─────────────────────────────────── */}
          <Section accent="#f472b6" label="Collaborators">
            <MembersPanel projectId={project.id} isOwner={isOwner} api={api} />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ accent, label, children }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
        <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent }}>{label}</h3>
      </div>
      <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4">
        {children}
      </div>
    </section>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
        {label}
        {hint && <span className="ml-2 normal-case font-normal text-slate-700">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
