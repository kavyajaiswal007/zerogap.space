import { startTransition, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BarChart3,
  Brain,
  Briefcase,
  Check,
  ChevronLeft,
  ChevronRight,
  Github,
  GraduationCap,
  Linkedin,
  Lock,
  Mail,
  Sparkles,
  Target,
  Upload,
  User,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Button } from './UI';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from './utils';
import { ApiError, type Profile } from './backend';
import { useSession } from './session';
import {
  STOCK_PASSWORD,
  STOCK_SKILLS,
  isValidEmail,
  makeStockEmail,
  normalizeEmail,
  normalizeGithubUsername,
  normalizeInt,
  normalizeName,
  normalizeOptionalUrl,
  normalizePassword,
  normalizeRole,
  normalizeSkills,
} from './stockDefaults';

type ExperienceLevel = 'fresher' | '1-2yrs' | '3+yrs';
type TargetRoleExperience = 'fresher' | 'junior' | 'mid' | 'senior';
type PillValue = string | string[];

const inputClassName =
  'w-full px-6 py-5 rounded-2xl bg-slate-50 border-2 border-slate-900/5 focus:border-primary focus:bg-white outline-none transition-all font-black text-sm tracking-tight';
const iconInputClassName =
  'w-full pl-12 pr-6 py-5 rounded-2xl bg-slate-50 border-2 border-slate-900/5 focus:border-primary focus:bg-white outline-none transition-all font-black text-sm tracking-tight';
const labelClassName = 'block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 italic';

const signupSteps: Array<{ id: number; title: string; icon: LucideIcon; optional?: boolean }> = [
  { id: 1, title: 'Identity', icon: User },
  { id: 2, title: 'Career', icon: Target },
  { id: 3, title: 'Skills', icon: Zap },
  { id: 4, title: 'Learning', icon: Brain },
  { id: 5, title: 'Proof', icon: Upload },
  { id: 6, title: 'Connect', icon: Github, optional: true },
  { id: 7, title: 'Launch', icon: Sparkles },
];

const degreeOptions = ['B.Tech CSE', 'B.Tech IT', 'BCA', 'MCA', 'B.Sc CS', 'MBA Tech', 'Other'];
const expectedCtcOptions = ['<3 LPA', '3-6 LPA', '6-10 LPA', '10-20 LPA', '20+ LPA'];

const roleCards: Array<{ label: string; value: string; icon: LucideIcon }> = [
  { label: 'Frontend Dev', value: 'Frontend Dev', icon: Zap },
  { label: 'Full Stack Dev', value: 'Full Stack Developer', icon: Briefcase },
  { label: 'Data Scientist', value: 'Data Scientist', icon: BarChart3 },
  { label: 'ML Engineer', value: 'ML Engineer', icon: Brain },
  { label: 'DevOps/Cloud', value: 'DevOps/Cloud', icon: Upload },
  { label: 'Android Dev', value: 'Android Dev', icon: Github },
  { label: 'UX Designer', value: 'UX Designer', icon: Target },
  { label: 'Cybersecurity', value: 'Cybersecurity', icon: Lock },
];

const skillGroups = [
  { label: 'WEB', skills: ['React', 'Next.js', 'TypeScript', 'Node.js', 'HTML/CSS', 'Vue.js'] },
  { label: 'DATA', skills: ['Python', 'SQL', 'Pandas', 'NumPy', 'TensorFlow', 'PyTorch'] },
  { label: 'INFRA', skills: ['Docker', 'Kubernetes', 'AWS', 'Git', 'Linux', 'CI/CD'] },
  { label: 'CORE CS', skills: ['DSA', 'System Design', 'DBMS', 'OS', 'Networking', 'OOP'] },
];

const learningStyleCards = [
  { label: 'Project-based', icon: '🎯' },
  { label: 'Theory-first', icon: '📖' },
  { label: 'Mentor-led', icon: '🎓' },
  { label: 'Self-paced', icon: '⚡' },
];

const missingSkillMap: Record<string, string[]> = {
  'Full Stack Developer': ['System Design', 'Node.js', 'PostgreSQL'],
  'Data Scientist': ['MLOps', 'Spark', 'Statistics'],
  'ML Engineer': ['Transformers', 'CUDA', 'MLflow'],
  'DevOps/Cloud': ['Terraform', 'Kubernetes', 'Monitoring'],
  'Frontend Dev': ['Performance', 'A11y', 'Testing'],
};

function getProficiencyColor(value: number) {
  if (value < 40) {
    return {
      bg: 'bg-danger',
      text: 'text-danger',
      soft: 'bg-red-50',
      border: 'border-red-200',
    };
  }

  if (value <= 70) {
    return {
      bg: 'bg-accent',
      text: 'text-accent',
      soft: 'bg-amber-50',
      border: 'border-amber-200',
    };
  }

  return {
    bg: 'bg-success',
    text: 'text-success',
    soft: 'bg-emerald-50',
    border: 'border-emerald-200',
  };
}

