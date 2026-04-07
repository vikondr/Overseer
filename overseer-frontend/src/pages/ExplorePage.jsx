import { useState, useEffect } from 'react';
import { exploreProjects, searchProjects } from '../api/projects';
import ProjectCard from '../components/ProjectCard';

const SORTS = [
  { value: 'stars', label: 'Most starred' },
  { value: 'recent', label: 'Recently updated' },
];

export default function ExplorePage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('stars');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const req = query
      ? searchProjects(query, page)
      : exploreProjects(page, 20, sort);

    req
      .then((data) => {
        if (!cancelled) {
          setProjects(data.content || []);
          setTotalPages(data.totalPages || 0);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query, sort, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setQuery(searchInput.trim());
    setPage(0);
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-14">
      {/* Header */}
      <div className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-sm px-4 py-10">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-1">Explore</h1>
          <p className="text-slate-500 text-sm mb-6">Discover creative work from the community</p>

          <form onSubmit={handleSearch} className="flex gap-2 max-w-lg">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search projects..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 text-white placeholder-slate-600 rounded-xl focus:outline-none focus:border-blue-500 text-sm transition-colors"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 btn-primary rounded-xl text-sm font-medium"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Controls */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          {query ? (
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm">
                Results for <span className="text-white">&ldquo;{query}&rdquo;</span>
              </span>
              <button
                onClick={() => {
                  setQuery('');
                  setSearchInput('');
                  setPage(0);
                }}
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
                  onClick={() => {
                    setSort(s.value);
                    setPage(0);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    sort === s.value
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {!loading && projects.length > 0 && (
            <span className="text-slate-600 text-xs">
              {totalPages > 1 ? `Page ${page + 1} of ${totalPages}` : `${projects.length} projects`}
            </span>
          )}
        </div>

        {/* Grid */}
        {loading ? (
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
        ) : error ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <p className="text-red-400 mb-2">Something went wrong</p>
              <p className="text-slate-600 text-sm">{error}</p>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex items-center justify-center py-24 text-slate-600">
            No projects found.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
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
                <span className="text-slate-500 text-sm px-2">
                  {page + 1} / {totalPages}
                </span>
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
        )}
      </div>
    </div>
  );
}
