import { useEffect, useState } from 'react';

const ROLE_COLORS = {
  OWNER:  { color: '#f472b6', bg: 'rgba(244,114,182,0.10)', border: 'rgba(244,114,182,0.30)' },
  EDITOR: { color: '#a78bfa', bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.30)' },
  VIEWER: { color: '#60a5fa', bg: 'rgba(96,165,250,0.10)',  border: 'rgba(96,165,250,0.30)'  },
};

export default function MembersModal({ projectId, isOwner, api, onClose }) {
  const [members, setMembers]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole]       = useState('EDITOR');
  const [adding, setAdding]         = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.listMembers(projectId)
      .then((list) => { if (!cancelled) setMembers(list); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [api, projectId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const username = newUsername.trim();
    if (!username) return;
    setAdding(true);
    setError('');
    try {
      const created = await api.addMember(projectId, { username, role: newRole });
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
      const updated = await api.updateMemberRole(projectId, userId, role);
      setMembers((list) => list.map((m) => (m.user.id === userId ? updated : m)));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemove = async (userId, username) => {
    if (!confirm(`Remove ${username} from this project?`)) return;
    setError('');
    try {
      await api.removeMember(projectId, userId);
      setMembers((list) => list.filter((m) => m.user.id !== userId));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-lg max-h-[85vh] flex flex-col border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0a1220 0%, #0f172a 100%)' }}
      >
        <div className="absolute top-0 left-0 w-48 h-48 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 0% 0%, rgba(244,114,182,0.10) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-48 h-48 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 100% 100%, rgba(167,139,250,0.08) 0%, transparent 70%)' }} />

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 py-4 border-b border-slate-800/60 shrink-0">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#f472b6' }}>
              Members
            </p>
            <h2 className="text-white font-bold text-base leading-tight">
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors text-xl ml-4 shrink-0">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="relative flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {isOwner && (
            <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Username"
                className="flex-1 min-w-[160px] px-3 py-2 bg-slate-900 border border-slate-800 focus:border-blue-600 text-white text-sm rounded-xl placeholder:text-slate-700 focus:outline-none transition-colors"
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
                  onRoleChange={(role) => handleRoleChange(m.user.id, role)}
                  onRemove={() => handleRemove(m.user.id, m.user.username)}
                />
              ))}
            </div>
          )}
        </div>

        {!isOwner && (
          <div className="relative px-6 py-3 border-t border-slate-800/60 text-[11px] text-slate-600">
            Only the project owner can add or remove members.
          </div>
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