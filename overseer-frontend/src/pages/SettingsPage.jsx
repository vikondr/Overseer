import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../api/users';

export default function SettingsPage() {
  const { user, reload } = useAuth();
  const [form, setForm] = useState({
    displayName: '',
    bio: '',
    location: '',
    websiteUrl: '',
    portfolioUrl: '',
    skills: '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      setForm({
        displayName: user.displayName || '',
        bio: user.bio || '',
        location: user.location || '',
        websiteUrl: user.websiteUrl || '',
        portfolioUrl: user.portfolioUrl || '',
        skills: (user.skills || []).join(', '),
      });
    }
  }, [user]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const skills = form.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await updateProfile({
        displayName: form.displayName || undefined,
        bio: form.bio || undefined,
        location: form.location || undefined,
        websiteUrl: form.websiteUrl || undefined,
        portfolioUrl: form.portfolioUrl || undefined,
        skills: skills.length ? skills : undefined,
      });
      await reload();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-14">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

        {user && (
          <div className="flex items-center gap-3 mb-8 pb-8 border-b border-slate-800">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.username} className="w-14 h-14 rounded-full" />
            ) : (
              <div className="w-14 h-14 rounded-full avatar-gradient flex items-center justify-center text-white font-bold text-xl">
                {user.username[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-white font-medium">{user.displayName || user.username}</p>
              <p className="text-slate-400 text-sm">
                @{user.username} · {user.email}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Display Name" value={form.displayName} onChange={set('displayName')} />
          <Field label="Bio" value={form.bio} onChange={set('bio')} multiline />
          <Field label="Location" value={form.location} onChange={set('location')} />
          <Field label="Website" value={form.websiteUrl} onChange={set('websiteUrl')} type="url" />
          <Field
            label="Portfolio"
            value={form.portfolioUrl}
            onChange={set('portfolioUrl')}
            type="url"
          />
          <Field
            label="Skills"
            hint="(comma-separated)"
            value={form.skills}
            onChange={set('skills')}
          />

          {error && (
            <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-green-400 text-sm bg-green-900/20 border border-green-800 rounded-lg px-3 py-2">
              Profile updated!
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 btn-primary rounded-lg text-sm font-medium"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, hint, value, onChange, type = 'text', multiline = false }) {
  const inputClass =
    'w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white placeholder-slate-500 rounded-lg focus:outline-none focus:border-blue-500 text-sm';
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">
        {label}
        {hint && <span className="text-slate-500 font-normal ml-1">{hint}</span>}
      </label>
      {multiline ? (
        <textarea
          rows={3}
          maxLength={500}
          value={value}
          onChange={onChange}
          className={`${inputClass} resize-none`}
        />
      ) : (
        <input type={type} value={value} onChange={onChange} className={inputClass} />
      )}
    </div>
  );
}
