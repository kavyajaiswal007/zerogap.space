import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useSession } from './session';

export default function AuthCallback() {
  const session = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash || window.location.search);
    const errorMsg = params.get('error_description') ?? params.get('error');
    if (errorMsg) {
      navigate(`/onboarding?mode=login&error=${encodeURIComponent(errorMsg)}`, { replace: true });
      return;
    }

    if (session.loading) {
      return;
    }

    navigate(session.user?.onboarding_completed ? '/dashboard' : '/onboarding', { replace: true });
  }, [navigate, session.loading, session.user?.onboarding_completed]);

  if (!session.loading && !session.isAuthenticated) {
    return <Navigate to="/onboarding?mode=login" replace />;
  }

  return (
    <div className="min-h-screen bg-soft-lavender dot-pattern flex items-center justify-center px-6">
      <div className="slab-card !rounded-[3rem] !p-12 max-w-xl text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">ZeroGap</p>
        <h1 className="text-4xl font-display font-black uppercase italic tracking-tight mb-4">Completing sign in.</h1>
        <p className="text-slate-500 font-medium leading-relaxed">Your tokens are saved. Opening your workspace now.</p>
      </div>
    </div>
  );
}
