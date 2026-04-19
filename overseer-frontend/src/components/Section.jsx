export default function Section({ color, label, children }) {
  return (
    <div className="rounded-xl border border-slate-800 overflow-hidden" style={{ background: 'rgba(15,23,42,0.6)' }}>
      <div
        className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-800"
        style={{ background: `linear-gradient(90deg, ${color}10 0%, transparent 100%)` }}
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color }}>
          {label}
        </span>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  );
}