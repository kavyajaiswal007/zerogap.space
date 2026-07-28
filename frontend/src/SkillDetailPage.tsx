import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  PlayCircle,
  Star,
  ChevronRight,
  Trophy,
  TrendingUp,
  Map,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { Card, Button } from './UI';
import { cn } from './utils';
import type { JobMatch, ScoreBreakdown } from './backend';
import { KAVYA_BUNDLE, KAVYA_JOBS, KAVYA_SCORE } from './prototypeData';

interface SkillDetailPayload {
  radar: Array<{ skill: string; score: number; category: string }>;
  matches: JobMatch[];
  score: ScoreBreakdown;
}

export default function SkillDetailPage() {
  const { id } = useParams();
  const { data, loading, error, reload } = {
    data: {
      radar: KAVYA_BUNDLE.skills.map((skill) => ({
        skill: skill.skill_name,
        score: skill.proficiency_level,
        category: skill.verified ? 'verified' : 'growth',
      })),
      matches: KAVYA_JOBS,
      score: KAVYA_SCORE,
    } satisfies SkillDetailPayload,
    loading: false,
    error: null,
    reload: () => {},
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8 dot-pattern min-h-screen">
        <div className="slab-card !rounded-[3rem] !p-12 text-center">
          <h1 className="text-4xl font-display font-black uppercase italic tracking-tight mb-4">Loading stage detail.</h1>
          <p className="text-slate-500 font-medium">Pulling skill evidence and job signals.</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8 dot-pattern min-h-screen">
        <div className="slab-card !rounded-[3rem] !p-12 text-center">
          <h1 className="text-4xl font-display font-black uppercase italic tracking-tight mb-4">Stage unavailable.</h1>
          <p className="text-slate-500 font-medium mb-8">{error ?? 'We could not load this skill detail right now.'}</p>
          <Button onClick={reload}>
            <RefreshCw size={16} /> TRY AGAIN
          </Button>
        </div>
      </div>
    );
  }

  const selectedSkill = (id ?? 'skill').replace(/-/g, ' ');
  const title = selectedSkill.replace(/\b\w/g, (letter) => letter.toUpperCase());
  const relatedSkills = data.radar.length
    ? data.radar.slice(0, 6).map((item) => item.skill)
    : [title, 'Project Proof', 'Interview Practice'];
  const subskills = relatedSkills.map((skill) => {
    const radar = data.radar.find((item) => item.skill.toLowerCase() === skill.toLowerCase());
    const score = radar?.score ?? 0;
    return {
      name: skill,
      score,
      status: score >= 60 ? 'Proven' : score > 0 ? 'Improving' : 'Missing',
    };
  });
  const companies = Array.from(
    new Set(
      data.matches
        .map((match) => match.job_listings.company)
        .filter((company): company is string => Boolean(company)),
    ),
  ).slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 dot-pattern min-h-screen">
      <header className="mb-12 flex flex-col md:flex-row justify-between items-end gap-10">
        <div className="flex-1">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-slate-400 hover:text-primary font-black text-[10px] uppercase mb-6 transition-colors">
            Back to dashboard
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 border-[1.5px] border-slate-900 bg-secondary rounded-full text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              Proven Skill
            </div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
              {Math.round(data.score.skillsMatchPercentage)}% Match
            </div>
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-black leading-tight mb-2 tracking-tight uppercase italic">{title}</h1>
          <p className="text-lg text-slate-500 font-medium max-w-2xl leading-relaxed uppercase tracking-tight">
            Review your current signal for this skill and turn it into stronger project proof.
          </p>
        </div>
        <div className="slab-card !bg-primary text-white !rounded-2xl !p-6 flex flex-col items-center justify-center border-none shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]">
          <p className="text-4xl lg:text-5xl font-black italic leading-none">{Math.round(data.score.finalScore)}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-1 opacity-70">Score</p>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-10">
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-display font-black uppercase italic">Skill Details</h2>
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-success opacity-20 border border-success animate-pulse" />
                <span className="text-[9px] font-black uppercase text-slate-400">Live from your score radar</span>
              </div>
            </div>
            <div className="space-y-4">
              {subskills.map((subskill, index) => (
                <div key={subskill.name} className="slab-card flex flex-col md:flex-row items-center gap-6 !rounded-2xl !p-4 hover:border-primary transition-all">
                  <div className="w-16 h-16 rounded-xl bg-slate-50 border-[1.5px] border-slate-900 flex items-center justify-center text-xl font-black italic shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] shrink-0">
                    {subskill.score}%
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                      <h3 className="text-lg font-black uppercase italic tracking-tight">{subskill.name}</h3>
                      {subskill.status === 'Proven' && <CheckCircle2 size={14} className="text-success" />}
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border-[1.5px] border-slate-900 p-[1px] max-w-sm mx-auto md:mx-0">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${subskill.score}%` }}
                        className="h-full bg-primary rounded-full"
                        transition={{ duration: 1, delay: index * 0.1 }}
                      />
                    </div>
                  </div>
                  <div
                    className={cn(
                      'px-3 py-1 border-[1.5px] border-slate-900 rounded-lg font-black text-[9px] uppercase shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]',
                      subskill.status === 'Proven'
                        ? 'bg-success text-white'
                        : subskill.status === 'Improving'
                          ? 'bg-secondary text-slate-900'
                          : 'bg-white text-slate-400',
                    )}
                  >
                    {subskill.status}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Card title="Your Future Pay" icon={TrendingUp} variant="highlight">
            <div className="grid md:grid-cols-2 gap-10">
              <div className="p-8 bg-slate-900 text-white rounded-[2rem] border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(190,242,100,1)] relative overflow-hidden">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Stage value</p>
                <p className="text-5xl font-black text-secondary italic">+{Math.round(data.score.skillsMatchPercentage)} pts</p>
                <div className="mt-6 flex items-center gap-2 text-success text-[10px] font-black uppercase">
                  <ArrowUpRight size={14} /> Skill match gain if completed cleanly
                </div>
              </div>
              <div className="space-y-4">
                <p className="font-black text-slate-900 uppercase tracking-tight text-xs">Companies hiring nearby:</p>
                <div className="flex flex-wrap gap-2">
                  {companies.map((company) => (
                    <span key={company} className="px-4 py-2 border-[1.5px] border-slate-900 bg-white rounded-xl font-black text-[10px] uppercase shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                      {company}
                    </span>
                  ))}
                </div>
                {!companies.length && (
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed uppercase mt-6 italic">
                    Refresh Hire Me mode after your next skill update to see matching companies here.
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          <Card title="Expert Advice" icon={Star} variant="warning">
            <p className="text-slate-600 font-bold text-[11px] mb-8 italic uppercase leading-relaxed">
              Focus on one portfolio-ready project that demonstrates this skill clearly for recruiters.
            </p>
            <Link to="/projects">
              <Button className="w-full text-[10px]">BUILD PROJECT PROOF</Button>
            </Link>
          </Card>

          <Card title="Things to Make" icon={Map} subtitle="Project ideas for this skill">
            <div className="space-y-4">
              {[
                `Build a focused ${title} project`,
                `Write a short case study for ${title}`,
                `Add measurable proof to your resume`,
              ].map((task) => (
                <div key={task} className="slab-card !p-4 group cursor-pointer hover:border-primary !rounded-2xl transition-all border-[1.5px]">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-black uppercase italic text-xs leading-tight">{task}</p>
                    <span className="text-[9px] font-black text-primary bg-primary/5 px-1.5 py-0.5 rounded">Proof</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">build</span>
                    <ChevronRight size={10} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
              <Link to="/projects">
                <Button variant="outline" className="w-full mt-4 text-[10px]" icon={PlayCircle}>
                  OPEN PROJECTS
                </Button>
              </Link>
            </div>
          </Card>

          <div className="slab-card !bg-primary text-white !rounded-[2rem]">
            <Trophy className="mb-4 text-secondary" size={36} strokeWidth={2.5} />
            <h3 className="text-xl font-display font-black uppercase mb-2">Stage Resources</h3>
            <p className="text-white/80 text-sm leading-relaxed">
              Use project builder to create recruiter-ready work around this skill.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
