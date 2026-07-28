import type { GeneratedProject, Profile, ProfileBundle, Roadmap, UserXp } from './backend';
import { KAVYA_BUNDLE } from './prototypeData';
import { VINEET_BUNDLE, VINEET_PROFILE } from './vineetData';

export const STOCK_PASSWORD = import.meta.env.VITE_STOCK_PASSWORD || 'ZeroGap123!';

export const STOCK_SKILLS = [
  { skill_name: 'React', proficiency_level: 65 },
  { skill_name: 'JavaScript', proficiency_level: 70 },
  { skill_name: 'TypeScript', proficiency_level: 55 },
];

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function makeStockEmail(value = 'zerogap') {
  const slug = value
    .toLowerCase()
    .replace(/@.*/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24) || 'zerogap-user';
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${slug}-${Date.now()}-${suffix}@example.com`;
}

export function normalizeEmail(value: string, uniqueFallback = true) {
  const email = value.trim().toLowerCase();
  if (isValidEmail(email)) {
    return email;
  }
  return uniqueFallback ? makeStockEmail(email) : 'zerogap-user@example.com';
}

export function normalizePassword(value: string) {
  return value.trim().length >= 8 ? value : STOCK_PASSWORD;
}

export function normalizeName(value?: string | null, email?: string) {
  const name = value?.trim();
  if (name && name.length >= 2) {
    return name;
  }
  const fromEmail = email?.split('@')[0]?.replace(/[-_.]+/g, ' ').trim();
  return fromEmail && fromEmail.length >= 2 ? fromEmail : 'ZeroGap User';
}

export function normalizeRole(value?: string | null) {
  const role = value?.trim();
  return role && role.length >= 2 ? role : 'Full Stack Developer';
}

export function normalizeInt(value: string | number | null | undefined, fallback: number, min = 0, max = 9999) {
  const next = Number(value);
  if (!Number.isFinite(next)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(next)));
}

export function normalizeOptionalUrl(value?: string | null) {
  const raw = value?.trim();
  if (!raw) {
    return undefined;
  }
  const candidate = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
  try {
    const parsed = new URL(candidate);
    return parsed.hostname.includes('.') ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function normalizeGithubUsername(value?: string | null) {
  return value?.trim().replace(/^@/, '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 39) || undefined;
}

export function normalizeSkills(skills: Array<{ skill_name: string; proficiency_level: number }>) {
  const seen = new Set<string>();
  const normalized = skills
    .map((skill) => ({
      skill_name: normalizeRole(skill.skill_name),
      proficiency_level: normalizeInt(skill.proficiency_level, 60, 0, 100),
    }))
    .filter((skill) => {
      const key = skill.skill_name.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

  return normalized.length ? normalized : STOCK_SKILLS;
}

export function stockXp(): UserXp {
  return {
    id: 'stock-xp',
    user_id: 'stock-user',
    total_xp: 120,
    current_level: 1,
    current_streak_days: 1,
    longest_streak_days: 1,
    last_active_date: new Date().toISOString().slice(0, 10),
    updated_at: new Date().toISOString(),
  };
}

export function stockProfileBundle(_profile?: Profile | null): ProfileBundle {
  if (_profile?.id === VINEET_PROFILE.id) return VINEET_BUNDLE;
  return KAVYA_BUNDLE;
}

export function stockProject(role = 'Full Stack Developer', difficulty = 'intermediate', index = 1): GeneratedProject {
  return {
    id: `stock-project-${difficulty}-${index}`,
    user_id: 'stock-user',
    project_title: `${role} Proof Project ${index}`,
    description: 'A polished portfolio project using stock ZeroGap defaults so the builder always has something useful to open.',
    tech_stack: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    skills_practiced: ['API design', 'UI polish', 'Deployment'],
    difficulty_level: difficulty,
    starter_code_url: null,
    github_template_url: null,
    step_by_step_guide: [
      'Create the app shell',
      'Build the primary dashboard',
      'Add mock data states',
      'Connect an API route',
      'Store one record',
      'Add empty and loading states',
      'Polish mobile layout',
      'Deploy the project',
    ],
    is_github_ready: true,
    created_at: new Date().toISOString(),
  };
}

export function stockRoadmap(role = 'Full Stack Developer'): Roadmap {
  const now = new Date().toISOString();
  const stages = [
    {
      title: 'React fundamentals sprint',
      description: 'Use the stock ZeroGap path to refresh UI, state, and reusable components.',
      skills: ['React', 'Components', 'State'],
      task: 'Build one polished dashboard section',
    },
    {
      title: 'Backend proof sprint',
      description: 'Practice APIs, data models, auth, and deployment with one complete feature.',
      skills: ['Node.js', 'APIs', 'PostgreSQL'],
      task: 'Create and deploy one backend endpoint',
    },
    {
      title: 'Portfolio proof sprint',
      description: 'Package your project into a recruiter-ready proof with screenshots and README.',
      skills: ['GitHub', 'README', 'Deployment'],
      task: 'Publish a live portfolio demo',
    },
  ];

  return {
    id: 'stock-roadmap',
    user_id: 'stock-user',
    target_role_id: 'stock-role',
    title: `${role} Job-Ready Roadmap`,
    total_stages: stages.length,
    estimated_weeks: 8,
    is_active: true,
    completion_percentage: 0,
    generated_by_ai: false,
    created_at: now,
    updated_at: now,
    stages: stages.map((stage, index) => ({
      id: `stock-stage-${index + 1}`,
      roadmap_id: 'stock-roadmap',
      stage_number: index + 1,
      title: stage.title,
      description: stage.description,
      skills_to_learn: stage.skills,
      resources: [],
      projects: [],
      estimated_weeks: index === 0 ? 2 : 3,
      is_completed: false,
      completion_percentage: index === 0 ? 20 : 0,
      order_index: index + 1,
      tasks: [
        {
          id: `stock-task-${index + 1}`,
          stage_id: `stock-stage-${index + 1}`,
          user_id: 'stock-user',
          title: stage.task,
          description: stage.description,
          task_type: index === 0 ? 'learn' : index === 1 ? 'build' : 'apply',
          resource_url: null,
          estimated_hours: 4,
          is_completed: false,
          completed_at: null,
          proof_url: null,
          xp_reward: 50,
          created_at: now,
        },
      ],
    })),
  };
}

export function normalizeProject(project: Partial<GeneratedProject> & { title?: string; focus?: string }, role: string, index: number): GeneratedProject {
  const fallback = stockProject(role, project.difficulty_level ?? project.focus ?? 'intermediate', index);
  return {
    ...fallback,
    ...project,
    id: project.id ?? fallback.id,
    project_title: project.project_title ?? project.title ?? fallback.project_title,
    description: project.description ?? fallback.description,
    tech_stack: project.tech_stack?.length ? project.tech_stack : fallback.tech_stack,
    skills_practiced: project.skills_practiced?.length ? project.skills_practiced : fallback.skills_practiced,
    step_by_step_guide: project.step_by_step_guide?.length ? project.step_by_step_guide : fallback.step_by_step_guide,
    is_github_ready: project.is_github_ready ?? true,
    created_at: project.created_at ?? fallback.created_at,
  };
}

export { KAVYA_BUNDLE };
