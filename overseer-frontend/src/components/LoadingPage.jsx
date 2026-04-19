export default function LoadingPage({ message = 'Loading…' }) {
  return (
    <div className="min-h-screen bg-slate-950 pt-14 flex items-center justify-center text-slate-500">
      {message}
    </div>
  );
}
