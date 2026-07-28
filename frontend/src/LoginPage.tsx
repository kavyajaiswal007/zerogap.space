import { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, ArrowRight, Zap, Target, TrendingUp, Users } from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { GoogleIcon } from './GoogleIcon';
import { useSession } from './session';

const features = [
  { icon: Zap, text: 'AI-powered skill gap analysis' },
  { icon: Target, text: 'Personalized roadmap to your dream job' },
  { icon: TrendingUp, text: 'Resume score + peer benchmarks' },
  { icon: Users, text: 'Mentor matching & project builder' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const session = useSession();
  const [searchParams] = useSearchParams();
  const nextPath = (() => {
    const next = searchParams.get('next') || '/dashboard';
    return next.startsWith('/') ? next : '/dashboard';
  })();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(e: { preventDefault(): void }) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = await session.login({ email, password });
      if (payload.user.onboarding_completed) {
        navigate(nextPath, { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden bg-[#0a0f1e]">
      {/* ── Left panel ── */}
      <div className="relative hidden lg:flex lg:w-[52%] flex-col gap-20 p-12 xl:p-16 overflow-hidden">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-sky-500/10 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-indigo-500/8 blur-[100px]" />

        {/* Logo */}
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center">
            <span className="text-white font-display font-black text-xl tracking-tight">ZeroGap</span>
          </Link>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 space-y-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-sky-400/30 bg-sky-400/10 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              <span className="text-sky-400 text-[11px] font-bold uppercase tracking-[0.15em]">For students & freshers</span>
            </div>
            <h1 className="text-[48px] xl:text-[56px] font-display font-black leading-[1.05] tracking-[-1.5px] text-white">
              Bridge the gap between{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">
                college & career.
              </span>
            </h1>
            <p className="mt-5 text-[17px] leading-relaxed text-slate-400 max-w-[420px]">
              ZeroGap shows exactly where your skills fall short and builds you a day-by-day plan to fix it.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  <Icon size={14} strokeWidth={2.5} className="text-sky-400" />
                </div>
                <span className="text-[14px] text-slate-300 font-medium">{text}</span>
              </li>
            ))}
          </ul>

        </div>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex flex-1 items-center justify-center bg-[#f8fafc] lg:rounded-l-[2.5rem] px-6 py-14 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[400px]"
        >
          {/* Mobile logo */}
          <Link to="/" className="inline-flex items-center mb-10 lg:hidden">
            <span className="font-display font-black text-lg text-slate-900">ZeroGap</span>
          </Link>

          <div className="mb-8">
            <h2 className="text-[30px] font-display font-black tracking-tight text-slate-900 leading-tight">
              Welcome back
            </h2>
            <p className="mt-1.5 text-[14px] text-slate-500">
              Don't have an account?{' '}
              <Link to="/onboarding" className="text-sky-500 font-semibold hover:text-sky-600 transition-colors">
                Sign up free
              </Link>
            </p>
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={() => {
              setEmail('1');
              setPassword('1');
            }}
            className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-slate-200 bg-white px-5 py-3.5 text-[14px] font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-md active:scale-[0.99]"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[12px] font-medium text-slate-400 uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Email / password form */}
          <form onSubmit={(e) => void handleLogin(e)} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-[12px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border-2 border-slate-200 text-[14px] text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-sky-400 focus:ring-3 focus:ring-sky-400/10"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-[12px] font-semibold text-slate-600 uppercase tracking-wide">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-[12px] text-slate-400 hover:text-slate-600 transition-colors font-medium"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} aria-hidden="true" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border-2 border-slate-200 text-[14px] text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-sky-400 focus:ring-3 focus:ring-sky-400/10"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-[13px] font-medium text-red-600"
                role="alert"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-[14px] font-bold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow-md active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={15} strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-[12px] text-slate-400 leading-relaxed">
            By signing in you agree to our{' '}
            <span className="text-slate-500 underline underline-offset-2 cursor-pointer hover:text-slate-700 transition-colors">Terms</span>{' '}
            &{' '}
            <span className="text-slate-500 underline underline-offset-2 cursor-pointer hover:text-slate-700 transition-colors">Privacy Policy</span>.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
