import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { exploreProjects } from '../api/projects';
import ProjectCard from '../components/ProjectCard';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || '';

const MARQUEE_TAGS = [
  'UI Design', 'Branding', 'Motion Graphics', '3D Art', 'Typography',
  'Illustration', 'Web Design', 'Logo Design', 'Photography', 'Concept Art',
  'Packaging', 'Icon Design', 'Product Design', 'Visual Identity', 'Print',
  'UI Design', 'Branding', 'Motion Graphics', '3D Art', 'Typography',
  'Illustration', 'Web Design', 'Logo Design', 'Photography', 'Concept Art',
  'Packaging', 'Icon Design', 'Product Design', 'Visual Identity', 'Print',
];

const PREVIEW_CARDS = [
  { from: '#1e3a8a', to: '#0f172a', letter: 'B' },
  { from: '#4c1d95', to: '#0f172a', letter: 'M' },
  { from: '#064e3b', to: '#0f172a', letter: 'R' },
  { from: '#881337', to: '#0f172a', letter: 'T' },
  { from: '#1e1b4b', to: '#0f172a', letter: 'W' },
  { from: '#3d1a78', to: '#0f172a', letter: 'P' },
  { from: '#422006', to: '#0f172a', letter: 'L' },
  { from: '#0c4a6e', to: '#0f172a', letter: 'S' },
];

