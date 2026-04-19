import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createApi } from '../api';
import PushFolderModal from './PushFolderModal';

const PALETTE = ['#60a5fa', '#a78bfa', '#f472b6', '#34d399'];
const palette = (name = '') => PALETTE[name.charCodeAt(0) % PALETTE.length];

const ALLOWED = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'psd', 'ai', 'fig'];

export default function WorkspacePage({ user, token, baseUrl, onLogout }) {
  const api = useMemo(() => createApi(baseUrl, token), [baseUrl, token]);

  const [projects, setProjects]         = useState([]);
  const [selected, setSelected]         = useState(null);   // full project detail
  const [activeSheet, setActiveSheet]   = useState(null);
  const [sheetDetail, setSheetDetail]   = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingSheet, setLoadingSheet] = useState(false);

  const [dragOver, setDragOver]         = useState(false);
  const [pendingFile, setPendingFile]   = useState(null);
  const [commitMsg, setCommitMsg]       = useState('');
  const [showModal, setShowModal]       = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [fileError, setFileError]       = useState('');

  const fileInputRef = useRef(null);
  const [pushFolder, setPushFolder] = useState(null); // folder data for modal

  // Load project list
  useEffect(() => {
    api.getProjects(user.username)
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoadingProjects(false));
  }, [user.username]);

  // Load sheet detail
  useEffect(() => {
    if (!activeSheet || !selected) return;
    setSheetDetail(null);
    setLoadingSheet(true);
    api.getSheet(selected.id, activeSheet)
      .then(setSheetDetail)
      .catch(console.error)
      .finally(() => setLoadingSheet(false));
  }, [activeSheet, selected]);

  const selectProject = useCallback(async (proj) => {
    setSelected(null);
    setSheetDetail(null);
    setActiveSheet(null);
    try {
      const full = await api.getProjectBySlug(user.username, proj.slug);
      setSelected(full);
      const firstSheet = full.sheets?.[0];
      if (firstSheet) setActiveSheet(firstSheet.id);
    } catch (e) { console.error(e); }
  }, [api, user.username]);

  const queueFile = (file) => {
    if (!activeSheet) return;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED.includes(ext)) {
      setFileError(`".${ext}" not supported. Allowed: ${ALLOWED.join(', ').toUpperCase()}`);
      return;
    }
    setFileError('');
    setPendingFile(file);
    setCommitMsg('');
    setShowModal(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) queueFile(file);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) queueFile(file);
    e.target.value = '';
  };

  const handlePushFolder = async () => {
    const result = await window.electron.selectFolder();
    if (result) setPushFolder(result);
  };

  const confirmUpload = async () => {
    if (!pendingFile) return;
    setShowModal(false);
    setUploading(true);
    try {
      await api.uploadFile(activeSheet, pendingFile, commitMsg);
      const updated = await api.getSheet(selected.id, activeSheet);
      setSheetDetail(updated);
      setSelected((p) => ({
        ...p,
        sheets: p.sheets.map((s) =>
          s.id === activeSheet ? { ...s, fileCount: updated.files?.length ?? s.fileCount } : s
        ),
      }));
    } catch (e) {
      alert(e.message);
    } finally {
      setUploading(false);
      setPendingFile(null);
      setCommitMsg('');
    }
  };

  return (
    <div className="h-full flex bg-slate-950 overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className="w-56 shrink-0 flex flex-col border-r border-slate-800/60" style={{ background: '#060d1a' }}>

        {/* App header */}
        <div className="relative px-4 py-5 border-b border-slate-800/60 overflow-hidden shrink-0">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(135deg, rgba(96,165,250,0.08) 0%, rgba(167,139,250,0.08) 100%)' }} />
          <div className="relative flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black shrink-0"
              style={{ background: 'linear-gradient(135deg, #60a5fa22 0%, #a78bfa22 100%)', border: '1px solid rgba(96,165,250,0.3)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
            <span
              className="font-black text-sm tracking-tight"
              style={{
                background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Overseer
            </span>
          </div>
        </div>

        {/* User */}
        <div className="px-4 py-3 border-b border-slate-800/40 shrink-0">
          <div className="flex items-center gap-2.5">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.username} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full shrink-0 ring-1 ring-slate-700" />
            ) : (
              <div className="w-8 h-8 rounded-full shrink-0 avatar-gradient flex items-center justify-center text-white text-xs font-bold">
                {user.username[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate leading-tight">
                {user.displayName || user.username}
              </p>
              <p className="text-slate-600 text-[11px] truncate">@{user.username}</p>
            </div>
          </div>
        </div>

        {/* Projects */}
        <div className="flex-1 overflow-y-auto py-3 min-h-0">
          <div className="px-4 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
              Projects
            </span>
          </div>

          {loadingProjects ? (
            <div className="px-4 space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 bg-slate-800/40 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <p className="px-4 text-slate-700 text-xs">No projects yet.</p>
          ) : (
            <div className="space-y-0.5 px-2">
              {projects.map((p) => {
                const color = palette(p.name);
                const isActive = selected?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => selectProject(p)}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl text-left transition-all"
                    style={isActive
                      ? { background: `${color}12`, border: `1px solid ${color}30` }
                      : { border: '1px solid transparent' }}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0 transition-all"
                      style={{ background: isActive ? color : '#1e293b', boxShadow: isActive ? `0 0 6px ${color}80` : 'none' }}
                    />
                    <span
                      className="text-xs font-medium truncate"
                      style={{ color: isActive ? color : '#64748b' }}
                    >
                      {p.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Push folder */}
        <div className="px-3 py-3 border-t border-slate-800/40 shrink-0">
          <button
            onClick={handlePushFolder}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all btn-primary"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Push Folder
          </button>
        </div>

        {/* Sign out */}
        <div className="px-4 py-2 shrink-0">
          <button
            onClick={onLogout}
            className="w-full px-3 py-1.5 text-xs text-slate-700 hover:text-slate-400 transition-colors text-left"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!selected ? (
          <EmptyState />
        ) : (
          <>
            {/* Project banner */}
            <ProjectBanner project={selected} />

            {/* Sheet tabs */}
            <SheetTabs
              sheets={selected.sheets || []}
              activeSheet={activeSheet}
              onSelect={setActiveSheet}
            />

            {/* Content */}
            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5">
              {!activeSheet ? (
                <NoSheets />
              ) : loadingSheet ? (
                <div className="text-slate-600 text-sm animate-pulse">Loading…</div>
              ) : (
                <>
                  {/* Drop zone */}
                  <DropZone
                    dragOver={dragOver}
                    uploading={uploading}
                    fileError={fileError}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept={ALLOWED.map((e) => `.${e}`).join(',')}
                    onChange={handleFileInput}
                  />

                  {/* Files */}
                  {(sheetDetail?.files || []).length > 0 && (
                    <FileTable files={sheetDetail.files} baseUrl={baseUrl} token={token} />
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Push Folder modal ───────────────────────────── */}
      {pushFolder && (
        <PushFolderModal
          folder={pushFolder}
          api={api}
          onClose={() => setPushFolder(null)}
          onDone={(project) => {
            setPushFolder(null);
            // Refresh project list and navigate to the new project
            api.getProjects(user.username).then((list) => {
              setProjects(list);
              const created = list.find((p) => p.id === project.id);
              if (created) selectProject(created);
            });
          }}
        />
      )}

      {/* ── Commit modal ────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div
            className="relative w-full max-w-md border border-slate-700/50 rounded-2xl shadow-2xl p-6 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0d1424 0%, #111827 100%)' }}
          >
            <div className="absolute top-0 right-0 w-36 h-36 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 100% 0%, rgba(96,165,250,0.1) 0%, transparent 70%)' }} />
            <h3 className="text-white font-semibold mb-0.5">Upload file</h3>
            <p className="text-slate-600 text-xs font-mono mb-5 truncate">{pendingFile?.name}</p>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
              Commit message <span className="normal-case font-normal text-slate-700">(optional)</span>
            </label>
            <input
              autoFocus
              type="text"
              value={commitMsg}
              onChange={(e) => setCommitMsg(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmUpload(); if (e.key === 'Escape') setShowModal(false); }}
              placeholder="Describe what changed…"
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 text-white text-sm rounded-xl focus:outline-none focus:border-blue-500 placeholder:text-slate-700 transition-colors"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 text-sm rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmUpload}
                className="flex-1 py-2 btn-primary text-sm rounded-xl font-semibold"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────── */

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)',
          backgroundSize: '32px 32px', opacity: 0.3,
        }} />
        <div style={{ position: 'absolute', top: '20%', left: '20%', width: '40%', height: '40%',
          background: 'radial-gradient(circle, rgba(96,165,250,0.05) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '15%', width: '35%', height: '35%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.05) 0%, transparent 65%)' }} />
      </div>
      <div
        className="relative w-16 h-16 rounded-2xl mb-5 flex items-center justify-center"
        style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </div>
      <p className="text-white font-semibold mb-1">Select a project</p>
      <p className="text-slate-600 text-sm">Choose a project from the sidebar to get started.</p>
    </div>
  );
}

function ProjectBanner({ project }) {
  const color = palette(project.name);
  return (
    <div className="relative px-6 py-5 border-b border-slate-800/60 shrink-0 overflow-hidden">
      {/* Blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position: 'absolute', top: '-50%', left: '-5%', width: '40%', height: '300%',
          background: `radial-gradient(circle, ${color}14 0%, transparent 65%)` }} />
        <div style={{ position: 'absolute', top: '-50%', right: '10%', width: '30%', height: '300%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 65%)' }} />
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)',
          backgroundSize: '24px 24px', opacity: 0.35,
        }} />
      </div>
      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
          <h2 className="text-lg font-black text-white tracking-tight">{project.name}</h2>
          {project.starCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-yellow-400 ml-1">
              <span>★</span>{project.starCount}
            </span>
          )}
        </div>
        {project.description && (
          <p className="text-slate-500 text-xs leading-relaxed mb-2 max-w-lg">{project.description}</p>
        )}
        {(project.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {project.tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-slate-800/60 border border-slate-700/40 text-slate-500 text-[10px] rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SheetTabs({ sheets, activeSheet, onSelect }) {
  if (sheets.length === 0) return null;
  return (
    <div className="flex items-center gap-1 px-6 py-2 border-b border-slate-800/60 shrink-0 overflow-x-auto"
      style={{ background: 'rgba(6,13,26,0.6)' }}>
      {sheets.map((sheet) => {
        const active = sheet.id === activeSheet;
        return (
          <button
            key={sheet.id}
            onClick={() => onSelect(sheet.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0"
            style={active
              ? { background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }
              : { color: '#475569', border: '1px solid transparent' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: active ? '#60a5fa' : '#1e293b' }}
            />
            {sheet.name}
            {sheet.fileCount > 0 && (
              <span
                className="text-[10px] px-1 rounded"
                style={active ? { color: '#93c5fd', background: 'rgba(96,165,250,0.15)' } : { color: '#334155', background: '#0f172a' }}
              >
                {sheet.fileCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function DropZone({ dragOver, uploading, fileError, onDragOver, onDragLeave, onDrop, onClick }) {
  return (
    <div className="mb-5">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onClick}
        className={`relative flex flex-col items-center justify-center gap-3 py-8 rounded-2xl cursor-pointer transition-all duration-300 ${
          uploading ? 'pointer-events-none opacity-60' : ''
        } ${dragOver ? 'drop-zone-active' : ''}`}
        style={{
          border: dragOver
            ? '2px dashed rgba(96,165,250,0.7)'
            : '2px dashed rgba(30,41,59,0.8)',
          background: dragOver
            ? 'linear-gradient(135deg, rgba(96,165,250,0.08) 0%, rgba(167,139,250,0.08) 100%)'
            : 'rgba(15,23,42,0.4)',
        }}
      >
        {/* Upload icon */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300"
          style={{
            background: dragOver
              ? 'linear-gradient(135deg, rgba(96,165,250,0.2) 0%, rgba(167,139,250,0.2) 100%)'
              : 'rgba(15,23,42,0.8)',
            border: dragOver ? '1px solid rgba(96,165,250,0.4)' : '1px solid rgba(30,41,59,0.8)',
          }}
        >
          {uploading ? (
            <div className="w-5 h-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
          ) : (
            <svg
              className="w-5 h-5 transition-colors"
              style={{ color: dragOver ? '#60a5fa' : '#334155' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          )}
        </div>

        <div className="text-center">
          <p
            className="text-sm font-medium transition-colors"
            style={{ color: dragOver ? '#93c5fd' : '#475569' }}
          >
            {uploading ? 'Uploading…' : dragOver ? 'Drop to upload' : 'Drop a file here, or click to browse'}
          </p>
          <p className="text-[11px] text-slate-700 mt-0.5">
            PNG · JPG · WEBP · SVG · PSD · AI · FIG
          </p>
        </div>
      </div>

      {fileError && (
        <p className="text-red-400 text-xs mt-2 px-1">{fileError}</p>
      )}
    </div>
  );
}

function FileTable({ files, baseUrl, token }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-600 mb-2">
        Files <span className="text-slate-700 ml-1">{files.length}</span>
      </p>
      <div className="border border-slate-800/70 rounded-2xl overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-2 border-b border-slate-800/50"
          style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.5) 100%)' }}
        >
          <div className="w-7 shrink-0" />
          <span className="flex-1 text-[10px] font-semibold uppercase tracking-wider text-slate-700">Name</span>
          <span className="w-9 text-[10px] font-semibold uppercase tracking-wider text-slate-700 shrink-0">Ver</span>
          <span className="flex-1 text-[10px] font-semibold uppercase tracking-wider text-slate-700 hidden sm:block">Message</span>
          <span className="w-12 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-700 shrink-0">Size</span>
          <span className="w-12 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-700 shrink-0">Date</span>
          <span className="w-5 shrink-0" />
        </div>

        {files.map((file, i) => (
          <FileRow
            key={file.id}
            file={file}
            last={i === files.length - 1}
            baseUrl={baseUrl}
            token={token}
          />
        ))}
      </div>
    </div>
  );
}

function FileRow({ file, last, baseUrl, token }) {
  const handleOpen = async () => {
    const url = `${baseUrl}/api/files/${file.id}/download`;
    try {
      await window.electron.openFile(url, file.fileName, token);
    } catch (e) {
      console.error('Failed to open file:', e);
    }
  };
  const ext = file.fileName.split('.').pop()?.toUpperCase() ?? '';
  const isImage = file.mimeType?.startsWith('image/');

  const extColors = {
    PNG:  { text: '#a78bfa', bg: 'rgba(109,40,217,0.15)' },
    JPG:  { text: '#a78bfa', bg: 'rgba(109,40,217,0.15)' },
    JPEG: { text: '#a78bfa', bg: 'rgba(109,40,217,0.15)' },
    SVG:  { text: '#34d399', bg: 'rgba(16,185,129,0.12)' },
    FIG:  { text: '#f472b6', bg: 'rgba(236,72,153,0.12)' },
    PSD:  { text: '#60a5fa', bg: 'rgba(59,130,246,0.12)' },
    AI:   { text: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
    WEBP: { text: '#a78bfa', bg: 'rgba(109,40,217,0.15)' },
  };
  const c = extColors[ext] ?? { text: '#64748b', bg: 'rgba(30,41,59,0.5)' };

  const diff = Date.now() - new Date(file.createdAt).getTime();
  const days = Math.floor(diff / 86400000);
  const timeStr = days === 0 ? 'today' : days < 30 ? `${days}d` : `${Math.floor(days / 30)}mo`;

  const sizeStr = file.fileSize < 1024 ? `${file.fileSize}B`
    : file.fileSize < 1048576 ? `${Math.round(file.fileSize / 1024)}KB`
    : `${(file.fileSize / 1048576).toFixed(1)}MB`;

  const dlUrl = `${baseUrl}/api/files/${file.id}/download`;

  return (
    <div className={`group flex items-center gap-3 px-4 py-2 hover:bg-slate-900/50 transition-colors ${!last ? 'border-b border-slate-800/40' : ''}`}>
      {/* Icon */}
      {isImage ? (
        <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-800 shrink-0 ring-1 ring-slate-700/50">
          <img src={`${dlUrl}?token=${token}`} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div
          className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center"
          style={{ background: c.bg }}
        >
          <span className="text-[8px] font-black leading-none" style={{ color: c.text }}>
            {ext.slice(0, 4)}
          </span>
        </div>
      )}

      <span className="flex-1 text-slate-300 text-xs truncate font-mono min-w-0">
        {file.fileName}
      </span>

      <span
        className="w-9 shrink-0 text-center text-[10px] font-mono rounded-md px-1 py-0.5"
        style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}
      >
        v{file.version}
      </span>

      <span className="flex-1 text-slate-700 text-[11px] italic truncate hidden sm:block">
        {file.commitMessage || ''}
      </span>

      <span className="w-12 text-right text-slate-700 text-[11px] font-mono shrink-0">{sizeStr}</span>
      <span className="w-12 text-right text-slate-700 text-[11px] shrink-0">{timeStr}</span>

      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
        {isImage && (
          <button
            onClick={handleOpen}
            className="w-5 text-center text-slate-700 hover:text-violet-400 text-sm"
            title="Open in Photos"
          >
            ⊙
          </button>
        )}
        <a
          href={dlUrl}
          download={file.fileName}
          className="w-5 text-center text-slate-700 hover:text-blue-400 text-sm"
          title="Download"
        >
          ↓
        </a>
      </div>
    </div>
  );
}

function NoSheets() {
  return (
    <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-800/60 rounded-2xl text-center">
      <div
        className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center"
        style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)' }}
      >
        <span className="text-slate-700 text-lg">⊞</span>
      </div>
      <p className="text-slate-600 text-sm">No sheets in this project.</p>
    </div>
  );
}