import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { aiRateLimiter } from '../../middleware/rateLimit.middleware.js';
import type { AuthenticatedRequest } from '../../types/index.js';
import { sendSuccess } from '../../utils/api.util.js';
import { supabaseAdmin } from '../../config/supabase.js';
import { ResumeService } from './resume.service.js';
import { enqueueResumePdf } from '../../queues/resumeGeneration.queue.js';

export const resumeRouter = Router();

resumeRouter.post('/resume/generate', requireAuth, aiRateLimiter, async (req: AuthenticatedRequest, res, next) => {
  try {
    const resume = await ResumeService.generate(req.user!.id);
    await enqueueResumePdf(req.user!.id, resume.id);
    sendSuccess(res, resume, 'Resume generated', 201);
  } catch (error) {
    next(error);
  }
});

resumeRouter.get('/resume/latest', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    sendSuccess(res, await ResumeService.latest(req.user!.id), 'Latest resume fetched');
  } catch (error) {
    next(error);
  }
});

resumeRouter.get('/resume/ats-score', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const latest = await ResumeService.latest(req.user!.id);
    sendSuccess(res, latest ? { ats_score: latest.ats_score, keyword_match_score: latest.keyword_match_score } : null, 'ATS score fetched');
  } catch (error) {
    next(error);
  }
});

resumeRouter.get('/resume/score-breakdown', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const latest = await ResumeService.getLatest(req.user!.id);
    if (!latest) {
      sendSuccess(res, null, 'No resume');
      return;
    }

    const content = latest.content_json;
    const breakdown = {
      summary_score: content?.summary?.length > 100 ? 95 : 60,
      skills_score: (content?.skills?.technical?.length ?? 0) >= 8 ? 100 : 70,
      projects_score: (content?.projects?.length ?? 0) >= 3 ? 95 : 50,
      experience_score: (content?.experience?.length ?? 0) >= 1 ? 90 : 45,
      certifications_score: (content?.certifications?.length ?? 0) >= 2 ? 100 : 60,
      achievements_score: (content?.achievements?.length ?? 0) >= 4 ? 95 : 55,
      ats_keywords_found: content?.ats_keywords_injected ?? [],
      page_count: (content?.projects?.length ?? 0) > 2 ? 2 : 1,
      suggestions: [] as string[],
    };

    if (breakdown.projects_score < 90) breakdown.suggestions.push('Add more projects to fill Page 2');
    if (breakdown.certifications_score < 90) breakdown.suggestions.push('Complete a certification from LearnPath to boost ATS score');
    if (!content?.basics?.github) breakdown.suggestions.push('Connect your GitHub profile for auto-project import');

    sendSuccess(res, breakdown, 'Score breakdown');
  } catch (error) {
    next(error);
  }
});

resumeRouter.post('/resume/compare-job/:jobId', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const [latest, job] = await Promise.all([
      ResumeService.getLatest(req.user!.id),
      supabaseAdmin.from('job_listings').select('*').eq('id', req.params.jobId).maybeSingle(),
    ]);

    if (!latest || !job.data) {
      sendSuccess(res, null, 'Not found');
      return;
    }

    const resumeSkills = new Set([
      ...(latest.content_json?.skills?.technical ?? []),
      ...(latest.content_json?.skills?.tools ?? []),
      ...(latest.content_json?.skills?.databases ?? []),
    ].map((skill: string) => skill.toLowerCase()));
    const jobSkills = (job.data.skills_required ?? []) as string[];
    const matched = jobSkills.filter((skill) => resumeSkills.has(skill.toLowerCase()));
    const missing = jobSkills.filter((skill) => !resumeSkills.has(skill.toLowerCase()));
    const fitPercentage = Math.round((matched.length / Math.max(jobSkills.length, 1)) * 100);

    sendSuccess(res, {
      matched,
      missing,
      fit_percentage: fitPercentage,
      job_title: job.data.title,
    }, 'Comparison done');
  } catch (error) {
    next(error);
  }
});

resumeRouter.get('/resume/:id', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    sendSuccess(res, await ResumeService.getById(req.user!.id, String(req.params.id)), 'Resume fetched');
  } catch (error) {
    next(error);
  }
});

resumeRouter.post('/resume/:id/export-pdf', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    sendSuccess(res, await ResumeService.exportPdf(req.user!.id, String(req.params.id)), 'Resume PDF exported');
  } catch (error) {
    next(error);
  }
});
