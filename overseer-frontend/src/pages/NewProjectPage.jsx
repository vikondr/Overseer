import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createProject } from '../api/projects';
import TagPicker from '../components/TagPicker';

const VISIBILITY_OPTIONS = [
  { value: 'PRIVATE',  label: 'Private',   desc: 'Only you',           color: '#60a5fa' },
  { value: 'PUBLIC',   label: 'Public',    desc: 'Everyone',           color: '#34d399' },
  { value: 'UNLISTED', label: 'Unlisted',  desc: 'Only with link',     color: '#f472b6' },
];

export default function NewProjectPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    description: '',
    visibility: 'PRIVATE',
    tags: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const project = await createProject({
        name: form.name,
        description: form.description || undefined,
        visibility: form.visibility,
        tags: form.tags.length ? form.tags : undefined,
      });
      navigate(`/u/${user.username}/${project.slug}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-14">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="relative border-b border-slate-800/60 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            opacity: 0.4,
          }} />
          <div style={{ position: 'absolute', top: '-40%', left: '-5%', width: '40vw', height: '40vw', maxWidth: 400, maxHeight: 400,
            background: 'radial-gradient(circle, rgba(96,165,250,0.1) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', bottom: '-20%', right: '5%', width: '30vw', height: '30vw', maxWidth: 320, maxHeight: 320,
            background: 'radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 65%)' }} />
        </div>
        <div className="relative max-w-2xl mx-auto px-4 py-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#34d399' }}>
            New project
          </p>
          <h1 className="text-3xl font-black text-white tracking-tight">Create a project</h1>
          <p className="text-slate-500 text-sm mt-1">Version your creative work from day one.</p>
        </div>
      </div>

      {/* ── Form ────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Details section */}
          <Section color="#60a5fa" label="Details">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Project name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={form.name}
                onChange={set('name')}
                placeholder="My awesome project"
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 text-white placeholder-slate-600 rounded-lg focus:outline-none focus:border-blue-400 text-sm transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
              <textarea
                maxLength={2000}
                rows={3}
                value={form.description}
                onChange={set('description')}
                placeholder="What is this project about?"
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 text-white placeholder-slate-600 rounded-lg focus:outline-none focus:border-blue-400 text-sm resize-none transition-colors"
              />
            </div>
          </Section>

          {/* Visibility section */}
          <Section color="#34d399" label="Visibility">
            <div className="flex flex-col sm:flex-row gap-2">
              {VISIBILITY_OPTIONS.map(({ value, label, desc, color }) => {
                const active = form.visibility === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, visibility: value }))}
                    className="flex-1 text-left px-4 py-3 rounded-xl border transition-all"
                    style={
                      active
                        ? { borderColor: `${color}55`, background: `${color}0e`, color }
                        : { borderColor: '#1e293b', background: 'transparent', color: '#475569' }
                    }
                  >
                    <div className="font-semibold text-sm">{label}</div>
                    <div className="text-xs mt-0.5 opacity-70">{desc}</div>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Tags section */}
          <Section color="#a78bfa" label="Tags">
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-slate-400 text-sm">Add up to 8 tags to help people find your work.</p>
                {form.tags.length > 0 && (
                  <span className="text-xs font-medium" style={{ color: '#a78bfa' }}>
                    {form.tags.length} selected
                  </span>
                )}
              </div>
              <TagPicker
                selected={form.tags}
                onChange={(tags) => setForm((f) => ({ ...f, tags }))}
                max={8}
              />
            </div>
          </Section>

          {error && (
            <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 btn-primary rounded-lg text-sm font-semibold"
            >
              {submitting ? 'Creating…' : 'Create Project'}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-300 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ color, label, children }) {
  return (
    <div className="rounded-xl border border-slate-800 overflow-hidden" style={{ background: 'rgba(15,23,42,0.6)' }}>
      <div
        className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-800"
        style={{ background: `linear-gradient(90deg, ${color}10 0%, transparent 100%)` }}
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color }}>
          {label}
        </span>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  );
}