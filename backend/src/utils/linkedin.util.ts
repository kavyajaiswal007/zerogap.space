import { getClaudeJson } from './claude.util.js';

export interface LinkedInProfile {
  name: string;
  headline: string;
  location: string;
  about: string;
  currentRole: string;
  currentCompany: string;
  experience: Array<{
    title: string; company: string; duration: string;
    description: string; startDate: string; endDate: string;
  }>;
  education: Array<{ institution: string; degree: string; field: string; year: string }>;
  skills: string[];
  certifications: Array<{ name: string; issuer: string; date: string }>;
  languages: string[];
  profileImageUrl: string;
}

interface LinkedInEnrichment {
  predictedSkills: Array<{ skill_name: string; proficiency_level: number }>;
  predictedGaps: string[];
  suggestedRoadmap: string;
  careerSummary: string;
  predictedSalaryRange: string;
  topJobTitles: string[];
  relevantCertifications: string[];
  suggestedPlaylists: Array<{
    title: string;
    channel: string;
    url: string;
    reason: string;
  }>;
  relevantJobs: Array<{
    title: string;
    company: string;
    location: string;
    salaryRange: string;
    matchReason: string;
    applyUrl: string;
    skills: string[];
  }>;
}

export async function scrapeLinkedInPublicProfile(
  _url: string
): Promise<LinkedInProfile | null> {
  return null;
}

export async function enrichProfileWithAI(
  profile: Partial<LinkedInProfile>,
  targetRole: string
): Promise<LinkedInEnrichment> {
  return getClaudeJson(
    'You enrich student career profiles for ZeroGap.',
    `Enrich this profile for a ${targetRole} candidate: ${JSON.stringify(profile)}`,
    {
      predictedSkills: [],
      predictedGaps: [],
      suggestedRoadmap: '',
      careerSummary: '',
      predictedSalaryRange: '₹4-8 LPA',
      topJobTitles: [],
      relevantCertifications: [],
      suggestedPlaylists: [],
      relevantJobs: [],
    }
  );
}
