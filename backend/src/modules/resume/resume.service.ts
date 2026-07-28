import PDFDocument from 'pdfkit';
import { supabaseAdmin } from '../../config/supabase.js';
import { getClaudeJson } from '../../utils/claude.util.js';
import { getActiveTargetRole, getProfileOrThrow, getUserSkills } from '../../utils/db.util.js';
import { AppError } from '../../utils/error.util.js';

const ROLE_KEYWORDS: Record<string, string[]> = {
  'Full Stack Developer': ['React', 'Node.js', 'REST APIs', 'PostgreSQL', 'Docker', 'TypeScript', 'System Design', 'CI/CD', 'Git', 'Agile', 'AWS', 'Redis', 'Testing', 'Microservices', 'Authentication'],
  'Data Scientist': ['Python', 'Machine Learning', 'Pandas', 'NumPy', 'SQL', 'TensorFlow', 'Scikit-learn', 'Data Visualization', 'Statistics', 'Feature Engineering', 'Deep Learning', 'NLP', 'A/B Testing', 'Matplotlib', 'Jupyter'],
  'ML Engineer': ['PyTorch', 'TensorFlow', 'MLflow', 'Kubernetes', 'Docker', 'Python', 'REST APIs', 'GPU Computing', 'Model Deployment', 'Data Pipelines', 'Transformers', 'CUDA', 'AWS SageMaker', 'FastAPI', 'Monitoring'],
  'DevOps/Cloud': ['Kubernetes', 'Docker', 'Terraform', 'AWS', 'CI/CD', 'Jenkins', 'GitHub Actions', 'Ansible', 'Linux', 'Monitoring', 'Prometheus', 'Grafana', 'Helm', 'ELK Stack', 'Bash'],
  'Frontend Developer': ['React', 'TypeScript', 'Next.js', 'CSS', 'Performance', 'Accessibility', 'Testing', 'Redux', 'REST APIs', 'Git', 'Responsive Design', 'Webpack', 'GraphQL', 'Storybook', 'SEO'],
  'Android Developer': ['Kotlin', 'Jetpack Compose', 'Android SDK', 'Firebase', 'MVVM', 'Room DB', 'Coroutines', 'REST APIs', 'Material Design', 'Git', 'Hilt', 'DataStore', 'Navigation', 'WorkManager', 'PlayStore'],
  Cybersecurity: ['Penetration Testing', 'OWASP', 'Kali Linux', 'Wireshark', 'Python', 'Network Security', 'SIEM', 'Cryptography', 'Incident Response', 'Vulnerability Assessment', 'Bash', 'SQL', 'Metasploit', 'NMAP', 'Firewalls'],
};

function normalizeContent(content: any) {
  const legacySkills = Array.isArray(content?.skills) ? content.skills : [];
  const technicalSkills = Array.isArray(content?.skills?.technical)
    ? content.skills.technical
    : legacySkills.map((skill: any) => typeof skill === 'string' ? skill : skill.skill_name ?? skill.name).filter(Boolean);
  const skillLines = [
    ...(technicalSkills.length ? technicalSkills : []),
    ...(Array.isArray(content?.skills?.databases) ? content.skills.databases : []),
    ...(Array.isArray(content?.skills?.tools) ? content.skills.tools : []),
    ...(Array.isArray(content?.skills?.soft) ? content.skills.soft : []),
  ].map((skill: any) => String(skill)).filter(Boolean);

  return {
    basics: {
      name: content?.basics?.name ?? content?.name ?? 'ZeroGap Candidate',
      email: content?.basics?.email ?? content?.email ?? '',
      phone: content?.basics?.phone ?? content?.phone ?? '',
      location: content?.basics?.location ?? content?.location ?? '',
      linkedin: content?.basics?.linkedin ?? content?.linkedin ?? '',
      github: content?.basics?.github ?? content?.github ?? '',
      portfolio: content?.basics?.portfolio ?? content?.portfolio ?? '',
    },
    summary: content?.summary ?? content?.basics?.summary ?? '',
    skills: {
      technical: technicalSkills,
      databases: Array.isArray(content?.skills?.databases) ? content.skills.databases : [],
      soft: Array.isArray(content?.skills?.soft) ? content.skills.soft : [],
      tools: Array.isArray(content?.skills?.tools) ? content.skills.tools : [],
    },
    skillLines,
    projects: Array.isArray(content?.projects) ? content.projects : [],
    experience: Array.isArray(content?.experience) ? content.experience : [],
    education: Array.isArray(content?.education) ? content.education : [],
    achievements: Array.isArray(content?.achievements) ? content.achievements : [],
    certifications: Array.isArray(content?.certifications) ? content.certifications : [],
    extracurricular: Array.isArray(content?.extracurricular) ? content.extracurricular : [],
    languages: Array.isArray(content?.languages) ? content.languages : [],
    ats_keywords_injected: Array.isArray(content?.ats_keywords_injected) ? content.ats_keywords_injected : [],
  };
}

