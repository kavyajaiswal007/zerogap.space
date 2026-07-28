import { motion } from 'motion/react';
import {
  Zap,
  Briefcase,
  AlertCircle,
  RefreshCw,
  Target,
  CheckCircle2,
  CircleDashed,
  ArrowUpRight,
  BookOpen,
} from 'lucide-react';
import { Button } from './UI';
import { Link } from 'react-router-dom';
import { cn } from './utils';
import { useSession } from './session';
import { stockProfileBundle } from './stockDefaults';
import {
  KAVYA_ACTIVITY_GRAPH,
  KAVYA_ANALYSIS,
  KAVYA_BENCHMARK,
  KAVYA_JOBS,
  KAVYA_RISK,
  KAVYA_ROADMAP,
  KAVYA_SCORE,
} from './prototypeData';
import {
  VINEET_ACTIVITY_GRAPH,
  VINEET_ANALYSIS,
  VINEET_BENCHMARK,
  VINEET_JOBS,
  VINEET_PROFILE,
  VINEET_RISK,
  VINEET_ROADMAP,
  VINEET_SCORE,
} from './vineetData';
import type {
  BenchmarkData,
  ConsistencyData,
  JobMatch,
  ProfileBundle,
  RiskPrediction,
  Roadmap,
  ScoreBreakdown,
  SkillGapAnalysis,
  Profile,
} from './backend';

interface DashboardPayload {
  profile: ProfileBundle;
  score: ScoreBreakdown;
  benchmark: BenchmarkData | null;
  matches: JobMatch[];
  analysis: SkillGapAnalysis | null;
  risk: RiskPrediction | null;
  roadmap: Roadmap | null;
  consistency: ConsistencyData;
}

function instantDashboardPayload(_profile?: Profile | null): DashboardPayload {
  const isVineet = _profile?.id === VINEET_PROFILE.id;
  return {
    profile: stockProfileBundle(_profile),
    score: isVineet ? VINEET_SCORE : KAVYA_SCORE,
    benchmark: isVineet ? VINEET_BENCHMARK : KAVYA_BENCHMARK,
    matches: isVineet ? VINEET_JOBS : KAVYA_JOBS,
    analysis: isVineet ? VINEET_ANALYSIS : KAVYA_ANALYSIS,
    risk: isVineet ? VINEET_RISK : KAVYA_RISK,
    roadmap: isVineet ? VINEET_ROADMAP : KAVYA_ROADMAP,
    consistency: isVineet
      ? { active_days: 3, consistency_score: 70, graph: VINEET_ACTIVITY_GRAPH }
      : { active_days: 2, consistency_score: 81, graph: KAVYA_ACTIVITY_GRAPH },
  };
}