function studyTimeToHours(value: string) {
  if (value === '30 min') return 1;
  if (value === '4+ hrs') return 4;
  const parsed = Number(value.replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? Math.max(1, Math.round(parsed)) : 2;
}

function mapExperienceLevel(value: ExperienceLevel): TargetRoleExperience {
  if (value === '1-2yrs') return 'junior';
  if (value === '3+yrs') return 'mid';
  return 'fresher';
}

interface PillToggleProps {
  options: string[];
  value: PillValue;
  onChange: (value: PillValue) => void;
  multi?: boolean;
}

const PillToggle = ({ options, value, onChange, multi = false }: PillToggleProps) => (
  <div className="flex flex-wrap gap-3">
    {options.map((option) => {
      const selected = Array.isArray(value) ? value.includes(option) : value === option;
      return (
        <button
          key={option}
          type="button"
          onClick={() => {
            if (!multi) {
              onChange(option);
              return;
            }

            const current = Array.isArray(value) ? value : [];
            onChange(current.includes(option) ? current.filter((item) => item !== option) : [...current, option]);
          }}
          className={cn(
            'px-5 py-3 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest transition-all shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
            selected ? 'bg-secondary border-slate-900 text-slate-900' : 'bg-white border-slate-900 text-slate-500 hover:bg-secondary/30',
          )}
        >
          {option}
        </button>
      );
    })}
  </div>
);

interface YesNoToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

const YesNoToggle = ({ value, onChange }: YesNoToggleProps) => (
  <div className="flex flex-wrap gap-3">
    <button
      type="button"
      onClick={() => onChange(true)}
      className={cn(
        'px-5 py-3 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest transition-all shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
        value ? 'bg-success border-slate-900 text-white' : 'bg-white border-slate-900 text-slate-500 hover:bg-success/10',
      )}
    >
      YES
    </button>
    <button
      type="button"
      onClick={() => onChange(false)}
      className={cn(
        'px-5 py-3 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest transition-all shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
        !value ? 'bg-danger/10 border-slate-900 text-danger' : 'bg-white border-slate-900 text-slate-500 hover:bg-danger/10',
      )}
    >
      NO
    </button>
  </div>
);

interface ProficiencySliderProps {
  skill: string;
  value: number;
  onChange: (value: number) => void;
}

const ProficiencySlider = ({ skill, value, onChange }: ProficiencySliderProps) => {
  const color = getProficiencyColor(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn('mt-3 rounded-2xl border-2 p-3', color.soft, color.border)}
    >
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{skill}</span>
        <span className={cn('text-[10px] font-black uppercase tracking-widest', color.text)}>{value}%</span>
      </div>
      <div className="relative mb-3 h-2 overflow-hidden rounded-full bg-white border border-slate-900/10">
        <motion.div className={cn('h-full rounded-full', color.bg)} animate={{ width: `${value}%` }} />
      </div>
      <input
        type="range"
        min={1}
        max={100}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-primary"
        aria-label={`${skill} proficiency`}
      />
    </motion.div>
  );
};

function getPasswordStrength(password: string) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;

  if (score >= 3) {
    return { label: 'STRONG', segments: 3, color: 'bg-success', text: 'text-success' };
  }

  if (score >= 2) {
    return { label: 'FAIR', segments: 2, color: 'bg-accent', text: 'text-accent' };
  }

  return { label: 'WEAK', segments: password ? 1 : 0, color: 'bg-danger', text: 'text-danger' };
}

