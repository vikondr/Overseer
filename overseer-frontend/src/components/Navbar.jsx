import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || '';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/');
  };

  const navLink = (to, label) => (
    <Link
      to={to}
      className={`text-sm transition-colors ${
        location.pathname === to
          ? 'text-white'
          : 'text-slate-400 hover:text-white'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/50" style={{ WebkitBackdropFilter: 'blur(20px)' }}>
      <div className="max-w-7xl mx-auto w-full flex items-center gap-6">
        {/* Logo */}
        <Link
          to="/"
          className="font-bold text-white tracking-tight text-[15px] shrink-0"
        >
          Overseer
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-5">
          {navLink('/explore', 'Explore')}
          {user && navLink('/dashboard', 'Dashboard')}
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2.5">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full avatar-gradient flex items-center justify-center text-white text-sm font-bold ring-1 ring-slate-700">
                    {user.username[0].toUpperCase()}
                  </div>
                )}
              </button>

              {dropdownOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-11 w-52 bg-slate-900 border border-slate-700/60 rounded-xl shadow-xl shadow-black/40 py-1.5 z-50">
                    <div className="px-4 py-2.5 border-b border-slate-800">
                      <p className="text-white text-sm font-medium truncate">
                        {user.displayName || user.username}
                      </p>
                      <p className="text-slate-500 text-xs mt-0.5">@{user.username}</p>
                    </div>
                    <div className="py-1">
                      <DropdownLink
                        to={`/u/${user.username}`}
                        onClick={() => setDropdownOpen(false)}
                      >
                        Profile
                      </DropdownLink>
                      <DropdownLink
                        to="/settings"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Settings
                      </DropdownLink>
                    </div>
                    <div className="border-t border-slate-800 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors rounded-lg mx-0"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <a
              href={`${BACKEND_URL}/oauth2/authorization/google`}
              className="px-3.5 py-1.5 text-sm btn-primary rounded-lg inline-flex items-center gap-1.5"
            >
              <GoogleIcon />
              Sign in
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}

function DropdownLink({ to, onClick, children }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="block px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
    >
      {children}
    </Link>
  );
}

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

