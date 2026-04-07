import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUser, followUser, unfollowUser } from '../api/users';
import { getUserProjects } from '../api/projects';
import ProjectCard from '../components/ProjectCard';

export default function ProfilePage() {
  const { username } = useParams();
  const { user: me } = useAuth();
  const [profile, setProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwn = me?.username === username;

  useEffect(() => {
    setLoading(true);
    Promise.all([getUser(username), getUserProjects(username)])
      .then(([p, projs]) => {
        setProfile(p);
        setProjects(projs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [username]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 pt-14 flex items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-900 pt-14 flex items-center justify-center text-slate-400">
        User not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pt-14">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-start gap-6 mb-10">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.username}
              className="w-20 h-20 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-full avatar-gradient flex items-center justify-center text-white text-2xl font-bold shrink-0">
              {profile.username[0].toUpperCase()}
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {profile.displayName || profile.username}
                </h1>
                <p className="text-slate-400 text-sm">@{profile.username}</p>
              </div>
              {isOwn ? (
                <Link
                  to="/settings"
                  className="px-4 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                >
                  Edit profile
                </Link>
              ) : me ? (
                <button
                  onClick={toggleFollow}
                  disabled={followLoading}
                  className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors disabled:opacity-50 ${
                    following
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      : 'btn-primary'
                  }`}
                >
                  {following ? 'Unfollow' : 'Follow'}
                </button>
              ) : null}
            </div>

            {profile.bio && (
              <p className="text-slate-300 text-sm mt-3 max-w-lg">{profile.bio}</p>
            )}

            <div className="flex flex-wrap items-center gap-4 mt-3">
              {profile.location && (
                <span className="text-slate-500 text-xs">📍 {profile.location}</span>
              )}
              {profile.websiteUrl && (
                <a
                  href={profile.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-xs"
                >
                  🔗 {profile.websiteUrl}
                </a>
              )}
            </div>

            <div className="flex items-center gap-5 mt-3 text-sm">
              <span className="text-slate-400">
                <strong className="text-white">{profile.followerCount ?? 0}</strong> followers
              </span>
              <span className="text-slate-400">
                <strong className="text-white">{profile.followingCount ?? 0}</strong> following
              </span>
              <span className="text-slate-400">
                <strong className="text-white">{profile.projectCount ?? projects.length}</strong>{' '}
                projects
              </span>
            </div>

            {(profile.skills || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {(profile.skills || []).map((s) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded-full"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <h2 className="text-lg font-semibold text-white mb-4">Projects</h2>
        {projects.length === 0 ? (
          <p className="text-slate-500 text-sm">No public projects yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