function ReadinessRing({ readiness, score }: { readiness: number; score: ScoreBreakdown }) {
  return (
    <div className="slab-card !p-8 flex items-center gap-8">
      <div className="relative shrink-0 w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="10" />
          <motion.circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={readiness >= 65 ? '#10b981' : readiness >= 40 ? '#f59e0b' : '#ef4444'}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 40}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - readiness / 100) }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-display font-black">{readiness}%</span>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ready</span>
        </div>
      </div>
      <div className="flex-1 space-y-3">
        {[
          { label: 'Skill Match', value: Math.round(score.skillsMatchPercentage), color: 'bg-secondary' },
          { label: 'Projects', value: Math.round(score.projectQualityScore), color: 'bg-primary' },
          { label: 'Consistency', value: Math.round(score.activityConsistencyScore), color: 'bg-accent' },
        ].map((stat) => (
          <div key={stat.label}>
            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-1">
              <span className="text-slate-400">{stat.label}</span>
              <span className="text-slate-900">{stat.value}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full border border-slate-200 overflow-hidden">
              <motion.div
                className={cn('h-full rounded-full', stat.color)}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, stat.value)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityHeatmap({ consistency }: { consistency: ConsistencyData }) {
  const today = new Date();
  const activeDates = new Set((consistency.graph ?? []).map((item) => item.date));
  const dayCount = Math.max(2, Math.min(14, consistency.graph?.length || consistency.active_days || 2));
  const days = Array.from({ length: dayCount }, (_, index) => {
    const day = new Date(today);
    day.setDate(day.getDate() - (dayCount - 1 - index));
    return day.toISOString().slice(0, 10);
  });

  return (
    <div className="slab-card !p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Last {dayCount} Days Activity · {consistency.active_days} active days
        </h3>
        <span className={cn(
          'text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border-2 border-slate-900',
          consistency.consistency_score >= 60 ? 'bg-emerald-100 text-emerald-700' :
            consistency.consistency_score >= 30 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700',
        )}>
          {consistency.consistency_score >= 60 ? 'On fire' : consistency.consistency_score >= 30 ? 'Building' : 'Start now'}
        </span>
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))` }}>
        {days.map((date) => (
          <div
            key={date}
            title={date}
            className={cn(
              'h-4 w-full rounded-sm border border-slate-200',
              activeDates.has(date) ? 'bg-secondary border-slate-900' : 'bg-slate-100',
            )}
          />
        ))}
      </div>
    </div>
  );
}

function RoadmapProgress({ roadmap }: { roadmap: Roadmap | null }) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-display font-black uppercase">Your Roadmap</h2>
        <Link to="/learn" className="text-[10px] font-black uppercase tracking-widest text-sky-500">
          View full →
        </Link>
      </div>

      {roadmap ? (
        <div className="slab-card !p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-black uppercase tracking-tight">{roadmap.title}</p>
            <span className="text-[10px] font-black uppercase text-slate-400">
              {Math.round(roadmap.completion_percentage)}% complete · {roadmap.estimated_weeks ?? 16} weeks
            </span>
          </div>
          <div className="flex gap-2">
            {(roadmap.stages ?? []).map((stage) => (
              <div key={stage.id} className="flex-1">
                <div className={cn(
                  'h-2 rounded-full border border-slate-900',
                  stage.is_completed ? 'bg-primary' :
                    stage.completion_percentage > 0 ? 'bg-secondary' : 'bg-slate-100',
                )} />
                <p className="text-[8px] font-black uppercase tracking-widest mt-1.5 text-slate-400 truncate">
                  {stage.title}
                </p>
              </div>
            ))}
          </div>
          {(() => {
            const current = roadmap.stages?.find((stage) => !stage.is_completed);
            if (!current) return null;
            return (
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 border-2 border-slate-900">
                <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Current stage</p>
                <p className="text-sm font-black uppercase tracking-tight">{current.title}</p>
                <p className="text-[10px] text-slate-500 mt-1">{current.description}</p>
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="slab-card !p-8 text-center">
          <p className="text-lg font-display font-black uppercase italic mb-3">No roadmap yet.</p>
          <p className="text-sm text-slate-500 mb-6">Generate your personalized day-by-day learning plan in one click.</p>
          <Link to="/learn">
            <Button className="neo-btn-primary h-12 px-8 text-[10px] tracking-widest">
              GENERATE ROADMAP
            </Button>
          </Link>
        </div>
      )}
    </section>
  );
}

function LiveJobCards({ matches }: { matches: JobMatch[] }) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-display font-black uppercase flex items-center gap-2">
          <Briefcase size={18} /> Job Matches
        </h2>
        <Link to="/jobs" className="text-[10px] font-black uppercase tracking-widest text-sky-500 hover:text-sky-700">
          See all →
        </Link>
      </div>
      {!matches.length && (
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
          Scanning market...
        </p>
      )}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(matches.length ? matches : Array<JobMatch | null>(3).fill(null)).map((match, index) => {
          if (!match) {
            return (
              <div key={index} className="slab-card !p-5 animate-pulse">
                <div className="h-3 bg-slate-200 rounded w-2/3 mb-3" />
                <div className="h-2 bg-slate-100 rounded w-1/2 mb-4" />
                <div className="flex gap-2 mb-4">
                  {[1, 2, 3].map((item) => <div key={item} className="h-5 w-14 bg-slate-100 rounded-lg" />)}
                </div>
                <div className="h-8 bg-slate-100 rounded-xl" />
              </div>
            );
          }

          const listing = match.job_listings;
          const fit = Math.round(match.fit_percentage);

          return (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.07 }}
              className="slab-card !p-5 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-black uppercase tracking-tight leading-tight text-slate-900 line-clamp-2">
                    {listing.title}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">{listing.company ?? 'Company'}</p>
                </div>
                <span className={cn(
                  'shrink-0 text-[10px] font-black px-2 py-1 rounded-lg border-2 border-slate-900',
                  fit >= 70 ? 'bg-emerald-100 text-emerald-700' :
                    fit >= 45 ? 'bg-amber-100 text-amber-700' : 'bg-red-50 text-red-600',
                )}>
                  {fit}% fit
                </span>
              </div>
              <div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-400">
                {listing.location && <span>{listing.location}</span>}
                {listing.salary_range && <span>{listing.salary_range}</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(listing.skills_required ?? []).slice(0, 4).map((skill) => (
                  <span key={skill} className={cn(
                    'px-2 py-0.5 rounded-md text-[9px] font-black uppercase border border-slate-200',
                    match.missing_skills?.includes(skill) ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-50 text-slate-600',
                  )}>
                    {skill}
                  </span>
                ))}
              </div>
              {match.missing_skills?.length > 0 && (
                <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wide">
                  Gap: {match.missing_skills.slice(0, 2).join(', ')}
                </p>
              )}
              <div className="flex gap-2 mt-auto">
                {listing.apply_url && (
                  <a
                    href={listing.apply_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 h-9 flex items-center justify-center rounded-xl bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                  >
                    Apply Now
                  </a>
                )}
                <Link
                  to="/jobs"
                  className="h-9 px-4 flex items-center justify-center rounded-xl bg-white text-slate-900 text-[9px] font-black uppercase tracking-widest border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                >
                  View
                </Link>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function PeerBenchmarkCard({ benchmark }: { benchmark: BenchmarkData | null }) {
  return (
    <div className="slab-card !p-6">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
        How you rank
      </h3>
      {benchmark ? (
        <div className="space-y-4">
          {[
            { label: 'vs Your College', value: Math.round(benchmark.college_percentile), color: 'bg-secondary' },
            { label: 'vs National', value: Math.round(benchmark.national_percentile), color: 'bg-primary' },
            { label: 'vs Branch', value: Math.round(benchmark.branch_percentile), color: 'bg-accent' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-1">
                <span className="text-slate-400">{stat.label}</span>
                <span className="text-slate-900">Top {Math.max(1, 100 - stat.value)}%</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full border border-slate-200 overflow-hidden">
                <motion.div
                  className={cn('h-full rounded-full', stat.color)}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, stat.value)}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                />
              </div>
            </div>
          ))}
          <p className="text-[9px] font-bold text-slate-400 pt-2">
            {benchmark.ranking_data?.total_role_users ?? 0} students targeting same role
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {['vs College', 'vs National', 'vs Branch'].map((label) => (
            <div key={label} className="animate-pulse">
              <div className="flex justify-between text-[9px] font-black uppercase mb-1">
                <div className="h-2.5 bg-slate-200 rounded w-24" />
                <div className="h-2.5 bg-slate-200 rounded w-12" />
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full" />
            </div>
          ))}
          <p className="text-[9px] font-bold text-slate-300 pt-2 uppercase tracking-wide">
            Calculating your rank...
          </p>
        </div>
      )}
    </div>
  );
}

function RiskPredictionCard({ risk }: { risk: RiskPrediction | null }) {
  if (!risk) return null;

  return (
    <div className={cn(
      'slab-card border-2',
      risk.risk_level === 'high' ? '!bg-red-50 border-red-400 shadow-[4px_4px_0px_0px_rgba(248,113,113,1)]' :
        risk.risk_level === 'medium' ? '!bg-amber-50 border-amber-500 shadow-[4px_4px_0px_0px_rgba(245,158,11,1)]' :
          '!bg-emerald-50 border-emerald-500 shadow-[4px_4px_0px_0px_rgba(16,185,129,1)]',
    )}>
      <div className="flex items-center gap-3 mb-4">
        <span className={cn(
          'text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border-2 border-slate-900',
          risk.risk_level === 'high' ? 'bg-red-500 text-white' :
            risk.risk_level === 'medium' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white',
        )}>
          {risk.risk_level} risk
        </span>
        <span className="text-[9px] font-black uppercase text-slate-500">
          {Math.round(risk.success_probability)}% success chance
        </span>
      </div>
      <p className="text-sm font-black uppercase italic tracking-tight mb-3">
        Ready in ~{risk.ready_in_months} month{risk.ready_in_months !== 1 ? 's' : ''}
      </p>
      {risk.risk_factors?.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {risk.risk_factors.slice(0, 2).map((factor) => (
            <div key={factor} className="flex items-center gap-2 text-[9px] font-bold text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
              {factor}
            </div>
          ))}
        </div>
      )}
      {risk.action_suggestions?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">This week:</p>
          {risk.action_suggestions.slice(0, 2).map((action) => (
            <div key={action} className="flex items-center gap-2 text-[9px] font-bold text-slate-700">
              <span>→</span> {action}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const session = useSession();
  const instantData = instantDashboardPayload(session.user);
  const { data, loading, error, reload } = {
    data: instantData,
    loading: false,
    error: null,
    reload: () => {},
  };

  const { profile, score, benchmark, matches, analysis, risk, roadmap, consistency } = data ?? instantData;
  const syncLabel = loading ? 'Opening instantly' : error ? 'Sync failed' : 'Live from your backend';
  const firstName = profile.profile.full_name?.split(' ')[0] ?? 'Builder';
  const activeRole = profile.target_roles.find((role) => role.is_active)?.job_title ?? 'your target role';
  const readiness = Math.round(score.finalScore || (profile.skills.length ? 35 : 18));
  const missingSkill = analysis?.missing_skills?.[0] ?? (activeRole.toLowerCase().includes('data') ? 'Python' : 'TypeScript');
  const missingSkills = analysis?.missing_skills?.length ? analysis.missing_skills : [missingSkill];
  const matchedSkills = analysis?.matched_skills?.length ? analysis.matched_skills : profile.skills.slice(0, 4).map((skill) => skill.skill_name);
  const partialSkills = analysis?.partial_skills?.length ? analysis.partial_skills : ['Git', 'Project polish'];
  const strongestSkill = [...profile.skills].sort((left, right) => right.proficiency_level - left.proficiency_level)[0];
  const gapStats = [
    { label: 'Role match', value: Math.round(score.skillsMatchPercentage), color: 'bg-secondary' },
    { label: 'Project quality', value: Math.round(score.projectQualityScore), color: 'bg-primary' },
    { label: 'Activity signal', value: Math.round(score.activityConsistencyScore), color: 'bg-accent' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 dot-pattern min-h-screen text-left">
      <header className="mb-8">
        <div className="flex flex-col lg:flex-row justify-between items-end gap-7">
          <div className="flex-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-secondary border-2 border-slate-900 rounded-full text-[10px] font-black uppercase mb-4 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
            >
              <Zap size={12} className="fill-current" />
              {syncLabel}
            </motion.div>
            {error && (
              <button
                type="button"
                onClick={reload}
                className="ml-3 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900"
              >
                <RefreshCw size={12} /> Sync
              </button>
            )}
            <h1 className="text-4xl md:text-6xl font-display font-black leading-tight mb-2 tracking-tighter uppercase">
              {firstName}'s Learning <br />Hub.
            </h1>
            <p className="text-lg text-slate-500 font-medium italic underline decoration-secondary decoration-4 underline-offset-4">
              Ready for {activeRole}: {readiness}%
            </p>
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <ReadinessRing readiness={readiness} score={score} />
        <ActivityHeatmap consistency={consistency} />
      </div>

      <div className="grid lg:grid-cols-3 gap-7 mb-8">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h2 className="text-2xl font-display font-black mb-6">BUILD NEXT</h2>
            <div className="slab-card !p-10 group relative overflow-hidden">
              <div className="absolute inset-0 bg-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="relative">
                <p className="text-2xl font-black mb-3 uppercase tracking-tighter italic">
                  Turn your clearest gap into a project.
                </p>
                <p className="text-slate-500 font-medium mb-8 max-w-xl">
                  Start with <strong className="text-slate-900 font-black italic">{missingSkill}</strong> and build proof that supports your target role.
                </p>
                <Link to="/projects">
                  <Button className="neo-btn-primary !px-10 h-14 text-sm">BUILD PROOF</Button>
                </Link>
              </div>
            </div>
          </section>

          <RoadmapProgress roadmap={roadmap} />
          <LiveJobCards matches={matches} />
        </div>

        <div className="space-y-6">
          <div className="slab-card !p-0 overflow-hidden shadow-[8px_8px_0px_0px_rgba(236,72,153,1)]">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-start">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">My Profile</h3>
                <span className="text-[10px] font-black uppercase bg-secondary text-slate-900 px-2 py-0.5 rounded-md">
                  {activeRole}
                </span>
              </div>
              <div className="w-14 h-14 bg-white border-2 border-slate-900 rounded-2xl flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)]">
                <span className="text-xl font-black italic text-slate-900">{firstName.slice(0, 1)}</span>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <p className="text-xl font-black leading-none uppercase italic mb-1 tracking-tighter">{profile.profile.full_name ?? 'ZeroGap User'}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {profile.profile.college_name ?? 'Independent learner'}
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Coding Skills', val: Math.round(strongestSkill?.proficiency_level ?? 0), color: 'bg-primary' },
                  { label: 'Role Match', val: Math.round(score.skillsMatchPercentage), color: 'bg-secondary' },
                  { label: 'Project Quality', val: Math.round(score.projectQualityScore), color: 'bg-accent' },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div className="flex justify-between text-[9px] font-black uppercase mb-1.5 tracking-widest text-slate-400">
                      <span>{stat.label}</span>
                      <span className="text-slate-900">{stat.val}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full border-2 border-slate-900 overflow-hidden">
                      <div className={cn('h-full', stat.color)} style={{ width: `${stat.val}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <PeerBenchmarkCard benchmark={benchmark} />
          <RiskPredictionCard risk={risk} />
        </div>
      </div>

      <section className="mb-16 rounded-[2.5rem] border-[3px] border-slate-900 bg-white px-5 py-8 shadow-[10px_10px_0px_0px_rgba(15,23,42,1)] md:px-8 md:py-10">
        <div className="mb-8 flex flex-col gap-5 border-b-[3px] border-slate-900 pb-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-primary">Gap Section</p>
            <h2 className="text-4xl font-display font-black uppercase leading-none tracking-tighter md:text-6xl">Your gap map.</h2>
            <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-slate-500">
              This area is separated from the rest of the dashboard so every career signal is easy to scan: what is missing, what is strong, what needs polish, and what to build next.
            </p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[2rem] border-[3px] border-slate-900 bg-slate-900 p-7 text-white shadow-[8px_8px_0px_0px_rgba(190,242,100,1)]"
            >
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">01 / Main thing to fix</p>
                  <h3 className="text-5xl font-display font-black uppercase italic leading-none">{missingSkill}</h3>
                </div>
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-white bg-secondary text-slate-900">
                  <Target size={30} strokeWidth={3} />
                </div>
              </div>
              <p className="mt-6 max-w-2xl text-sm font-medium leading-relaxed text-slate-300">
                This is the clearest missing signal between your current profile and {activeRole}. Treat this as the priority until you have visible project proof.
              </p>
              <Link to="/projects" className="mt-8 inline-flex">
                <Button className="neo-btn-primary !h-12 !px-6 text-[10px]">
                  START PROJECT <ArrowUpRight size={14} />
                </Button>
              </Link>
            </motion.div>

            <div className="grid gap-4">
              {gapStats.map((stat, index) => (
                <div key={stat.label} className="rounded-[1.5rem] border-[3px] border-slate-900 bg-slate-50 p-5 shadow-[5px_5px_0px_0px_rgba(15,23,42,1)]">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">0{index + 2} / {stat.label}</p>
                    <p className="text-3xl font-display font-black italic leading-none">{stat.value}%</p>
                  </div>
                  <div className="h-4 overflow-hidden rounded-full border-2 border-slate-900 bg-white">
                    <div className={cn('h-full rounded-full', stat.color)} style={{ width: `${Math.min(100, Math.max(0, stat.value))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-[2rem] border-[3px] border-red-400 bg-red-50 p-6 shadow-[7px_7px_0px_0px_rgba(248,113,113,1)]">
              <div className="mb-6 flex items-center gap-3 border-b-2 border-red-200 pb-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-red-400 bg-white text-red-600">
                  <AlertCircle size={21} />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-red-500">Needs fixing</p>
                  <h3 className="text-2xl font-display font-black uppercase tracking-tight">Missing</h3>
                </div>
              </div>
              <div className="space-y-3">
                {missingSkills.slice(0, 5).map((skill) => (
                  <div key={skill} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-slate-900 bg-white px-4 py-3">
                    <span className="text-xs font-black uppercase tracking-tight text-slate-900">{skill}</span>
                    <Link
                      to={`/learn?search=${encodeURIComponent(skill)}&category=All`}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border-2 border-slate-900 bg-secondary px-2 py-1 text-[9px] font-black uppercase tracking-widest text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                    >
                      <BookOpen size={11} /> Find courses
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border-[3px] border-emerald-500 bg-emerald-50 p-6 shadow-[7px_7px_0px_0px_rgba(16,185,129,1)]">
              <div className="mb-6 flex items-center gap-3 border-b-2 border-emerald-200 pb-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-emerald-500 bg-white text-emerald-600">
                  <CheckCircle2 size={21} />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Already useful</p>
                  <h3 className="text-2xl font-display font-black uppercase tracking-tight">Strong</h3>
                </div>
              </div>
              <div className="space-y-3">
                {(matchedSkills.length ? matchedSkills : ['React']).slice(0, 5).map((skill) => (
                  <div key={skill} className="flex items-center justify-between rounded-2xl border-2 border-slate-900 bg-white px-4 py-3">
                    <span className="text-xs font-black uppercase tracking-tight text-slate-900">{skill}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700">Keep</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border-[3px] border-amber-500 bg-amber-50 p-6 shadow-[7px_7px_0px_0px_rgba(245,158,11,1)]">
              <div className="mb-6 flex items-center gap-3 border-b-2 border-amber-200 pb-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-amber-500 bg-white text-amber-600">
                  <CircleDashed size={21} />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-700">Close, but weak</p>
                  <h3 className="text-2xl font-display font-black uppercase tracking-tight">Almost There</h3>
                </div>
              </div>
              <div className="space-y-3">
                {partialSkills.slice(0, 5).map((skill) => (
                  <div key={skill} className="flex items-center justify-between rounded-2xl border-2 border-slate-900 bg-white px-4 py-3">
                    <span className="text-xs font-black uppercase tracking-tight text-slate-900">{skill}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-700">Polish</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
