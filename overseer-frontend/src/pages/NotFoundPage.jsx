import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-950 pt-14 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-7xl font-bold text-slate-700 mb-4">404</h1>
        <p className="text-slate-400 text-lg mb-6">Page not found.</p>
        <Link
          to="/"
          className="px-5 py-2.5 btn-primary rounded-lg text-sm"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
