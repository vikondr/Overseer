import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../api/users';
import TagPicker from '../components/TagPicker';
import Section from '../components/Section';
import Field from '../components/Field';
import AlertBanner from '../components/AlertBanner';

export default function SettingsPage() {
  const { user, reload } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '',
    displayName: '',
    bio: '',
    location: '',
    websiteUrl: '',
    portfolioUrl: '',
    skills: [],
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username || '',
        displayName: user.displayName || '',
        bio: user.bio || '',
        location: user.location || '',
        websiteUrl: user.websiteUrl || '',
        portfolioUrl: user.portfolioUrl || '',
        skills: user.skills ? [...user.skills] : [],
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
      const usernameChanged = form.username && form.username !== user.username;
      await updateProfile({
        username: usernameChanged ? form.username : undefined,
        displayName: form.displayName || undefined,
        bio: form.bio || undefined,
        location: form.location || undefined,
        websiteUrl: form.websiteUrl || undefined,
        portfolioUrl: form.portfolioUrl || undefined,
        skills: form.skills.length ? form.skills : undefined,
      });
      await reload();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      if (usernameChanged) {
        navigate(`/u/${form.username}`);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-14">
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your public profile and preferences</p>
        </div>

        {/* Profile preview card */}
        {user && (
          <div
            className="relative rounded-2xl overflow-hidden mb-8 border border-slate-800"
            style={{ background: 'linear-gradient(135deg, rgba(96,165,250,0.07) 0%, rgba(167,139,250,0.07) 100%)' }}
          >
            <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 70%)' }} />
            <div className="absolute bottom-0 left-0 w-32 h-32 pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(96,165,250,0.1) 0%, transparent 70%)' }} />

            <div className="relative flex items-center gap-4 p-5">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.username} className="w-14 h-14 rounded-full shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-full avatar-gradient flex items-center justify-center text-white font-bold text-xl shrink-0">
                  {user.username[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-white font-semibold">{user.displayName || user.username}</p>
                <p className="text-slate-400 text-sm">@{user.username}</p>
                <p className="text-slate-600 text-xs mt-0.5">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Identity section */}
          <Section color="#60a5fa" label="Identity">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={set('username')}
                maxLength={30}
                pattern="^[a-zA-Z0-9_-]{3,30}$"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white placeholder-slate-600 rounded-lg focus:outline-none focus:border-blue-400 text-sm transition-colors font-mono"
              />
              {form.username !== user?.username && form.username.length >= 3 && (
                <p className="mt-1.5 text-xs" style={{ color: '#f472b6' }}>
                  Changing your username will update your profile URL to /u/{form.username}
                </p>
              )}
            </div>
            <Field label="Display Name" value={form.displayName} onChange={set('displayName')} />
            <Field label="Bio" value={form.bio} onChange={set('bio')} multiline />
            <Field label="Location" value={form.location} onChange={set('location')} />
          </Section>

          {/* Links section */}
          <Section color="#a78bfa" label="Links">
            <Field label="Website" value={form.websiteUrl} onChange={set('websiteUrl')} type="url" />
            <Field label="Portfolio" value={form.portfolioUrl} onChange={set('portfolioUrl')} type="url" />
          </Section>

          {/* Skills section */}
          <Section color="#34d399" label="Skills">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Skills
                {form.skills.length > 0 && (
                  <span className="ml-2 text-xs font-normal" style={{ color: '#34d399' }}>
                    {form.skills.length} selected
                  </span>
                )}
              </label>
              <TagPicker
                selected={form.skills}
                onChange={(skills) => setForm((f) => ({ ...f, skills }))}
                max={10}
              />
            </div>
          </Section>

          {error && <AlertBanner>{error}</AlertBanner>}
          {success && <AlertBanner type="success">Profile updated successfully.</AlertBanner>}

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 btn-primary rounded-lg text-sm font-semibold"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
