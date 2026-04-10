import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-950 pt-14 flex items-center justify-center overflow-hidden relative">

      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          opacity: 0.35,
        }} />
        <div style={{ position: 'absolute', top: '10%', left: '10%', width: '40vw', height: '40vw', maxWidth: 500, maxHeight: 500,
          background: 'radial-gradient(circle, rgba(96,165,250,0.07) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '35vw', height: '35vw', maxWidth: 450, maxHeight: 450,
          background: 'radial-gradient(circle, rgba(167,139,250,0.07) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', top: '40%', left: '40%', width: '25vw', height: '25vw', maxWidth: 350, maxHeight: 350,
          background: 'radial-gradient(circle, rgba(244,114,182,0.05) 0%, transparent 65%)' }} />
      </div>

      <div className="relative text-center px-4">
        {/* 404 number */}
        <p
          className="font-black leading-none mb-6 select-none"
          style={{
            fontSize: 'clamp(100px, 20vw, 180px)',
            background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 40%, #f472b6 70%, #34d399 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            opacity: 0.35,
          }}
        >
          404
        </p>

        <h1 className="text-2xl font-bold text-white mb-2 -mt-4">Page not found</h1>
        <p className="text-slate-500 text-sm mb-8 max-w-xs mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="px-6 py-2.5 btn-primary rounded-xl text-sm font-semibold"
          >
            Go home
          </Link>
          <Link
            to="/explore"
            className="px-6 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-300 rounded-xl text-sm transition-colors"
          >
            Explore projects
          </Link>
        </div>
      </div>
    </div>
  );
}