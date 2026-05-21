import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProjectBySlug, starProject, unstarProject } from '../api/projects';
import { getSheet, createSheet, deleteSheet } from '../api/sheets';
import {
  getProjectMembers,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
} from '../api/members';
import LoadingPage from '../components/LoadingPage';
import PageBanner from '../components/PageBanner';
import ImageLightbox from '../components/ImageLightbox';
import CompareVersionsModal from '../components/CompareVersionsModal';
import ForkSheetModal from '../components/ForkSheetModal';
import MergeSheetModal from '../components/MergeSheetModal';
import Markdown from '../components/Markdown';

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
  const [newSheetName, setNewSheetName] = useState('');
  const [showNewSheet, setShowNewSheet] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [compareFile, setCompareFile] = useState(null);
  const [forkSource, setForkSource]   = useState(null);
  const [mergeSource, setMergeSource] = useState(null);

  // Authoritative role comes from the backend response; fall back to ownership-by-username
  // so the UI doesn't look broken on a stale snapshot before the backfill runs.
  const myRole = project?.myRole ?? (user?.username === username ? 'OWNER' : null);
  const isOwner = myRole === 'OWNER';
  const canEdit = myRole === 'OWNER' || myRole === 'EDITOR';
  // PUBLIC projects can be forked by anyone with read access (collaborative-VCS pitch).
  // PRIVATE/UNLISTED require EDITOR+ (matches SheetService.forkSheet).
  const canFork = !!user && (project?.visibility === 'PUBLIC' || canEdit);
  const activeSheetSummary = sheets.find((s) => s.id === activeSheet) || null;
  const isFork = !!activeSheetSummary?.parentSheetId;

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

  const refreshProject = async () => {
    try {
      const refreshed = await getProjectBySlug(username, slug);
      setProject(refreshed);
      setSheets(refreshed.sheets || []);
      return refreshed;
    } catch (e) {
      console.error(e);
    }
  };

  const handleForkDone = async (created) => {
    setForkSource(null);
    await refreshProject();
    setActiveSheet(created.id);
  };

  const handleMergeDone = async (result) => {
    const targetSheetId = result?.parentSheetId ?? mergeSource?.parentSheetId;
    setMergeSource(null);
    await refreshProject();
    if (targetSheetId) setActiveSheet(targetSheetId);
  };

  if (loading) return <LoadingPage />;
  if (!project) return null;

  const visibilityColors = {
    PUBLIC:   'border-emerald-700/60 text-emerald-400 bg-emerald-900/10',
    UNLISTED: 'border-yellow-700/60 text-yellow-400 bg-yellow-900/10',
    PRIVATE:  'border-slate-600/60 text-slate-400 bg-slate-800/30',
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-14">

      {/* ── Project Banner ──────────────────────────────────── */}
      <PageBanner>
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
              {canEdit && (
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
      </PageBanner>

      {/* ── Main layout ─────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">

        {/* Sheets Sidebar */}
        <div className="w-56 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#60a5fa' }}>
              Sheets
            </span>
            {canEdit && (
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
                  {sheet.parentSheetId ? (
                    <BranchIcon
                      className="w-3 h-3 shrink-0"
                      color={activeSheet === sheet.id ? '#a78bfa' : '#475569'}
                    />
                  ) : (
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0 transition-colors"
                      style={{ background: activeSheet === sheet.id ? '#60a5fa' : '#1e293b' }}
                    />
                  )}
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
                  {canEdit && !sheet.isDefault && (
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
              {canEdit ? 'No sheets yet.' : 'No sheets.'}
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
            </div>
          ) : !sheetDetail ? (
            <div className="text-slate-600 text-sm animate-pulse">Loading…</div>
          ) : (
            <>
              {/* Sheet header */}
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {isFork && <BranchIcon className="w-4 h-4 shrink-0" color="#a78bfa" />}
                    <h2 className="text-white font-semibold truncate">{sheetDetail.name}</h2>
                  </div>
                  {sheetDetail.description && (
                    <p className="text-slate-500 text-sm mt-0.5">{sheetDetail.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {isFork && canEdit && (
                    <button
                      onClick={() => setMergeSource(activeSheetSummary)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                      style={{
                        color: '#60a5fa',
                        border: '1px solid rgba(96,165,250,0.25)',
                        background: 'rgba(96,165,250,0.06)',
                      }}
                      title="Merge this fork back into its parent"
                    >
                      <MergeIcon className="w-3 h-3" color="#60a5fa" />
                      Merge
                    </button>
                  )}
                  {canFork && (
                    <button
                      onClick={() => setForkSource(activeSheetSummary)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                      style={{
                        color: '#a78bfa',
                        border: '1px solid rgba(167,139,250,0.25)',
                        background: 'rgba(167,139,250,0.06)',
                      }}
                      title="Fork this sheet"
                    >
                      <BranchIcon className="w-3 h-3" color="#a78bfa" />
                      Fork
                    </button>
                  )}
                  {canEdit && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/60 border border-slate-800 text-slate-500 text-xs rounded-xl">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Push commits via the desktop app
                    </div>
                  )}
                </div>
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
                    {canEdit ? 'Push files via the desktop app to get started.' : 'No files in this sheet.'}
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
                      onPreview={() => setPreviewFile(file)}
                      onCompare={() => setCompareFile(file)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

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
            <div className="p-6 bg-slate-950/40 overflow-x-auto">
              <Markdown source={project.readmeContent} />
            </div>
          </div>
        </div>
      )}

      {/* ── Members (visible to any member; mutations OWNER-only) ── */}
      {myRole && project && (
        <div className="max-w-7xl mx-auto px-4 pb-12">
          <MembersSection projectId={project.id} canManage={isOwner} />
        </div>
      )}

      {/* ── Image Lightbox ──────────────────────────────────── */}
      <ImageLightbox
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        src={previewFile ? `/api/files/${previewFile.id}/download` : ''}
        fileName={previewFile?.fileName ?? ''}
        downloadHref={previewFile ? `/api/files/${previewFile.id}/download` : ''}
        onCompareVersions={previewFile ? () => {
          setCompareFile(previewFile);
          setPreviewFile(null);
        } : undefined}
      />

      {/* ── Compare Versions Modal ──────────────────────────── */}
      <CompareVersionsModal
        open={!!compareFile}
        onClose={() => setCompareFile(null)}
        file={compareFile}
        sheetId={activeSheet}
      />

      {/* ── Fork Sheet Modal ────────────────────────────────── */}
      {forkSource && project && (
        <ForkSheetModal
          projectId={project.id}
          sourceSheet={forkSource}
          onClose={() => setForkSource(null)}
          onDone={handleForkDone}
        />
      )}

      {/* ── Merge Sheet Modal ───────────────────────────────── */}
      {mergeSource && project && (
        <MergeSheetModal
          projectId={project.id}
          forkSheet={mergeSource}
          parentSheet={sheets.find((s) => s.id === mergeSource.parentSheetId) || null}
          canMerge={canEdit}
          onClose={() => setMergeSource(null)}
          onDone={handleMergeDone}
        />
      )}
    </div>
  );
}

function BranchIcon({ className, color }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  );
}

function MergeIcon({ className, color }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M6 21V9a9 9 0 0 0 9 9" />
    </svg>
  );
}

/* ── Members section ───────────────────────────────────── */

const ROLE_COLORS = {
  OWNER:  { color: '#f472b6', bg: 'rgba(244,114,182,0.10)', border: 'rgba(244,114,182,0.30)' },
  EDITOR: { color: '#a78bfa', bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.30)' },
  VIEWER: { color: '#60a5fa', bg: 'rgba(96,165,250,0.10)',  border: 'rgba(96,165,250,0.30)'  },
};

function MembersSection({ projectId, canManage }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState('EDITOR');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getProjectMembers(projectId)
      .then((list) => { if (!cancelled) setMembers(list); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const username = newUsername.trim();
    if (!username) return;
    setAdding(true);
    setError('');
    try {
      const created = await addProjectMember(projectId, { username, role: newRole });
      setMembers((m) => [...m, created]);
      setNewUsername('');
      setNewRole('EDITOR');
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleRoleChange = async (userId, role) => {
    setError('');
    try {
      const updated = await updateProjectMemberRole(projectId, userId, role);
      setMembers((list) => list.map((m) => (m.user.id === userId ? updated : m)));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemove = async (userId, username) => {
    if (!confirm(`Remove ${username} from this project?`)) return;
    setError('');
    try {
      await removeProjectMember(projectId, userId);
      setMembers((list) => list.filter((m) => m.user.id !== userId));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="border border-slate-800/70 rounded-2xl overflow-hidden">
      <div
        className="flex items-center gap-2.5 px-5 py-3 border-b border-slate-800/60"
        style={{ background: 'linear-gradient(90deg, rgba(244,114,182,0.07) 0%, transparent 60%)' }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#f472b6' }} />
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#f472b6' }}>
          Members
        </span>
        <span className="text-slate-700 text-xs ml-auto">{members.length}</span>
      </div>

      <div className="p-5 space-y-4 bg-slate-950/40">
        {/* Add member form — OWNER only */}
        {canManage && (
          <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Username"
              className="flex-1 min-w-[180px] px-3 py-2 bg-slate-900 border border-slate-800 focus:border-blue-600 text-white text-sm rounded-xl placeholder:text-slate-700 focus:outline-none transition-colors"
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 text-white text-sm rounded-xl focus:outline-none focus:border-violet-600 transition-colors"
            >
              <option value="EDITOR">Editor</option>
              <option value="VIEWER">Viewer</option>
            </select>
            <button
              type="submit"
              disabled={adding || !newUsername.trim()}
              className="px-4 py-2 btn-primary text-sm rounded-xl font-semibold disabled:opacity-40"
            >
              {adding ? 'Adding…' : 'Add member'}
            </button>
          </form>
        )}

        {error && <p className="text-red-400 text-xs">{error}</p>}

        {/* Member list */}
        {loading ? (
          <div className="text-slate-700 text-sm animate-pulse">Loading members…</div>
        ) : members.length === 0 ? (
          <p className="text-slate-700 text-sm">No members yet.</p>
        ) : (
          <div className="space-y-1.5">
            {members.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                canManage={canManage}
                onRoleChange={(role) => handleRoleChange(m.user.id, role)}
                onRemove={() => handleRemove(m.user.id, m.user.username)}
              />
            ))}
          </div>
        )}

        {!canManage && (
          <p className="text-slate-700 text-[11px] pt-1">
            Only the project owner can add, remove, or change roles.
          </p>
        )}
      </div>
    </div>
  );
}

function MemberRow({ member, canManage, onRoleChange, onRemove }) {
  const isOwner = member.role === 'OWNER';
  const c = ROLE_COLORS[member.role] ?? ROLE_COLORS.VIEWER;
  return (
    <div className="group flex items-center gap-3 px-3 py-2 rounded-xl border border-slate-800/60 bg-slate-900/40 hover:bg-slate-900/70 transition-colors">
      {member.user.avatarUrl ? (
        <img
          src={member.user.avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="w-8 h-8 rounded-full ring-1 ring-slate-700/60 shrink-0"
        />
      ) : (
        <div className="w-8 h-8 rounded-full shrink-0 avatar-gradient flex items-center justify-center text-white text-xs font-bold">
          {(member.user.username || '?')[0].toUpperCase()}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-white text-sm font-medium truncate leading-tight">
          {member.user.displayName || member.user.username}
        </p>
        <p className="text-slate-600 text-xs truncate">@{member.user.username}</p>
      </div>

      {isOwner || !canManage ? (
        <span
          className="text-[11px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-lg border"
          style={{ color: c.color, background: c.bg, borderColor: c.border }}
        >
          {member.role.toLowerCase()}
        </span>
      ) : (
        <select
          value={member.role}
          onChange={(e) => onRoleChange(e.target.value)}
          className="text-xs font-semibold uppercase tracking-widest px-2.5 py-1 rounded-lg border bg-transparent focus:outline-none"
          style={{ color: c.color, background: c.bg, borderColor: c.border }}
        >
          <option value="EDITOR" style={{ color: '#0f172a' }}>Editor</option>
          <option value="VIEWER" style={{ color: '#0f172a' }}>Viewer</option>
        </select>
      )}

      {canManage && !isOwner && (
        <button
          type="button"
          onClick={onRemove}
          className="text-slate-700 hover:text-red-400 text-sm opacity-0 group-hover:opacity-100 transition-all px-2"
          title="Remove member"
        >
          ✕
        </button>
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

function FileRow({ file, last, onPreview, onCompare }) {
  const isImage = file.mimeType?.startsWith('image/');

  return (
    <div
      className={`group flex items-center gap-3 px-4 py-2.5 hover:bg-slate-900/60 transition-colors ${
        !last ? 'border-b border-slate-800/50' : ''
      }`}
    >
      {isImage ? (
        <button
          type="button"
          onClick={onPreview}
          className="shrink-0 cursor-zoom-in"
          title="Preview"
        >
          <FileTypeIcon file={file} />
        </button>
      ) : (
        <FileTypeIcon file={file} />
      )}

      {isImage ? (
        <button
          type="button"
          onClick={onPreview}
          className="flex-1 text-left text-slate-300 text-sm hover:text-white truncate font-mono min-w-0 transition-colors cursor-zoom-in"
          title={file.fileName}
        >
          {file.fileName}
        </button>
      ) : (
        <a
          href={`/api/files/${file.id}/download`}
          target="_blank"
          rel="noreferrer"
          className="flex-1 text-slate-300 text-sm hover:text-white truncate font-mono min-w-0 transition-colors"
          title={file.fileName}
        >
          {file.fileName}
        </a>
      )}

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

      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {isImage && file.version > 1 && (
          <button
            type="button"
            onClick={onCompare}
            className="w-5 text-slate-500 hover:text-violet-400 text-sm text-center"
            title="Compare versions"
          >
            ⇄
          </button>
        )}
        <a
          href={`/api/files/${file.id}/download`}
          download={file.fileName}
          className="w-5 text-slate-500 hover:text-blue-400 text-sm text-center"
          title="Download"
        >
          ↓
        </a>
      </div>
    </div>
  );
}