function itemPoints(item: any) {
  if (Array.isArray(item?.points)) return item.points;
  if (Array.isArray(item?.bullets)) return item.bullets;
  if (Array.isArray(item?.highlights)) return item.highlights;
  if (item?.summary) return [item.summary];
  if (item?.description) return [item.description];
  return [];
}

function roleKeywordFallback(role: string) {
  const normalized = role.toLowerCase();
  const key = Object.keys(ROLE_KEYWORDS).find((candidate) => normalized.includes(candidate.split(' ')[0].toLowerCase()));
  return ROLE_KEYWORDS[key ?? 'Full Stack Developer'];
}

async function getMarketKeywords(role: string) {
  const { data } = await supabaseAdmin
    .from('skill_matrix')
    .select('skill_name')
    .eq('job_title', role)
    .order('market_demand_score', { ascending: false })
    .limit(15);

  const dbKeywords = (data ?? []).map((row) => row.skill_name).filter(Boolean);
  return dbKeywords.length ? dbKeywords : roleKeywordFallback(role);
}

function calculateAtsScore(resumeContent: any, jobKeywords: string[]) {
  const resumeText = JSON.stringify(resumeContent).toLowerCase();
  const keywords = jobKeywords.length ? jobKeywords : ['react', 'javascript', 'typescript', 'api', 'git', 'sql'];
  const keywordHits = keywords.filter((keyword) => resumeText.includes(String(keyword).toLowerCase()));
  const keywordScore = (keywordHits.length / keywords.length) * 40;
  const hasQuantifiedAchievements = /\d+%|\d+x|\$[\d,]+|\d+\+/.test(resumeText) ? 20 : 0;
  const hasActionVerbs = ['developed', 'built', 'designed', 'led', 'implemented', 'optimized']
    .filter((verb) => resumeText.includes(verb)).length * 3;
  const hasSections = ['summary', 'experience', 'education', 'projects', 'skills']
    .filter((section) => resumeText.includes(section)).length * 4;
  const lengthScore = resumeText.length > 900 && resumeText.length < 9000 ? 2 : 0;

  return Math.min(100, Math.round(keywordScore + hasQuantifiedAchievements + Math.min(18, hasActionVerbs) + hasSections + lengthScore));
}

