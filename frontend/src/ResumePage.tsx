import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  BookOpen,
  Download,
  ExternalLink,
  FileText,
  RefreshCw,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { Button, Card } from './UI';
import { cn } from './utils';
import { apiRequest, type JobMatch, type ResumeRecord } from './backend';
import { useBackendResource } from './useBackendResource';
import { useSession } from './session';
import { MentorChat } from './MentorChat';
import { KAVYA_JOBS, KAVYA_RESUME, PROTOTYPE_TOKEN } from './prototypeData';
import { VINEET_JOBS, VINEET_PROFILE, VINEET_RESUME } from './vineetData';

type ResumeTab = 'page1' | 'page2' | 'score';

interface ScoreBreakdown {
  summary_score: number;
  skills_score: number;
  projects_score: number;
  experience_score: number;
  certifications_score: number;
  achievements_score: number;
  ats_keywords_found: string[];
  page_count: number;
  suggestions: string[];
}

interface CompareResult {
  matched: string[];
  missing: string[];
  fit_percentage: number;
  job_title: string;
}

const unusedJobMatchTypeAnchor: JobMatch[] = [];

function defaultScoreBreakdown(isVineet: boolean): ScoreBreakdown {
  if (isVineet) {
    return {
      summary_score: 82,
      skills_score: 70,
      projects_score: 48,
      experience_score: 90,
      certifications_score: 88,
      achievements_score: 84,
      ats_keywords_found: VINEET_RESUME.content_json.ats_keywords_injected ?? [],
      page_count: 2,
      suggestions: [
        'Add GitHub portfolio link with a deployed project',
        'Complete 1 full-stack project to boost Projects score',
        'Add Docker proof to close DevOps gap',
      ],
    };
  }

  return {
    summary_score: 92,
    skills_score: 88,
    projects_score: 94,
    experience_score: 82,
    certifications_score: 90,
    achievements_score: 86,
    ats_keywords_found: KAVYA_RESUME.content_json.ats_keywords_injected ?? [],
    page_count: 2,
    suggestions: ['Add Docker proof after containerising ZeroGap', 'Add one testing metric after Jest coverage lands'],
  };
}

function contentBasics(content: any) {
  const technical = Array.isArray(content?.skills?.technical)
    ? content.skills.technical
    : Array.isArray(content?.skills)
      ? content.skills.map((skill: any) => typeof skill === 'string' ? skill : skill.skill_name ?? skill.name).filter(Boolean)
      : [];
  const databases = Array.isArray(content?.skills?.databases) ? content.skills.databases : [];
  const tools = Array.isArray(content?.skills?.tools) ? content.skills.tools : [];
  const soft = Array.isArray(content?.skills?.soft) ? content.skills.soft : [];

  return {
    name: content?.basics?.name ?? content?.name ?? 'ZeroGap Candidate',
    email: content?.basics?.email ?? content?.email ?? '',
    phone: content?.basics?.phone ?? '',
    location: content?.basics?.location ?? content?.location ?? '',
    linkedin: content?.basics?.linkedin ?? '',
    github: content?.basics?.github ?? '',
    portfolio: content?.basics?.portfolio ?? '',
    summary: content?.summary ?? content?.basics?.summary ?? '',
    skills: { technical, databases, tools, soft },
    skillLines: [...technical, ...databases, ...tools, ...soft],
    projects: Array.isArray(content?.projects) ? content.projects : [],
    experience: Array.isArray(content?.experience) ? content.experience : [],
    education: Array.isArray(content?.education) ? content.education : [],
    certifications: Array.isArray(content?.certifications) ? content.certifications : [],
    achievements: Array.isArray(content?.achievements) ? content.achievements : [],
    extracurricular: Array.isArray(content?.extracurricular) ? content.extracurricular : [],
    languages: Array.isArray(content?.languages) ? content.languages : [],
    atsKeywords: Array.isArray(content?.ats_keywords_injected) ? content.ats_keywords_injected : [],
  };
}

function points(item: any) {
  return item?.bullets ?? item?.points ?? item?.highlights ?? (item?.summary || item?.description ? [item.summary ?? item.description] : []);
}

function ResumeSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <h2 className="text-[9px] font-black uppercase tracking-[0.18em] border-b border-slate-900 mb-1.5 pb-0.5">{title}</h2>
      {children}
    </div>
  );
}

function ResumeShell({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="overflow-x-auto pb-4">
      <div
        className="bg-white border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] mx-auto text-slate-950"
        style={{
          width: '210mm',
          maxWidth: '100%',
          minHeight: '297mm',
          padding: '13mm 15mm',
          fontFamily: 'Arial, Calibri, sans-serif',
          fontSize: '10px',
          lineHeight: 1.24,
        }}
      >
        <div className="text-right text-[8px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</div>
        {children}
      </div>
    </div>
  );
}

function ResumePreview({ rawContent }: { rawContent: any }) {
  const content = contentBasics(rawContent);
  const skillRows = [
    ['Technical', content.skills.technical.join(', ') || content.skillLines.slice(0, 8).join(', ')],
    ['Databases', content.skills.databases.join(', ')],
    ['Tools & Cloud', content.skills.tools.join(', ') || content.skillLines.slice(8, 16).join(', ')],
    ['Core Strengths', content.skills.soft.join(', ')],
  ].filter(([, value]) => value);

  return (
    <ResumeShell label="Page 1">
      <div className="text-center border-b-2 border-slate-900 pb-2 mb-3">
        <h1 className="text-[24px] font-black uppercase tracking-[0.16em] leading-none">{content.name}</h1>
        <p className="text-[10px] text-slate-700 mt-1">
          {[content.location, content.email, content.phone].filter(Boolean).join(' | ')}
          {content.linkedin && <> | <a href={content.linkedin} className="underline">LinkedIn</a></>}
          {content.github && <> | <a href={content.github} className="underline">GitHub</a></>}
          {content.portfolio && <> | <a href={content.portfolio} className="underline">Portfolio</a></>}
        </p>
      </div>

      {content.summary && (
        <ResumeSection title="Professional Summary">
          <p className="text-[10px] text-slate-800 leading-snug">{content.summary}</p>
        </ResumeSection>
      )}

      {content.education.length > 0 && (
        <ResumeSection title="Education">
          {content.education.map((item: any, index: number) => (
            <div key={index} className="mb-1">
              <div className="flex justify-between gap-4 text-[10px]">
                <span><strong>{item.degree}</strong>{item.institution ? ` - ${item.institution}` : ''}</span>
                <span className="text-slate-600 whitespace-nowrap">{item.graduation ?? item.year}</span>
              </div>
              <p className="text-[9.5px] text-slate-700">
                {[item.location, item.cgpa ? `CGPA: ${item.cgpa}` : '', Array.isArray(item.relevant_courses) ? `Relevant: ${item.relevant_courses.join(', ')}` : ''].filter(Boolean).join(' | ')}
              </p>
            </div>
          ))}
        </ResumeSection>
      )}

      {skillRows.length > 0 && (
        <ResumeSection title="Technical Skills">
          <div className="space-y-0.5">
            {skillRows.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[92px_1fr] gap-2 text-[9.8px]">
                <span className="font-bold">{label}:</span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </ResumeSection>
      )}

      {content.experience.slice(0, 1).length > 0 && (
        <ResumeSection title="Experience">
          {content.experience.slice(0, 1).map((item: any, index: number) => (
            <div key={index} className="mb-2">
              <div className="flex justify-between gap-4 text-[10px]">
                <span><strong>{item.title ?? item.role}</strong>{item.company ? ` - ${item.company}` : ''}{item.location ? `, ${item.location}` : ''}</span>
                <span className="text-slate-600 whitespace-nowrap">{item.duration ?? [item.start_date, item.end_date].filter(Boolean).join(' - ')}</span>
              </div>
              <ul className="list-disc ml-4 mt-0.5 space-y-0.5">
                {points(item).slice(0, 4).map((line: string, pointIndex: number) => (
                  <li key={pointIndex} className="text-[9.5px] text-slate-800">{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </ResumeSection>
      )}

      {content.projects.length > 0 && (
        <ResumeSection title="Projects">
          {content.projects.slice(0, 2).map((project: any, index: number) => (
            <div key={index} className="mb-2">
              <div className="flex justify-between gap-3 text-[10px]">
                <span className="font-bold">{project.name} <span className="font-normal text-slate-600">| {project.tech_stack ?? project.tech?.join?.(', ')}</span></span>
                <span className="whitespace-nowrap">{project.github_url && <a href={project.github_url} className="text-[9px] underline">GitHub</a>}</span>
              </div>
              <ul className="list-disc ml-4 mt-0.5 space-y-0.5">
                {points(project).slice(0, 3).map((line: string, pointIndex: number) => (
                  <li key={pointIndex} className="text-[9.5px] text-slate-800">{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </ResumeSection>
      )}
    </ResumeShell>
  );
}

function ResumePage2Preview({ rawContent }: { rawContent: any }) {
  const content = contentBasics(rawContent);
  const page2Projects = content.projects.slice(2);
  const page2Experience = content.experience.slice(1);

  return (
    <ResumeShell label="Page 2">
      <div className="border-b-2 border-slate-900 pb-2 mb-3">
        <h1 className="text-[18px] font-black uppercase tracking-[0.12em] leading-none">{content.name}</h1>
        <p className="text-[9px] text-slate-600 mt-1">Additional projects, credentials, leadership, and ATS keyword profile</p>
      </div>

      {page2Projects.length > 0 && (
        <ResumeSection title="Additional Projects">
          {page2Projects.map((project: any, index: number) => (
            <div key={index} className="mb-2">
              <div className="flex justify-between gap-3 text-[10px]">
                <span className="font-bold">{project.name} <span className="font-normal text-slate-600">| {project.tech_stack ?? project.tech?.join?.(', ')}</span></span>
                <span className="text-slate-600">{project.status}</span>
              </div>
              <ul className="list-disc ml-4 mt-0.5 space-y-0.5">
                {points(project).slice(0, 3).map((line: string, pointIndex: number) => (
                  <li key={pointIndex} className="text-[9.5px] text-slate-800">{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </ResumeSection>
      )}

      {page2Experience.length > 0 && (
        <ResumeSection title="Additional Experience">
          {page2Experience.map((item: any, index: number) => (
            <div key={index} className="mb-2">
              <div className="flex justify-between gap-4 text-[10px]">
                <span><strong>{item.title ?? item.role}</strong>{item.company ? ` - ${item.company}` : ''}</span>
                <span className="text-slate-600 whitespace-nowrap">{item.duration ?? [item.start_date, item.end_date].filter(Boolean).join(' - ')}</span>
              </div>
              <ul className="list-disc ml-4 mt-0.5 space-y-0.5">
                {points(item).slice(0, 4).map((line: string, pointIndex: number) => (
                  <li key={pointIndex} className="text-[9.5px] text-slate-800">{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </ResumeSection>
      )}

      {content.certifications.length > 0 && (
        <ResumeSection title="Certifications">
          <div className="grid gap-1">
            {content.certifications.map((item: any, index: number) => (
              <div key={index} className="flex justify-between gap-4 text-[9.5px]">
                <span><strong>{item.name ?? item.title}</strong>{item.issuer ? ` - ${item.issuer}` : ''}</span>
                <span className="text-slate-600 whitespace-nowrap">{item.date ?? item.issue_date}</span>
              </div>
            ))}
          </div>
        </ResumeSection>
      )}

      {content.achievements.length > 0 && (
        <ResumeSection title="Achievements">
          <ul className="list-disc ml-4 space-y-0.5">
            {content.achievements.map((achievement: string, index: number) => (
              <li key={index} className="text-[9.5px] text-slate-800">{achievement}</li>
            ))}
          </ul>
        </ResumeSection>
      )}

      {content.extracurricular.length > 0 && (
        <ResumeSection title="Extracurricular & Leadership">
          <div className="space-y-1">
            {content.extracurricular.map((activity: any, index: number) => (
              <div key={index} className="text-[9.5px] text-slate-800">
                {typeof activity === 'string' ? activity : (
                  <>
                    <strong>{activity.title}</strong>{activity.organization ? ` - ${activity.organization}` : ''}{activity.duration ? ` (${activity.duration})` : ''}
                    {activity.description ? <span> — {activity.description}</span> : null}
                  </>
                )}
              </div>
            ))}
          </div>
        </ResumeSection>
      )}

      {content.languages.length > 0 && (
        <ResumeSection title="Languages">
          <p className="text-[9.5px] text-slate-800">{content.languages.join(' · ')}</p>
        </ResumeSection>
      )}

      {content.atsKeywords.length > 0 && (
        <ResumeSection title="Core Competencies & ATS Keywords">
          <p style={{ fontSize: '9px', color: '#475569', lineHeight: 1.6 }}>
            {content.atsKeywords.join(' · ')}
          </p>
        </ResumeSection>
      )}
    </ResumeShell>
  );
}

function AtsScorePanel({ scoreBreakdown }: { scoreBreakdown: ScoreBreakdown | null }) {
  if (!scoreBreakdown) {
    return (
      <div className="slab-card !p-8 animate-pulse">
        <div className="h-4 w-40 bg-slate-200 rounded mb-6" />
        <div className="space-y-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-3 bg-slate-100 rounded" />)}</div>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="slab-card !p-8">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
          <TrendingUp size={14} /> ATS Score Breakdown
        </h3>
        <div className="space-y-4">
          {[
            { label: 'Summary Quality', value: scoreBreakdown.summary_score },
            { label: 'Skills Coverage', value: scoreBreakdown.skills_score },
            { label: 'Projects Depth', value: scoreBreakdown.projects_score },
            { label: 'Experience', value: scoreBreakdown.experience_score },
            { label: 'Certifications', value: scoreBreakdown.certifications_score },
            { label: 'Achievements', value: scoreBreakdown.achievements_score },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-1">
                <span className="text-slate-400">{item.label}</span>
                <span className={item.value >= 90 ? 'text-emerald-600' : item.value >= 70 ? 'text-amber-600' : 'text-red-500'}>
                  {item.value}/100
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full border border-slate-200 overflow-hidden">
                <motion.div
                  className={cn('h-full rounded-full', item.value >= 90 ? 'bg-emerald-500' : item.value >= 70 ? 'bg-amber-500' : 'bg-red-400')}
                  initial={{ width: 0 }}
                  animate={{ width: `${item.value}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {scoreBreakdown.suggestions?.length > 0 && (
          <div className="slab-card !p-6 !bg-amber-50 border-amber-400 shadow-[4px_4px_0px_0px_rgba(245,158,11,1)]">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-4 flex items-center gap-2">
              <AlertCircle size={14} /> Improve Your Resume
            </h3>
            <div className="space-y-2">
              {scoreBreakdown.suggestions.map((suggestion) => (
                <div key={suggestion} className="flex items-start gap-2 text-[10px] font-bold text-slate-700">
                  <span className="text-amber-500 mt-0.5">→</span> {suggestion}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="slab-card !p-6">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
            ATS Keywords Injected ({scoreBreakdown.ats_keywords_found?.length ?? 0})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {(scoreBreakdown.ats_keywords_found ?? []).map((keyword) => (
              <span key={keyword} className="px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-[9px] font-black uppercase text-emerald-700">
                ✓ {keyword}
              </span>
            ))}
          </div>
          <p className="mt-4 text-[9px] font-bold text-slate-400 uppercase tracking-wide">
            Pages generated: {scoreBreakdown.page_count}/2
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResumePage() {
  void unusedJobMatchTypeAnchor;
  const session = useSession();
  const isKavya = session.accessToken === PROTOTYPE_TOKEN || session.user?.id === KAVYA_RESUME.user_id;
  const isVineet = session.user?.id === VINEET_PROFILE.id;
  const localResume = isVineet ? VINEET_RESUME : isKavya ? KAVYA_RESUME : null;
  const activeResume = localResume ?? KAVYA_RESUME;
  const activeJobs = isVineet ? VINEET_JOBS : KAVYA_JOBS;
  const [busy, setBusy] = useState<'generate' | 'export' | null>(null);
  const [activeTab, setActiveTab] = useState<ResumeTab>('page1');
  const [compareJobId, setCompareJobId] = useState<string | null>(null);
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdown | null>(() => defaultScoreBreakdown(isVineet));
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const { data: backendLatest, loading: backendLoading, error: backendError, reload: backendReload } = useBackendResource<ResumeRecord>(
    (request) => request('/api/resume/latest'),
    [session.accessToken],
  );
  const latest = localResume ?? backendLatest;
  const loading = localResume ? false : backendLoading;
  const error = localResume ? null : backendError;
  const reload = localResume ? () => {} : backendReload;

  useEffect(() => {
    if (localResume) {
      setScoreBreakdown(defaultScoreBreakdown(isVineet));
      return;
    }

    if (!backendLatest || !session.accessToken) return;
    session.request<ScoreBreakdown | null>('/api/resume/score-breakdown')
      .then(setScoreBreakdown)
      .catch(() => {});
  }, [backendLatest?.id, isVineet, localResume, session.accessToken]);

  async function generateResume() {
    if (!session.accessToken) return;
    setBusy('generate');

    if (localResume) {
      window.setTimeout(() => {
        setActiveTab('page1');
        setBusy(null);
      }, 250);
      return;
    }

    try {
      await apiRequest('/api/resume/generate', {
        method: 'POST',
        token: session.accessToken,
      });
      reload();
      setActiveTab('page1');
    } catch (err) {
      console.error('Resume generate failed', err);
    } finally {
      setBusy(null);
    }
  }

  async function exportPdf() {
    if (!latest || !session.accessToken) return;
    setBusy('export');

    if (localResume) {
      window.setTimeout(() => {
        window.open(latest.pdf_url ?? activeResume.content_json.basics.portfolio ?? '#', '_blank', 'noopener,noreferrer');
        setBusy(null);
      }, 250);
      return;
    }

    try {
      const result = await apiRequest<{ pdf_url: string }>(
        `/api/resume/${latest.id}/export-pdf`,
        { method: 'POST', token: session.accessToken },
      );
      if (result?.pdf_url) {
        window.open(result.pdf_url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.error('PDF export failed', err);
    } finally {
      setBusy(null);
    }
  }

  async function compareJob() {
    if (!compareJobId) return;
    const match = activeJobs.find((job) => job.job_listing_id === compareJobId || job.id === compareJobId) ?? activeJobs[0];
    setCompareResult({
      matched: match.job_listings.skills_required.filter((skill) => !match.missing_skills.includes(skill)).slice(0, 8),
      missing: match.missing_skills,
      fit_percentage: match.fit_percentage,
      job_title: match.job_listings.title,
    });
  }

  const content = latest ? contentBasics(latest.content_json) : null;
  const pageScore = useMemo(() => Math.round(latest?.ats_score ?? 0), [latest?.ats_score]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 dot-pattern min-h-screen">
      <header className="mb-12 flex flex-col md:flex-row justify-between items-end gap-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary border-2 border-slate-900 rounded-full text-[10px] font-black uppercase mb-4 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <Zap size={13} /> ATS Resume
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-black leading-tight tracking-tighter uppercase">BUILD THE <br />RESUME.</h1>
          <p className="text-slate-500 font-medium mt-3">Generate a predictive 2-page ATS resume from your live profile, jobs, projects, and LearnPath certificates.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void generateResume()} disabled={busy === 'generate'}><Sparkles size={16} /> {busy === 'generate' ? 'GENERATING...' : 'GENERATE'}</Button>
          <Button variant="outline" onClick={() => void exportPdf()} disabled={!latest || busy === 'export'}><Download size={16} /> {busy === 'export' ? 'EXPORTING...' : 'EXPORT PDF'}</Button>
        </div>
      </header>

      <div className="mb-8">
        <MentorChat />
      </div>

      {loading ? (
        <div className="slab-card !rounded-[3rem] !p-12 text-center animate-pulse">
          <h2 className="text-3xl font-display font-black uppercase italic mb-3">Loading resume.</h2>
          <p className="text-slate-500 font-medium">Checking the latest ATS draft.</p>
        </div>
      ) : error ? (
        <div className="slab-card !rounded-[3rem] !p-12 text-center">
          <h2 className="text-3xl font-display font-black uppercase italic mb-3">Resume unavailable.</h2>
          <p className="text-slate-500 font-medium mb-8">{error}</p>
          <Button onClick={reload}><RefreshCw size={16} /> TRY AGAIN</Button>
        </div>
      ) : !latest || !content ? (
        <div className="slab-card !rounded-[3rem] !p-12 text-center">
          <FileText className="mx-auto mb-4 text-slate-300" size={56} />
          <h2 className="text-3xl font-display font-black uppercase italic mb-3">No resume yet.</h2>
          <p className="text-slate-500 font-medium mb-8">Generate one from your target role, GitHub proof, certificates, and completed roadmap work.</p>
          <Button onClick={() => void generateResume()} disabled={busy === 'generate'}>GENERATE FIRST RESUME</Button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[22rem_1fr] gap-8">
          <aside className="space-y-6">
            <Card title="ATS Score" icon={Sparkles} variant="highlight">
              <p className="text-6xl font-display font-black italic leading-none">{pageScore}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">out of 100</p>
              <div className="h-4 bg-slate-100 rounded-full border-2 border-slate-900 overflow-hidden mt-6">
                <div className="h-full bg-primary" style={{ width: `${Math.min(100, pageScore)}%` }} />
              </div>
            </Card>
            <Card title="Keyword Match" icon={FileText}>
              <p className="text-4xl font-display font-black italic leading-none">{Math.round(latest.keyword_match_score ?? 0)}%</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">market keywords covered</p>
              {latest.pdf_url && (
                <a href={latest.pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-6 text-[10px] font-black uppercase tracking-widest text-primary underline">
                  Open latest PDF <ExternalLink size={11} />
                </a>
              )}
            </Card>
            <div className="slab-card !p-5">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                <Star size={13} /> Compare vs Job
              </h3>
              <p className="text-[10px] text-slate-500 mb-3">Paste a job ID to see your resume fit %</p>
              <input
                type="text"
                placeholder="Job listing ID..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border-2 border-slate-200 text-[11px] font-bold outline-none focus:border-sky-400 mb-2"
                value={compareJobId ?? ''}
                onChange={(event) => setCompareJobId(event.target.value)}
              />
              <Button variant="outline" className="w-full h-9 text-[9px]" onClick={() => void compareJob()}>
                COMPARE
              </Button>
              {compareResult && (
                <div className="mt-3 space-y-2">
                  <p className="text-xl font-display font-black">{compareResult.fit_percentage}% fit</p>
                  <p className="text-[9px] font-black uppercase text-emerald-600">Matched: {compareResult.matched.join(', ') || 'None yet'}</p>
                  <p className="text-[9px] font-black uppercase text-red-500">Missing: {compareResult.missing.join(', ') || 'None'}</p>
                </div>
              )}
            </div>
            {content.certifications.length === 0 && (
              <div className="slab-card !p-5 !bg-sky-50 border-sky-300">
                <p className="text-[10px] font-black uppercase tracking-widest text-sky-700 mb-2">
                  Boost ATS Score
                </p>
                <p className="text-[10px] text-slate-600 mb-3">
                  Complete a LearnPath playlist, pass the MCQ quiz, and earn a certificate that goes directly into this resume.
                </p>
                <Link to="/learn">
                  <Button variant="outline" className="w-full h-9 text-[9px]">
                    <BookOpen size={12} /> EARN CERTIFICATE →
                  </Button>
                </Link>
              </div>
            )}
          </aside>

          <section>
            {latest && (
              <div className="flex gap-2 mb-6">
                {(['page1', 'page2', 'score'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'px-5 py-2.5 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest transition-all shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
                      activeTab === tab
                        ? 'bg-primary text-white border-slate-900'
                        : 'bg-white text-slate-900 border-slate-900 hover:bg-slate-50',
                    )}
                  >
                    {tab === 'page1' ? 'Page 1' : tab === 'page2' ? 'Page 2' : 'ATS Score'}
                  </button>
                ))}
              </div>
            )}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18 }}
              >
                {activeTab === 'page1' && <ResumePreview rawContent={latest.content_json} />}
                {activeTab === 'page2' && <ResumePage2Preview rawContent={latest.content_json} />}
                {activeTab === 'score' && <AtsScorePanel scoreBreakdown={scoreBreakdown} />}
              </motion.div>
            </AnimatePresence>
          </section>
        </div>
      )}
    </div>
  );
}
