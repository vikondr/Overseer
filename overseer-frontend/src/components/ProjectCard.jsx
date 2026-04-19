import { Link } from 'react-router-dom';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  if (months > 0) return `${months}mo ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

const PALETTES = [
  { gradient: 'from-blue-900/80 via-blue-950 to-slate-900',    glow: 'card-glow-blue',   accent: '#60a5fa' },
  { gradient: 'from-violet-900/80 via-violet-950 to-slate-900', glow: 'card-glow-violet', accent: '#a78bfa' },
  { gradient: 'from-pink-900/80 via-pink-950 to-slate-900',    glow: 'card-glow-pink',   accent: '#f472b6' },
  { gradient: 'from-emerald-900/80 via-emerald-950 to-slate-900', glow: 'card-glow-green', accent: '#34d399' },
];

function getPalette(name = '') {
  return PALETTES[name.charCodeAt(0) % PALETTES.length];
}

export default function ProjectCard({ project }) {
  const { name, slug, description, thumbnailUrl, tags = [], starCount, owner, updatedAt } = project;
  const palette = getPalette(name);

  return (
    <Link
      to={`/u/${owner?.username}/${slug}`}
      className={`group flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 ${palette.glow}`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden">
        {thumbnailUrl ? (
          <>
            <img
              src={thumbnailUrl}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-500"
            />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/80 to-transparent" />
          </>
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${palette.gradient} flex items-center justify-center relative`}>
            {/* Subtle grid pattern */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />
            {/* Glow dot */}
            <div
              className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full blur-2xl opacity-30"
              style={{ background: palette.accent }}
            />
            <span className="relative text-6xl font-black select-none tracking-tight" style={{ color: `${palette.accent}50` }}>
              {name[0]?.toUpperCase()}
            </span>
          </div>
        )}

        {/* Star badge */}
        {starCount > 0 && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 bg-black/60 backdrop-blur-sm text-slate-200 text-xs rounded-full border border-white/5">
            <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z" />
            </svg>
            {starCount}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4">
        <h3
          className="text-white font-semibold text-sm leading-snug line-clamp-1 mb-1 transition-colors"
          style={{ '--tw-text-opacity': 1 }}
        >
          <span className="group-hover:text-transparent group-hover:bg-clip-text transition-all duration-300"
            style={{
              backgroundImage: `linear-gradient(135deg, #fff 0%, ${palette.accent} 100%)`,
              WebkitBackgroundClip: 'text',
            }}
          >
            {name}
          </span>
        </h3>

        {description ? (
          <p className="text-slate-500 text-xs leading-relaxed line-clamp-2 mb-3 flex-1">
            {description}
          </p>
        ) : (
          <div className="flex-1" />
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-slate-800/80">
          <div className="flex flex-wrap gap-1 min-w-0">
            {(tags || []).slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 bg-slate-800/80 text-slate-500 text-[11px] rounded-md truncate max-w-[80px]"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-slate-600 text-xs shrink-0">
            {owner?.avatarUrl ? (
              <img src={owner.avatarUrl} alt={owner.username} referrerPolicy="no-referrer" className="w-4 h-4 rounded-full ring-1 ring-slate-700" />
            ) : (
              <div className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-[8px] font-bold">
                {owner?.username?.[0]?.toUpperCase()}
              </div>
            )}
            <span className="text-slate-500 truncate max-w-[70px]">{owner?.username}</span>
            {updatedAt && <span className="text-slate-700">·</span>}
            {updatedAt && <span className="text-slate-600">{timeAgo(updatedAt)}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}
