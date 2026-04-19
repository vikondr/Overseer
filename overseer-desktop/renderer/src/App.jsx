import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import WorkspacePage from './pages/WorkspacePage';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('overseer_token') || '');
  const [baseUrl, setBaseUrl] = useState(() => localStorage.getItem('overseer_url') || 'http://localhost:8080');
  const [user, setUser]       = useState(null);
  const [checking, setChecking] = useState(!!localStorage.getItem('overseer_token'));

  useEffect(() => {
    const saved = localStorage.getItem('overseer_token');
    const url   = localStorage.getItem('overseer_url') || 'http://localhost:8080';
    if (!saved) { setChecking(false); return; }
    fetch(`${url}/api/auth/me`, { headers: { Authorization: `Bearer ${saved}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((u) => setUser(u))
      .catch(() => { localStorage.removeItem('overseer_token'); setToken(''); })
      .finally(() => setChecking(false));
  }, []);

  const connect = async (url, tok) => {
    const res = await fetch(`${url}/api/auth/me`, { headers: { Authorization: `Bearer ${tok}` } });
    if (!res.ok) throw new Error('Invalid token or server not reachable.');
    const u = await res.json();
    localStorage.setItem('overseer_token', tok);
    localStorage.setItem('overseer_url', url);
    setToken(tok);
    setBaseUrl(url);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('overseer_token');
    setToken('');
    setUser(null);
  };

  if (checking) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="w-6 h-6 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginPage onConnect={connect} />;
  return <WorkspacePage user={user} token={token} baseUrl={baseUrl} onLogout={logout} />;
}