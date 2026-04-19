import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createProject } from '../api/projects';
import TagPicker from '../components/TagPicker';
import Section from '../components/Section';
import VisibilityPicker from '../components/VisibilityPicker';
import PageBanner from '../components/PageBanner';
import AlertBanner from '../components/AlertBanner';

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
      <PageBanner>
        <div className="relative max-w-2xl mx-auto px-4 py-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#34d399' }}>
            New project
          </p>
          <h1 className="text-3xl font-black text-white tracking-tight">Create a project</h1>
          <p className="text-slate-500 text-sm mt-1">Version your creative work from day one.</p>
        </div>
      </PageBanner>

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
            <VisibilityPicker
              value={form.visibility}
              onChange={(v) => setForm((f) => ({ ...f, visibility: v }))}
            />
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

          {error && <AlertBanner>{error}</AlertBanner>}

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
