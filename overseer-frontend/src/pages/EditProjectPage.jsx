import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProjectBySlug, updateProject } from '../api/projects';
import TagPicker from '../components/TagPicker';
import VisibilityPicker from '../components/VisibilityPicker';
import LoadingPage from '../components/LoadingPage';
import AlertBanner from '../components/AlertBanner';

export default function EditProjectPage() {
  const { username, slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    visibility: 'PUBLIC',
    tags: [],
    readmeContent: '',
    livePreviewUrl: '',
  });

  useEffect(() => {
    getProjectBySlug(username, slug)
      .then((p) => {
        if (user?.username !== username) {
          navigate(`/u/${username}/${slug}`);
          return;
        }
        setProject(p);
        setForm({
          name: p.name ?? '',
          description: p.description ?? '',
          visibility: p.visibility ?? 'PUBLIC',
          tags: [...(p.tags ?? [])],
          readmeContent: p.readmeContent ?? '',
          livePreviewUrl: p.livePreviewUrl ?? '',
        });
      })
      .catch(() => navigate('/404'))
      .finally(() => setLoading(false));
  }, [username, slug, user, navigate]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Project name is required.'); return; }
    setError('');
    setSaving(true);
    try {
      await updateProject(project.id, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        visibility: form.visibility,
        tags: form.tags,
        readmeContent: form.readmeContent.trim() || null,
        livePreviewUrl: form.livePreviewUrl.trim() || null,
      });
      setSaved(true);
      setTimeout(() => {
        navigate(`/u/${username}/${slug}`);
      }, 800);
    } catch (err) {
      setError(err.message ?? 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingPage />;
  if (!project) return null;

  return (
    <div className="min-h-screen bg-slate-950 pt-14">
      {/* Header strip */}
      <div
        className="border-b border-slate-800/60"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1f3a 100%)' }}
      >
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-0.5">
              <Link to={`/u/${username}`} className="hover:text-white transition-colors">{username}</Link>
              <span>/</span>
              <Link to={`/u/${username}/${slug}`} className="hover:text-white transition-colors">{project.name}</Link>
              <span>/</span>
              <span className="text-white">Edit</span>
            </div>
            <h1 className="text-lg font-bold text-white">Edit project</h1>
          </div>
          <Link
            to={`/u/${username}/${slug}`}
            className="text-slate-500 hover:text-white text-sm transition-colors"
          >
            Cancel
          </Link>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Name */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5">
              Project name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              maxLength={100}
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 text-white text-sm rounded-lg focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
              placeholder="My awesome project"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              maxLength={2000}
              rows={3}
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 text-white text-sm rounded-lg focus:outline-none focus:border-blue-500 placeholder:text-slate-600 resize-y"
              placeholder="What's this project about?"
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Visibility</label>
            <VisibilityPicker
              value={form.visibility}
              onChange={(v) => setForm((f) => ({ ...f, visibility: v }))}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Tags</label>
            <TagPicker
              selected={form.tags}
              onChange={(tags) => setForm((f) => ({ ...f, tags }))}
              max={8}
            />
          </div>

          {/* Live preview URL */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5">Live preview URL</label>
            <input
              type="url"
              value={form.livePreviewUrl}
              onChange={set('livePreviewUrl')}
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 text-white text-sm rounded-lg focus:outline-none focus:border-blue-500 placeholder:text-slate-600 font-mono"
              placeholder="https://your-project.example.com"
            />
          </div>

          {/* README */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5">README</label>
            <textarea
              value={form.readmeContent}
              onChange={set('readmeContent')}
              rows={8}
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 text-white text-sm rounded-lg focus:outline-none focus:border-blue-500 placeholder:text-slate-600 resize-y font-mono"
              placeholder="Describe your project in detail…"
            />
          </div>

          {error && <AlertBanner>{error}</AlertBanner>}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || saved}
              className="px-6 py-2.5 btn-primary rounded-lg text-sm font-semibold disabled:opacity-60 transition-all"
            >
              {saved ? 'Saved!' : saving ? 'Saving…' : 'Save changes'}
            </button>
            <Link
              to={`/u/${username}/${slug}`}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