const PasswordStrength = ({ password }: { password: string }) => {
  const strength = getPasswordStrength(password);

  return (
    <div className="mt-3">
      <div className="mb-2 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((segment) => (
          <div key={segment} className="h-2 rounded-full bg-slate-200 border border-slate-900/10 overflow-hidden">
            <div className={cn('h-full transition-all', segment < strength.segments ? strength.color : 'bg-transparent')} />
          </div>
        ))}
      </div>
      <p className={cn('text-[9px] font-black uppercase tracking-widest', strength.text)}>{strength.label}</p>
    </div>
  );
};

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const session = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const isLoginMode = searchParams.get('mode') === 'login';
  const requestedNextPath = searchParams.get('next') || '/dashboard';
  const nextPath = requestedNextPath.startsWith('/') ? requestedNextPath : '/dashboard';
  const needsProfileSetup = session.isAuthenticated && !session.user?.onboarding_completed && !isLoginMode;
  const steps = isLoginMode ? [{ id: 1, title: 'Sign In', icon: User }] : signupSteps;

  const [currentStep, setCurrentStep] = useState(1);
  const [fullName, setFullName] = useState(isLoginMode ? '' : session.user?.full_name ?? '');
  const [email, setEmail] = useState(isLoginMode ? '' : session.user?.email ?? '');
  const [password, setPassword] = useState('');
  const [collegeName, setCollegeName] = useState(session.user?.college_name ?? '');
  const [degree, setDegree] = useState(session.user?.degree ?? 'B.Tech CSE');
  const [branchSpecialization, setBranchSpecialization] = useState('');
  const [graduationYear, setGraduationYear] = useState(String(session.user?.graduation_year ?? new Date().getFullYear() + 1));
  const [learningStyle, setLearningStyle] = useState(session.user?.learning_style ?? 'Project-based');
  const [selectedRole, setSelectedRole] = useState('Full Stack Developer');
  const [customRole, setCustomRole] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('fresher');
  const [dreamCompanyTypes, setDreamCompanyTypes] = useState<string[]>([]);
  const [targetCity, setTargetCity] = useState('');
  const [expectedCTC, setExpectedCTC] = useState('');
  const [willingToRelocate, setWillingToRelocate] = useState(true);
  const [selectedSkills, setSelectedSkills] = useState<Array<{ skill_name: string; proficiency_level: number }>>([]);
  const [skillProficiencies, setSkillProficiencies] = useState<Record<string, number>>({});
  const [customSkill, setCustomSkill] = useState('');
  const [studyTime, setStudyTime] = useState('2 hrs');
  const [studyTimes, setStudyTimes] = useState<string[]>([]);
  const [weakestAreas, setWeakestAreas] = useState<string[]>([]);
  const [hasInternship, setHasInternship] = useState(false);
  const [internshipDetails, setInternshipDetails] = useState('');
  const [hasProjects, setHasProjects] = useState(false);
  const [projectDetails, setProjectDetails] = useState('');
  const [cpRating, setCpRating] = useState('None');
  const [openToFreelance, setOpenToFreelance] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [leetcodeUsername, setLeetcodeUsername] = useState('');
  const [kaggleUsername, setKaggleUsername] = useState('');
  const [certificationName, setCertificationName] = useState('');
  const [githubUsername, setGithubUsername] = useState(session.user?.github_username ?? '');
  const [linkedinUrl, setLinkedinUrl] = useState(session.user?.linkedin_url ?? '');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [youtubeChannel, setYoutubeChannel] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStepData = steps.find((step) => step.id === currentStep);
  const targetRole = normalizeRole(customRole || selectedRole);
  const selectedSkillPayload = useMemo(
    () => selectedSkills.map((skill) => ({
      skill_name: skill.skill_name,
      proficiency_level: skillProficiencies[skill.skill_name] ?? skill.proficiency_level,
    })),
    [selectedSkills, skillProficiencies],
  );
  const topFiveSkills = useMemo(
    () => [...(selectedSkillPayload.length ? selectedSkillPayload : STOCK_SKILLS)]
      .sort((left, right) => right.proficiency_level - left.proficiency_level)
      .slice(0, 5),
    [selectedSkillPayload],
  );
  const topSkill = topFiveSkills[0] ?? { skill_name: 'React', proficiency_level: 65 };
  const missingSkills = missingSkillMap[targetRole] ?? ['System Design', 'Communication', 'DSA'];
  const summaryText = `You're a ${learningStyle} learner targeting ${targetRole} at ${dreamCompanyTypes[0] || 'top companies'}. Your strongest skill is ${topSkill.skill_name} (${topSkill.proficiency_level}%). ZeroGap will close your ${missingSkills.join(' & ')} gaps with a personalised daily roadmap.`;

  function setMode(mode: 'signup' | 'login') {
    const params = new URLSearchParams(searchParams);
    if (mode === 'login') {
      params.set('mode', 'login');
    } else {
      params.delete('mode');
    }
    startTransition(() => {
      setCurrentStep(1);
      setError(null);
      setSearchParams(params, { replace: true });
    });
  }

  function toggleSkill(skillName: string) {
    setSelectedSkills((skills) => {
      const exists = skills.some((item) => item.skill_name.toLowerCase() === skillName.toLowerCase());
      if (exists) {
        setSkillProficiencies((proficiencies) => {
          const next = { ...proficiencies };
          delete next[skillName];
          return next;
        });
        return skills.filter((item) => item.skill_name.toLowerCase() !== skillName.toLowerCase());
      }

      setSkillProficiencies((proficiencies) => ({ ...proficiencies, [skillName]: proficiencies[skillName] ?? 70 }));
      return [...skills, { skill_name: skillName, proficiency_level: 70 }];
    });
  }

  function updateSkillProficiency(skillName: string, value: number) {
    setSkillProficiencies((proficiencies) => ({ ...proficiencies, [skillName]: value }));
    setSelectedSkills((skills) => skills.map((skill) => (
      skill.skill_name === skillName ? { ...skill, proficiency_level: value } : skill
    )));
  }

  function addCustomSkill() {
    const name = customSkill.trim();
    if (!name) {
      return;
    }

    if (!selectedSkills.some((item) => item.skill_name.toLowerCase() === name.toLowerCase())) {
      setSelectedSkills((skills) => [...skills, { skill_name: name, proficiency_level: 60 }]);
      setSkillProficiencies((proficiencies) => ({ ...proficiencies, [name]: 60 }));
    }
    setCustomSkill('');
  }

  function validateCurrentStep() {
    setError(null);

    if (isLoginMode) {
      return true;
    }

    if (currentStep === 1) {
      if (!fullName.trim()) {
        setError('Full name is required.');
        return false;
      }

      if (!session.isAuthenticated && !isValidEmail(email)) {
        setError('Please enter a valid email address.');
        return false;
      }

      if (!session.isAuthenticated && password.trim().length < 8) {
        setError('Password must be at least 8 characters.');
        return false;
      }

      if (!collegeName.trim()) {
        setError('College or university name is required.');
        return false;
      }

      if (!degree.trim()) {
        setError('Degree is required.');
        return false;
      }
    }

    if (currentStep === 2) {
      if (!targetRole.trim()) {
        setError('Choose a target role or type your own.');
        return false;
      }

      if (!targetCity.trim()) {
        setError('Target city is required.');
        return false;
      }
    }

    if (currentStep === 3 && selectedSkills.length < 3) {
      setError('Add at least 3 current skills.');
      return false;
    }

    if (currentStep === 4) {
      if (!studyTime || !learningStyle) {
        setError('Learning style and study time are required.');
        return false;
      }

      if (!weakestAreas.length) {
        setError('Choose at least one weakest area.');
        return false;
      }
    }

    return true;
  }

  function buildOnboardingPayload(profile?: Profile | null) {
    const safeEmail = normalizeEmail(email || profile?.email || '', false);
    const fallbackName = normalizeName(fullName || profile?.full_name, safeEmail);

    return {
      profile: {
        full_name: fallbackName,
        college_name: collegeName.trim() || profile?.college_name || 'Independent learner',
        degree: degree.trim() || profile?.degree || 'B.Tech CSE',
        branch_specialization: branchSpecialization.trim(),
        graduation_year: normalizeInt(graduationYear, profile?.graduation_year ?? new Date().getFullYear() + 1, 2020, 2030),
        learning_style: learningStyle || profile?.learning_style || 'Project-based',
        time_availability_hours: studyTimeToHours(studyTime),
        github_username: normalizeGithubUsername(githubUsername || profile?.github_username),
        linkedin_url: normalizeOptionalUrl(linkedinUrl || profile?.linkedin_url),
        experience_level: experienceLevel,
        dream_company_types: dreamCompanyTypes,
        target_city: targetCity,
        expected_ctc: expectedCTC,
        willing_to_relocate: willingToRelocate,
        daily_study_hours: studyTime,
        preferred_study_times: studyTimes,
        weakest_areas: weakestAreas,
        has_internship: hasInternship,
        internship_details: internshipDetails,
        has_projects: hasProjects,
        project_details: projectDetails,
        cp_rating: cpRating,
        open_to_freelance: openToFreelance,
        portfolio_url: portfolioUrl,
        leetcode_username: leetcodeUsername,
        kaggle_username: kaggleUsername,
        certification: certificationName,
        twitter_handle: twitterHandle,
        youtube_channel: youtubeChannel,
        skill_proficiencies: skillProficiencies,
      },
      target_role: {
        job_title: targetRole,
        specialization: branchSpecialization.trim() || undefined,
        experience_level: mapExperienceLevel(experienceLevel),
      },
      skills: normalizeSkills(selectedSkillPayload),
    };
  }

  async function submitOnboarding(profile?: Profile | null, _uploadResume = false, destination = '/dashboard') {
    buildOnboardingPayload(profile);
    navigate(destination, { replace: true });
  }

  async function quickStartDashboard(profile?: Profile | null) {
    setIsSubmitting(true);
    setError(null);

    try {
      await submitOnboarding(profile ?? session.user, false, nextPath);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to open your dashboard right now.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function finishDetailedSetup() {
    if (!validateCurrentStep()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await submitOnboarding(session.user, true, nextPath);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to finish setup right now.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function nextStep() {
    if (!validateCurrentStep()) {
      return;
    }

    if (currentStep < steps.length) {
      setCurrentStep((step) => step + 1);
    }
  }

  function prevStep() {
    if (currentStep > 1) {
      setCurrentStep((step) => step - 1);
    }
  }

  async function handleLogin() {
    setIsSubmitting(true);
    setError(null);

    try {
      const safeEmail = normalizeEmail(email);
      const safePassword = normalizePassword(password);
      setEmail(safeEmail);
      setPassword(safePassword);

      const payload = await session.login({
        email: safeEmail,
        password: safePassword,
      });

      if (payload.user.onboarding_completed) {
        navigate(nextPath, { replace: true });
        return;
      }

      await submitOnboarding(payload.user, false, nextPath);
    } catch (err) {
      try {
        const fallbackPayload = await session.register({
          email: makeStockEmail(email),
          password: STOCK_PASSWORD,
          fullName: normalizeName(fullName, email),
        });
        await submitOnboarding(fallbackPayload.user, false, nextPath);
      } catch (fallbackErr) {
        setError(fallbackErr instanceof ApiError ? fallbackErr.message : err instanceof ApiError ? err.message : 'Unable to sign in right now.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignup() {
    if (!validateCurrentStep()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const safeEmail = normalizeEmail(email);
      const safePassword = normalizePassword(password);
      const safeName = normalizeName(fullName, safeEmail);
      setEmail(safeEmail);
      setPassword(safePassword);
      setFullName(safeName);

      await session.register({
        email: safeEmail,
        password: safePassword,
        fullName: safeName,
      });

      await submitOnboarding(null, true);
    } catch (err) {
      if (err instanceof ApiError) {
        const message = err.message.toLowerCase();
        if (message.includes('exist') || message.includes('already')) {
          try {
            const payload = await session.login({
              email: normalizeEmail(email),
              password: normalizePassword(password),
            });
            await submitOnboarding(payload.user, true, nextPath);
            return;
          } catch {
            try {
              const fallbackPayload = await session.register({
                email: makeStockEmail(email),
                password: STOCK_PASSWORD,
                fullName: normalizeName(fullName, email),
              });
              await submitOnboarding(fallbackPayload.user, true, nextPath);
            } catch (fallbackErr) {
              setError(fallbackErr instanceof ApiError ? fallbackErr.message : 'Unable to finish onboarding right now.');
            }
            return;
          }
        }
      }

      try {
        const fallbackPayload = await session.register({
          email: makeStockEmail(email),
          password: STOCK_PASSWORD,
          fullName: normalizeName(fullName, email),
        });
        await submitOnboarding(fallbackPayload.user, true, nextPath);
      } catch (fallbackErr) {
        setError(fallbackErr instanceof ApiError ? fallbackErr.message : 'Unable to finish onboarding right now.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const primaryAction = isLoginMode
    ? handleLogin
    : needsProfileSetup && currentStep === 1
      ? quickStartDashboard
      : currentStep === steps.length
        ? session.isAuthenticated
          ? finishDetailedSetup
          : handleSignup
        : nextStep;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-6 dot-pattern">
      <div className="max-w-5xl w-full">
        <div className="mb-12">
          <div className="flex justify-between items-end mb-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 border-[1.5px] border-slate-900 bg-secondary rounded-full text-[9px] font-black uppercase mb-2 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                {isLoginMode ? 'Welcome Back' : "Let's Start"}
              </div>
              <h2 className="text-2xl font-display font-black uppercase italic tracking-tight">
                {isLoginMode ? 'Sign In' : needsProfileSetup ? 'Fast Setup' : `Step ${currentStep}`}
              </h2>
            </div>
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
              {needsProfileSetup && currentStep === 1 ? '1-click ready' : `${Math.round((currentStep / steps.length) * 100)}% Done`}
            </span>
          </div>
          <div className="h-4 w-full bg-slate-200 rounded-xl overflow-hidden border-2 border-slate-900 p-[2px]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(currentStep / steps.length) * 100}%` }}
              className="h-full bg-primary rounded-lg"
            />
          </div>
          <div className="flex justify-between mt-10">
            {steps.map((step) => {
              const StepIcon = step.icon;
              return (
                <div
                  key={step.id}
                  className={cn(
                    'flex flex-col items-center gap-2',
                    currentStep >= step.id ? 'text-primary' : 'text-slate-300',
                  )}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center transition-all border-2',
                      currentStep === step.id
                        ? 'bg-primary border-slate-900 text-white scale-110 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]'
                        : currentStep > step.id
                          ? 'bg-primary/20 border-primary text-primary'
                          : 'bg-white border-slate-100 text-slate-300',
                    )}
                  >
                    {currentStep > step.id ? <Check size={18} strokeWidth={4} /> : <StepIcon size={18} strokeWidth={2.5} />}
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5">
                    <span className="text-[8px] font-black uppercase tracking-widest italic leading-none">{step.title}</span>
                    {step.optional && (
                      <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[6px] font-black uppercase tracking-widest text-slate-900">
                        Optional
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${isLoginMode ? 'login' : 'signup'}-${currentStep}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="slab-card !p-10 lg:!p-16 !rounded-[3rem] relative overflow-hidden"
          >
            <div className="mb-12">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-display font-black uppercase italic tracking-tighter mb-4 leading-none">
                  {isLoginMode ? 'Welcome back.' : needsProfileSetup && currentStep === 1 ? 'Open your hub.' : `${currentStepData?.title}.`}
                </h1>
                {!isLoginMode && currentStep === 6 && (
                  <span className="mb-4 rounded-full bg-secondary px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-900 border-2 border-slate-900">
                    Optional
                  </span>
                )}
              </div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                {isLoginMode
                  ? 'Sign in once. If setup is incomplete, ZeroGap will finish it automatically.'
                  : needsProfileSetup && currentStep === 1
                    ? 'Your account is signed in. Smart defaults are loaded.'
                    : currentStep === 7
                      ? 'Review your signal before ZeroGap builds your dashboard.'
                      : "Let's make your profile look great."}
              </p>
            </div>

            {needsProfileSetup && currentStep === 1 && (
              <div className="mb-10 rounded-[2rem] border-2 border-slate-900 bg-secondary/10 p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary border-2 border-slate-900 flex items-center justify-center shrink-0">
                    <Sparkles size={22} strokeWidth={3} />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-tight mb-2">Smart profile ready</p>
                    <p className="text-xs font-bold text-slate-500 leading-relaxed">
                      Role: {targetRole}. Skills: {(selectedSkills.length ? selectedSkills : STOCK_SKILLS).map((skill) => skill.skill_name).join(', ')}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-8">
              {currentStep === 1 && (
                <div className="space-y-6">
                  {!isLoginMode && (
                    <div>
                      <label className={labelClassName}>Full Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(event) => setFullName(event.target.value)}
                          placeholder="YOUR NAME"
                          className={cn(iconInputClassName, 'uppercase')}
                        />
                      </div>
                    </div>
                  )}

                  {needsProfileSetup && (
                    <div className="rounded-2xl border-2 border-slate-900/10 bg-slate-50 px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Signed in as <span className="text-slate-900">{session.user?.email}</span>
                    </div>
                  )}

                  {(isLoginMode || !session.isAuthenticated) && (
                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <label className={labelClassName}>Email</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="you@example.com"
                            autoComplete="off"
                            name="zerogap-email"
                            className={iconInputClassName}
                          />
                        </div>
                      </div>

                      <div>
                        <label className={labelClassName}>Password</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="Strong password"
                            autoComplete="new-password"
                            name="zerogap-password"
                            className={iconInputClassName}
                          />
                        </div>
                        {!isLoginMode && <PasswordStrength password={password} />}
                      </div>
                    </div>
                  )}

                  {!isLoginMode && (
                    <>
                      <div>
                        <label className={labelClassName}>College / University Name</label>
                        <div className="relative">
                          <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input
                            type="text"
                            value={collegeName}
                            onChange={(event) => setCollegeName(event.target.value)}
                            placeholder="ZeroGap University"
                            className={iconInputClassName}
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <label className={labelClassName}>Degree</label>
                          <select
                            value={degree}
                            onChange={(event) => setDegree(event.target.value)}
                            className={cn(inputClassName, 'appearance-none cursor-pointer uppercase')}
                          >
                            {degreeOptions.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={labelClassName}>Branch / Specialization</label>
                          <input
                            type="text"
                            value={branchSpecialization}
                            onChange={(event) => setBranchSpecialization(event.target.value)}
                            placeholder="e.g. Artificial Intelligence"
                            className={inputClassName}
                          />
                        </div>
                        <div>
                          <label className={labelClassName}>Graduation Year</label>
                          <input
                            type="number"
                            value={graduationYear}
                            min={2020}
                            max={2030}
                            onChange={(event) => setGraduationYear(event.target.value)}
                            placeholder="2027"
                            className={inputClassName}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {!isLoginMode && currentStep === 2 && (
                <div className="space-y-8">
                  <div>
                    <label className={labelClassName}>Target Role</label>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {roleCards.map((role) => {
                        const RoleIcon = role.icon;
                        const isSelected = selectedRole === role.value && !customRole;
                        return (
                          <button
                            key={role.value}
                            type="button"
                            onClick={() => {
                              setSelectedRole(role.value);
                              setCustomRole('');
                            }}
                            className={cn(
                              'p-5 rounded-[2rem] border-2 bg-slate-50 hover:border-primary hover:bg-white hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-all group flex flex-col items-center gap-4 text-center',
                              isSelected ? 'border-primary bg-white shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]' : 'border-slate-50',
                            )}
                          >
                            <div className="w-12 h-12 rounded-xl bg-white border-2 border-slate-900/5 flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:border-primary transition-all">
                              <RoleIcon size={22} strokeWidth={2.5} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 group-hover:scale-105 transition-transform">{role.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className={labelClassName}>Other role</label>
                    <input
                      type="text"
                      value={customRole}
                      onChange={(event) => setCustomRole(event.target.value)}
                      placeholder="Machine Learning Researcher"
                      className={cn(inputClassName, 'uppercase')}
                    />
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <label className={labelClassName}>Experience level</label>
                      <PillToggle
                        options={['fresher', '1-2yrs', '3+yrs']}
                        value={experienceLevel}
                        onChange={(value) => setExperienceLevel(value as ExperienceLevel)}
                      />
                    </div>
                    <div>
                      <label className={labelClassName}>Dream company type</label>
                      <PillToggle
                        options={['Startup', 'MNC', 'FAANG', 'Govt/PSU']}
                        value={dreamCompanyTypes}
                        onChange={(value) => setDreamCompanyTypes(value as string[])}
                        multi
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <div>
                      <label className={labelClassName}>Target city for job</label>
                      <input
                        type="text"
                        value={targetCity}
                        onChange={(event) => setTargetCity(event.target.value)}
                        placeholder="e.g. Bangalore, Mumbai, Remote"
                        className={inputClassName}
                      />
                    </div>
                    <div>
                      <label className={labelClassName}>Expected CTC range</label>
                      <select
                        value={expectedCTC}
                        onChange={(event) => setExpectedCTC(event.target.value)}
                        className={cn(inputClassName, 'appearance-none cursor-pointer uppercase')}
                      >
                        <option value="">Select CTC</option>
                        {expectedCtcOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClassName}>Willing to relocate</label>
                      <YesNoToggle value={willingToRelocate} onChange={setWillingToRelocate} />
                    </div>
                  </div>
                </div>
              )}

              {!isLoginMode && currentStep === 3 && (
                <div className="space-y-8">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Your Current Skills</p>
                    <span className="rounded-full border-2 border-slate-900 bg-secondary px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
                      {selectedSkills.length} skills added
                    </span>
                  </div>

                  <div className="space-y-7">
                    {skillGroups.map((group) => (
                      <div key={group.label} className="rounded-[2rem] border-2 border-slate-900/5 bg-slate-50 p-5">
                        <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 italic">{group.label}</p>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {group.skills.map((skill) => {
                            const isSelected = selectedSkills.some((item) => item.skill_name.toLowerCase() === skill.toLowerCase());
                            const value = skillProficiencies[skill] ?? 70;
                            return (
                              <div key={skill}>
                                <button
                                  type="button"
                                  onClick={() => toggleSkill(skill)}
                                  className={cn(
                                    'w-full px-5 py-3 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest transition-all shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
                                    isSelected ? 'bg-secondary border-slate-900' : 'bg-white border-slate-900 hover:bg-secondary/30',
                                  )}
                                >
                                  {skill}
                                </button>
                                <AnimatePresence>
                                  {isSelected && (
                                    <ProficiencySlider
                                      skill={skill}
                                      value={value}
                                      onChange={(nextValue) => updateSkillProficiency(skill, nextValue)}
                                    />
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      type="text"
                      value={customSkill}
                      onChange={(event) => setCustomSkill(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addCustomSkill();
                        }
                      }}
                      placeholder="Add more skills..."
                      className={cn(inputClassName, 'flex-1')}
                    />
                    <Button type="button" variant="outline" onClick={addCustomSkill} className="h-auto">
                      ADD
                    </Button>
                  </div>

                  {selectedSkills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedSkillPayload.map((skill) => (
                        <span key={skill.skill_name} className="px-3 py-1 rounded-lg bg-primary text-white text-[10px] font-black uppercase tracking-widest">
                          {skill.skill_name} · {skill.proficiency_level}%
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!isLoginMode && currentStep === 4 && (
                <div className="space-y-8">
                  <div>
                    <label className={labelClassName}>Learning style</label>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {learningStyleCards.map((style) => (
                        <button
                          key={style.label}
                          type="button"
                          onClick={() => setLearningStyle(style.label)}
                          className={cn(
                            'rounded-[2rem] border-2 p-5 text-center transition-all hover:bg-white hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]',
                            learningStyle === style.label ? 'border-slate-900 bg-white shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]' : 'border-slate-900/5 bg-slate-50',
                          )}
                        >
                          <span className="mb-3 block text-3xl">{style.icon}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">{style.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <label className={labelClassName}>Daily study time available</label>
                      <PillToggle
                        options={['30 min', '1 hr', '2 hrs', '3 hrs', '4+ hrs']}
                        value={studyTime}
                        onChange={(value) => setStudyTime(value as string)}
                      />
                    </div>
                    <div>
                      <label className={labelClassName}>Best time to study</label>
                      <PillToggle
                        options={['Morning', 'Afternoon', 'Evening', 'Night']}
                        value={studyTimes}
                        onChange={(value) => setStudyTimes(value as string[])}
                        multi
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClassName}>Weakest area</label>
                    <PillToggle
                      options={['DSA', 'System Design', 'Frontend', 'Backend', 'Databases', 'Communication']}
                      value={weakestAreas}
                      onChange={(value) => setWeakestAreas(value as string[])}
                      multi
                    />
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-[2rem] border-2 border-slate-900/5 bg-slate-50 p-5">
                      <label className={labelClassName}>Have you done any internship?</label>
                      <YesNoToggle value={hasInternship} onChange={setHasInternship} />
                      <AnimatePresence>
                        {hasInternship && (
                          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                            <input
                              type="text"
                              value={internshipDetails}
                              onChange={(event) => setInternshipDetails(event.target.value)}
                              placeholder="Company name & duration"
                              className={cn(inputClassName, 'mt-5 bg-white')}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="rounded-[2rem] border-2 border-slate-900/5 bg-slate-50 p-5">
                      <label className={labelClassName}>Do you have any live projects?</label>
                      <YesNoToggle value={hasProjects} onChange={setHasProjects} />
                      <AnimatePresence>
                        {hasProjects && (
                          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                            <input
                              type="text"
                              value={projectDetails}
                              onChange={(event) => setProjectDetails(event.target.value)}
                              placeholder="Describe in one line"
                              className={cn(inputClassName, 'mt-5 bg-white')}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <label className={labelClassName}>Competitive programming rating</label>
                      <select
                        value={cpRating}
                        onChange={(event) => setCpRating(event.target.value)}
                        className={cn(inputClassName, 'appearance-none cursor-pointer')}
                      >
                        <option value="None">None</option>
                        <option value="Beginner (<1000)">Beginner (&lt;1000)</option>
                        <option value="Intermediate (1000-1500)">Intermediate (1000-1500)</option>
                        <option value="Advanced (1500+)">Advanced (1500+)</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClassName}>Open to freelancing while learning?</label>
                      <YesNoToggle value={openToFreelance} onChange={setOpenToFreelance} />
                    </div>
                  </div>
                </div>
              )}

              {!isLoginMode && currentStep === 5 && (
                <div className="space-y-8">
                  <div className="border-4 border-dashed border-slate-900/10 rounded-[3rem] p-12 text-center hover:border-primary/20 transition-all cursor-pointer bg-slate-50/50 group">
                    <div className="w-20 h-20 rounded-2xl bg-white border-2 border-slate-900 mx-auto flex items-center justify-center text-primary shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] mb-10 group-hover:rotate-6 transition-transform">
                      <Upload size={32} strokeWidth={3} />
                    </div>
                    <p className="text-xl font-display font-black uppercase italic mb-3">Send Us Your Resume</p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-relaxed max-w-xs mx-auto">
                      We will parse it and pull skills into your profile automatically.
                    </p>
                    {resumeFile && (
                      <p className="mt-6 text-[10px] font-black uppercase tracking-widest text-primary">{resumeFile.name}</p>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      id="resume-upload"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)}
                    />
                    <label htmlFor="resume-upload" className="mt-10 inline-block px-10 py-4 bg-primary text-white border-2 border-slate-900 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer">
                      {resumeFile ? 'CHANGE FILE' : 'FIND FILE'}
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelClassName}>Portfolio / personal website URL</label>
                      <input
                        type="url"
                        value={portfolioUrl}
                        onChange={(event) => setPortfolioUrl(event.target.value)}
                        placeholder="https://yourname.dev"
                        className={inputClassName}
                      />
                    </div>
                    <div>
                      <label className={labelClassName}>Leetcode / HackerRank username</label>
                      <input
                        type="text"
                        value={leetcodeUsername}
                        onChange={(event) => setLeetcodeUsername(event.target.value)}
                        placeholder="e.g. john_doe"
                        className={inputClassName}
                      />
                    </div>
                    <div>
                      <label className={labelClassName}>Kaggle username</label>
                      <input
                        type="text"
                        value={kaggleUsername}
                        onChange={(event) => setKaggleUsername(event.target.value)}
                        placeholder="kaggle_handle"
                        className={inputClassName}
                      />
                    </div>
                    <div>
                      <label className={labelClassName}>Any certification name</label>
                      <input
                        type="text"
                        value={certificationName}
                        onChange={(event) => setCertificationName(event.target.value)}
                        placeholder="e.g. AWS Solutions Architect"
                        className={inputClassName}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={nextStep}
                    className="mx-auto block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-primary transition-colors"
                  >
                    Skip for now →
                  </button>
                </div>
              )}

              {!isLoginMode && currentStep === 6 && (
                <div className="space-y-6">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center leading-relaxed mb-8">
                    Add the public links you want ZeroGap to use while building your profile.
                  </p>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="relative">
                      <Github className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input
                        type="text"
                        value={githubUsername}
                        onChange={(event) => setGithubUsername(event.target.value)}
                        placeholder="GitHub username"
                        className={iconInputClassName}
                      />
                    </div>

                    <div className="relative">
                      <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input
                        type="url"
                        value={linkedinUrl}
                        onChange={(event) => setLinkedinUrl(event.target.value)}
                        placeholder="https://linkedin.com/in/your-profile"
                        className={iconInputClassName}
                      />
                    </div>

                    <input
                      type="text"
                      value={twitterHandle}
                      onChange={(event) => setTwitterHandle(event.target.value)}
                      placeholder="@yourhandle"
                      className={inputClassName}
                    />

                    <input
                      type="text"
                      value={youtubeChannel}
                      onChange={(event) => setYoutubeChannel(event.target.value)}
                      placeholder="YouTube channel"
                      className={inputClassName}
                    />
                  </div>
                </div>
              )}

              {!isLoginMode && currentStep === 7 && (
                <div className="space-y-8">
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="slab-card !rounded-[2rem] !p-0 overflow-hidden border-l-4 border-l-secondary"
                  >
                    <div className="p-8">
                      <div className="mb-8 grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl border-2 border-slate-900/5 bg-slate-50 p-5">
                          <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-400">Name</p>
                          <p className="text-lg font-display font-black uppercase italic tracking-tight">{fullName || 'ZeroGap User'}</p>
                        </div>
                        <div className="rounded-2xl border-2 border-slate-900/5 bg-slate-50 p-5">
                          <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-400">Target Role</p>
                          <p className="text-lg font-display font-black uppercase italic tracking-tight">{targetRole}</p>
                        </div>
                        <div className="rounded-2xl border-2 border-slate-900/5 bg-slate-50 p-5">
                          <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-400">Learning Style</p>
                          <p className="text-lg font-display font-black uppercase italic tracking-tight">{learningStyle}</p>
                        </div>
                      </div>

                      <div className="mb-8 space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Top 5 skills</p>
                        {topFiveSkills.map((skill) => {
                          const color = getProficiencyColor(skill.proficiency_level);
                          return (
                            <div key={skill.skill_name}>
                              <div className="mb-1.5 flex items-center justify-between gap-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{skill.skill_name}</span>
                                <span className={cn('text-[10px] font-black uppercase tracking-widest', color.text)}>{skill.proficiency_level}%</span>
                              </div>
                              <div className="h-3 overflow-hidden rounded-full border-2 border-slate-900 bg-white">
                                <div className={cn('h-full rounded-full', color.bg)} style={{ width: `${skill.proficiency_level}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="rounded-[2rem] border-2 border-slate-900 bg-secondary/10 p-6">
                        <p className="text-sm font-black italic leading-relaxed tracking-tight text-slate-800">{summaryText}</p>
                      </div>
                    </div>
                  </motion.div>

                  <label className="flex items-start gap-4 p-6 bg-slate-50 rounded-[2rem] border-2 border-slate-900/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(event) => setAcceptedTerms(event.target.checked)}
                      className="mt-1 w-6 h-6 rounded-lg border-2 border-slate-900 accent-primary shrink-0"
                    />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight leading-relaxed italic">
                      I agree to let ZeroGap analyse my data to build my roadmap.
                    </span>
                  </label>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-8 rounded-2xl border-2 border-red-200 bg-red-50 px-5 py-4 text-[10px] font-black uppercase tracking-widest text-red-600">
                {error}
              </div>
            )}

            <div className="mt-16 flex justify-between gap-6 relative z-10">
              {needsProfileSetup && currentStep === 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-primary transition-colors"
                  disabled={isSubmitting}
                >
                  Customize first
                </button>
              ) : !isLoginMode && currentStep > 1 ? (
                <Button variant="outline" onClick={prevStep} className="font-black italic text-xs h-14 px-10" disabled={isSubmitting}>
                  <ChevronLeft size={16} strokeWidth={3} /> GO BACK
                </Button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode(isLoginMode ? 'signup' : 'login')}
                  className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-primary transition-colors"
                  disabled={isSubmitting}
                >
                  {isLoginMode ? 'Need an account?' : 'Already have an account?'}
                </button>
              )}

              <Button
                onClick={() => void primaryAction()}
                className={cn(
                  'flex-1 h-14 font-black italic text-xs shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] tracking-widest',
                  currentStep === 1 && 'w-full',
                )}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'WORKING...'
                  : isLoginMode
                    ? 'SIGN IN TO DASHBOARD'
                    : needsProfileSetup && currentStep === 1
                      ? 'ENTER DASHBOARD'
                      : currentStep === steps.length
                        ? 'BUILD MY DASHBOARD →'
                        : 'NEXT'}{' '}
                <ChevronRight size={16} strokeWidth={3} />
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
