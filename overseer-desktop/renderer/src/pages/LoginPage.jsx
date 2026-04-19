import { useState } from 'react';

export default function LoginPage({ onConnect }) {
  const [url, setUrl] = useState('http://localhost:8080');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const tok = await window.electron.openGoogleAuth(url.trim());
      await onConnect(url.trim(), tok);
    } catch (err) {
      if (err.message !== 'cancelled') setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full bg-slate-950 flex items-center justify-center relative overflow-hidden">

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)',
          backgroundSize: '28px 28px', opacity: 0.4,
        }} />
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '60vw', height: '60vw',
          background: 'radial-gradient(circle, rgba(96,165,250,0.1) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '50vw', height: '50vw',
          background: 'radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', top: '40%', right: '20%', width: '30vw', height: '30vw',
          background: 'radial-gradient(circle, rgba(244,114,182,0.07) 0%, transparent 65%)' }} />
      </div>

      <div className="relative w-full max-w-sm px-6">
        {/* Logo */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5 text-2xl font-black"
            style={{
              background: 'linear-gradient(135deg, rgba(96,165,250,0.15) 0%, rgba(167,139,250,0.15) 100%)',
              border: '1px solid rgba(96,165,250,0.25)',
              color: '#60a5fa',
            }}
          >
            ◈
          </div>
          <h1
            className="text-3xl font-black tracking-tight mb-1"
            style={{
              background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #f472b6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Overseer
          </h1>
          <p className="text-slate-500 text-sm">Desktop Client</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border border-slate-800/80 p-6 relative overflow-hidden"
          style={{ background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(20px)' }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 100% 0%, rgba(167,139,250,0.1) 0%, transparent 70%)' }} />

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
                Server URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 text-white text-sm rounded-xl focus:outline-none focus:border-blue-500 placeholder:text-slate-700 transition-colors font-mono"
                placeholder="http://localhost:8080"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3 bg-white hover:bg-slate-100 text-slate-800 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <GoogleIcon />
              {loading ? 'Opening…' : 'Sign in with Google'}
            </button>
          </div>
        </div>

        <div className="flex gap-1 justify-center mt-6">
          {['#60a5fa', '#a78bfa', '#f472b6', '#34d399'].map((c) => (
            <div key={c} className="w-1.5 h-1.5 rounded-full opacity-40" style={{ background: c }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}