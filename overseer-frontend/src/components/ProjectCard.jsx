import { Link } from 'react-router-dom';

const ACCENTS = ['#60a5fa', '#a78bfa', '#f472b6', '#34d399', '#fb923c'];
const accentFor = (name = '?') => ACCENTS[name.charCodeAt(0) % ACCENTS.length];

const VISIBILITY_BADGE = {
  PRIVATE:  { label: 'Private',  color: '#cbd5e1', bg: 'rgba(15,23,42,0.85)',  border: 'rgba(148,163,184,0.30)' },
  UNLISTED: { label: 'Unlisted', color: '#fbbf24', bg: 'rgba(45,28,9,0.85)',   border: 'rgba(251,191,36,0.30)' },
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  if (months > 0) return `${months}mo`;
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (mins > 0) return `${mins}m`;
  return 'now';
}

export default function ProjectCard({ project }) {
  const { name, slug, description, thumbnailUrl, tags = [], starCount, owner, updatedAt, visibility } = project;
  const accent = accentFor(name);
  const vis = VISIBILITY_BADGE[visibility];

  return (
    <Link
      to={`/u/${owner?.username}/${slug}`}
      className="group relative flex flex-col rounded-2xl overflow-hidden bg-slate-900/40 border border-slate-800/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-700"
      style={{ '--accent': accent }}
    >
      {/* Accent glow on hover */}
      <span
        aria-hidden
        className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ boxShadow: `0 12px 38px -18px ${accent}aa, inset 0 0 0 1px ${accent}30` }}
      />

      {/* Thumbnail (4:3 — taller than the old aspect-video, feels more portfolio-grade) */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center relative"
            style={{
              background: `linear-gradient(135deg, ${accent}22 0%, rgba(15,23,42,0.95) 70%)`,
            }}
          >
            <div
              className="absolute inset-0 opacity-25"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
                backgroundSize: '22px 22px',
              }}
            />
            <div
              className="absolute top-[35%] left-1/2 -translate-x-1/2 w-32 h-32 rounded-full blur-3xl opacity-40"
              style={{ background: accent }}
            />
            <span
              className="relative text-7xl font-black tracking-tight select-none"
              style={{ color: `${accent}66` }}
            >
              {name[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
        )}

        {/* Top-row badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-2 pointer-events-none">
          {vis ? (
            <span
              className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md backdrop-blur-md border"
              style={{ color: vis.color, background: vis.bg, borderColor: vis.border }}
            >
              {vis.label}
            </span>
          ) : <span />}

          {starCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full backdrop-blur-md bg-black/55 text-slate-100 border border-white/10">
              <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z" />
              </svg>
              <span className="font-medium">{starCount}</span>
            </span>
          )}
        </div>

        {/* Bottom gradient + pinned title/owner — visible always, just stronger over photos */}
        <div className="absolute inset-x-0 bottom-0 p-3 pt-10 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent">
          <h3 className="text-white font-semibold text-[15px] leading-tight line-clamp-1 drop-shadow-sm">
            {name}
          </h3>
          {owner && (
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-300">
              {owner.avatarUrl ? (
                <img
                  src={owner.avatarUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-4 h-4 rounded-full ring-1 ring-white/20"
                />
              ) : (
                <span
                  className="w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center text-white"
                  style={{ background: `${accent}cc` }}
                >
                  {owner.username?.[0]?.toUpperCase()}
                </span>
              )}
              <span className="truncate">@{owner.username}</span>
              {updatedAt && (
                <>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400">{timeAgo(updatedAt)}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer: description + tags */}
      <div className="flex flex-col gap-2 px-3.5 py-3 border-t border-slate-800/60 bg-slate-950/30">
        {description ? (
          <p className="text-slate-400 text-[12px] leading-relaxed line-clamp-2">
            {description}
          </p>
        ) : (
          <p className="text-slate-700 text-[12px] italic">No description</p>
        )}

        {(tags || []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 text-[10px] rounded-md font-medium"
                style={{
                  color: `${accent}`,
                  background: `${accent}14`,
                  border: `1px solid ${accent}28`,
                }}
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-md text-slate-600 bg-slate-800/40 border border-slate-800">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
