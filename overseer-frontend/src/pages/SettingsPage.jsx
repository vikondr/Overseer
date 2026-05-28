import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateProfile, uploadAvatar } from '../api/users';
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
    readmeContent: '',
    location: '',
    websiteUrl: '',
    portfolioUrl: '',
    skills: [],
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState(null);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username || '',
        displayName: user.displayName || '',
        bio: user.bio || '',
        readmeContent: user.readmeContent || '',
        location: user.location || '',
        websiteUrl: user.websiteUrl || '',
        portfolioUrl: user.portfolioUrl || '',
        skills: user.skills ? [...user.skills] : [],
      });
    }
  }, [user]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarError(null);
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) {
      setAvatarError('Please choose a PNG, JPEG, WebP or GIF image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('That image is too large — please choose one under 5 MB.');
      return;
    }
    setAvatarUploading(true);
    try {
      await uploadAvatar(file);
      await reload();
    } catch (err) {
      setAvatarError(err.message);
    } finally {
      setAvatarUploading(false);
    }
  };

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
        // Send empty string explicitly so the user can clear the README;
        // undefined would mean "don't change" on the backend.
        readmeContent: form.readmeContent,
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
              <div className="relative shrink-0">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-full object-cover ring-1 ring-slate-700"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full avatar-gradient flex items-center justify-center text-white font-bold text-xl">
                    {user.username[0].toUpperCase()}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  title="Change profile picture"
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 border border-slate-700 hover:border-blue-500 text-slate-300 hover:text-white flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  {avatarUploading ? (
                    <span className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                  ) : (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.93l-3.243 1.08 1.08-3.243a4 4 0 01.93-1.414z" />
                    </svg>
                  )}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div>
                <p className="text-white font-semibold">{user.displayName || user.username}</p>
                <p className="text-slate-400 text-sm">@{user.username}</p>
                <p className="text-slate-600 text-xs mt-0.5">{user.email}</p>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="mt-2 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                >
                  {avatarUploading ? 'Uploading…' : 'Change profile picture'}
                </button>
                {avatarError && (
                  <p className="text-red-400 text-xs mt-1">{avatarError}</p>
                )}
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

          {/* README section */}
          <Section color="#f472b6" label="README">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Profile README
                <span className="ml-2 text-xs font-normal text-slate-500">
                  Markdown supported · shown on your public profile
                </span>
              </label>
              <textarea
                value={form.readmeContent}
                onChange={set('readmeContent')}
                rows={10}
                maxLength={20000}
                placeholder="# Hi, I'm…\n\nA few paragraphs about your practice, what you're working on, where to find more of your work."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white placeholder-slate-600 rounded-lg focus:outline-none focus:border-pink-400 text-sm transition-colors font-mono leading-relaxed resize-y"
              />
              <p className="mt-1.5 text-xs text-slate-600">
                {form.readmeContent.length} / 20000 characters
              </p>
            </div>
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
