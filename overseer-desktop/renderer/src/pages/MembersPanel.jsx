import { useEffect, useRef, useState } from 'react';
import ConfirmModal from './ConfirmModal';

const ROLE_COLORS = {
  OWNER:  { color: '#f472b6', bg: 'rgba(244,114,182,0.10)', border: 'rgba(244,114,182,0.30)' },
  EDITOR: { color: '#a78bfa', bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.30)' },
  VIEWER: { color: '#60a5fa', bg: 'rgba(96,165,250,0.10)',  border: 'rgba(96,165,250,0.30)'  },
};

/**
 * Collaborator management — list + add (via user search) + role change + remove.
 * Pure inline panel: no modal chrome. Drop into any container.
 */
export default function MembersPanel({ projectId, isOwner, api }) {
  const [members, setMembers]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState([]);
  const [searching, setSearching]   = useState(false);
  const [picked, setPicked]         = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [newRole, setNewRole]       = useState('EDITOR');
  const [adding, setAdding]         = useState(false);
  const [error, setError]           = useState('');
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [removing, setRemoving]     = useState(false);
  const searchBoxRef                = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.listMembers(projectId)
      .then((list) => { if (!cancelled) setMembers(list); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [api, projectId]);

  useEffect(() => {
    const term = query.trim();
    if (!term || (picked && picked.username === term)) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const page = await api.searchUsers(term, 0, 6);
        if (cancelled) return;
        const existingIds = new Set(members.map((m) => m.user.id));
        setResults((page.content || []).filter((u) => !existingIds.has(u.id)));
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 220);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, api, members, picked]);

  useEffect(() => {
    function onDocClick(e) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const pick = (u) => {
    setPicked(u);
    setQuery(u.username);
    setShowResults(false);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const username = (picked?.username ?? query).trim();
    if (!username) return;
    setAdding(true);
    setError('');
    try {
      const created = await api.addMember(projectId, { username, role: newRole });
      setMembers((m) => [...m, created]);
      setQuery('');
      setPicked(null);
      setResults([]);
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
      const updated = await api.updateMemberRole(projectId, userId, role);
      setMembers((list) => list.map((m) => (m.user.id === userId ? updated : m)));
    } catch (err) {
      setError(err.message);
    }
  };

  const requestRemove = (member) => {
    setConfirmRemove({
      userId: member.user.id,
      username: member.user.username,
      displayName: member.user.displayName || member.user.username,
    });
  };

  const confirmRemoveMember = async () => {
    if (!confirmRemove) return;
    setError('');
    setRemoving(true);
    try {
      await api.removeMember(projectId, confirmRemove.userId);
      setMembers((list) => list.filter((m) => m.user.id !== confirmRemove.userId));
      setConfirmRemove(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-3">
      {isOwner && (
        <form onSubmit={handleAdd} className="flex flex-wrap gap-2 items-stretch">
          <div ref={searchBoxRef} className="relative flex-1 min-w-[180px]">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPicked(null);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              placeholder="Search by username or name…"
              autoComplete="off"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-blue-600 text-white text-sm rounded-xl placeholder:text-slate-700 focus:outline-none transition-colors"
            />
            {showResults && query.trim() && (
              <div className="absolute z-30 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-700/70 bg-slate-900 shadow-2xl shadow-black/40">
                {searching && results.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-slate-500 animate-pulse">Searching…</div>
                ) : results.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-slate-500">No matches for “{query.trim()}”.</div>
                ) : (
                  results.map((u) => (
                    <button
                      type="button"
                      key={u.id}
                      onClick={() => pick(u)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-800/80 transition-colors text-left"
                    >
                      {u.avatarUrl ? (
                        <img
                          src={api.resolveUrl(u.avatarUrl)}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full ring-1 ring-slate-700/60 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full shrink-0 avatar-gradient flex items-center justify-center text-white text-xs font-bold">
                          {(u.username || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm font-medium truncate leading-tight">
                          {u.displayName || u.username}
                        </p>
                        <p className="text-slate-500 text-xs truncate">@{u.username}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
            {picked && (
              <div className="mt-1.5 flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
                <span>Adding</span>
                {picked.avatarUrl ? (
                  <img
                    src={api.resolveUrl(picked.avatarUrl)}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-4 h-4 rounded-full"
                  />
                ) : null}
                <span className="text-slate-200 font-medium">@{picked.username}</span>
              </div>
            )}
          </div>
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
            disabled={adding || !(picked || query.trim())}
            className="px-4 py-2 btn-primary text-sm rounded-xl font-semibold disabled:opacity-40"
          >
            {adding ? 'Adding…' : 'Add'}
          </button>
        </form>
      )}

      {error && (
        <p className="text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

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
              canManage={isOwner}
              resolveUrl={api.resolveUrl}
              onRoleChange={(role) => handleRoleChange(m.user.id, role)}
              onRemove={() => requestRemove(m)}
            />
          ))}
        </div>
      )}

      {!isOwner && (
        <p className="text-[11px] text-slate-600 pt-1">
          Only the project owner can add, remove, or change roles.
        </p>
      )}

      <ConfirmModal
        open={!!confirmRemove}
        title="Remove this member?"
        message={confirmRemove ? (
          <>
            They will lose access to this project immediately. You can re-add{' '}
            <span className="text-slate-200 font-medium">@{confirmRemove.username}</span> later.
          </>
        ) : null}
        confirmLabel="Remove"
        loading={removing}
        onConfirm={confirmRemoveMember}
        onClose={() => { if (!removing) setConfirmRemove(null); }}
      />
    </div>
  );
}

function MemberRow({ member, canManage, resolveUrl, onRoleChange, onRemove }) {
  const isOwner = member.role === 'OWNER';
  const c = ROLE_COLORS[member.role] ?? ROLE_COLORS.VIEWER;
  return (
    <div className="group flex items-center gap-3 px-3 py-2 rounded-xl border border-slate-800/60 bg-slate-900/40 hover:bg-slate-900/70 transition-colors">
      {member.user.avatarUrl ? (
        <img
          src={resolveUrl ? resolveUrl(member.user.avatarUrl) : member.user.avatarUrl}
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
