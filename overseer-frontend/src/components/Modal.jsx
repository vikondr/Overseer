export default function Modal({ open, onClose, children, maxWidth = 'max-w-md' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full ${maxWidth} border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/60 p-6 overflow-hidden`}
        style={{ background: 'linear-gradient(135deg, #0d1424 0%, #111827 100%)' }}
      >
        <div
          className="absolute top-0 right-0 w-36 h-36 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 100% 0%, rgba(96,165,250,0.1) 0%, transparent 70%)' }}
        />
        {children}
      </div>
    </div>
  );
}
