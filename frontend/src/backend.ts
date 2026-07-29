export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, '');

export interface ApiMeta {
  timestamp: string;
  version: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
  error: string | null;
  meta: ApiMeta;
}

export interface BackendSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role: 'student' | 'college' | 'recruiter' | 'mentor' | 'parent' | 'admin';
  college_name: string | null;
  degree: string | null;
  graduation_year: number | null;
  location: string | null;
  bio: string | null;
  learning_style: string | null;
  time_availability_hours: number;
  github_username: string | null;
  linkedin_url: string | null;
  github_access_token: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface TargetRole {
  id: string;
  user_id: string;
  job_title: string;
  specialization: string | null;
  experience_level: 'fresher' | 'junior' | 'mid' | 'senior';
  is_active: boolean;
  created_at: string;
}

export interface UserSkill {
  id: string;
  user_id: string;
  skill_name: string;
  proficiency_level: number;
  verified: boolean;
  proof_type: 'github' | 'certificate' | 'project' | 'self_declared';
  proof_url: string | null;
  last_updated: string;
}

export interface Certificate {
  id: string;
  title: string;
  issuer: string | null;
  credential_url: string | null;
}

export interface GithubProof {
  id: string;
  repo_name: string;
  repo_url: string;
  quality_score: number | null;
  skills_detected: string[] | null;
}

export interface UserXp {
  id: string;
  user_id: string;
  total_xp: number;
  current_level: number;
  current_streak_days: number;
  longest_streak_days: number;
  last_active_date: string;
  updated_at: string;
}

export interface ProfileBundle {
  profile: Profile;
  target_roles: TargetRole[];
  skills: UserSkill[];
  certificates: Certificate[];
  github_proofs: GithubProof[];
  xp: UserXp | null;
}

export interface AuthPayload {
  user: Profile;
  session: BackendSession;
}

export interface ScoreBreakdown {
  skillsMatchPercentage: number;
  projectQualityScore: number;
  activityConsistencyScore: number;
  finalScore: number;
}

export interface SkillGapAnalysis {
  id: string;
  user_id: string;
  target_role_id: string;
  skill_score: number;
  matched_skills: string[];
  missing_skills: string[];
  partial_skills: string[];
  skills_match_percentage: number;
  project_quality_score: number;
  activity_consistency_score: number;
  analysis_data: Record<string, unknown>;
  created_at: string;
}

export interface RoadmapTask {
  id: string;
  stage_id: string;
  user_id: string;
  title: string;
  description: string;
  task_type: 'learn' | 'build' | 'practice' | 'certify' | 'apply';
  resource_url: string | null;
  estimated_hours: number | null;
  is_completed: boolean;
  completed_at: string | null;
  proof_url: string | null;
  xp_reward: number;
  created_at: string;
}

export interface RoadmapStage {
  id: string;
  roadmap_id: string;
  stage_number: number;
  title: string;
  description: string;
  skills_to_learn: string[];
  resources: Array<{
    name: string;
    url: string;
    type: 'video' | 'article' | 'course' | 'book';
    platform: string;
    is_free: boolean;
  }>;
  projects: Array<{
    name: string;
    description: string;
    skills_practiced: string[];
    difficulty: string;
    github_template_url?: string;
  }>;
  estimated_weeks: number | null;
  is_completed: boolean;
  completion_percentage: number;
  order_index: number | null;
  tasks: RoadmapTask[];
}

export interface Roadmap {
  id: string;
  user_id: string;
  target_role_id: string;
  title: string;
  total_stages: number;
  estimated_weeks: number | null;
  is_active: boolean;
  completion_percentage: number;
  generated_by_ai: boolean;
  created_at: string;
  updated_at: string;
  stages: RoadmapStage[];
}

export interface RoadmapProgress {
  roadmap_id: string;
  completion_percentage: number;
  completed_stages: number;
  total_stages: number;
  completed_tasks: number;
  total_tasks: number;
}

