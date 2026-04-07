import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthCallbackPage() {
  const [params] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      login(token).then(() => navigate('/dashboard', { replace: true }));
    } else {
      navigate('/', { replace: true });
    }
  }, [params, login, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 text-slate-400">
      Signing you in...
    </div>
  );
}
