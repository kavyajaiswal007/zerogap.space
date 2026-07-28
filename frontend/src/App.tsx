import React, { lazy, Suspense, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSession } from './session';
import { LearnPathProvider } from './learnpath/LearnPathContext';

const Navigation = lazy(() => import('./Navigation'));
const LandingPage = lazy(() => import('./LandingPage'));
const OnboardingFlow = lazy(() => import('./OnboardingFlow'));
const AuthCallback = lazy(() => import('./AuthCallback'));
const Dashboard = lazy(() => import('./Dashboard'));
const SkillDetailPage = lazy(() => import('./SkillDetailPage'));
const JobMatchPage = lazy(() => import('./JobMatchPage'));
const ProjectBuilder = lazy(() => import('./ProjectBuilder'));
const PeerBenchmark = lazy(() => import('./PeerBenchmark'));
const ResumePage = lazy(() => import('./ResumePage'));
const CollegeAdmin = lazy(() => import('./CollegeAdmin'));
const ProfileSettings = lazy(() => import('./Settings'));
const LoginPage = lazy(() => import('./LoginPage'));
const LearnPage = lazy(() => import('./learnpath/LearnPage'));
const LearnPathSidebar = lazy(() => import('./learnpath/LearnPathSidebar'));

function FullScreenState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="min-h-screen bg-soft-lavender dot-pattern flex items-center justify-center px-6">
      <div className="slab-card !rounded-[2.5rem] !p-12 max-w-xl text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">ZeroGap</p>
        <h1 className="text-4xl font-display font-black uppercase italic tracking-tight mb-4">{title}</h1>
        <p className="text-slate-500 font-medium leading-relaxed">{subtitle}</p>
      </div>
    </div>
  );
}

class AppErrorBoundary extends React.Component<{ children: ReactNode }, { hasError: boolean }> {
  declare props: { children: ReactNode };

  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ZeroGap frontend error', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-soft-lavender dot-pattern flex items-center justify-center px-6">
        <div className="slab-card !rounded-[2.5rem] !p-12 max-w-xl text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-danger mb-4">ZeroGap</p>
          <h1 className="text-4xl font-display font-black uppercase italic tracking-tight mb-4">Frontend recovered.</h1>
          <p className="text-slate-500 font-medium leading-relaxed mb-8">
            The app hit a temporary browser error. Refreshing reloads the newest production bundle.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="neo-btn-primary mx-auto"
          >
            REFRESH APP
          </button>
        </div>
      </div>
    );
  }
}

function OnboardingRoute() {
  const location = useLocation();
  const session = useSession();

  if (session.loading) {
    return (
      <FullScreenState
        title="Preparing your session"
        subtitle="We're checking your ZeroGap profile and getting your workspace ready."
      />
    );
  }

  const isLoginMode = new URLSearchParams(location.search).get('mode') === 'login';

  if (session.isAuthenticated && session.user?.onboarding_completed) {
    return <Navigate to="/dashboard" replace />;
  }

  if (session.isAuthenticated && !session.user?.onboarding_completed && isLoginMode) {
    return <Navigate to="/onboarding" replace />;
  }

  return <OnboardingFlow />;
}

function HomeRoute() {
  const session = useSession();

  if (session.loading) {
    return (
      <FullScreenState
        title="Checking your session"
        subtitle="If your ZeroGap account is saved here, we'll open your workspace directly."
      />
    );
  }

  if (session.isAuthenticated) {
    return <Navigate to={session.user?.onboarding_completed ? '/dashboard' : '/onboarding'} replace />;
  }

  return <LandingPage />;
}

function ProtectedAppShell() {
  const location = useLocation();
  const session = useSession();

  if (session.loading) {
    return (
      <FullScreenState
        title="Loading your workspace"
        subtitle="Pulling your profile, score, and job signals from the backend."
      />
    );
  }

  if (!session.isAuthenticated) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (!session.user?.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <LearnPathProvider>
      <div className="flex min-w-0 flex-col lg:flex-row">
        <Suspense
          fallback={
            <FullScreenState
              title="Opening your workspace"
              subtitle="Loading the page bundle for this section."
            />
          }
        >
          <Navigation />
          <main className="min-w-0 flex-1 lg:pl-20 pt-20 lg:pt-0">
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/learn" element={<LearnPage />} />
              <Route path="/skill-gap" element={<Navigate to="/dashboard" replace />} />
              <Route path="/skill/:id" element={<SkillDetailPage />} />
              <Route path="/jobs" element={<JobMatchPage />} />
              <Route path="/hire-me" element={<JobMatchPage />} />
              <Route path="/mentor" element={<Navigate to="/resume" replace />} />
              <Route path="/resume" element={<ResumePage />} />
              <Route path="/skill" element={<SkillDetailPage />} />
              <Route path="/projects" element={<ProjectBuilder />} />
              <Route path="/settings" element={<Navigate to="/profile" replace />} />
              <Route path="/benchmarks" element={<PeerBenchmark />} />
              <Route path="/benchmark" element={<PeerBenchmark />} />
              <Route path="/admin" element={<CollegeAdmin />} />
              <Route path="/profile" element={<ProfileSettings />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
          <LearnPathSidebar />
        </Suspense>
      </div>
    </LearnPathProvider>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-soft-lavender relative overflow-x-hidden">
        <AppErrorBoundary>
          <Suspense
            fallback={
              <FullScreenState
                title="Loading ZeroGap"
                subtitle="Getting the experience ready."
              />
            }
          >
            <Routes>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/onboarding" element={<OnboardingRoute />} />
              <Route path="/*" element={<ProtectedAppShell />} />
            </Routes>
          </Suspense>
        </AppErrorBoundary>
      </div>
    </Router>
  );
}
