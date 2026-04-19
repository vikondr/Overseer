import { useState } from 'react';

const VISIBILITY_OPTIONS = [
  { value: 'PRIVATE',  label: 'Private',  color: '#60a5fa' },
  { value: 'PUBLIC',   label: 'Public',   color: '#34d399' },
  { value: 'UNLISTED', label: 'Unlisted', color: '#f472b6' },
];

function fileSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

export default function PushFolderModal({ folder, api, onClose, onDone }) {
  const [name, setName]         = useState(folder.folderName);
  const [visibility, setVis]    = useState('PRIVATE');
  const [sheetName, setSheet]   = useState('Main');
  const [commitMsg, setCommit]  = useState('Initial push');
  const [pushing, setPushing]   = useState(false);
  const [progress, setProgress] = useState(null); // { current, total, fileName }
  const [error, setError]       = useState('');

  const handlePush = async () => {
    if (!name.trim()) { setError('Project name is required.'); return; }
    if (folder.files.length === 0) { setError('No supported files in this folder.'); return; }
    setPushing(true);
    setError('');
    try {
      // 1. Create project
      const project = await api.createProject({
        name: name.trim(),
        visibility,
      });

      // 2. Get the auto-created default sheet, or create one
      let sheetId;
      const sheets = await api.getSheets(project.id);
      if (sheets.length > 0) {
        // Rename default sheet if needed, or just use it
        sheetId = sheets[0].id;
      } else {
        const sheet = await api.createSheet(project.id, { name: sheetName.trim() || 'Main' });
        sheetId = sheet.id;
      }

      // 3. Upload each file
      const total = folder.files.length;
      for (let i = 0; i < total; i++) {
        const f = folder.files[i];
        setProgress({ current: i + 1, total, fileName: f.name });

        // Read file bytes from main process
        const { data } = await window.electron.readFile(f.path);
        const blob = new Blob([new Uint8Array(data)]);
        const file = new File([blob], f.name);

        await api.uploadFile(sheetId, file, commitMsg.trim() || undefined);
      }

      setProgress(null);
      onDone(project);
    } catch (e) {
      setError(e.message);
      setProgress(null);
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={pushing ? undefined : onClose} />

      <div
        className="relative w-full max-w-lg border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0a1220 0%, #0f172a 100%)' }}
      >
        {/* Accent blob */}
        <div className="absolute top-0 left-0 w-48 h-48 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 0% 0%, rgba(96,165,250,0.1) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-48 h-48 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 100% 100%, rgba(52,211,153,0.07) 0%, transparent 70%)' }} />

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#34d399' }}>
              Push folder
            </p>
            <h2 className="text-white font-bold text-base leading-tight truncate max-w-xs" title={folder.folderPath}>
              {folder.folderPath}
            </h2>
          </div>
          {!pushing && (
            <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors text-xl ml-4 shrink-0">
              ×
            </button>
          )}
        </div>

        <div className="relative px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* Project name */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
              Project Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={pushing}
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 text-white text-sm rounded-xl focus:outline-none focus:border-blue-500 placeholder:text-slate-700 transition-colors disabled:opacity-50"
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
              Visibility
            </label>
            <div className="flex gap-2">
              {VISIBILITY_OPTIONS.map(({ value, label, color }) => {
                const active = visibility === value;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={pushing}
                    onClick={() => setVis(value)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold border transition-all disabled:opacity-50"
                    style={active
                      ? { borderColor: `${color}50`, background: `${color}0e`, color }
                      : { borderColor: '#1e293b', color: '#475569' }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Commit message */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
              Commit Message
            </label>
            <input
              value={commitMsg}
              onChange={(e) => setCommit(e.target.value)}
              disabled={pushing}
              placeholder="Describe this push…"
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 text-white text-sm rounded-xl focus:outline-none focus:border-blue-500 placeholder:text-slate-700 transition-colors disabled:opacity-50"
            />
          </div>

          {/* File list */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
              Files
              <span className="ml-1.5 font-normal normal-case text-slate-700">
                {folder.files.length} file{folder.files.length !== 1 ? 's' : ''}
              </span>
            </label>

            {folder.files.length === 0 ? (
              <p className="text-slate-600 text-sm py-4 text-center border border-dashed border-slate-800 rounded-xl">
                No supported files found.<br />
                <span className="text-slate-700 text-xs">PNG · JPG · WEBP · SVG · PSD · AI · FIG</span>
              </p>
            ) : (
              <div className="border border-slate-800/70 rounded-xl overflow-hidden">
                {folder.files.map((f, i) => {
                  const isPushing = pushing && progress && progress.current - 1 === i;
                  const isDone    = pushing && progress && progress.current - 1 > i;
                  return (
                    <div
                      key={f.path}
                      className={`flex items-center gap-3 px-3 py-2 text-xs transition-colors ${
                        i < folder.files.length - 1 ? 'border-b border-slate-800/50' : ''
                      } ${isPushing ? 'bg-blue-900/10' : ''}`}
                    >
                      <span
                        className="w-4 h-4 rounded flex items-center justify-center shrink-0 text-[10px]"
                        style={isDone
                          ? { background: 'rgba(52,211,153,0.15)', color: '#34d399' }
                          : isPushing
                          ? { background: 'rgba(96,165,250,0.15)', color: '#60a5fa' }
                          : { background: 'rgba(30,41,59,0.8)', color: '#334155' }}
                      >
                        {isDone ? '✓' : isPushing ? '↑' : '·'}
                      </span>
                      <span className={`flex-1 font-mono truncate ${isPushing ? 'text-blue-300' : isDone ? 'text-slate-500' : 'text-slate-300'}`}>
                        {f.name}
                      </span>
                      <span className="text-slate-700 shrink-0">{fileSize(f.size)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Progress bar */}
          {pushing && progress && (
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Uploading {progress.fileName}…</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(progress.current / progress.total) * 100}%`,
                    background: 'linear-gradient(90deg, #60a5fa 0%, #34d399 100%)',
                  }}
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="relative px-6 py-4 border-t border-slate-800/60 flex gap-3">
          <button
            onClick={onClose}
            disabled={pushing}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 text-sm rounded-xl transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handlePush}
            disabled={pushing || folder.files.length === 0}
            className="flex-1 py-2 btn-primary text-sm rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {pushing ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Pushing…
              </>
            ) : (
              `Push ${folder.files.length} file${folder.files.length !== 1 ? 's' : ''}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}