import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProjectBySlug, starProject, unstarProject } from '../api/projects';
import { getSheet, createSheet, deleteSheet } from '../api/sheets';
import { uploadSheetFile } from '../api/files';

export default function ProjectPage() {
  const { username, slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(null);
  const [sheetDetail, setSheetDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starred, setStarred] = useState(false);
  const [starLoading, setStarLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [newSheetName, setNewSheetName] = useState('');
  const [showNewSheet, setShowNewSheet] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [fileError, setFileError] = useState('');

  const isOwner = user?.username === username;

  useEffect(() => {
    setLoading(true);
    getProjectBySlug(username, slug)
      .then((p) => {
        setProject(p);
        setSheets(p.sheets || []);
        if (p.sheets?.length > 0) setActiveSheet(p.sheets[0].id);
      })
      .catch(() => navigate('/404'))
      .finally(() => setLoading(false));
  }, [username, slug, navigate]);

  useEffect(() => {
    if (!activeSheet || !project) return;
    setSheetDetail(null);
    getSheet(project.id, activeSheet)
      .then(setSheetDetail)
      .catch(console.error);
  }, [activeSheet, project]);

  const handleStar = async () => {
    if (!user) return;
    setStarLoading(true);
    try {
      if (starred) {
        await unstarProject(project.id);
        setStarred(false);
        setProject((p) => ({ ...p, starCount: p.starCount - 1 }));
      } else {
        await starProject(project.id);
        setStarred(true);
        setProject((p) => ({ ...p, starCount: p.starCount + 1 }));
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setStarLoading(false);
    }
  };

  const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'psd', 'ai', 'fig'];

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !activeSheet) return;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setFileError(`File type ".${ext}" is not supported. Allowed: PNG, JPG, WEBP, SVG, PSD, AI, FIG`);
      e.target.value = '';
      return;
    }
    setFileError('');
    setPendingFile({ file, inputRef: e.target });
    setCommitMessage('');
    setShowCommitModal(true);
  };

  const handleCommitConfirm = async () => {
    if (!pendingFile) return;
    setShowCommitModal(false);
    setUploadingFile(true);
    try {
      await uploadSheetFile(activeSheet, pendingFile.file, commitMessage);
      const updated = await getSheet(project.id, activeSheet);
      setSheetDetail(updated);
      setSheets((ss) =>
        ss.map((s) =>
          s.id === activeSheet ? { ...s, fileCount: updated.files?.length ?? s.fileCount } : s
        )
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setUploadingFile(false);
      if (pendingFile.inputRef) pendingFile.inputRef.value = '';
      setPendingFile(null);
      setCommitMessage('');
    }
  };

  const handleCommitCancel = () => {
    if (pendingFile?.inputRef) pendingFile.inputRef.value = '';
    setPendingFile(null);
    setCommitMessage('');
    setShowCommitModal(false);
  };

  const handleCreateSheet = async (e) => {
    e.preventDefault();
    if (!newSheetName.trim()) return;
    try {
      const sheet = await createSheet(project.id, { name: newSheetName.trim() });
      setSheets((s) => [
        ...s,
        { id: sheet.id, name: sheet.name, isDefault: sheet.isDefault, fileCount: 0 },
      ]);
      setActiveSheet(sheet.id);
      setNewSheetName('');
      setShowNewSheet(false);
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDeleteSheet = async (sheetId) => {
    if (!confirm('Delete this sheet and all its files?')) return;
    try {
      await deleteSheet(project.id, sheetId);
      const remaining = sheets.filter((s) => s.id !== sheetId);
      setSheets(remaining);
      if (activeSheet === sheetId) setActiveSheet(remaining[0]?.id ?? null);
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 pt-14 flex items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  if (!project) return null;

  const visibilityColors = {
    PUBLIC:   'border-emerald-700/60 text-emerald-400 bg-emerald-900/10',
    UNLISTED: 'border-yellow-700/60 text-yellow-400 bg-yellow-900/10',
    PRIVATE:  'border-slate-600/60 text-slate-400 bg-slate-800/30',
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-14">

      {/* ── Project Banner ──────────────────────────────────── */}
      <div className="relative border-b border-slate-800/60 overflow-hidden">
        {/* Background layer */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            opacity: 0.45,
          }} />
          <div style={{ position: 'absolute', top: '-30%', left: '-5%', width: '45vw', height: '45vw', maxWidth: 450, maxHeight: 450,
            background: 'radial-gradient(circle, rgba(96,165,250,0.11) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', top: '5%', left: '28%', width: '30vw', height: '30vw', maxWidth: 320, maxHeight: 320,
            background: 'radial-gradient(circle, rgba(167,139,250,0.09) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', bottom: '-25%', right: '5%', width: '38vw', height: '38vw', maxWidth: 380, maxHeight: 380,
            background: 'radial-gradient(circle, rgba(244,114,182,0.07) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', top: '30%', right: '20%', width: '20vw', height: '20vw', maxWidth: 220, maxHeight: 220,
            background: 'radial-gradient(circle, rgba(52,211,153,0.06) 0%, transparent 65%)' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-4">
            <Link to={`/u/${username}`} className="text-slate-400 hover:text-white transition-colors font-medium">
              {username}
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-white font-semibold">{project.name}</span>
            <span className={`px-2 py-0.5 text-xs rounded-full border font-medium ${visibilityColors[project.visibility] ?? visibilityColors.PRIVATE}`}>
              {project.visibility?.toLowerCase()}
            </span>
          </div>

          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <h1 className="text-4xl font-black text-white tracking-tight leading-tight mb-2">
                {project.name}
              </h1>
              {project.description && (
                <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
                  {project.description}
                </p>
              )}
              {(project.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 bg-slate-800/70 border border-slate-700/50 text-slate-400 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {project.livePreviewUrl && (
                <a
                  href={project.livePreviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 border border-slate-700 hover:border-slate-500 text-slate-300 text-sm rounded-xl transition-colors backdrop-blur-sm"
                >
                  Preview
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
              {user && (
                <button
                  onClick={handleStar}
                  disabled={starLoading}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl transition-all disabled:opacity-50 border backdrop-blur-sm ${
                    starred
                      ? 'bg-yellow-900/20 text-yellow-400 border-yellow-700/50'
                      : 'bg-slate-900/80 hover:bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <svg
                    className={`w-3.5 h-3.5 transition-colors ${starred ? 'fill-yellow-400 stroke-yellow-400' : 'fill-none stroke-current'}`}
                    viewBox="0 0 24 24"
                    strokeWidth={1.8}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                  <span className="font-semibold">{project.starCount}</span>
                </button>
              )}
              {isOwner && (
                <Link
                  to={`/u/${username}/${slug}/edit`}
                  className="px-3 py-1.5 bg-slate-900/80 border border-slate-700 hover:border-slate-500 text-slate-300 text-sm rounded-xl transition-colors backdrop-blur-sm"
                >
                  Edit
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main layout ─────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">

        {/* Sheets Sidebar */}
        <div className="w-56 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#60a5fa' }}>
              Sheets
            </span>
            {isOwner && (
              <button
                onClick={() => setShowNewSheet(true)}
                className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-600/60 text-slate-500 hover:text-blue-400 flex items-center justify-center transition-all text-base leading-none"
                title="New sheet"
              >
                +
              </button>
            )}
          </div>

          <div className="space-y-0.5">
            {sheets.map((sheet) => (
              <div
                key={sheet.id}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all ${
                  activeSheet === sheet.id
                    ? 'border border-blue-800/50'
                    : 'text-slate-500 hover:text-slate-300 border border-transparent hover:bg-slate-900/60'
                }`}
                style={activeSheet === sheet.id
                  ? { background: 'rgba(59,130,246,0.1)', color: '#93c5fd' }
                  : {}}
                onClick={() => setActiveSheet(sheet.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0 transition-colors"
                    style={{ background: activeSheet === sheet.id ? '#60a5fa' : '#1e293b' }}
                  />
                  <span className="text-sm truncate">{sheet.name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {sheet.fileCount > 0 && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                      style={activeSheet === sheet.id
                        ? { background: 'rgba(59,130,246,0.2)', color: '#93c5fd' }
                        : { background: '#0f172a', color: '#334155' }}
                    >
                      {sheet.fileCount}
                    </span>
                  )}
                  {isOwner && !sheet.isDefault && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteSheet(sheet.id); }}
                      className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-red-400 text-xs transition-all ml-0.5"
                      title="Delete sheet"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {showNewSheet && (
            <form onSubmit={handleCreateSheet} className="mt-2">
              <input
                autoFocus
                value={newSheetName}
                onChange={(e) => setNewSheetName(e.target.value)}
                placeholder="Sheet name"
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-blue-700/50 text-white text-sm rounded-lg focus:outline-none placeholder:text-slate-700"
              />
              <div className="flex gap-1 mt-1">
                <button type="submit" className="flex-1 py-1 btn-primary text-xs rounded-lg font-medium">
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewSheet(false); setNewSheetName(''); }}
                  className="flex-1 py-1 bg-slate-900 border border-slate-800 text-slate-500 text-xs rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {sheets.length === 0 && !showNewSheet && (
            <p className="text-slate-700 text-xs mt-2 pl-1">
              {isOwner ? 'No sheets yet.' : 'No sheets.'}
            </p>
          )}
        </div>

        {/* Files Area */}
        <div className="flex-1 min-w-0">
          {!activeSheet ? (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800/80 rounded-2xl text-center">
              <div
                className="w-12 h-12 rounded-2xl mb-4 flex items-center justify-center text-xl"
                style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}
              >
                ⊞
              </div>
              {isOwner ? (
                <>
                  <p className="text-slate-400 font-medium mb-1">No sheets yet</p>
                  <p className="text-slate-600 text-sm mb-4">Create a sheet to start organizing files</p>
                  <button
                    onClick={() => setShowNewSheet(true)}
                    className="px-4 py-1.5 btn-primary text-sm rounded-xl font-medium"
                  >
                    + New Sheet
                  </button>
                </>
              ) : (
                <p className="text-slate-600 text-sm">No sheets yet.</p>
              )}
            </div>
          ) : !sheetDetail ? (
            <div className="text-slate-600 text-sm animate-pulse">Loading…</div>
          ) : (
            <>
              {/* Sheet header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-white font-semibold">{sheetDetail.name}</h2>
                  {sheetDetail.description && (
                    <p className="text-slate-500 text-sm mt-0.5">{sheetDetail.description}</p>
                  )}
                </div>
                {isOwner && (
                  <div className="flex flex-col items-end gap-1">
                    <label
                      className={`flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 border border-slate-800 hover:border-blue-600/60 text-slate-400 hover:text-blue-300 text-sm rounded-xl cursor-pointer transition-all ${
                        uploadingFile ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      {uploadingFile ? 'Uploading…' : 'Upload File'}
                      <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploadingFile} />
                    </label>
                    {fileError && (
                      <p className="text-red-400 text-xs max-w-xs text-right">{fileError}</p>
                    )}
                  </div>
                )}
              </div>

              {(sheetDetail.files || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800/80 rounded-2xl p-16 text-center">
                  <div
                    className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center"
                    style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}
                  >
                    <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <p className="text-slate-600 text-sm">
                    {isOwner ? 'Upload files to get started.' : 'No files in this sheet.'}
                  </p>
                </div>
              ) : (
                <div className="border border-slate-800/80 rounded-2xl overflow-hidden">
                  {/* Table header */}
                  <div
                    className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-800/60"
                    style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.5) 100%)' }}
                  >
                    <div className="w-8 shrink-0" />
                    <span className="flex-1 text-[10px] font-semibold uppercase tracking-widest text-slate-700">Name</span>
                    <span className="w-10 text-[10px] font-semibold uppercase tracking-widest text-slate-700 shrink-0">Ver</span>
                    <span className="hidden sm:block w-48 text-[10px] font-semibold uppercase tracking-widest text-slate-700 shrink-0">Message</span>
                    <span className="w-14 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-700 shrink-0">Size</span>
                    <span className="hidden md:block w-16 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-700 shrink-0">Date</span>
                    <span className="w-5 shrink-0" />
                  </div>
                  {sheetDetail.files.map((file, i) => (
                    <FileRow
                      key={file.id}
                      file={file}
                      last={i === sheetDetail.files.length - 1}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Commit Message Modal ─────────────────────────────── */}
      {showCommitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleCommitCancel} />
          <div
            className="relative w-full max-w-md border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/60 p-6 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0d1424 0%, #111827 100%)' }}
          >
            {/* Accent blob */}
            <div
              className="absolute top-0 right-0 w-36 h-36 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 100% 0%, rgba(96,165,250,0.1) 0%, transparent 70%)' }}
            />
            <h3 className="text-white font-semibold text-base mb-0.5">Upload file</h3>
            <p className="text-slate-600 text-xs mb-5 font-mono truncate">{pendingFile?.file?.name}</p>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
              Commit message
              <span className="normal-case font-normal text-slate-700 ml-1">(optional)</span>
            </label>
            <input
              autoFocus
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCommitConfirm();
                if (e.key === 'Escape') handleCommitCancel();
              }}
              placeholder="Describe what changed…"
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 text-white text-sm rounded-xl focus:outline-none focus:border-blue-500 placeholder:text-slate-700 transition-colors"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCommitCancel}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 text-sm rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCommitConfirm}
                className="flex-1 py-2 btn-primary text-sm rounded-xl font-semibold"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── README ──────────────────────────────────────────── */}
      {project.readmeContent && (
        <div className="max-w-7xl mx-auto px-4 pb-12">
          <div className="border border-slate-800/70 rounded-2xl overflow-hidden">
            <div
              className="flex items-center gap-2.5 px-5 py-3 border-b border-slate-800/60"
              style={{ background: 'linear-gradient(90deg, rgba(96,165,250,0.07) 0%, transparent 60%)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#60a5fa' }}>
                README
              </span>
            </div>
            <pre className="p-6 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto bg-slate-950/40">
              {project.readmeContent}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function fileSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function fileTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  const months = Math.floor(days / 30);
  if (months > 0) return `${months}mo`;
  if (days > 0) return `${days}d`;
  return 'today';
}

function FileTypeIcon({ file }) {
  const isImage = file.mimeType?.startsWith('image/');
  const ext = file.fileName.split('.').pop()?.toUpperCase() ?? '';

  if (isImage) {
    return (
      <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-800 shrink-0 ring-1 ring-slate-700/50">
        <img
          src={`/api/files/${file.id}/download`}
          alt=""
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const colorMap = {
    PDF:  { text: 'text-red-400',    bg: 'bg-red-950/40',    ring: 'ring-red-800/30'    },
    PNG:  { text: 'text-violet-400', bg: 'bg-violet-950/40', ring: 'ring-violet-800/30' },
    JPG:  { text: 'text-violet-400', bg: 'bg-violet-950/40', ring: 'ring-violet-800/30' },
    JPEG: { text: 'text-violet-400', bg: 'bg-violet-950/40', ring: 'ring-violet-800/30' },
    SVG:  { text: 'text-emerald-400', bg: 'bg-emerald-950/40', ring: 'ring-emerald-800/30' },
    FIG:  { text: 'text-pink-400',   bg: 'bg-pink-950/40',   ring: 'ring-pink-800/30'   },
    XD:   { text: 'text-pink-400',   bg: 'bg-pink-950/40',   ring: 'ring-pink-800/30'   },
    AI:   { text: 'text-orange-400', bg: 'bg-orange-950/40', ring: 'ring-orange-800/30' },
    PSD:  { text: 'text-blue-400',   bg: 'bg-blue-950/40',   ring: 'ring-blue-800/30'   },
  };
  const style = colorMap[ext] ?? { text: 'text-slate-400', bg: 'bg-slate-800/60', ring: 'ring-slate-700/30' };

  return (
    <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ring-1 ${style.bg} ${style.ring}`}>
      <span className={`text-[9px] font-black leading-none ${style.text}`}>{ext.slice(0, 4)}</span>
    </div>
  );
}

function FileRow({ file, last }) {
  return (
    <div
      className={`group flex items-center gap-3 px-4 py-2.5 hover:bg-slate-900/60 transition-colors ${
        !last ? 'border-b border-slate-800/50' : ''
      }`}
    >
      <FileTypeIcon file={file} />

      <a
        href={`/api/files/${file.id}/download`}
        target="_blank"
        rel="noreferrer"
        className="flex-1 text-slate-300 text-sm hover:text-white truncate font-mono min-w-0 transition-colors"
        title={file.fileName}
      >
        {file.fileName}
      </a>

      <span className="w-10 shrink-0 px-1.5 py-0.5 text-center text-[10px] rounded-md font-mono bg-blue-950/50 text-blue-400 border border-blue-800/30">
        v{file.version}
      </span>

      {file.commitMessage ? (
        <span
          className="hidden sm:block w-48 text-slate-600 text-xs italic truncate shrink-0"
          title={file.commitMessage}
        >
          {file.commitMessage}
        </span>
      ) : (
        <span className="hidden sm:block w-48 shrink-0" />
      )}

      <span className="w-14 text-right text-slate-700 text-xs shrink-0 font-mono">
        {fileSize(file.fileSize)}
      </span>

      <span className="hidden md:block w-16 text-right text-slate-700 text-xs shrink-0">
        {fileTimeAgo(file.createdAt)}
      </span>

      <a
        href={`/api/files/${file.id}/download`}
        download={file.fileName}
        className="w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-blue-400 text-sm text-center"
        title="Download"
      >
        ↓
      </a>
    </div>
  );
}