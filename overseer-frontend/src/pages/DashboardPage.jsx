import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserProjects, deleteProject } from '../api/projects';
import ProjectCard from '../components/ProjectCard';

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getUserProjects(user.username)
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    try {
      await deleteProject(id);
      setProjects((ps) => ps.filter((p) => p.id !== id));
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-14">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">My Projects</h1>
          <Link
            to="/projects/new"
            className="px-4 py-2 btn-primary rounded-lg text-sm font-medium"
          >
            + New Project
          </Link>
        </div>

        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <p className="text-lg mb-4">No projects yet.</p>
            <Link to="/projects/new" className="text-blue-400 hover:text-blue-300">
              Create your first project →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <div key={p.id} className="relative group">
                <ProjectCard project={p} />
                <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                  <Link
                    to={`/u/${user.username}/${p.slug}`}
                    className="px-2 py-1 bg-slate-900/80 text-slate-300 text-xs rounded hover:text-white transition-colors"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="px-2 py-1 bg-red-900/80 text-red-300 text-xs rounded hover:text-white transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
