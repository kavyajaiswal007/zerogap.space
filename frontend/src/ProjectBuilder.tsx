import { useState } from 'react';
import {
  Layout,
  Smartphone,
  Database,
  Globe,
  Terminal,
  PlayCircle,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { Button } from './UI';
import { cn } from './utils';
import { KAVYA_BUNDLE, KAVYA_PROJECTS } from './prototypeData';
import { VINEET_BUNDLE, VINEET_PROFILE, VINEET_PROJECTS } from './vineetData';
import { useSession } from './session';

const categories = [
  { name: 'Frontend', icon: Layout, color: 'bg-primary', difficulty: 'beginner' },
  { name: 'Mobile', icon: Smartphone, color: 'bg-secondary', difficulty: 'intermediate' },
  { name: 'Backend', icon: Database, color: 'bg-success', difficulty: 'intermediate' },
  { name: 'Advanced', icon: Globe, color: 'bg-indigo-600', difficulty: 'advanced' },
];

export default function ProjectBuilder() {
  const session = useSession();
  const isVineet = session.user?.id === VINEET_PROFILE.id;
  const activeBundle = isVineet ? VINEET_BUNDLE : KAVYA_BUNDLE;
  const activeProjects = isVineet ? VINEET_PROJECTS : KAVYA_PROJECTS;
  const [busyDifficulty, setBusyDifficulty] = useState<string | null>(null);
  const { data, loading, error, reload } = {
    data: { profile: activeBundle, mine: activeProjects, suggestions: activeProjects },
    loading: false,
    error: null,
    reload: () => {},
  };

  async function generateProject(difficulty = 'intermediate') {
    setBusyDifficulty(difficulty);
    window.setTimeout(() => {
      setBusyDifficulty(null);
    }, 300);
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8 dot-pattern min-h-screen">
        <div className="slab-card !rounded-[3rem] !p-12 text-center">
          <h1 className="text-4xl font-display font-black uppercase italic tracking-tight mb-4">Loading project builder.</h1>
          <p className="text-slate-500 font-medium">Pulling your current project suggestions and generated specs.</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8 dot-pattern min-h-screen">
        <div className="slab-card !rounded-[3rem] !p-12 text-center">
          <h1 className="text-4xl font-display font-black uppercase italic tracking-tight mb-4">Project builder unavailable.</h1>
          <p className="text-slate-500 font-medium mb-8">{error ?? 'We could not load project ideas right now.'}</p>
          <Button onClick={reload}>
            <RefreshCw size={16} /> TRY AGAIN
          </Button>
        </div>
      </div>
    );
  }

  const activeRole = data.profile.target_roles.find((role) => role.is_active)?.job_title ?? 'your target role';
  const suggestions = data.suggestions.length ? data.suggestions : data.mine;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 dot-pattern min-h-screen">
      <header className="mb-12 flex flex-col md:flex-row justify-between items-end gap-10">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 border-[1.5px] border-slate-900 bg-secondary rounded-full text-[9px] font-black uppercase mb-4 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            Project Factory
          </div>
          <h1 className="text-4xl font-display font-black text-slate-900 leading-none">PROJECT <br />BUILDER.</h1>
          <p className="text-slate-500 font-medium text-sm mt-3 max-w-xl">
            Backend-generated project ideas tailored for <span className="text-primary font-black underline decoration-2 decoration-secondary">{activeRole}</span>.
          </p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" size="sm" icon={Plus} className="text-[10px]" onClick={() => void generateProject('intermediate')}>
            {busyDifficulty === 'intermediate' ? 'GENERATING...' : 'NEW CUSTOM PROJECT'}
          </Button>
        </div>
      </header>

      <section className="mb-20">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Choose a Field</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {categories.map((category) => (
            <button
              key={category.name}
              onClick={() => void generateProject(category.difficulty)}
              className="slab-card !p-6 flex flex-col items-center gap-4 group transition-all"
            >
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-white border-2 border-slate-900 shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] transition-transform group-hover:scale-110', category.color)}>
                <category.icon size={22} strokeWidth={2.5} />
              </div>
              <span className="font-black text-xs uppercase tracking-widest text-slate-900">{category.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-10">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-black uppercase">Projects for your Gaps</h2>
          <p className="text-[10px] font-black uppercase text-slate-400 italic">Generated from your live profile and target role</p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
          {suggestions.map((project) => (
            <div key={project.id} className="slab-card !rounded-3xl hover:border-primary transition-all flex flex-col group overflow-hidden">
              <div className="p-6 space-y-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-lg bg-slate-50 border-[1.5px] border-slate-900 flex items-center justify-center text-primary shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                    <Terminal size={18} strokeWidth={2.5} />
                  </div>
                  <span className={cn(
                    'px-2 py-0.5 rounded-md text-[8px] font-black uppercase border-[1.5px]',
                    project.difficulty_level === 'advanced'
                      ? 'bg-danger/5 border-danger/20 text-danger'
                      : 'bg-primary/5 border-primary/20 text-primary',
                  )}>
                    {project.difficulty_level ?? 'intermediate'}
                  </span>
                </div>

                <h3 className="text-xl font-display font-black leading-tight uppercase tracking-tight">{project.project_title}</h3>
                <p className="text-slate-500 text-[11px] font-bold leading-relaxed mb-4 flex-1 uppercase tracking-tight">
                  {project.description ?? 'A practical portfolio project aligned to your target role.'}
                </p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {project.tech_stack.slice(0, 6).map((skill) => (
                    <span key={skill} className="px-2 py-0.5 bg-slate-50 rounded-md text-[8px] font-black text-slate-400 uppercase border-[1px] border-slate-900/10">
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Step-by-step guide</p>
                  <ul className="space-y-2">
                    {project.step_by_step_guide.slice(0, 4).map((step) => (
                      <li key={step} className="text-[10px] font-black uppercase tracking-tight text-slate-600">
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2 pt-4">
                  <Button size="sm" className="w-full text-[10px]" icon={PlayCircle}>
                    OPEN SPEC
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-20 p-10 slab-card !bg-primary text-white !rounded-[3rem] overflow-hidden relative border-none">
        <div className="relative z-10 flex flex-col lg:flex-row gap-12 items-center">
          <div className="flex-1 text-center lg:text-left">
            <h2 className="text-4xl lg:text-5xl font-display font-black leading-none mb-6">LATEST GENERATED <br />PROJECTS.</h2>
            <p className="text-white/80 font-medium text-sm mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed uppercase tracking-tight">
              You currently have {data.mine.length} saved project specs in the backend. Generate more when your roadmap changes.
            </p>
            <Button size="lg" className="px-12 bg-white text-primary hover:bg-slate-50 border-none shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] font-display font-black italic" onClick={() => void generateProject('advanced')}>
              {busyDifficulty === 'advanced' ? 'GENERATING...' : 'GENERATE ADVANCED'}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 shrink-0">
            <div className="p-6 bg-black/30 rounded-2xl border-2 border-white/20">
              <p className="text-3xl font-black mb-1 italic leading-none">{data.mine.length}</p>
              <p className="text-[9px] uppercase font-bold text-white/50 tracking-widest whitespace-nowrap">Saved Specs</p>
            </div>
            <div className="p-6 bg-black/30 rounded-2xl border-2 border-white/20">
              <p className="text-3xl font-black mb-1 italic leading-none">
                {data.mine.reduce((count, project) => count + project.skills_practiced.length, 0)}
              </p>
              <p className="text-[9px] uppercase font-bold text-white/50 tracking-widest whitespace-nowrap">Skill Drills</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
