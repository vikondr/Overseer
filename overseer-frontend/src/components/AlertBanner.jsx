export default function AlertBanner({ type = 'error', children }) {
  if (!children) return null;

  if (type === 'success') {
    return (
      <p
        className="text-emerald-400 text-sm border rounded-xl px-4 py-3"
        style={{ background: 'rgba(52,211,153,0.08)', borderColor: 'rgba(52,211,153,0.3)' }}
      >
        {children}
      </p>
    );
  }

  return (
    <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded-xl px-4 py-3">
      {children}
    </p>
  );
}