export interface JobListing {
  id: string;
  title: string;
  source: string | null;
  company: string | null;
  location: string | null;
  apply_url: string | null;
  is_active: boolean;
  posted_at: string | null;
  fetched_at: string;
  description: string | null;
  external_id: string | null;
  salary_range: string | null;
  salary_lpa_min: number | null;
  salary_lpa_max: number | null;
  skills_required: string[];
  job_type: string | null;
  experience_required: string | null;
  is_remote: boolean;
  company_logo: string | null;
  qualifications: string | null;
  highlights: {
    Responsibilities?: string[];
    Qualifications?: string[];
    Benefits?: string[];
  } | null;
}

export interface JobMatch {
  id: string;
  user_id: string;
  job_listing_id: string;
  fit_percentage: number;
  missing_skills: string[];
  next_steps: string[];
  match_reason: string;
  saved: boolean;
  applied: boolean;
  created_at: string;
  job_listings: JobListing;
}

export interface TrackerLog {
  id: string;
  task_id: string | null;
  action: string;
  time_spent_minutes: number;
  output_description: string | null;
  proof_url: string | null;
  date: string;
  xp_earned: number;
  created_at: string;
}

export interface ConsistencyData {
  active_days: number;
  consistency_score: number;
  graph: Array<{ date: string }>;
}

export interface BenchmarkData {
  id: string;
  user_id: string;
  target_role: string;
  college_name: string | null;
  college_percentile: number;
  branch_percentile: number;
  national_percentile: number;
  avg_college_score: number;
  avg_national_score: number;
  ranking_data: {
    total_role_users?: number;
    total_college_users?: number;
  };
  calculated_at: string;
}

export interface GeneratedProject {
  id: string;
  user_id: string;
  project_title: string;
  description: string | null;
  tech_stack: string[];
  skills_practiced: string[];
  difficulty_level: string | null;
  starter_code_url: string | null;
  github_template_url: string | null;
  step_by_step_guide: string[];
  is_github_ready: boolean;
  created_at: string;
}

export interface RiskPrediction {
  id: string;
  user_id: string;
  risk_level: 'low' | 'medium' | 'high';
  ready_in_months: number;
  risk_factors: string[];
  action_suggestions: string[];
  success_probability: number;
  predicted_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string | null;
  context_type: string;
  created_at: string;
  last_message_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  token_count: number | null;
  created_at: string;
}

export interface ResumeRecord {
  id: string;
  user_id: string;
  target_role_id: string | null;
  content_json: any;
  ats_score: number | null;
  keyword_match_score: number | null;
  pdf_url: string | null;
  version: number;
  is_latest: boolean;
  created_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string | null;
  badge_icon: string | null;
  xp_reward: number;
  condition_type: string | null;
  condition_value: Record<string, unknown>;
  earned: boolean;
}

export interface CollegeDashboardData {
  college_name?: string;
  avg_skill_score?: number;
  placement_readiness_percentage?: number;
  top_performing_domains?: string[];
  training_recommendations?: string[];
  total_students?: number;
  job_ready_students?: number;
}

export interface CollegeStudent {
  id?: string;
  full_name?: string;
  email?: string;
  score?: number;
  readiness?: number;
  target_role?: string;
  status?: string;
}

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 500, code = 'API_ERROR') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  token?: string | null;
  body?: unknown;
  headers?: HeadersInit;
}

async function unwrapResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const payload = text ? JSON.parse(text) as ApiResponse<T> : null;

  if (!payload || !response.ok || !payload.success) {
    throw new ApiError(
      payload?.message ?? payload?.error ?? `Request failed with status ${response.status}`,
      response.status,
      payload?.error ?? 'REQUEST_FAILED',
    );
  }

  return payload.data as T;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}) {
  const headers = new Headers(options.headers ?? {});

  if (!headers.has('Content-Type') && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  return unwrapResponse<T>(response);
}

export async function uploadRequest<T>(path: string, token: string, formData: FormData) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return unwrapResponse<T>(response);
}

export function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function formatRelativeDate(value?: string | null) {
  if (!value) {
    return 'Recently updated';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Recently updated';
  }

  const diff = Date.now() - date.getTime();
  const hours = Math.max(1, Math.floor(diff / (1000 * 60 * 60)));

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days}d ago`;
  }

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