export default function LandingPage() {
  const { user } = useAuth();
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    exploreProjects(0, 4, 'stars')
      .then((d) => setFeatured(d.content || []))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center px-4 pt-32 pb-0 overflow-hidden">
        {/* Layered background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            opacity: 0.5,
          }}
        />
        {/* Glow blobs */}
        <div className="absolute pointer-events-none" style={{
          top: '-10%', left: '10%', width: '60vw', height: '60vw', maxWidth: 800, maxHeight: 800,
          background: 'radial-gradient(circle, rgba(59,130,246,0.09) 0%, transparent 65%)',
        }} />
        <div className="absolute pointer-events-none" style={{
          top: '20%', right: '-5%', width: '40vw', height: '40vw', maxWidth: 600, maxHeight: 600,
          background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 65%)',
        }} />
        <div className="absolute pointer-events-none" style={{
          bottom: '5%', left: '-5%', width: '40vw', height: '40vw', maxWidth: 500, maxHeight: 500,
          background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 65%)',
        }} />

        {/* Content */}
        <div className="relative z-10 text-center max-w-5xl mx-auto w-full">
          {/* Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-slate-900/80 border border-slate-700/60 rounded-full text-slate-400 text-xs mb-10 tracking-wide backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            Open platform · Version control for creatives
          </div>

          {/* Headline */}
          <h1 className="font-black tracking-tighter leading-[0.86] mb-8"
            style={{ fontSize: 'clamp(60px, 10vw, 108px)' }}
          >
            <span className="block text-white">Design.</span>
            <span
              className="block"
              style={{
                background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 40%, #f472b6 70%, #34d399 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Version.
            </span>
            <span className="block text-slate-500">Share.</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 mb-12 max-w-lg mx-auto leading-relaxed">
            The portfolio platform built for designers who care about their
            process, not just the outcome.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-20">
            <Link
              to="/explore"
              className="group w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-900 rounded-xl font-bold transition-all text-sm inline-flex items-center justify-center gap-2 shadow-xl shadow-white/10"
            >
              Explore Projects
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>

            {!user ? (
              <a
                href={`${BACKEND_URL}/oauth2/authorization/google`}
                className="group w-full sm:w-auto px-8 py-4 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 text-white rounded-xl font-bold transition-all text-sm inline-flex items-center justify-center gap-2.5 backdrop-blur-sm"
              >
                <GoogleIcon />
                Get Started Free
              </a>
            ) : (
              <Link
                to="/dashboard"
                className="w-full sm:w-auto px-8 py-4 btn-primary rounded-xl font-bold text-sm inline-flex items-center justify-center"
              >
                Go to Dashboard
              </Link>
            )}
          </div>

          {/* Hero preview */}
          <div className="relative mx-auto" style={{ maxWidth: 900 }}>
            {/* Glow ring */}
            <div className="absolute -inset-px rounded-2xl pointer-events-none"
              style={{ background: 'linear-gradient(135deg, rgba(96,165,250,0.2), rgba(167,139,250,0.15), rgba(244,114,182,0.1))', filter: 'blur(1px)' }}
            />
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-24 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse, rgba(96,165,250,0.15) 0%, transparent 70%)' }}
            />

            {/* Mock window */}
            <div
              className="relative rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl shadow-black/70"
              style={{ transform: 'perspective(1400px) rotateX(5deg)', transformOrigin: 'center top' }}
            >
              {/* Window chrome */}
              <div className="flex items-center gap-3 px-5 py-3 bg-slate-900 border-b border-slate-800/80">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-slate-700/80" />
                  <div className="w-3 h-3 rounded-full bg-slate-700/80" />
                  <div className="w-3 h-3 rounded-full bg-slate-700/80" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="h-4.5 px-3 py-0.5 bg-slate-800 rounded-md flex items-center gap-1.5" style={{ width: 200 }}>
                    <div className="w-2 h-2 rounded-full bg-slate-600" />
                    <div className="h-2 flex-1 bg-slate-700 rounded" />
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full bg-slate-700/60" />
              </div>

              {/* Mock content */}
              <div className="bg-slate-950 p-5">
                {/* Toolbar */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-32 bg-slate-800 rounded-md" />
                    <div className="h-5 w-20 bg-slate-800/50 rounded-md" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-7 w-20 bg-slate-800 rounded-lg" />
                    <div className="h-7 w-24 rounded-lg" style={{ background: 'rgba(59,130,246,0.3)' }} />
                  </div>
                </div>

                {/* Cards grid */}
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  {PREVIEW_CARDS.map((card, i) => (
                    <div key={i} className="rounded-xl overflow-hidden bg-slate-900 border border-slate-800/60">
                      <div className="h-16 sm:h-20 relative" style={{ background: `linear-gradient(135deg, ${card.from}, ${card.to})` }}>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-black" style={{ color: `${card.from}90` }}>{card.letter}</span>
                        </div>
                      </div>
                      <div className="p-2">
                        <div className="h-2 bg-slate-700/60 rounded w-3/4 mb-1.5" />
                        <div className="h-1.5 bg-slate-800 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom fade into next section */}
        <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{ background: 'linear-gradient(to top, #020617, transparent)' }} />
      </section>

      {/* ── Marquee ───────────────────────────────────────────── */}
      <div className="relative border-y border-slate-800/50 py-3.5 overflow-hidden mt-16 bg-slate-950/60">
        <div className="absolute left-0 top-0 bottom-0 w-20 pointer-events-none z-10"
          style={{ background: 'linear-gradient(to right, #020617, transparent)' }} />
        <div className="absolute right-0 top-0 bottom-0 w-20 pointer-events-none z-10"
          style={{ background: 'linear-gradient(to left, #020617, transparent)' }} />
        <div className="marquee-track">
          {MARQUEE_TAGS.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-slate-900/70 border border-slate-800 rounded-full text-slate-500 text-xs whitespace-nowrap mx-2"
            >
              <span className="w-1 h-1 rounded-full bg-slate-600" />
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ── Stats strip ───────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-6 text-center">
          {[
            { value: '∞', label: 'Version history', color: '#60a5fa' },
            { value: '100%', label: 'Free to use', color: '#34d399' },
            { value: '0', label: 'Credit cards', color: '#f472b6' },
          ].map(({ value, label, color }) => (
            <div key={label} className="group">
              <p
                className="text-5xl sm:text-6xl font-black mb-2 transition-all"
                style={{ color }}
              >
                {value}
              </p>
              <p className="text-slate-600 text-sm uppercase tracking-widest">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features (Bento grid) ─────────────────────────────── */}
      <section className="py-16 px-4 border-t border-slate-900/80">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">Why Overseer</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              A platform that gets design
            </h2>
            <p className="text-slate-400 text-lg max-w-md mx-auto">
              Purpose-built for creative files, not just source code.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Large — Version control */}
            <div className="md:col-span-2 relative p-8 bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden group hover:border-blue-800/60 transition-all duration-300">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.06) 0%, transparent 60%)' }} />

              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="text-blue-400 font-mono text-2xl mb-3 select-none">⊞</div>
                  <h3 className="text-white font-bold text-xl mb-2">Version Every File</h3>
                  <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                    Every upload creates a new version. Compare revisions side by side, attach commit messages, and never lose work again.
                  </p>
                </div>
              </div>

              {/* Visual: version list */}
              <div className="mt-6 space-y-2.5 border-t border-slate-800/60 pt-6">
                {[
                  { v: 'v3', label: 'Final client delivery', date: '2h ago',  active: true  },
                  { v: 'v2', label: 'Revised color palette',  date: '1d ago',  active: false },
                  { v: 'v1', label: 'Initial concept',        date: '3d ago',  active: false },
                ].map(({ v, label, date, active }) => (
                  <div key={v} className="flex items-center gap-3 text-xs group/row">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-blue-400' : 'bg-slate-700'}`} />
                    <span className="font-mono text-slate-600 w-5">{v}</span>
                    <span className={`flex-1 ${active ? 'text-slate-300' : 'text-slate-500'}`}>{label}</span>
                    <span className="text-slate-700">{date}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Small — Portfolio */}
            <div className="relative p-8 bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden group hover:border-violet-800/60 transition-all duration-300">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(139,92,246,0.08) 0%, transparent 60%)' }} />

              <div className="text-violet-400 font-mono text-2xl mb-3 select-none">◎</div>
              <h3 className="text-white font-bold text-xl mb-2">Portfolio-First</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Your projects are presentation-ready from day one. Tag your work, write a README, and link a live preview.
              </p>

              {/* Visual: mock project header */}
              <div className="mt-6 pt-5 border-t border-slate-800/60">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-violet-800/60" />
                  <div className="h-2.5 w-16 bg-slate-700 rounded" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['UI', 'Figma', 'Case study'].map(t => (
                    <span key={t} className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-full text-slate-500 text-[11px]">{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Small — Sheets */}
            <div className="relative p-8 bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden group hover:border-emerald-800/60 transition-all duration-300">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.07) 0%, transparent 60%)' }} />

              <div className="text-emerald-400 font-mono text-2xl mb-3 select-none">⋮⋮</div>
              <h3 className="text-white font-bold text-xl mb-2">Sheets & Layers</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Organise files into sheets — like branches for design assets. Keep variants, iterations, and deliverables clean.
              </p>

              {/* Visual: stacked sheet tabs */}
              <div className="mt-6 pt-5 border-t border-slate-800/60 flex flex-col gap-1.5">
                {['Main', 'Dark mode', 'Mobile'].map((s, i) => (
                  <div key={s} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${i === 0 ? 'bg-emerald-900/20 border border-emerald-800/40 text-emerald-400' : 'text-slate-600 border border-slate-800/0'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                    {s}
                  </div>
                ))}
              </div>
            </div>

            {/* Large — Open */}
            <div className="md:col-span-2 relative p-8 bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden group hover:border-pink-800/60 transition-all duration-300">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 20% 80%, rgba(236,72,153,0.06) 0%, transparent 60%)' }} />

              <div className="text-pink-400 font-mono text-2xl mb-3 select-none">⟡</div>
              <h3 className="text-white font-bold text-xl mb-2">Open & Free Forever</h3>
              <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                No paywalls, no premium tiers, no credit card required. Overseer is free for everyone — built on open principles.
              </p>

              <div className="mt-6 pt-5 border-t border-slate-800/60 flex flex-wrap gap-2">
                {['No credit card', 'Unlimited projects', 'Community-driven', 'Open platform', 'Always free'].map((label) => (
                  <span key={label} className="px-3 py-1 bg-slate-800/60 border border-slate-700/50 rounded-full text-slate-400 text-xs hover:border-slate-600 transition-colors">
                    {label}
                  </span>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Featured Projects ─────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="py-20 px-4 border-t border-slate-900/80">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-2">Community</p>
                <h2 className="text-2xl font-bold text-white mb-1">Featured Projects</h2>
                <p className="text-slate-500 text-sm">Top-starred work from the community</p>
              </div>
              <Link
                to="/explore"
                className="group text-slate-400 hover:text-white text-sm transition-colors inline-flex items-center gap-1.5 border border-slate-800 hover:border-slate-600 px-3 py-1.5 rounded-lg"
              >
                Browse all
                <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featured.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ───────────────────────────────────────────────── */}
      {!user && (
        <section className="py-28 px-4 relative overflow-hidden border-t border-slate-900/80">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(59,130,246,0.07) 0%, transparent 60%)' }} />
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 20% 0%, rgba(139,92,246,0.05) 0%, transparent 50%)' }} />

          <div className="relative max-w-2xl mx-auto text-center">
            <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-4">Get started</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-5 leading-tight">
              Ready to start versioning<br />your creative work?
            </h2>
            <p className="text-slate-400 mb-10 text-lg">
              Free to use. No credit card required.
            </p>
            <a
              href={`${BACKEND_URL}/oauth2/authorization/google`}
              className="group px-10 py-4 bg-white hover:bg-slate-50 text-slate-900 rounded-xl font-bold transition-all text-sm inline-flex items-center justify-center gap-2.5 shadow-2xl shadow-white/10 hover:shadow-white/15"
            >
              <GoogleIcon />
              Sign up with Google
            </a>
            <p className="mt-5 text-slate-700 text-xs">Join the community. It's free forever.</p>
          </div>
        </section>
      )}

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-slate-900/80 py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-slate-300 font-bold text-sm tracking-tight">Overseer</span>
          <p className="text-slate-700 text-xs text-center">Version control for creative work.</p>
          <p className="text-slate-700 text-xs">© 2025</p>
        </div>
      </footer>

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
