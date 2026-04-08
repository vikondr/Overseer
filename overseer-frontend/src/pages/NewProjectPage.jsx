import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createProject } from '../api/projects';
import TagPicker from '../components/TagPicker';

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
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-white mb-8">Create New Project</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Project Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={100}
              value={form.name}
              onChange={set('name')}
              placeholder="My awesome project"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white placeholder-slate-500 rounded-lg focus:outline-none focus:border-blue-400 text-sm"
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
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white placeholder-slate-500 rounded-lg focus:outline-none focus:border-blue-400 text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Visibility</label>
            <select
              value={form.visibility}
              onChange={set('visibility')}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:outline-none focus:border-blue-400 text-sm"
            >
              <option value="PRIVATE">Private – only you</option>
              <option value="PUBLIC">Public – everyone</option>
              <option value="UNLISTED">Unlisted – only with link</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Tags
              {form.tags.length > 0 && (
                <span className="ml-2 text-xs font-normal text-blue-400">
                  {form.tags.length} selected
                </span>
              )}
            </label>
            <TagPicker
              selected={form.tags}
              onChange={(tags) => setForm((f) => ({ ...f, tags }))}
              max={8}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 btn-primary rounded-lg text-sm font-medium"
            >
              {submitting ? 'Creating...' : 'Create Project'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