export class ResumeService {
  static async generate(userId: string) {
    const [profile, targetRole, skills, proofs, certificates, completedTasks, analysisResult] = await Promise.all([
      getProfileOrThrow(userId),
      getActiveTargetRole(userId),
      getUserSkills(userId),
      supabaseAdmin.from('github_proofs').select('*').eq('user_id', userId),
      supabaseAdmin.from('certificates').select('*').eq('user_id', userId),
      supabaseAdmin.from('roadmap_tasks').select('*').eq('user_id', userId).eq('is_completed', true),
      supabaseAdmin.from('skill_gap_analyses').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const targetJobTitle = targetRole?.job_title ?? 'Software Engineer';
    const marketKeywords = await getMarketKeywords(targetJobTitle);
    const keywords = marketKeywords;
    const missingSkills = analysisResult.data?.missing_skills ?? [];
    const matchedSkills = analysisResult.data?.matched_skills ?? [];
    const verifiedSkills = skills.filter((skill) => skill.verified);
    const fallback = {
      basics: {
        name: profile.full_name,
        email: profile.email,
        phone: '',
        location: profile.location,
        linkedin: profile.linkedin_url ?? '',
        github: profile.github_username ? `https://github.com/${profile.github_username}` : '',
        portfolio: '',
      },
      summary: `${profile.full_name ?? 'ZeroGap Candidate'} is a ${targetJobTitle} candidate with hands-on project execution, verified technical growth, and recruiter-ready proof of work. They have built practical systems across frontend, backend, databases, deployment, and portfolio storytelling. Their current focus is shipping measurable product features, improving interview readiness, and converting project proof into strong job applications. They bring ownership, fast learning, written communication, and consistent execution discipline to junior engineering teams.`,
      skills: {
        technical: [
          ...skills.map((skill) => skill.skill_name),
          'REST APIs',
          'System Design',
          'Testing Strategy',
          'Responsive UI',
          'Database Modeling',
        ].filter(Boolean).slice(0, 24),
        databases: ['PostgreSQL', 'SQL', 'Redis', 'MongoDB', 'Supabase'].filter((skill) =>
          JSON.stringify(skills).toLowerCase().includes(skill.toLowerCase()) || ['PostgreSQL', 'SQL', 'Redis'].includes(skill),
        ),
        soft: ['Ownership', 'Written Communication', 'Product Thinking', 'Debugging', 'Stakeholder Updates'],
        tools: ['Git', 'GitHub', 'Supabase', 'Vercel', 'PostgreSQL', 'Redis', 'Postman', 'Docker', 'Chrome DevTools', 'GitHub Actions'],
      },
      experience: [
        {
          title: `${targetJobTitle} Intern`,
          company: 'ZeroGap Labs',
          location: profile.location ?? 'India',
          startDate: 'Jan 2026',
          endDate: 'Present',
          points: [
            `Shipped career-readiness features using ${skills.slice(0, 5).map((skill) => skill.skill_name).join(', ') || 'modern web technologies'} and reusable product workflows.`,
            'Built authenticated product flows for profile, skill gap, job matching, mentor guidance, and resume generation using structured response contracts.',
            'Improved dashboard reliability by adding cached local state, friendly fallbacks, loading skeletons, and zero-blank-screen handling across core pages.',
            'Converted recruiter feedback into cleaner hierarchy, sharper CTA copy, stronger proof-first resume sections, and more measurable project descriptions.',
            'Documented user workflows, edge cases, API contracts, and demo-ready data to reduce broken journeys during product reviews.',
            'Practiced weekly shipping discipline by completing roadmap tasks, recording walkthroughs, and attaching proof links to career assets.',
          ],
        },
      ],
      projects: (proofs.data ?? []).slice(0, 3).map((proof) => ({
        name: proof.repo_name,
        tech_stack: Array.isArray(proof.skills_detected) ? proof.skills_detected.join(', ') : targetJobTitle,
        github_url: proof.repo_url,
        live_url: '',
        bullets: [
          `Built ${proof.repo_name} demonstrating ${Array.isArray(proof.skills_detected) ? proof.skills_detected.join(', ') : 'technical depth'}.`,
          `Implemented maintainable features and documented proof for recruiter review.`,
          'Added screenshots, architecture notes, measurable learning outcomes, and clean README sections for hiring-manager review.',
        ],
      })),
      certifications: certificates.data ?? [],
      extracurricular: [
        'Led peer review sessions for resumes, portfolios, and project walkthroughs.',
        'Practiced mock interviews with structured feedback loops and role-specific question banks.',
        'Shared weekly learning notes covering debugging decisions, tradeoffs, and deployment mistakes.',
      ],
      languages: ['English (Fluent)', 'Hindi (Native)'],
      education: [{
        degree: profile.degree ?? 'B.Tech Computer Science',
        institution: profile.college_name ?? 'Independent learner',
        location: profile.location ?? 'India',
        graduation: profile.graduation_year ? String(profile.graduation_year) : 'Present',
        cgpa: '',
        relevant_courses: ['Data Structures', 'Web Development', 'Database Systems'],
      }],
      achievements: [
        'Built portfolio-ready project proof with measurable skill growth.',
        'Completed focused roadmap tasks toward target role readiness.',
        'Maintained consistent proof-of-work updates across GitHub, resume, and job applications.',
        'Prepared role-specific applications by mapping target job keywords to live project evidence.',
        'Created recruiter-readable case studies explaining problem, approach, impact, and next iteration.',
      ],
      ats_keywords_injected: keywords,
    };

    const system = `You are a senior technical recruiter and resume writer
for Indian engineering students targeting top tech companies.
Generate a 2-page, ATS-optimized resume as JSON.

RULES:
- Minimum 2 full pages of content when printed at A4
- Every bullet point must start with a strong action verb
  (Built, Developed, Optimized, Architected, Reduced, Increased, Led)
- Quantify EVERY achievement: add realistic metrics if missing
  (e.g., "Reduced load time by 40%", "Served 500+ users")
- Fill Page 1: Summary, Education, Technical Skills, 1-2 Projects
- Fill Page 2: 2-3 more Projects, Experience/Internship, Certifications,
  Achievements, Extracurricular, Leadership
- Add 3 PREDICTED projects based on target role if user has fewer than 3
  (label them "Planned Project" with tech stack)
- ATS keywords: inject top 15 keywords for the target role naturally
- summary must be 3-4 sentences, tailored to target role and company type
- skills must be separated into: technical[], tools[], soft[], databases[]
Return ONLY valid JSON matching the schema below. No markdown.`;

    const prompt = `
Student Profile:
Name: ${profile.full_name}
Email: ${profile.email}
College: ${profile.college_name ?? 'Engineering College'}
Degree: ${profile.degree ?? 'B.Tech CSE'}
Graduation Year: ${profile.graduation_year ?? 2025}
GitHub: ${profile.github_username ? `github.com/${profile.github_username}` : ''}
LinkedIn: ${profile.linkedin_url ?? ''}
Target Role: ${targetJobTitle}
Experience Level: ${targetRole?.experience_level ?? 'fresher'}

Current Skills (with proficiency %):
${skills.map((skill) => `${skill.skill_name}: ${skill.proficiency_level}%`).join('\n')}

GitHub Projects:
${(proofs.data ?? []).map((proof: any) => `- ${proof.repo_name}: ${proof.skills_detected?.join(', ')} (quality: ${proof.quality_score}/100)`).join('\n') || 'None yet'}

Certificates:
${(certificates.data ?? []).map((cert: any) => `- ${cert.title ?? cert.name} by ${cert.issuer ?? 'Online'}`).join('\n') || 'None yet'}

Missing skills for role: ${missingSkills.join(', ')}
Matched skills: ${matchedSkills.join(', ')}

Market keywords to inject for "${targetJobTitle}":
${marketKeywords.join(', ')}

Return this JSON schema (fill ALL fields, never leave empty arrays):
{
  "basics": {
    "name": "string",
    "email": "string",
    "phone": "string (generate realistic Indian format: +91-XXXXXXXXXX)",
    "location": "City, India",
    "linkedin": "string",
    "github": "string",
    "portfolio": "string (generate zerogap.io/u/username if none)"
  },
  "summary": "3-4 sentence role-targeted professional summary",
  "skills": {
    "technical": ["8-12 primary technical skills"],
    "databases": ["3-5 database/storage skills"],
    "tools": ["6-10 DevOps/tools/platforms"],
    "soft": ["5-6 professional skills"]
  },
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "location": "City, India",
      "graduation": "Month Year",
      "cgpa": "string (generate 7.5-8.9 range if not provided)",
      "relevant_courses": ["4-5 relevant courses for target role"]
    }
  ],
  "experience": [
    {
      "title": "Role Title",
      "company": "Company Name",
      "location": "City / Remote",
      "duration": "Month Year - Month Year",
      "points": [
        "Action verb + task + quantified result (4-5 bullets per experience)"
      ]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "tech_stack": "Tech, Stack, Used",
      "github_url": "github.com/username/repo or empty",
      "live_url": "https://... or empty",
      "status": "Completed | In Progress | Planned",
      "points": [
        "Built X that does Y resulting in Z (3 bullets each)"
      ]
    }
  ],
  "certifications": [
    {
      "name": "Certification Name",
      "issuer": "Issuing Platform",
      "date": "Month Year",
      "credential_url": "url or empty"
    }
  ],
  "achievements": [
    "Achievement string with context and impact (6-8 total)"
  ],
  "extracurricular": [
    {
      "title": "Role / Activity",
      "organization": "Club / Society",
      "duration": "Year",
      "description": "One line impact statement"
    }
  ],
  "languages": ["English (Fluent)", "Hindi (Native)"],
  "ats_keywords_injected": ["list of keywords used in the resume"]
}`;

    const resumeJson = await getClaudeJson<any>(
      system,
      `${prompt}

User data for grounding:
${JSON.stringify({
        profile,
        verifiedSkills,
        githubProofs: proofs.data,
        certificates: certificates.data,
        completedTasks: completedTasks.data,
        targetJobTitle,
        keywords,
      }).slice(0, 15000)}`,
      fallback,
    );

    const resumeText = JSON.stringify(resumeJson).toLowerCase();
    const keywordMatchScore = keywords.length
      ? Number((((keywords.filter((keyword: string) => resumeText.includes(keyword.toLowerCase())).length) / keywords.length) * 100).toFixed(2))
      : 0;
    const atsScore = calculateAtsScore(resumeJson, keywords);

    const { data: latest } = await supabaseAdmin.from('resumes').select('version').eq('user_id', userId).order('version', { ascending: false }).limit(1).maybeSingle();
    await supabaseAdmin.from('resumes').update({ is_latest: false }).eq('user_id', userId);

    const { data, error } = await supabaseAdmin.from('resumes').insert({
      user_id: userId,
      target_role_id: targetRole?.id ?? null,
      content_json: resumeJson,
      ats_score: Number(atsScore.toFixed(2)),
      keyword_match_score: keywordMatchScore,
      version: (latest?.version ?? 0) + 1,
      is_latest: true,
    }).select().single();

    if (error) throw new AppError(error.message, 500, 'RESUME_GENERATE_FAILED');
    return data;
  }

  static buildPage2Sections(contentJson: any) {
    const projects = Array.isArray(contentJson?.projects) ? contentJson.projects : [];
    const experience = Array.isArray(contentJson?.experience) ? contentJson.experience : [];
    const certs = Array.isArray(contentJson?.certifications) ? contentJson.certifications : [];
    const achievements = Array.isArray(contentJson?.achievements) ? contentJson.achievements : [];
    const extra = Array.isArray(contentJson?.extracurricular) ? contentJson.extracurricular : [];

    return {
      page2_projects: projects.slice(2),
      page2_experience: experience.slice(1),
      certifications: certs,
      achievements,
      extracurricular: extra,
      languages: contentJson?.languages ?? [],
      ats_keywords: contentJson?.ats_keywords_injected ?? [],
    };
  }

  static async latest(userId: string) {
    const { data, error } = await supabaseAdmin.from('resumes').select('*').eq('user_id', userId).eq('is_latest', true).maybeSingle();
    if (error) throw new AppError(error.message, 500, 'DB_ERROR');
    return data;
  }

  static async getLatest(userId: string) {
    return this.latest(userId);
  }

  static async getById(userId: string, id: string) {
    const { data, error } = await supabaseAdmin.from('resumes').select('*').eq('user_id', userId).eq('id', id).single();
    if (error) throw new AppError(error.message, 500, 'DB_ERROR');
    return data;
  }

  static async exportPdf(userId: string, id: string) {
    const resume = await this.getById(userId, id);
    try {
      const pdfBuffer = await this.renderPdfBuffer(resume.content_json);
      const fileName = `resume-${userId}-v${resume.version}.pdf`;
      const { error: uploadError } = await supabaseAdmin
        .storage
        .from('resumes')
        .upload(fileName, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabaseAdmin
        .storage
        .from('resumes')
        .getPublicUrl(fileName);
      const { error: updateError } = await supabaseAdmin.from('resumes').update({ pdf_url: urlData.publicUrl }).eq('id', resume.id);
      if (updateError) throw updateError;
      return { pdf_url: urlData.publicUrl };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Unable to export resume PDF', 500, 'PDF_EXPORT_FAILED');
    }
  }

  private static async renderPdfBuffer(contentJson: any): Promise<Buffer> {
    try {
      return this.renderPdfKitBuffer(contentJson);
    } catch {
      throw new AppError('PDF export unavailable. Download from the Resume tab.', 503, 'PDF_EXPORT_UNAVAILABLE');
    }
  }

  private static async renderPdfKitBuffer(contentJson: any): Promise<Buffer> {
    const content = normalizeContent(contentJson);

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 36 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(22).text(content.basics.name);
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#64748b').text([
        content.basics.email,
        content.basics.phone,
        content.basics.location,
        content.basics.linkedin,
        content.basics.github,
      ].filter(Boolean).join(' | '));
      doc.fillColor('#111827').moveDown();

      if (content.summary) {
        doc.fontSize(14).text('Summary');
        doc.fontSize(9.5).text(content.summary);
        doc.moveDown();
      }

      if (content.skillLines.length) {
        doc.fontSize(14).text('Skills');
        if (content.skills.technical.length) doc.fontSize(9.5).text(`Technical: ${content.skills.technical.join(', ')}`);
        if (content.skills.tools.length) doc.fontSize(9.5).text(`Tools: ${content.skills.tools.join(', ')}`);
        if (content.skills.soft.length) doc.fontSize(9.5).text(`Strengths: ${content.skills.soft.join(', ')}`);
        doc.moveDown();
      }

      if (content.experience.length) {
        doc.fontSize(14).text('Experience');
        for (const exp of content.experience) {
          doc.fontSize(10).text(`${exp.title ?? exp.role ?? 'Experience'} ${exp.company ? `- ${exp.company}` : ''}`);
          for (const point of itemPoints(exp)) {
            doc.fontSize(9.5).text(`- ${point}`);
          }
        }
        doc.moveDown();
      }

      if (content.projects.length) {
        doc.fontSize(14).text('Projects');
        for (const project of content.projects) {
          doc.fontSize(10).text(`${project.name ?? 'Project'} ${project.tech_stack || project.tech ? `| ${Array.isArray(project.tech) ? project.tech.join(', ') : project.tech_stack}` : ''}`);
          if (project.description) doc.fontSize(9.5).text(project.description);
          for (const point of itemPoints(project)) {
            doc.fontSize(9.5).text(`- ${point}`);
          }
        }
        doc.moveDown();
      }

      if (content.education.length) {
        doc.fontSize(14).text('Education');
        for (const edu of content.education) {
          doc.fontSize(9.5).text(`${edu.degree ?? 'Degree'} - ${edu.institution ?? 'Institution'} ${edu.graduation || edu.year ? `(${edu.graduation ?? edu.year})` : ''}`);
        }
        doc.moveDown();
      }

      if (content.certifications.length) {
        doc.fontSize(14).text('Certifications');
        for (const cert of content.certifications) {
          doc.fontSize(9.5).text(`- ${typeof cert === 'string' ? cert : `${cert.title ?? cert.name}${cert.issuer ? ` by ${cert.issuer}` : ''}`}`);
        }
        doc.moveDown();
      }

      if (content.achievements.length) {
        doc.fontSize(14).text('Achievements');
        for (const achievement of content.achievements) {
          doc.fontSize(9.5).text(`- ${achievement}`);
        }
        doc.moveDown();
      }

      if (content.extracurricular.length) {
        doc.fontSize(14).text('Extra-curricular');
        for (const activity of content.extracurricular) {
          doc.fontSize(9.5).text(`- ${activity}`);
        }
      }

      if (content.languages.length) {
        doc.moveDown();
        doc.fontSize(14).text('Languages');
        doc.fontSize(9.5).text(content.languages.join(', '));
      }

      doc.end();
    });
  }
}
