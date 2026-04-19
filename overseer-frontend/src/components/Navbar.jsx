import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import GoogleIcon from './GoogleIcon';

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
        location.pathname === to || location.pathname.startsWith(to + '/')
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
          {user && navLink(`/u/${user.username}`, 'My Profile')}
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
              <GoogleIcon size={14} />
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


