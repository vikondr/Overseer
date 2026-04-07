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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeSheet) return;
    const message = prompt('Commit message (optional)', '') ?? '';
    setUploadingFile(true);
    try {
      await uploadSheetFile(activeSheet, file, message);
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
      e.target.value = '';
    }
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
      <div className="min-h-screen bg-slate-900 pt-14 flex items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  if (!project) return null;

  const visibilityColors = {
    PUBLIC: 'border-green-700 text-green-400',
    UNLISTED: 'border-yellow-700 text-yellow-400',
    PRIVATE: 'border-slate-600 text-slate-400',
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-14">
      {/* Project Header */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 text-sm mb-1 flex-wrap">
                <Link
                  to={`/u/${username}`}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {username}
                </Link>
                <span className="text-slate-600">/</span>
                <span className="text-white font-medium">{project.name}</span>
                <span
                  className={`px-1.5 py-0.5 text-xs rounded border ${
                    visibilityColors[project.visibility] ?? visibilityColors.PRIVATE
                  }`}
                >
                  {project.visibility?.toLowerCase()}
                </span>
              </div>

              {project.description && (
                <p className="text-slate-400 text-sm mt-1 max-w-2xl">{project.description}</p>
              )}

              {(project.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {project.livePreviewUrl && (
                <a
                  href={project.livePreviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
                >
                  Preview ↗
                </a>
              )}
              {user && (
                <button
                  onClick={handleStar}
                  disabled={starLoading}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors disabled:opacity-50 border ${
                    starred
                      ? 'bg-yellow-900/40 text-yellow-400 border-yellow-700'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600'
                  }`}
                >
                  ★ {project.starCount}
                </button>
              )}
              {isOwner && (
                <Link
                  to={`/u/${username}/${slug}/edit`}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
                >
                  Edit
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Sheets Sidebar */}
        <div className="w-52 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">
              Sheets
            </span>
            {isOwner && (
              <button
                onClick={() => setShowNewSheet(true)}
                className="text-slate-400 hover:text-white text-xl leading-none"
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
                className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  activeSheet === sheet.id
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-700/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                onClick={() => setActiveSheet(sheet.id)}
              >
                <span className="text-sm truncate">{sheet.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs opacity-50">{sheet.fileCount}</span>
                  {isOwner && !sheet.isDefault && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSheet(sheet.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs ml-1"
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
                className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 text-white text-sm rounded focus:outline-none focus:border-blue-500"
              />
              <div className="flex gap-1 mt-1">
                <button
                  type="submit"
                  className="flex-1 py-1 btn-primary text-xs rounded"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewSheet(false);
                    setNewSheetName('');
                  }}
                  className="flex-1 py-1 bg-slate-700 text-slate-300 text-xs rounded"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {sheets.length === 0 && !showNewSheet && (
            <p className="text-slate-600 text-xs mt-2">
              {isOwner ? 'No sheets yet.' : 'No sheets.'}
            </p>
          )}
        </div>

        {/* Files Area */}
        <div className="flex-1 min-w-0">
          {!activeSheet ? (
            <div className="text-center py-16 text-slate-500">
              {isOwner ? (
                <button
                  onClick={() => setShowNewSheet(true)}
                  className="text-blue-400 hover:text-blue-300"
                >
                  + Create a sheet to start adding files
                </button>
              ) : (
                'No sheets yet.'
              )}
            </div>
          ) : !sheetDetail ? (
            <div className="text-slate-500 text-sm">Loading...</div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-white font-medium">{sheetDetail.name}</h2>
                  {sheetDetail.description && (
                    <p className="text-slate-500 text-sm">{sheetDetail.description}</p>
                  )}
                </div>
                {isOwner && (
                  <label
                    className={`px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg cursor-pointer transition-colors ${
                      uploadingFile ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    {uploadingFile ? 'Uploading...' : '+ Upload File'}
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                    />
                  </label>
                )}
              </div>

              {(sheetDetail.files || []).length === 0 ? (
                <div className="border-2 border-dashed border-slate-700 rounded-xl p-16 text-center text-slate-500">
                  {isOwner ? 'Upload files to get started.' : 'No files in this sheet.'}
                </div>
              ) : (
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-800 bg-slate-900/60">
                    <div className="w-8 shrink-0" />
                    <span className="flex-1 text-slate-500 text-[11px] uppercase tracking-wider">Name</span>
                    <span className="w-10 text-slate-500 text-[11px] uppercase tracking-wider shrink-0">Ver</span>
                    <span className="hidden sm:block w-48 text-slate-500 text-[11px] uppercase tracking-wider shrink-0">Message</span>
                    <span className="w-14 text-right text-slate-500 text-[11px] uppercase tracking-wider shrink-0">Size</span>
                    <span className="hidden md:block w-16 text-right text-slate-500 text-[11px] uppercase tracking-wider shrink-0">Date</span>
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

      {/* README */}
      {project.readmeContent && (
        <div className="max-w-7xl mx-auto px-4 pb-10">
          <div className="border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-slate-700 bg-slate-800/50 text-slate-400 text-sm font-medium">
              README
            </div>
            <pre className="p-6 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
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
      <div className="w-8 h-8 rounded overflow-hidden bg-slate-700 shrink-0">
        <img
          src={`/api/files/${file.id}/download`}
          alt=""
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const colorMap = {
    PDF: 'text-red-400 bg-red-900/20',
    PNG: 'text-violet-400 bg-violet-900/20',
    JPG: 'text-violet-400 bg-violet-900/20',
    JPEG: 'text-violet-400 bg-violet-900/20',
    SVG: 'text-green-400 bg-green-900/20',
    FIG: 'text-pink-400 bg-pink-900/20',
    XD:  'text-pink-400 bg-pink-900/20',
    AI:  'text-orange-400 bg-orange-900/20',
    PSD: 'text-blue-400 bg-blue-900/20',
  };
  const color = colorMap[ext] ?? 'text-slate-400 bg-slate-800';

  return (
    <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center ${color}`}>
      <span className="text-[9px] font-black leading-none">{ext.slice(0, 4)}</span>
    </div>
  );
}

function FileRow({ file, last }) {
  return (
    <div className={`group flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/50 transition-colors ${!last ? 'border-b border-slate-800/60' : ''}`}>
      <FileTypeIcon file={file} />

      <a
        href={`/api/files/${file.id}/download`}
        target="_blank"
        rel="noreferrer"
        className="flex-1 text-slate-300 text-sm hover:text-white truncate font-mono min-w-0"
        title={file.fileName}
      >
        {file.fileName}
      </a>

      <span className="w-10 shrink-0 px-1.5 py-0.5 text-center text-[10px] rounded font-mono bg-blue-950/60 text-blue-400 border border-blue-800/40">
        v{file.version}
      </span>

      {file.commitMessage ? (
        <span className="hidden sm:block w-48 text-slate-500 text-xs italic truncate shrink-0" title={file.commitMessage}>
          {file.commitMessage}
        </span>
      ) : (
        <span className="hidden sm:block w-48 shrink-0" />
      )}

      <span className="w-14 text-right text-slate-600 text-xs shrink-0">
        {fileSize(file.fileSize)}
      </span>

      <span className="hidden md:block w-16 text-right text-slate-600 text-xs shrink-0">
        {fileTimeAgo(file.createdAt)}
      </span>

      <a
        href={`/api/files/${file.id}/download`}
        download={file.fileName}
        className="w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-white text-sm text-center"
        title="Download"
      >
        ↓
      </a>
    </div>
  );
}
