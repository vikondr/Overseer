import { useEffect, useRef } from 'react';

/**
 * Branded confirmation dialog — replaces `window.confirm()` for destructive flows
 * so the prompt matches the rest of the desktop chrome instead of jumping to
 * Electron's native OS sheet.
 */
export default function ConfirmModal({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  destructive = true,
  loading = false,
  onConfirm,
  onClose,
}) {
  const confirmRef = useRef(null);

  // Auto-focus the confirm button when opening, and wire Esc → close.
  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape' && !loading) onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, loading, onClose]);

  if (!open) return null;

  const accent = destructive ? '#f87171' : '#60a5fa';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => { if (!loading) onClose?.(); }}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="relative w-full max-w-md border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0d1424 0%, #111827 100%)' }}
      >
        <div
          className="absolute top-0 right-0 w-40 h-40 pointer-events-none"
          style={{ background: `radial-gradient(circle at 100% 0%, ${accent}1f 0%, transparent 70%)` }}
        />
        <div
          className="absolute bottom-0 left-0 w-32 h-32 pointer-events-none"
          style={{ background: `radial-gradient(circle at 0% 100%, ${accent}14 0%, transparent 70%)` }}
        />

        <div className="relative px-6 py-5">
          <div className="flex items-start gap-3">
            <div
              className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center"
              style={{ background: `${accent}1a`, border: `1px solid ${accent}3a` }}
            >
              {destructive ? (
                <svg viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8"  x2="12" y2="13" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 id="confirm-modal-title" className="text-white font-semibold text-base leading-tight">
                {title}
              </h3>
              {message && (
                <div className="mt-1.5 text-slate-400 text-sm leading-relaxed">
                  {message}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => { if (!loading) onClose?.(); }}
              disabled={loading}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors disabled:opacity-40"
              title="Close"
            >
              ✕
            </button>
          </div>

          <div className="flex gap-2 mt-5">
            <button
              type="button"
              onClick={() => { if (!loading) onClose?.(); }}
              disabled={loading}
              className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-sm rounded-xl transition-colors disabled:opacity-40"
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmRef}
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-2 text-sm rounded-xl font-semibold transition-colors disabled:opacity-60"
              style={destructive
                ? { background: '#b91c1c', color: '#fff', border: '1px solid #ef4444' }
                : { background: '#1d4ed8', color: '#fff', border: '1px solid #3b82f6' }}
            >
              {loading ? 'Working…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}