import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { exploreProjects, searchProjects } from '../api/projects';
import { searchUsers } from '../api/users';
import ProjectCard from '../components/ProjectCard';

const SORTS = [
  { value: 'stars',  label: 'Most starred',      color: '#60a5fa' },
  { value: 'recent', label: 'Recently updated',   color: '#a78bfa' },
];

export default function ExplorePage() {
  const [projects, setProjects]       = useState([]);
  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [query, setQuery]             = useState('');
  const [sort, setSort]               = useState('stars');
  const [page, setPage]               = useState(0);
  const [totalPages, setTotalPages]   = useState(0);
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const reqs = query
      ? [searchProjects(query, page), searchUsers(query)]
      : [exploreProjects(page, 20, sort), Promise.resolve({ content: [] })];

    Promise.all(reqs)
      .then(([projData, userData]) => {
        if (!cancelled) {
          setProjects(projData.content || []);
          setTotalPages(projData.totalPages || 0);
          setUsers(userData.content || []);
        }
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [query, sort, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setQuery(searchInput.trim());
    setPage(0);
  };

  const clearSearch = () => {
    setQuery('');
    setSearchInput('');
    setPage(0);
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-14">
      {/* Header */}
      <div
        className="relative border-b border-slate-800/60 overflow-hidden px-4 py-10"
        style={{ background: 'linear-gradient(180deg, rgba(96,165,250,0.04) 0%, transparent 100%)' }}
      >
        <div className="absolute pointer-events-none top-0 right-0 w-96 h-40"
          style={{ background: 'radial-gradient(ellipse at 100% 0%, rgba(167,139,250,0.08) 0%, transparent 70%)' }} />

        <div className="relative max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#60a5fa' }}>
            Community
          </p>
          <h1 className="text-3xl font-bold text-white mb-1">Explore</h1>
          <p className="text-slate-500 text-sm mb-6">Discover creative work and designers from the community</p>

          <form onSubmit={handleSearch} className="flex gap-2 max-w-lg">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search projects and people…"
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 text-white placeholder-slate-600 rounded-xl focus:outline-none focus:border-blue-400 text-sm transition-colors"
              />
            </div>
            <button type="submit" className="px-4 py-2 btn-primary rounded-xl text-sm font-medium">
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Controls / active query label */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          {query ? (
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm">
                Results for <span className="text-white">&ldquo;{query}&rdquo;</span>
              </span>
              <button
                onClick={clearSearch}
                className="text-slate-500 hover:text-slate-300 text-xs border border-slate-700 rounded-full px-2 py-0.5 transition-colors"
              >
                Clear ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
              {SORTS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => { setSort(s.value); setPage(0); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={sort === s.value
                    ? { background: `${s.color}18`, color: s.color, border: `1px solid ${s.color}35` }
                    : { color: '#64748b', border: '1px solid transparent' }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {!loading && !query && projects.length > 0 && totalPages > 1 && (
            <span className="text-slate-600 text-xs">Page {page + 1} of {totalPages}</span>
          )}
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="flex items-center justify-center py-24 text-center">
            <div>
              <p className="text-red-400 mb-2">Something went wrong</p>
              <p className="text-slate-600 text-sm">{error}</p>
            </div>
          </div>
        ) : (
          <>
            {/* People section — only shown when searching */}
            {query && users.length > 0 && (
              <section className="mb-10">
                <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#a78bfa' }}>
                  People · {users.length}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {users.map((u) => <UserCard key={u.id} user={u} />)}
                </div>
              </section>
            )}

            {/* Projects section */}
            {query && (
              <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#60a5fa' }}>
                Projects · {projects.length}
              </h2>
            )}

            {projects.length === 0 && (!query || users.length === 0) ? (
              <div className="flex items-center justify-center py-24 text-slate-600">
                {query ? 'No results found.' : 'No projects yet.'}
              </div>
            ) : projects.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-10">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl text-sm disabled:opacity-30 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                      ← Previous
                    </button>
                    <span className="text-slate-500 text-sm px-2">{page + 1} / {totalPages}</span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl text-sm disabled:opacity-30 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function UserCard({ user }) {
  return (
    <Link
      to={`/u/${user.username}`}
      className="flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-700 hover:bg-slate-800/60 transition-all"
    >
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={user.username}
          referrerPolicy="no-referrer"
          className="w-10 h-10 rounded-full shrink-0 ring-1 ring-slate-700 object-cover"
        />
      ) : (
        <div className="w-10 h-10 rounded-full shrink-0 avatar-gradient flex items-center justify-center text-white text-sm font-bold">
          {user.username[0].toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-white text-sm font-semibold truncate leading-tight">
          {user.displayName || user.username}
        </p>
        <p className="text-slate-500 text-xs truncate">@{user.username}</p>
      </div>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="bg-slate-900 rounded-2xl overflow-hidden animate-pulse border border-slate-800">
          <div className="aspect-video bg-slate-800" />
          <div className="p-4 space-y-2.5">
            <div className="h-3.5 bg-slate-800 rounded w-3/4" />
            <div className="h-3 bg-slate-800 rounded w-full" />
            <div className="h-3 bg-slate-800 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}