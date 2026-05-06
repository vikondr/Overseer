import { useEffect } from 'react';

export default function ImageLightbox({ open, onClose, src, fileName, downloadHref, onCompareVersions }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />

      {/* Top bar */}
      <div className="relative flex items-center justify-between px-5 py-3 border-b border-slate-800/60"
        style={{ background: 'linear-gradient(180deg, rgba(13,20,36,0.95) 0%, rgba(13,20,36,0.7) 100%)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
          <span className="text-sm font-mono text-slate-300 truncate" title={fileName}>{fileName}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onCompareVersions && (
            <button
              onClick={onCompareVersions}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 border border-slate-700 hover:border-violet-500 text-slate-300 hover:text-violet-300 text-sm rounded-xl transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7l4-4m0 0l4 4m-4-4v18m-4-4l-4-4m0 0l4-4m-4 4h18" />
              </svg>
              Compare versions
            </button>
          )}
          {downloadHref && (
            <a
              href={downloadHref}
              download={fileName}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 border border-slate-700 hover:border-blue-500 text-slate-300 hover:text-blue-300 text-sm rounded-xl transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 4v12m0 0l-4-4m4 4l4-4" />
              </svg>
              Download
            </a>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-900/80 border border-slate-700 hover:border-red-500 text-slate-400 hover:text-red-400 transition-colors text-sm"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Image area */}
      <div
        className="relative flex-1 flex items-center justify-center p-6 overflow-auto"
        onClick={onClose}
      >
        <img
          src={src}
          alt={fileName}
          onClick={(e) => e.stopPropagation()}
          className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
          style={{ background: 'rgba(15,23,42,0.4)' }}
        />
      </div>
    </div>
  );
}