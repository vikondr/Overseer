import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUser, isFollowingUser, followUser, unfollowUser } from '../api/users';
import { getUserProjects, deleteProject } from '../api/projects';
import ProjectCard from '../components/ProjectCard';
import LoadingPage from '../components/LoadingPage';

const SKILL_COLORS = ['#60a5fa', '#a78bfa', '#f472b6', '#34d399'];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function ProfilePage() {
  const { username } = useParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile]     = useState(null);
  const [projects, setProjects]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwn = me?.username === username;

  useEffect(() => {
    setLoading(true);
    const requests = [getUser(username), getUserProjects(username)];
    if (me && me.username !== username) requests.push(isFollowingUser(username));
    Promise.all(requests)
      .then(([p, projs, followingStatus]) => {
        setProfile(p);
        setProjects(projs);
        if (followingStatus !== undefined) setFollowing(followingStatus);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [username, me]);

  const toggleFollow = async () => {
    if (!me) return;
    setFollowLoading(true);
    try {
      if (following) {
        await unfollowUser(username);
        setFollowing(false);
        setProfile((p) => ({ ...p, followerCount: p.followerCount - 1 }));
      } else {
        await followUser(username);
        setFollowing(true);
        setProfile((p) => ({ ...p, followerCount: p.followerCount + 1 }));
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    try {
      await deleteProject(id);
      setProjects((ps) => ps.filter((p) => p.id !== id));
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <LoadingPage />;
  if (!profile) return <LoadingPage message="User not found." />;

  return (
    <div className="min-h-screen bg-slate-950 pt-14">

      {/* ── Banner ─────────────────────────────────────────── */}
      <div
        className="relative h-44 border-b border-slate-800/60"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
      >
        {/* Blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div style={{ position: 'absolute', top: '-40%', left: '5%', width: '40vw', height: '40vw', maxWidth: 400, maxHeight: 400,
            background: 'radial-gradient(circle, rgba(96,165,250,0.14) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', top: '-10%', left: '35%', width: '30vw', height: '30vw', maxWidth: 350, maxHeight: 350,
            background: 'radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', bottom: '-30%', right: '10%', width: '35vw', height: '35vw', maxWidth: 380, maxHeight: 380,
            background: 'radial-gradient(circle, rgba(244,114,182,0.1) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', top: '10%', right: '30%', width: '20vw', height: '20vw', maxWidth: 250, maxHeight: 250,
            background: 'radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 65%)' }} />
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)',
            backgroundSize: '28px 28px', opacity: 0.6,
          }} />
        </div>

        {/* Action button — inside banner, bottom-right */}
        <div className="absolute bottom-4 right-4 z-10">
          {isOwn ? (
            <Link
              to="/settings"
              className="px-4 py-1.5 text-sm border border-slate-700 text-slate-300 rounded-lg transition-colors hover:bg-slate-800/60 backdrop-blur-sm"
              style={{ background: 'rgba(15,23,42,0.7)' }}
            >
              Edit profile
            </Link>
          ) : me ? (
            <button
              onClick={toggleFollow}
              disabled={followLoading}
              className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors disabled:opacity-50 backdrop-blur-sm ${
                following ? 'border border-slate-700 text-slate-300' : 'btn-primary'
              }`}
              style={following ? { background: 'rgba(15,23,42,0.7)' } : {}}
            >
              {following ? 'Unfollow' : 'Follow'}
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Profile content ─────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4">

        {/* Avatar — relative + z-10 so it paints above the banner */}
        <div className="relative z-10 -mt-10 mb-5">
          <div
            className="w-20 h-20 rounded-full overflow-hidden"
            style={{ boxShadow: '0 0 0 4px #020617' }}
          >
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.username} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full avatar-gradient flex items-center justify-center text-white text-2xl font-bold">
                {profile.username[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Name row */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-1">
          <div>
            {isOwn && (
              <p className="text-slate-500 text-sm mb-0.5">{greeting()},</p>
            )}
            <h1 className="text-2xl font-bold text-white leading-tight">
              {profile.displayName || profile.username}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">@{profile.username}</p>
          </div>

          {isOwn && (
            <Link
              to="/projects/new"
              className="px-4 py-2 btn-primary rounded-lg text-sm font-semibold shrink-0 mt-1"
            >
              + New Project
            </Link>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-slate-300 text-sm mt-3 max-w-lg leading-relaxed">{profile.bio}</p>
        )}

        {/* Links */}
        {(profile.location || profile.websiteUrl) && (
          <div className="flex flex-wrap items-center gap-4 mt-3">
            {profile.location && (
              <span className="text-slate-500 text-xs flex items-center gap-1">
                <span>📍</span> {profile.location}
              </span>
            )}
            {profile.websiteUrl && (
              <a
                href={profile.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
                style={{ color: '#60a5fa' }}
              >
                <span>🔗</span> {profile.websiteUrl}
              </a>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-1 mt-4 flex-wrap">
          {[
            { value: profile.followerCount ?? 0,               label: 'followers', color: '#60a5fa' },
            { value: profile.followingCount ?? 0,              label: 'following',  color: '#a78bfa' },
            { value: profile.projectCount ?? projects.length,  label: 'projects',   color: '#34d399' },
          ].map(({ value, label, color }, i) => (
            <div key={label} className="flex items-center">
              {i > 0 && <span className="text-slate-800 mx-2 select-none">·</span>}
              <span className="text-sm">
                <strong style={{ color }}>{value}</strong>
                <span className="text-slate-500 ml-1">{label}</span>
              </span>
            </div>
          ))}
        </div>

        {/* Skills */}
        {(profile.skills || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {[...(profile.skills || [])].map((s, i) => {
              const color = SKILL_COLORS[i % SKILL_COLORS.length];
              return (
                <span
                  key={s}
                  className="px-2.5 py-0.5 rounded-full text-xs font-medium border"
                  style={{ color, borderColor: `${color}40`, background: `${color}10` }}
                >
                  {s}
                </span>
              );
            })}
          </div>
        )}

        {/* ── Projects ─────────────────────────────────────── */}
        <div className="mt-10 mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Projects</h2>
            {projects.length > 0 && (
              <span className="text-slate-600 text-xs">{projects.length} total</span>
            )}
          </div>

          {projects.length === 0 ? (
            <EmptyProjects isOwn={isOwn} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p) => (
                <div key={p.id} className="relative group">
                  <ProjectCard project={p} />
                  {isOwn && (
                    <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                      <Link
                        to={`/u/${username}/${p.slug}`}
                        className="px-2 py-1 bg-slate-900/90 text-slate-300 text-xs rounded hover:text-white transition-colors backdrop-blur-sm"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="px-2 py-1 bg-red-900/80 text-red-300 text-xs rounded hover:text-white transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyProjects({ isOwn }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center border border-slate-800/60 rounded-2xl">
      <div
        className="w-16 h-16 rounded-2xl mb-5 flex items-center justify-center text-2xl"
        style={{ background: 'linear-gradient(135deg, rgba(96,165,250,0.12) 0%, rgba(167,139,250,0.12) 100%)', border: '1px solid rgba(96,165,250,0.2)' }}
      >
        ⊞
      </div>
      {isOwn ? (
        <>
          <p className="text-white font-semibold mb-1">No projects yet</p>
          <p className="text-slate-500 text-sm mb-6 max-w-xs">
            Start versioning your creative work. Every upload creates a new revision.
          </p>
          <Link to="/projects/new" className="px-5 py-2 btn-primary rounded-xl text-sm font-semibold">
            Create your first project
          </Link>
        </>
      ) : (
        <p className="text-slate-600 text-sm">No public projects yet.</p>
      )}
    </div>
  );
}