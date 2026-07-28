import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { certificateRateLimiter, quizSubmitRateLimiter } from '../middleware/rateLimit.middleware.js';
import type { AuthenticatedRequest } from '../types/index.js';
import type {
  CertificateRow,
  LearnPathStats,
  LearningPathRow,
  PlaylistProgressData,
  PlaylistRow,
  PlaylistVideoRow,
  UserVideoProgressRow,
  VideoQuestionRow,
} from '../types/learnpath.types.js';
import { sendSuccess } from '../utils/api.util.js';
import { generateCertificatePDF } from '../utils/certificateGenerator.util.js';
import { AppError } from '../utils/error.util.js';
import { getCompletionMap, getEnrollmentMap, getRecommendedPlaylists } from '../utils/playlistRecommender.util.js';
import { getOrGenerateQuiz } from '../utils/quizGenerator.util.js';
import { AchievementsService } from '../modules/achievements/achievements.service.js';
import { logger } from '../utils/logger.util.js';

const CERTIFICATE_BUCKET = 'certificates';
const CERTIFICATE_SIGNED_URL_SECONDS = 7 * 24 * 60 * 60;

interface PlaylistSeedEntry {
  yt_playlist_id: string;
  title: string;
  channel_name: string;
  first_video_id: string;
  total_videos: number;
  total_duration_seconds: number;
  category: string;
  skill_tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description: string;
}

const HARDCODED_PLAYLISTS: PlaylistSeedEntry[] = [
  {
    yt_playlist_id: 'PLu0W_9lII9agx66oZnT6-n3iF1k9s2g4K',
    title: 'React JS Full Course for Beginners',
    channel_name: 'Codevolution',
    first_video_id: 'QFaFIcGhPoM',
    total_videos: 30,
    total_duration_seconds: 27000,
    category: 'Web Development - Frontend',
    skill_tags: ['React', 'JavaScript', 'Frontend', 'Hooks'],
    difficulty: 'beginner',
    description: 'Complete React JS course covering components, hooks, state, props and more.',
  },
  {
    yt_playlist_id: 'PL0Zuz27SZ-6PRCpm9clX0WiBEMB70FWwd',
    title: 'HTML & CSS Full Course - Beginner to Pro',
    channel_name: 'Dave Gray',
    first_video_id: 'mJgBOIoGihA',
    total_videos: 22,
    total_duration_seconds: 36000,
    category: 'Web Development - Frontend',
    skill_tags: ['HTML', 'CSS', 'Responsive UI', 'Frontend'],
    difficulty: 'beginner',
    description: 'Learn HTML and CSS from scratch. Build real websites with responsive design.',
  },
  {
    yt_playlist_id: 'PL0Zuz27SZ-6Oi6xNtL_fwCrwpuqylMsgT',
    title: 'JavaScript Full Course for Beginners',
    channel_name: 'Dave Gray',
    first_video_id: 'EfAl9bwzVZk',
    total_videos: 26,
    total_duration_seconds: 43200,
    category: 'Web Development - Frontend',
    skill_tags: ['JavaScript', 'ES6', 'DOM', 'Frontend'],
    difficulty: 'beginner',
    description: 'Complete JavaScript course: variables, functions, arrays, async/await and more.',
  },
  {
    yt_playlist_id: 'PLGLfVvz_LVvTn3cK5e6LjhgGiSeVlIRwt',
    title: 'TypeScript Full Course',
    channel_name: 'Derek Banas',
    first_video_id: '2pZmKW9-I_k',
    total_videos: 18,
    total_duration_seconds: 21600,
    category: 'Web Development - Frontend',
    skill_tags: ['TypeScript', 'JavaScript', 'Frontend'],
    difficulty: 'intermediate',
    description: 'Master TypeScript: types, interfaces, generics, decorators.',
  },
  {
    yt_playlist_id: 'PLZPZq0r_RZOMhCAyywfnYLlrjiVOkdAI1',
    title: 'Next.js 14 Full Course',
    channel_name: 'JavaScript Mastery',
    first_video_id: 'wm5gMKuwSYk',
    total_videos: 12,
    total_duration_seconds: 18000,
    category: 'Web Development - Frontend',
    skill_tags: ['Next.js', 'React', 'SSR', 'Frontend'],
    difficulty: 'intermediate',
    description: 'Build full-stack apps with Next.js 14 App Router, server components.',
  },
  {
    yt_playlist_id: 'PLBZBJbE_rGRWeh5mIBhD-hhDwSEDxogDg',
    title: 'Tailwind CSS Full Course',
    channel_name: 'Traversy Media',
    first_video_id: 'UBOj6rqRUME',
    total_videos: 8,
    total_duration_seconds: 14400,
    category: 'Web Development - Frontend',
    skill_tags: ['Tailwind CSS', 'CSS', 'UI Design'],
    difficulty: 'beginner',
    description: 'Complete Tailwind CSS guide: utility classes, responsive design, dark mode.',
  },
  {
    yt_playlist_id: 'PLS1QulWo1RIa6f4t5N6g7H8J9K0L1M2N3',
    title: 'Redux Toolkit Complete Course',
    channel_name: 'Codevolution',
    first_video_id: 'bbkBuqC1rU4',
    total_videos: 14,
    total_duration_seconds: 12600,
    category: 'Web Development - Frontend',
    skill_tags: ['Redux', 'React', 'State Management'],
    difficulty: 'intermediate',
    description: 'Learn Redux Toolkit: createSlice, createAsyncThunk, RTK Query.',
  },
  {
    yt_playlist_id: 'PLGLfVvz_LVvT7c8d9e0f1g2h3i4j5k6l7',
    title: 'Node.js & Express Full Course',
    channel_name: 'Traversy Media',
    first_video_id: 'fBNz5xF-Kx4',
    total_videos: 20,
    total_duration_seconds: 28800,
    category: 'Web Development - Backend',
    skill_tags: ['Node.js', 'Express', 'REST API', 'Backend'],
    difficulty: 'beginner',
    description: 'Build REST APIs with Node.js and Express from scratch.',
  },
  {
    yt_playlist_id: 'PLGLfVvz_LVvRzA3zX9Z8Z1K4z9b9d9k9Z',
    title: 'FastAPI Python Complete Course',
    channel_name: 'Tech With Tim',
    first_video_id: 'sSEyvEUYYBU',
    total_videos: 16,
    total_duration_seconds: 14400,
    category: 'Web Development - Backend',
    skill_tags: ['FastAPI', 'Python', 'REST API', 'Backend'],
    difficulty: 'intermediate',
    description: 'Build high-performance APIs with FastAPI, Pydantic, and async Python.',
  },
  {
    yt_playlist_id: 'PL-osiE80TeTsqhIuOqKhwlXsIBIdSeYtc',
    title: 'Django Web Framework Complete Course',
    channel_name: 'Corey Schafer',
    first_video_id: 'UmljXZIypDc',
    total_videos: 18,
    total_duration_seconds: 32400,
    category: 'Web Development - Backend',
    skill_tags: ['Django', 'Python', 'Backend', 'ORM'],
    difficulty: 'intermediate',
    description: 'Build complete web apps with Django: models, views, templates, auth.',
  },
  {
    yt_playlist_id: 'PLu0W_9lII9ah7DDtYtflgwMwpT3xmjXY9',
    title: 'Spring Boot Java Backend Course',
    channel_name: 'Amigoscode',
    first_video_id: '9SGDpanrc8U',
    total_videos: 24,
    total_duration_seconds: 43200,
    category: 'Web Development - Backend',
    skill_tags: ['Spring Boot', 'Java', 'REST API', 'Backend'],
    difficulty: 'intermediate',
    description: 'Build enterprise Java apps with Spring Boot, JPA, Security.',
  },
  {
    yt_playlist_id: 'PLgFHb8dDZq1c1y4p2Zp4yC6h0vR9bZ1mY',
    title: 'PostgreSQL Complete Tutorial',
    channel_name: 'Amigoscode',
    first_video_id: 'qw--VYLpxG4',
    total_videos: 12,
    total_duration_seconds: 14400,
    category: 'Databases',
    skill_tags: ['PostgreSQL', 'SQL', 'Databases'],
    difficulty: 'beginner',
    description: 'Master PostgreSQL: queries, joins, indexes, transactions.',
  },
  {
    yt_playlist_id: 'PLu0W_9lII9agwh1XjRt242xIpHhPT2llg',
    title: 'Python for Beginners - Full Course',
    channel_name: 'Telusko',
    first_video_id: 'YYXdXT2l-Gg',
    total_videos: 45,
    total_duration_seconds: 54000,
    category: 'Data Science & ML',
    skill_tags: ['Python', 'Programming', 'Basics'],
    difficulty: 'beginner',
    description: 'Complete Python programming: syntax, OOP, file handling, modules.',
  },
  {
    yt_playlist_id: 'PLS1QulWo1RIaUGP446_pWLgTZPiFizEMq',
    title: 'Pandas & NumPy for Data Analysis',
    channel_name: 'Keith Galli',
    first_video_id: 'vmEHCJofslg',
    total_videos: 14,
    total_duration_seconds: 18000,
    category: 'Data Science & ML',
    skill_tags: ['Pandas', 'NumPy', 'Python', 'Data Analysis'],
    difficulty: 'beginner',
    description: 'Data manipulation with Pandas and numerical computing with NumPy.',
  },
  {
    yt_playlist_id: 'PLQVvvaa0QuDcjD5BAw2DxE6OF2tius3V3',
    title: 'Machine Learning with Python - Full Course',
    channel_name: 'Sentdex',
    first_video_id: 'OGxgnH8y2NM',
    total_videos: 30,
    total_duration_seconds: 36000,
    category: 'Data Science & ML',
    skill_tags: ['Machine Learning', 'Python', 'Scikit-learn'],
    difficulty: 'intermediate',
    description: 'Hands-on ML: regression, classification, clustering, neural networks.',
  },
  {
    yt_playlist_id: 'PLWKjhJtqVAblStefaz_YOVpDWqcRScc2s',
    title: 'Deep Learning Specialization',
    channel_name: 'DeepLearning.AI',
    first_video_id: 'CS4cs9xVecg',
    total_videos: 40,
    total_duration_seconds: 72000,
    category: 'Data Science & ML',
    skill_tags: ['Deep Learning', 'Neural Networks', 'TensorFlow'],
    difficulty: 'advanced',
    description: 'Deep neural networks, CNNs, RNNs, transformers from Andrew Ng.',
  },
  {
    yt_playlist_id: 'PLZoTAELRMXVMdJ5sqbCK2LiM0HhQVWNzm',
    title: 'TensorFlow 2.0 Complete Course',
    channel_name: 'freeCodeCamp',
    first_video_id: 'tPYj3fFJGjk',
    total_videos: 20,
    total_duration_seconds: 43200,
    category: 'Data Science & ML',
    skill_tags: ['TensorFlow', 'Deep Learning', 'Python', 'AI'],
    difficulty: 'intermediate',
    description: 'Build and train deep learning models with TensorFlow 2.0.',
  },
  {
    yt_playlist_id: 'PLkDaE6sCZn6FNC6YRfRQc_FbeQrF8BwGI',
    title: 'ML Engineering & MLOps Course',
    channel_name: 'DeepLearning.AI',
    first_video_id: 'NgWujOrCZFo',
    total_videos: 18,
    total_duration_seconds: 28800,
    category: 'Data Science & ML',
    skill_tags: ['MLOps', 'ML Engineering', 'Python', 'Production'],
    difficulty: 'advanced',
    description: 'Deploy ML models in production: MLflow, monitoring, pipelines.',
  },
  {
    yt_playlist_id: 'PLt9cUwGw6CYHKBH5OoR8M2ELGlNlrgBKl',
    title: 'Data Science Full Course - Zero to Hero',
    channel_name: 'Krish Naik',
    first_video_id: 'ua-CiDNNj30',
    total_videos: 50,
    total_duration_seconds: 90000,
    category: 'Data Science & ML',
    skill_tags: ['Data Science', 'Python', 'ML', 'Statistics'],
    difficulty: 'beginner',
    description: 'Complete data science: EDA, ML, deep learning, deployment.',
  },
  {
    yt_playlist_id: 'PLDzeHZWIZsTryvtXdMr6rPh4IDexB5NIA',
    title: 'Data Structures & Algorithms - Java',
    channel_name: 'CodeWithHarry',
    first_video_id: 'AT14lCXuMKI',
    total_videos: 60,
    total_duration_seconds: 72000,
    category: 'DSA & CS Fundamentals',
    skill_tags: ['DSA', 'Java', 'Arrays', 'Interview Prep'],
    difficulty: 'intermediate',
    description: 'All DSA topics: arrays, linked lists, trees, graphs, dynamic programming.',
  },
  {
    yt_playlist_id: 'PLfqMhTWNBTe0b2nM6JHVCnAkhQRGiZMSJ',
    title: 'DSA Cracker - FAANG Interview Prep',
    channel_name: 'Striver',
    first_video_id: '0IAPZzGSbME',
    total_videos: 80,
    total_duration_seconds: 108000,
    category: 'DSA & CS Fundamentals',
    skill_tags: ['DSA', 'LeetCode', 'FAANG', 'Interview'],
    difficulty: 'advanced',
    description: 'Crack FAANG interviews: top patterns, DP, graphs, trees.',
  },
  {
    yt_playlist_id: 'PLgUwDviBIf0rENwdL0nEH0uGom9no0nyB',
    title: 'DSA with C++ - Striver A-Z Sheet',
    channel_name: 'Striver',
    first_video_id: 'EAR7De6Goz4',
    total_videos: 100,
    total_duration_seconds: 180000,
    category: 'DSA & CS Fundamentals',
    skill_tags: ['DSA', 'C++', 'Competitive Programming'],
    difficulty: 'intermediate',
    description: 'Complete A-Z DSA: every topic from basics to advanced in C++.',
  },
  {
    yt_playlist_id: 'PLAE85DE8440AA6B83',
    title: 'Java Complete Tutorial for Beginners',
    channel_name: 'thenewboston',
    first_video_id: 'Hl-zzrqQoSE',
    total_videos: 87,
    total_duration_seconds: 39600,
    category: 'DSA & CS Fundamentals',
    skill_tags: ['Java', 'OOP', 'Programming', 'Basics'],
    difficulty: 'beginner',
    description: 'Java from zero: syntax, OOP, collections, file I/O.',
  },
  {
    yt_playlist_id: 'PLi9RQVmJD2fZqMccp1L0j3H5hG5j2w7dA',
    title: 'Graph Algorithms Masterclass',
    channel_name: 'William Fiset',
    first_video_id: '09_LlHjoEiY',
    total_videos: 35,
    total_duration_seconds: 43200,
    category: 'DSA & CS Fundamentals',
    skill_tags: ['Graphs', 'Algorithms', 'DSA', 'Advanced'],
    difficulty: 'advanced',
    description: 'BFS, DFS, Dijkstra, MST, network flow, topological sort.',
  },
  {
    yt_playlist_id: 'PLWKjhJtqVAblpP3C6q6Yx2S5Z7Z7Z7Z7Z',
    title: 'Docker Complete Course - Beginner to Expert',
    channel_name: 'TechWorld with Nana',
    first_video_id: '3c-iBn73dDE',
    total_videos: 20,
    total_duration_seconds: 25200,
    category: 'DevOps & Cloud',
    skill_tags: ['Docker', 'Containers', 'DevOps'],
    difficulty: 'beginner',
    description: 'Docker fundamentals: images, containers, volumes, docker-compose.',
  },
  {
    yt_playlist_id: 'PLS1QulWo1RIaZ5z5z5z5z5z5z5z5z5z',
    title: 'Kubernetes Complete Bootcamp',
    channel_name: 'TechWorld with Nana',
    first_video_id: 'X48VuDVv0do',
    total_videos: 22,
    total_duration_seconds: 57600,
    category: 'DevOps & Cloud',
    skill_tags: ['Kubernetes', 'K8s', 'Orchestration', 'Cloud'],
    difficulty: 'advanced',
    description: 'Kubernetes architecture, pods, deployments, services, ingress.',
  },
  {
    yt_playlist_id: 'PLZoTAELRMXVNklA5UZimjuxf3WD3O1CBO',
    title: 'AWS Full Course - Cloud Practitioner',
    channel_name: 'freeCodeCamp',
    first_video_id: 'SOTamWNgDKc',
    total_videos: 14,
    total_duration_seconds: 72000,
    category: 'DevOps & Cloud',
    skill_tags: ['AWS', 'Cloud', 'EC2', 'S3', 'Lambda'],
    difficulty: 'beginner',
    description: 'Complete AWS: EC2, S3, Lambda, RDS, IAM, CloudFormation.',
  },
  {
    yt_playlist_id: 'PLGLfVvz_LVvRzA3zX9Z8Z1K4z9b9d9k9Z',
    title: 'CI/CD Pipeline with GitHub Actions',
    channel_name: 'TechWorld with Nana',
    first_video_id: 'R8_veQiYBjI',
    total_videos: 10,
    total_duration_seconds: 10800,
    category: 'DevOps & Cloud',
    skill_tags: ['CI/CD', 'GitHub Actions', 'DevOps', 'Automation'],
    difficulty: 'intermediate',
    description: 'Automate testing, building, and deployment with GitHub Actions.',
  },
  {
    yt_playlist_id: 'PLUcsbZa0qzu3yNzzAxgvSgRobdUUJvz7p',
    title: 'Linux Command Line Complete Course',
    channel_name: 'Fireship',
    first_video_id: 'oxuRxtrO2Ag',
    total_videos: 15,
    total_duration_seconds: 12600,
    category: 'DevOps & Cloud',
    skill_tags: ['Linux', 'Bash', 'Command Line', 'DevOps'],
    difficulty: 'beginner',
    description: 'Master the Linux terminal: files, permissions, scripting, processes.',
  },
  {
    yt_playlist_id: 'PLlcnQQJK8SUjW_HiBWhZ_XOfCq9Hu0aeY',
    title: 'Terraform Infrastructure as Code',
    channel_name: 'TechWorld with Nana',
    first_video_id: 'l5k1ai_GBDE',
    total_videos: 12,
    total_duration_seconds: 14400,
    category: 'DevOps & Cloud',
    skill_tags: ['Terraform', 'IaC', 'AWS', 'DevOps'],
    difficulty: 'intermediate',
    description: 'Provision cloud infrastructure with Terraform: AWS, variables, modules.',
  },
  {
    yt_playlist_id: 'PLu0W_9lII9agS67Uits0UnJyrYiXhDS6q',
    title: 'Android Development with Kotlin',
    channel_name: 'Philipp Lackner',
    first_video_id: 'EExSSotojVI',
    total_videos: 35,
    total_duration_seconds: 63000,
    category: 'Mobile Development',
    skill_tags: ['Android', 'Kotlin', 'Jetpack Compose', 'Mobile'],
    difficulty: 'beginner',
    description: 'Build Android apps with Kotlin and Jetpack Compose from scratch.',
  },
  {
    yt_playlist_id: 'PLS1QulWo1RIaUGP446_pWLgTZPiFizEMq',
    title: 'Flutter & Dart Complete Course',
    channel_name: 'Academind',
    first_video_id: '1ukSR1GRtMU',
    total_videos: 28,
    total_duration_seconds: 50400,
    category: 'Mobile Development',
    skill_tags: ['Flutter', 'Dart', 'iOS', 'Android', 'Cross-platform'],
    difficulty: 'beginner',
    description: 'Build cross-platform apps for iOS and Android with Flutter.',
  },
  {
    yt_playlist_id: 'PLgFHb8dDZq1c1y4p2Zp4yC6h0vR9bZ1mY',
    title: 'React Native Full Course',
    channel_name: 'Academind',
    first_video_id: 'qSRrxpdMpVc',
    total_videos: 20,
    total_duration_seconds: 36000,
    category: 'Mobile Development',
    skill_tags: ['React Native', 'JavaScript', 'Mobile', 'iOS', 'Android'],
    difficulty: 'intermediate',
    description: 'Build mobile apps with React Native: navigation, APIs, storage.',
  },
  {
    yt_playlist_id: 'PLMCXHnjXnTnvo6alSjVkgxV-VH6EPyvoX',
    title: 'System Design Interview Masterclass',
    channel_name: 'Gaurav Sen',
    first_video_id: 'quLrc3PbuIw',
    total_videos: 25,
    total_duration_seconds: 36000,
    category: 'System Design',
    skill_tags: ['System Design', 'Architecture', 'Scalability', 'Interview'],
    difficulty: 'advanced',
    description: 'Design scalable systems: load balancers, databases, caching, queues.',
  },
  {
    yt_playlist_id: 'PLTCrU9sGyburBw9wNOHebv9SjlE4Elv5a',
    title: 'System Design for Beginners',
    channel_name: 'ByteByteGo',
    first_video_id: 'i53Gi_K3o7I',
    total_videos: 15,
    total_duration_seconds: 18000,
    category: 'System Design',
    skill_tags: ['System Design', 'Architecture', 'Beginners'],
    difficulty: 'intermediate',
    description: 'Core system design concepts: APIs, databases, microservices.',
  },
  {
    yt_playlist_id: 'PLavw5C92dz9Ef4E-1Zi9KfCTXS_IN8gXZ',
    title: 'MySQL Complete Tutorial for Beginners',
    channel_name: 'Bro Code',
    first_video_id: 'Cz3WcZLRaWc',
    total_videos: 26,
    total_duration_seconds: 18000,
    category: 'Databases',
    skill_tags: ['MySQL', 'SQL', 'Databases', 'Queries'],
    difficulty: 'beginner',
    description: 'Complete MySQL: tables, queries, joins, stored procedures.',
  },
  {
    yt_playlist_id: 'PLQVvvaa0QuDfKTOs3Keq_kaG2P55YRn5v',
    title: 'MongoDB Complete Developer Course',
    channel_name: 'Sentdex',
    first_video_id: 'E-1xI85Zog8',
    total_videos: 18,
    total_duration_seconds: 21600,
    category: 'Databases',
    skill_tags: ['MongoDB', 'NoSQL', 'Databases', 'Node.js'],
    difficulty: 'intermediate',
    description: 'MongoDB: CRUD, aggregation pipeline, indexes, replication.',
  },
  {
    yt_playlist_id: 'PL4cUxeGkcC9h77dJ-QJlwGlZlTd4ecZOA',
    title: 'Redis Complete Course',
    channel_name: 'The Net Ninja',
    first_video_id: 'jgpVdJB2sKQ',
    total_videos: 12,
    total_duration_seconds: 10800,
    category: 'Databases',
    skill_tags: ['Redis', 'Caching', 'NoSQL', 'Backend'],
    difficulty: 'intermediate',
    description: 'Redis fundamentals: strings, lists, sets, pub/sub, caching strategies.',
  },
  {
    yt_playlist_id: 'PLBf0hzazHTGOEuhPQSnq-Ej8jRyXxfYvl',
    title: 'Ethical Hacking Full Course',
    channel_name: 'freeCodeCamp',
    first_video_id: '3Kq1MIfTWCE',
    total_videos: 20,
    total_duration_seconds: 50400,
    category: 'Cybersecurity',
    skill_tags: ['Ethical Hacking', 'Penetration Testing', 'Kali Linux'],
    difficulty: 'intermediate',
    description: 'Network scanning, exploitation, post-exploitation, reporting.',
  },
  {
    yt_playlist_id: 'PLG49S3nxzAnnVhoAaL4B6aMFDQ8_gdxAy',
    title: 'Cybersecurity for Beginners',
    channel_name: 'Professor Messer',
    first_video_id: 'tBkp8FbKAlo',
    total_videos: 30,
    total_duration_seconds: 36000,
    category: 'Cybersecurity',
    skill_tags: ['Cybersecurity', 'Network Security', 'CompTIA'],
    difficulty: 'beginner',
    description: 'Security fundamentals: threats, cryptography, network security.',
  },
  {
    yt_playlist_id: 'PLllcnQQJK8SUjW_HiBWhZ_XOfCq9Hu2aeY',
    title: 'Technical Interview Preparation',
    channel_name: 'Exponent',
    first_video_id: 'rEJzOhC5ZtQ',
    total_videos: 20,
    total_duration_seconds: 21600,
    category: 'Soft Skills & Career',
    skill_tags: ['Interview Prep', 'Communication', 'Career'],
    difficulty: 'intermediate',
    description: 'Crack technical interviews: coding rounds, system design, HR.',
  },
  {
    yt_playlist_id: 'PLZPZq0r_RZOMx7l8v9w1c2k3l4m5n6o7',
    title: 'Git & GitHub Complete Course',
    channel_name: 'Traversy Media',
    first_video_id: 'SWYqp7iY_Tc',
    total_videos: 14,
    total_duration_seconds: 10800,
    category: 'Soft Skills & Career',
    skill_tags: ['Git', 'GitHub', 'Version Control', 'Collaboration'],
    difficulty: 'beginner',
    description: 'Master Git: commits, branches, merging, GitHub pull requests.',
  },
];

const PATHS_TO_SEED = [
  {
    slug: 'full-stack-zero-to-hero',
    title: 'Full Stack - Zero to Hero',
    description: 'HTML -> CSS -> JS -> React -> Node.js -> Deploy',
    category: 'Web Development - Frontend',
    badge_label: 'Full Stack',
    playlist_ids: ['PLu0W_9lII9agx66oZnT6-n3iF1k9s2g4K', 'PL0Zuz27SZ-6PRCpm9clX0WiBEMB70FWwd', 'PL0Zuz27SZ-6Oi6xNtL_fwCrwpuqylMsgT'],
  },
  {
    slug: 'ml-engineer-path',
    title: 'ML Engineer Path',
    description: 'Python -> ML -> Deep Learning -> MLOps',
    category: 'Data Science & ML',
    badge_label: 'ML Engineer',
    playlist_ids: ['PLu0W_9lII9agwh1XjRt242xIpHhPT2llg', 'PLQVvvaa0QuDcjD5BAw2DxE6OF2tius3V3', 'PLWKjhJtqVAblStefaz_YOVpDWqcRScc2s'],
  },
  {
    slug: 'dsa-cracker',
    title: 'DSA Cracker - FAANG Ready',
    description: 'Arrays -> Trees -> Graphs -> DP -> FAANG',
    category: 'DSA & CS Fundamentals',
    badge_label: 'DSA Expert',
    playlist_ids: ['PLDzeHZWIZsTryvtXdMr6rPh4IDexB5NIA', 'PLgUwDviBIf0rENwdL0nEH0uGom9no0nyB', 'PLfqMhTWNBTe0b2nM6JHVCnAkhQRGiZMSJ'],
  },
  {
    slug: 'devops-cloud',
    title: 'DevOps & Cloud Engineer',
    description: 'Linux -> Docker -> Kubernetes -> AWS -> CI/CD',
    category: 'DevOps & Cloud',
    badge_label: 'Cloud Native',
    playlist_ids: ['PLUcsbZa0qzu3yNzzAxgvSgRobdUUJvz7p', 'PLWKjhJtqVAblpP3C6q6Yx2S5Z7Z7Z7Z7Z', 'PLGLfVvz_LVvRzA3zX9Z8Z1K4z9b9d9k9Z'],
  },
];

let seedInProgress = false;
let seedDone = false;
let seedPromise: Promise<void> | null = null;

async function seedLearningPaths() {
  for (const path of PATHS_TO_SEED) {
    const { data: pathRow, error: pathError } = await supabaseAdmin
      .from('learning_paths')
      .upsert({
        slug: path.slug,
        title: path.title,
        description: path.description,
        category: path.category,
        badge_label: path.badge_label,
      }, { onConflict: 'slug' })
      .select()
      .maybeSingle();

    if (pathError) throw pathError;
    if (!pathRow) continue;

    const { error: clearError } = await supabaseAdmin
      .from('learning_path_playlists')
      .delete()
      .eq('path_id', pathRow.id);
    if (clearError) throw clearError;

    for (let index = 0; index < path.playlist_ids.length; index += 1) {
      const playlistId = path.playlist_ids[index];
      const { data: playlist, error: playlistError } = await supabaseAdmin
        .from('playlists')
        .select('id')
        .eq('yt_playlist_id', playlistId)
        .maybeSingle();

      if (playlistError) throw playlistError;
      if (!playlist) continue;

      const { error: joinError } = await supabaseAdmin.from('learning_path_playlists').upsert({
        path_id: pathRow.id,
        playlist_id: playlist.id,
        step_number: index + 1,
      }, { onConflict: 'path_id,playlist_id' });

      if (joinError) throw joinError;
    }
  }
}

async function autoSeedPlaylists() {
  if (seedDone) return;
  if (seedInProgress && seedPromise) return seedPromise;
  if (seedPromise) return seedPromise;

  seedInProgress = true;
  seedPromise = (async () => {
    logger.info('Auto-seeding playlists into Supabase...');
    for (const entry of HARDCODED_PLAYLISTS) {
      const thumbnail = `https://i.ytimg.com/vi/${entry.first_video_id}/hqdefault.jpg`;
      const { error } = await supabaseAdmin.from('playlists').upsert({
        yt_playlist_id: entry.yt_playlist_id,
        title: entry.title,
        channel_name: entry.channel_name,
        thumbnail_url: thumbnail,
        total_videos: entry.total_videos,
        total_duration_seconds: entry.total_duration_seconds,
        category: entry.category,
        skill_tags: entry.skill_tags,
        difficulty: entry.difficulty,
        description: entry.description,
      }, { onConflict: 'yt_playlist_id' });

      if (error) throw error;
    }

    await seedLearningPaths();
    seedDone = true;
    logger.info(`Auto-seeded ${HARDCODED_PLAYLISTS.length} playlists successfully.`);
  })()
    .catch((error) => {
      logger.error({ message: 'Auto-seed failed', error });
    })
    .finally(() => {
      seedInProgress = false;
      seedPromise = null;
    });

  return seedPromise;
}

setImmediate(() => {
  void (async () => {
    try {
      const { count, error } = await supabaseAdmin.from('playlists').select('*', { count: 'exact', head: true });
      if (error) throw error;
      if ((count ?? 0) === 0) {
        void autoSeedPlaylists();
      } else {
        seedDone = true;
      }
    } catch (error) {
      logger.warn({ message: 'Unable to check LearnPath playlist seed status', error });
    }
  })();
});

export const learnPathRouter = Router();

interface EnrollmentJoinRow {
  playlist_id: string;
  completed_at: string | null;
  playlists: PlaylistRow | PlaylistRow[] | null;
}

interface CatalogQuery {
  category?: string;
  difficulty?: string;
  tag?: string;
  search?: string;
  page?: string;
  limit?: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function routeParam(req: { params: Record<string, string | string[] | undefined> }, key: string) {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function isMissingPlaylistTableError(error: unknown) {
  const maybeError = error as { code?: string; message?: string } | null;
  return maybeError?.code === 'PGRST205'
    || maybeError?.code === '42P01'
    || /playlists.*schema cache|relation .*playlists.*does not exist/i.test(maybeError?.message ?? '');
}

function fallbackPlaylistRows() {
  return HARDCODED_PLAYLISTS.map<PlaylistRow>((entry, index) => ({
    id: `fallback-${index + 1}`,
    yt_playlist_id: entry.yt_playlist_id,
    title: entry.title,
    description: entry.description,
    channel_name: entry.channel_name,
    thumbnail_url: `https://i.ytimg.com/vi/${entry.first_video_id}/hqdefault.jpg`,
    total_videos: entry.total_videos,
    total_duration_seconds: entry.total_duration_seconds,
    skill_tags: entry.skill_tags,
    difficulty: entry.difficulty,
    category: entry.category,
    created_at: new Date(0).toISOString(),
  }));
}

function fallbackCatalog(queryParams: CatalogQuery, from: number, to: number) {
  const searchTerm = String(queryParams.search ?? '').trim().toLowerCase();
  const rows = fallbackPlaylistRows().filter((playlist) => {
    if (queryParams.category && playlist.category !== queryParams.category) return false;
    if (queryParams.difficulty && playlist.difficulty !== queryParams.difficulty) return false;
    if (queryParams.tag && !playlist.skill_tags.includes(queryParams.tag)) return false;
    if (!searchTerm) return true;
    return [
      playlist.title,
      playlist.description ?? '',
      playlist.channel_name,
      playlist.category,
      ...playlist.skill_tags,
    ].some((value) => value.toLowerCase().includes(searchTerm));
  });

  return {
    playlists: rows.slice(from, to + 1).map((playlist) => ({
      ...playlist,
      is_enrolled: false,
      completion_percentage: 0,
      match_score: 0.6,
    })),
    total: rows.length,
  };
}

function publicCertificate(certificate: CertificateRow, playlistTitle?: string) {
  return {
    id: certificate.id,
    playlist_id: certificate.playlist_id,
    playlist_title: playlistTitle ?? certificate.title,
    certificate_code: certificate.certificate_code,
    issued_at: certificate.issue_date ?? certificate.created_at,
    overall_quiz_score: certificate.overall_quiz_score ?? 0,
    total_watch_seconds: certificate.total_watch_seconds ?? 0,
    pdf_url: certificate.pdf_url ?? certificate.file_url ?? '',
  };
}

function parseAnswers(body: unknown): Record<string, string> {
  const answers = (body as { answers?: unknown }).answers;
  if (Array.isArray(answers)) {
    return answers.reduce<Record<string, string>>((acc, item) => {
      const row = item as { question_id?: unknown; selected_option_id?: unknown };
      if (row.question_id && row.selected_option_id) {
        acc[String(row.question_id)] = String(row.selected_option_id);
      }
      return acc;
    }, {});
  }

  if (answers && typeof answers === 'object') {
    return Object.fromEntries(
      Object.entries(answers as Record<string, unknown>).map(([questionId, selected]) => [questionId, String(selected)]),
    );
  }

  return {};
}

function shuffle<T>(items: T[]) {
  return [...items]
    .map((item) => ({ item, sort: Math.random() }))
    .sort((left, right) => left.sort - right.sort)
    .map(({ item }) => item);
}

async function getPlaylistOrThrow(playlistId: string) {
  const { data, error } = await supabaseAdmin.from('playlists').select('*').eq('id', playlistId).maybeSingle();
  if (error) throw new AppError(error.message, 500, 'PLAYLIST_LOOKUP_FAILED');
  if (!data) throw new AppError('Playlist not found', 404, 'PLAYLIST_NOT_FOUND');
  return data as PlaylistRow;
}

async function getVideoOrThrow(videoId: string) {
  const { data, error } = await supabaseAdmin.from('playlist_videos').select('*').eq('id', videoId).maybeSingle();
  if (error) throw new AppError(error.message, 500, 'VIDEO_LOOKUP_FAILED');
  if (!data) throw new AppError('Video not found', 404, 'VIDEO_NOT_FOUND');
  return data as PlaylistVideoRow;
}

async function getProgressRow(userId: string, videoId: string) {
  const { data, error } = await supabaseAdmin
    .from('user_video_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('video_id', videoId)
    .maybeSingle();

  if (error) throw new AppError(error.message, 500, 'PROGRESS_LOOKUP_FAILED');
  return data as UserVideoProgressRow | null;
}

async function updateLearningStreak(userId: string) {
  await AchievementsService.updateStreak(userId);

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data } = await supabaseAdmin.from('learning_streaks').select('*').eq('user_id', userId).maybeSingle();
  const current = data as { current_streak?: number; longest_streak?: number; last_active_date?: string | null } | null;
  const nextCurrent = current?.last_active_date === today
    ? current.current_streak ?? 1
    : current?.last_active_date === yesterday
      ? (current.current_streak ?? 0) + 1
      : 1;

  await supabaseAdmin.from('learning_streaks').upsert({
    user_id: userId,
    current_streak: nextCurrent,
    longest_streak: Math.max(nextCurrent, current?.longest_streak ?? 0),
    last_active_date: today,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}

async function maybeCompleteEnrollment(userId: string, playlistId: string) {
  const progress = await getPlaylistProgress(userId, playlistId);
  if (!progress.is_eligible_for_certificate) {
    return progress;
  }

  await supabaseAdmin
    .from('user_playlist_enrollments')
    .update({ completed_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('playlist_id', playlistId)
    .is('completed_at', null);

  return progress;
}

async function getPlaylistProgress(userId: string, playlistId: string): Promise<PlaylistProgressData> {
  const playlist = await getPlaylistOrThrow(playlistId);
  const [videosResult, progressResult, notesResult] = await Promise.all([
    supabaseAdmin.from('playlist_videos').select('*').eq('playlist_id', playlistId).order('position'),
    supabaseAdmin.from('user_video_progress').select('*').eq('user_id', userId).eq('playlist_id', playlistId),
    supabaseAdmin.from('user_video_notes').select('video_id, note_text').eq('user_id', userId).eq('playlist_id', playlistId),
  ]);

  if (videosResult.error) throw new AppError(videosResult.error.message, 500, 'VIDEOS_LOOKUP_FAILED');
  if (progressResult.error) throw new AppError(progressResult.error.message, 500, 'PROGRESS_LOOKUP_FAILED');
  if (notesResult.error) throw new AppError(notesResult.error.message, 500, 'NOTES_LOOKUP_FAILED');

  const progressByVideo = new Map((progressResult.data as UserVideoProgressRow[] | null ?? []).map((row) => [row.video_id, row]));
  const notesByVideo = new Map((notesResult.data ?? []).map((row) => [String(row.video_id), String(row.note_text ?? '')]));
  const videos = (videosResult.data as PlaylistVideoRow[] | null ?? []).map((video) => {
    const row = progressByVideo.get(video.id);
    return {
      ...video,
      progress: {
        watch_seconds: row?.watch_seconds ?? 0,
        is_watch_complete: row?.is_watch_complete ?? false,
        quiz_passed: row?.quiz_passed ?? false,
        quiz_score: row?.quiz_score ?? null,
      },
      note_text: notesByVideo.get(video.id) ?? '',
    };
  });

  const blockers = videos
    .filter((video) => !video.progress.is_watch_complete || !video.progress.quiz_passed)
    .map((video) => `Video ${video.position}: ${video.title}`);
  const completedVideos = videos.filter((video) => video.progress.is_watch_complete && video.progress.quiz_passed).length;

  return {
    playlist,
    videos,
    completed_videos: completedVideos,
    total_videos: videos.length,
    playlist_completion_percentage: videos.length ? Math.round((completedVideos / videos.length) * 100) : 0,
    is_eligible_for_certificate: videos.length > 0 && blockers.length === 0,
    blockers,
  };
}

async function signedCertificateUrl(certificate: CertificateRow) {
  if (!certificate.pdf_storage_path) {
    return certificate.pdf_url ?? certificate.file_url ?? '';
  }

  const { data, error } = await supabaseAdmin
    .storage
    .from(CERTIFICATE_BUCKET)
    .createSignedUrl(certificate.pdf_storage_path, CERTIFICATE_SIGNED_URL_SECONDS);

  return error ? (certificate.pdf_url ?? certificate.file_url ?? '') : data.signedUrl;
}

function makeCertificateCode() {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ZG-${year}-${random}`;
}

learnPathRouter.get('/verify/:certificateCode', async (req, res, next) => {
  try {
    const certificateCode = routeParam(req, 'certificateCode');
    const { data: certificate, error } = await supabaseAdmin
      .from('certificates')
      .select('id, user_id, title, issue_date, created_at, certificate_code, overall_quiz_score, playlist_id')
      .eq('certificate_code', certificateCode)
      .maybeSingle();

    if (error) throw new AppError(error.message, 500, 'CERTIFICATE_VERIFY_FAILED');
    if (!certificate) throw new AppError('Certificate not found', 404, 'CERTIFICATE_NOT_FOUND');

    const [profileResult, playlistResult] = await Promise.all([
      supabaseAdmin.from('profiles').select('full_name').eq('id', certificate.user_id).maybeSingle(),
      certificate.playlist_id
        ? supabaseAdmin.from('playlists').select('title').eq('id', certificate.playlist_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (profileResult.error) throw new AppError(profileResult.error.message, 500, 'CERTIFICATE_VERIFY_FAILED');
    if (playlistResult.error) throw new AppError(playlistResult.error.message, 500, 'CERTIFICATE_VERIFY_FAILED');

    sendSuccess(res, {
      user_name: profileResult.data?.full_name ?? 'ZeroGap Learner',
      playlist_title: playlistResult.data?.title ?? certificate.title,
      issued_at: certificate.issue_date ?? certificate.created_at,
      score: certificate.overall_quiz_score ?? 0,
    }, 'Certificate verified');
  } catch (error) {
    next(error);
  }
});

learnPathRouter.use(requireAuth);

learnPathRouter.get('/recommended', async (req: AuthenticatedRequest, res, next) => {
  try {
    sendSuccess(res, await getRecommendedPlaylists(req.user!.id), 'Recommended playlists fetched');
  } catch (error) {
    next(error);
  }
});

learnPathRouter.get('/catalog', async (req: AuthenticatedRequest, res, next) => {
  try {
    const queryParams = req.query as CatalogQuery;
    const page = clamp(Number(queryParams.page ?? 1) || 1, 1, 500);
    const limit = clamp(Number(queryParams.limit ?? 20) || 20, 1, 50);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from('playlists')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (queryParams.category) query = query.eq('category', queryParams.category);
    if (queryParams.difficulty) query = query.eq('difficulty', queryParams.difficulty);
    if (queryParams.tag) query = query.contains('skill_tags', [queryParams.tag]);
    if (queryParams.search) {
      const term = String(queryParams.search).replace(/[%_,]/g, ' ').trim();
      if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,channel_name.ilike.%${term}%`);
    }

    const { data, error, count } = await query;
    if (error) {
      if (isMissingPlaylistTableError(error)) {
        sendSuccess(res, fallbackCatalog(queryParams, from, to), 'Playlist catalog fetched (fallback)');
        return;
      }
      throw new AppError(error.message, 500, 'CATALOG_LOOKUP_FAILED');
    }

    if ((count ?? 0) === 0 && !seedDone) {
      await autoSeedPlaylists();

      let retryQuery = supabaseAdmin
        .from('playlists')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (queryParams.category) retryQuery = retryQuery.eq('category', queryParams.category);
      if (queryParams.difficulty) retryQuery = retryQuery.eq('difficulty', queryParams.difficulty);
      if (queryParams.tag) retryQuery = retryQuery.contains('skill_tags', [queryParams.tag]);
      if (queryParams.search) {
        const term = String(queryParams.search).replace(/[%_,]/g, ' ').trim();
        if (term) retryQuery = retryQuery.or(`title.ilike.%${term}%,description.ilike.%${term}%,channel_name.ilike.%${term}%`);
      }

      const { data: retryData, error: retryError, count: retryCount } = await retryQuery;
      if (retryError) {
        if (isMissingPlaylistTableError(retryError)) {
          sendSuccess(res, fallbackCatalog(queryParams, from, to), 'Playlist catalog fetched (fallback)');
          return;
        }
        throw new AppError(retryError.message, 500, 'CATALOG_LOOKUP_FAILED');
      }
      if ((retryCount ?? 0) > 0) {
        const retryPlaylists = (retryData ?? []) as PlaylistRow[];
        const [retryEnrollments, retryCompletionMap] = await Promise.all([
          getEnrollmentMap(req.user!.id),
          getCompletionMap(req.user!.id, retryPlaylists.map((playlist) => playlist.id)),
        ]);

        sendSuccess(res, {
          playlists: retryPlaylists.map((playlist) => ({
            ...playlist,
            is_enrolled: retryEnrollments.has(playlist.id),
            completion_percentage: retryCompletionMap.get(playlist.id) ?? 0,
            match_score: 0.6,
          })),
          total: retryCount ?? retryPlaylists.length,
        }, 'Playlist catalog fetched (seeded)');
        return;
      }

      sendSuccess(res, fallbackCatalog(queryParams, from, to), 'Playlist catalog fetched (fallback)');
      return;
    }

    const playlists = (data ?? []) as PlaylistRow[];
    const [enrollments, completionMap] = await Promise.all([
      getEnrollmentMap(req.user!.id),
      getCompletionMap(req.user!.id, playlists.map((playlist) => playlist.id)),
    ]);

    sendSuccess(res, {
      playlists: playlists.map((playlist) => ({
        ...playlist,
        is_enrolled: enrollments.has(playlist.id),
        completion_percentage: completionMap.get(playlist.id) ?? 0,
        match_score: 0.6,
      })),
      total: count ?? playlists.length,
    }, 'Playlist catalog fetched');
  } catch (error) {
    next(error);
  }
});

learnPathRouter.post('/enroll/:playlistId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const playlistId = routeParam(req, 'playlistId');
    await getPlaylistOrThrow(playlistId);
    const { error } = await supabaseAdmin.from('user_playlist_enrollments').upsert({
      user_id: req.user!.id,
      playlist_id: playlistId,
      is_recommended: Boolean(req.body?.is_recommended),
    }, { onConflict: 'user_id,playlist_id' });

    if (error) throw new AppError(error.message, 500, 'ENROLLMENT_FAILED');
    await updateLearningStreak(req.user!.id);
    sendSuccess(res, { enrolled: true }, 'Playlist enrolled', 201);
  } catch (error) {
    next(error);
  }
});

learnPathRouter.delete('/enroll/:playlistId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const playlistId = routeParam(req, 'playlistId');
    const { data, error } = await supabaseAdmin
      .from('user_playlist_enrollments')
      .select('completed_at')
      .eq('user_id', req.user!.id)
      .eq('playlist_id', playlistId)
      .maybeSingle();
    if (error) throw new AppError(error.message, 500, 'ENROLLMENT_LOOKUP_FAILED');
    if (data?.completed_at) throw new AppError('Completed playlists cannot be unenrolled', 409, 'PLAYLIST_ALREADY_COMPLETED');

    const deleteResult = await supabaseAdmin
      .from('user_playlist_enrollments')
      .delete()
      .eq('user_id', req.user!.id)
      .eq('playlist_id', playlistId);
    if (deleteResult.error) throw new AppError(deleteResult.error.message, 500, 'UNENROLL_FAILED');
    sendSuccess(res, { enrolled: false }, 'Playlist unenrolled');
  } catch (error) {
    next(error);
  }
});

learnPathRouter.get('/enrolled', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_playlist_enrollments')
      .select('playlist_id, completed_at, playlists(*)')
      .eq('user_id', req.user!.id)
      .order('enrolled_at', { ascending: false });
    if (error) throw new AppError(error.message, 500, 'ENROLLED_LOOKUP_FAILED');

    const rows = (data ?? []) as EnrollmentJoinRow[];
    const playlists = rows.map((row) => one(row.playlists)).filter((playlist): playlist is PlaylistRow => Boolean(playlist));
    const completionMap = await getCompletionMap(req.user!.id, playlists.map((playlist) => playlist.id));
    sendSuccess(res, playlists.map((playlist) => ({
      ...playlist,
      is_enrolled: true,
      completion_percentage: completionMap.get(playlist.id) ?? 0,
    })), 'Enrolled playlists fetched');
  } catch (error) {
    next(error);
  }
});

learnPathRouter.post('/progress/watch', async (req: AuthenticatedRequest, res, next) => {
  try {
    const videoId = String(req.body?.video_id ?? '');
    const secondsWatched = clamp(Math.round(Number(req.body?.seconds_watched ?? 0)), 0, 600);
    if (!videoId || !secondsWatched) throw new AppError('video_id and seconds_watched are required', 400, 'INVALID_PROGRESS_PAYLOAD');

    const video = await getVideoOrThrow(videoId);
    const existing = await getProgressRow(req.user!.id, videoId);
    const watchSeconds = (existing?.watch_seconds ?? 0) + secondsWatched;
    const isWatchComplete = watchSeconds >= Math.round(video.duration_seconds * 0.8);
    const newlyCompleted = isWatchComplete && !existing?.is_watch_complete;

    const { data, error } = await supabaseAdmin.from('user_video_progress').upsert({
      user_id: req.user!.id,
      video_id: video.id,
      playlist_id: video.playlist_id,
      watch_seconds: watchSeconds,
      is_watch_complete: isWatchComplete,
      quiz_attempts: existing?.quiz_attempts ?? 0,
      quiz_score: existing?.quiz_score ?? null,
      quiz_passed: existing?.quiz_passed ?? false,
      completed_at: existing?.completed_at ?? null,
      last_updated: new Date().toISOString(),
    }, { onConflict: 'user_id,video_id' }).select().single();

    if (error) throw new AppError(error.message, 500, 'WATCH_PROGRESS_FAILED');
    await updateLearningStreak(req.user!.id);
    if (newlyCompleted) await AchievementsService.awardXP(req.user!.id, 10);
    sendSuccess(res, data, 'Watch progress saved');
  } catch (error) {
    next(error);
  }
});

learnPathRouter.get('/progress/:playlistId', async (req: AuthenticatedRequest, res, next) => {
  try {
    sendSuccess(res, await getPlaylistProgress(req.user!.id, routeParam(req, 'playlistId')), 'Playlist progress fetched');
  } catch (error) {
    next(error);
  }
});

learnPathRouter.get('/quiz/:videoId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const video = await getVideoOrThrow(routeParam(req, 'videoId'));
    const progress = await getProgressRow(req.user!.id, video.id);
    if (!progress?.is_watch_complete) throw new AppError('Watch at least 80% of this video before taking the quiz', 403, 'WATCH_REQUIRED');

    const questions = await getOrGenerateQuiz(video.id);
    sendSuccess(res, shuffle(questions).map((question) => ({
      id: question.id,
      question_text: question.question_text,
      options: shuffle(question.options),
      position: question.position,
    })), 'Quiz fetched');
  } catch (error) {
    next(error);
  }
});

learnPathRouter.post('/quiz/:videoId/submit', quizSubmitRateLimiter, async (req: AuthenticatedRequest, res, next) => {
  try {
    const video = await getVideoOrThrow(routeParam(req, 'videoId'));
    const progress = await getProgressRow(req.user!.id, video.id);
    if (!progress?.is_watch_complete) throw new AppError('Watch at least 80% of this video before submitting the quiz', 403, 'WATCH_REQUIRED');

    const answers = parseAnswers(req.body);
    const { data, error } = await supabaseAdmin
      .from('video_questions')
      .select('*')
      .eq('video_id', video.id)
      .order('position');
    if (error) throw new AppError(error.message, 500, 'QUIZ_LOOKUP_FAILED');

    const questions = (data ?? []) as VideoQuestionRow[];
    if (!questions.length) throw new AppError('Quiz questions are not ready yet', 409, 'QUIZ_NOT_READY');
    const correctCount = questions.filter((question) => answers[question.id] === question.correct_option_id).length;
    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= 80;
    const bestScore = Math.max(score, progress.quiz_score ?? 0);
    const newlyPassed = passed && !progress.quiz_passed;

    const updateResult = await supabaseAdmin.from('user_video_progress').upsert({
      user_id: req.user!.id,
      video_id: video.id,
      playlist_id: video.playlist_id,
      watch_seconds: progress.watch_seconds,
      is_watch_complete: true,
      quiz_attempts: (progress.quiz_attempts ?? 0) + 1,
      quiz_score: bestScore,
      quiz_passed: progress.quiz_passed || passed,
      completed_at: progress.completed_at ?? (passed ? new Date().toISOString() : null),
      last_updated: new Date().toISOString(),
    }, { onConflict: 'user_id,video_id' });
    if (updateResult.error) throw new AppError(updateResult.error.message, 500, 'QUIZ_PROGRESS_FAILED');

    await updateLearningStreak(req.user!.id);
    if (newlyPassed) await AchievementsService.awardXP(req.user!.id, 25);
    if (passed) await maybeCompleteEnrollment(req.user!.id, video.playlist_id);

    sendSuccess(res, {
      score,
      passed,
      correct_count: correctCount,
      total: questions.length,
      explanations: questions.map((question) => ({
        question_id: question.id,
        explanation: question.explanation ?? '',
        correct_option_id: question.correct_option_id,
      })),
    }, 'Quiz submitted');
  } catch (error) {
    next(error);
  }
});

learnPathRouter.get('/certificate/:playlistId/check', async (req: AuthenticatedRequest, res, next) => {
  try {
    const progress = await getPlaylistProgress(req.user!.id, routeParam(req, 'playlistId'));
    sendSuccess(res, {
      eligible: progress.is_eligible_for_certificate,
      blockers: progress.blockers,
      videos: progress.videos.map((video) => ({
        id: video.id,
        title: video.title,
        position: video.position,
        watch_complete: video.progress.is_watch_complete,
        quiz_passed: video.progress.quiz_passed,
        quiz_score: video.progress.quiz_score,
      })),
    }, 'Certificate eligibility checked');
  } catch (error) {
    next(error);
  }
});

learnPathRouter.post('/certificate/:playlistId/generate', certificateRateLimiter, async (req: AuthenticatedRequest, res, next) => {
  try {
    const playlistId = routeParam(req, 'playlistId');
    const progress = await getPlaylistProgress(req.user!.id, playlistId);
    if (!progress.is_eligible_for_certificate) {
      throw new AppError('Complete every video and pass every quiz first', 409, 'CERTIFICATE_NOT_ELIGIBLE');
    }

    const existingResult = await supabaseAdmin
      .from('certificates')
      .select('*')
      .eq('user_id', req.user!.id)
      .eq('playlist_id', playlistId)
      .maybeSingle();
    if (existingResult.error) throw new AppError(existingResult.error.message, 500, 'CERTIFICATE_LOOKUP_FAILED');

    if (existingResult.data) {
      const certificate = existingResult.data as CertificateRow;
      const signedUrl = await signedCertificateUrl(certificate);
      sendSuccess(res, publicCertificate({ ...certificate, pdf_url: signedUrl }, progress.playlist.title), 'Certificate fetched');
      return;
    }

    const profileResult = await supabaseAdmin.from('profiles').select('full_name').eq('id', req.user!.id).maybeSingle();
    if (profileResult.error) throw new AppError(profileResult.error.message, 500, 'PROFILE_LOOKUP_FAILED');

    const code = makeCertificateCode();
    const scoreValues = progress.videos.map((video) => video.progress.quiz_score ?? 0);
    const averageScore = scoreValues.reduce((sum, value) => sum + value, 0) / Math.max(scoreValues.length, 1);
    const watchSeconds = progress.videos.reduce((sum, video) => sum + video.progress.watch_seconds, 0);
    const issuedAt = new Date();
    const pdf = await generateCertificatePDF({
      userName: profileResult.data?.full_name ?? 'ZeroGap Learner',
      playlistTitle: progress.playlist.title,
      score: averageScore,
      watchSeconds,
      code,
      issuedAt,
    });

    const storagePath = `${req.user!.id}/${playlistId}.pdf`;
    const upload = await supabaseAdmin.storage.from(CERTIFICATE_BUCKET).upload(storagePath, pdf, {
      contentType: 'application/pdf',
      upsert: true,
    });
    const signedUrl = upload.error
      ? ''
      : (await supabaseAdmin.storage.from(CERTIFICATE_BUCKET).createSignedUrl(storagePath, CERTIFICATE_SIGNED_URL_SECONDS)).data?.signedUrl ?? '';

    const { data, error } = await supabaseAdmin.from('certificates').insert({
      user_id: req.user!.id,
      playlist_id: playlistId,
      title: progress.playlist.title,
      issuer: 'ZeroGap',
      issue_date: issuedAt.toISOString().slice(0, 10),
      credential_url: `https://zerogap.io/verify/${code}`,
      file_url: signedUrl,
      skills_validated: progress.playlist.skill_tags,
      verified: true,
      certificate_code: code,
      overall_quiz_score: averageScore,
      total_watch_seconds: watchSeconds,
      pdf_url: signedUrl,
      pdf_storage_path: upload.error ? null : storagePath,
    }).select().single();
    if (error) throw new AppError(error.message, 500, 'CERTIFICATE_CREATE_FAILED');

    await AchievementsService.awardXP(req.user!.id, 200);
    sendSuccess(res, publicCertificate(data as CertificateRow, progress.playlist.title), 'Certificate generated', 201);
  } catch (error) {
    next(error);
  }
});

learnPathRouter.get('/certificate/:playlistId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const playlistId = routeParam(req, 'playlistId');
    const [certificateResult, playlist] = await Promise.all([
      supabaseAdmin
        .from('certificates')
        .select('*')
        .eq('user_id', req.user!.id)
        .eq('playlist_id', playlistId)
        .maybeSingle(),
      getPlaylistOrThrow(playlistId),
    ]);
    if (certificateResult.error) throw new AppError(certificateResult.error.message, 500, 'CERTIFICATE_LOOKUP_FAILED');
    if (!certificateResult.data) throw new AppError('Certificate not found', 404, 'CERTIFICATE_NOT_FOUND');
    const certificate = certificateResult.data as CertificateRow;
    const signedUrl = await signedCertificateUrl(certificate);
    sendSuccess(res, publicCertificate({ ...certificate, pdf_url: signedUrl }, playlist.title), 'Certificate fetched');
  } catch (error) {
    next(error);
  }
});

learnPathRouter.get('/certificates', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('certificates')
      .select('*, playlists(title)')
      .eq('user_id', req.user!.id)
      .not('playlist_id', 'is', null)
      .order('created_at', { ascending: false });
    if (error) throw new AppError(error.message, 500, 'CERTIFICATES_LOOKUP_FAILED');

    const certificates = await Promise.all((data ?? []).map(async (row) => {
      const certificate = row as CertificateRow & { playlists?: { title?: string } | { title?: string }[] | null };
      const signedUrl = await signedCertificateUrl(certificate);
      return publicCertificate({ ...certificate, pdf_url: signedUrl }, one(certificate.playlists)?.title);
    }));

    sendSuccess(res, certificates, 'Certificates fetched');
  } catch (error) {
    next(error);
  }
});

learnPathRouter.get('/stats', async (req: AuthenticatedRequest, res, next) => {
  try {
    const [enrollments, certificates, progress, xp, streak] = await Promise.all([
      supabaseAdmin.from('user_playlist_enrollments').select('id', { count: 'exact', head: true }).eq('user_id', req.user!.id),
      supabaseAdmin.from('certificates').select('id', { count: 'exact', head: true }).eq('user_id', req.user!.id).not('playlist_id', 'is', null),
      supabaseAdmin.from('user_video_progress').select('watch_seconds').eq('user_id', req.user!.id),
      supabaseAdmin.from('user_xp').select('total_xp, current_streak_days, longest_streak_days').eq('user_id', req.user!.id).maybeSingle(),
      supabaseAdmin.from('learning_streaks').select('current_streak, longest_streak').eq('user_id', req.user!.id).maybeSingle(),
    ]);

    const totalSeconds = (progress.data ?? []).reduce((sum, row) => sum + Number(row.watch_seconds ?? 0), 0);
    const data: LearnPathStats = {
      enrolled_count: enrollments.count ?? 0,
      certificates_earned: certificates.count ?? 0,
      total_watch_hours: Math.round(totalSeconds / 360) / 10,
      total_xp: Number(xp.data?.total_xp ?? 0),
      current_streak: Number(streak.data?.current_streak ?? xp.data?.current_streak_days ?? 0),
      longest_streak: Number(streak.data?.longest_streak ?? xp.data?.longest_streak_days ?? 0),
    };

    sendSuccess(res, data, 'LearnPath stats fetched');
  } catch (error) {
    next(error);
  }
});

learnPathRouter.get('/notes/:videoId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const video = await getVideoOrThrow(routeParam(req, 'videoId'));
    const { data, error } = await supabaseAdmin
      .from('user_video_notes')
      .select('*')
      .eq('user_id', req.user!.id)
      .eq('video_id', video.id)
      .maybeSingle();
    if (error) throw new AppError(error.message, 500, 'NOTE_LOOKUP_FAILED');
    sendSuccess(res, data ?? { video_id: video.id, playlist_id: video.playlist_id, note_text: '' }, 'Video note fetched');
  } catch (error) {
    next(error);
  }
});

learnPathRouter.put('/notes/:videoId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const video = await getVideoOrThrow(routeParam(req, 'videoId'));
    const noteText = String(req.body?.note_text ?? '').slice(0, 12_000);
    const { data, error } = await supabaseAdmin.from('user_video_notes').upsert({
      user_id: req.user!.id,
      video_id: video.id,
      playlist_id: video.playlist_id,
      note_text: noteText,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,video_id' }).select().single();
    if (error) throw new AppError(error.message, 500, 'NOTE_SAVE_FAILED');
    sendSuccess(res, data, 'Video note saved');
  } catch (error) {
    next(error);
  }
});

learnPathRouter.get('/notes/:playlistId/export', async (req: AuthenticatedRequest, res, next) => {
  try {
    const progress = await getPlaylistProgress(req.user!.id, routeParam(req, 'playlistId'));
    const body = progress.videos
      .map((video) => `Video ${video.position}: ${video.title}\n${video.note_text ?? ''}`.trim())
      .join('\n\n---\n\n');
    sendSuccess(res, { filename: `${progress.playlist.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-notes.txt`, content: body }, 'Notes exported');
  } catch (error) {
    next(error);
  }
});

learnPathRouter.get('/paths', async (_req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('learning_paths')
      .select('*, learning_path_playlists(step_number, playlists(*))')
      .order('created_at', { ascending: false });
    if (error) throw new AppError(error.message, 500, 'PATHS_LOOKUP_FAILED');
    sendSuccess(res, data as LearningPathRow[], 'Learning paths fetched');
  } catch (error) {
    next(error);
  }
});

learnPathRouter.post('/seed', async (_req: AuthenticatedRequest, res, next) => {
  try {
    seedDone = false;
    await autoSeedPlaylists();
    const { count, error } = await supabaseAdmin
      .from('playlists')
      .select('*', { count: 'exact', head: true });
    if (error && isMissingPlaylistTableError(error)) {
      sendSuccess(res, {
        seeded: 0,
        total_in_db: 0,
        fallback_available: HARDCODED_PLAYLISTS.length,
        schema_missing: true,
      }, 'Playlist table missing; fallback catalog is available');
      return;
    }
    if (error) throw new AppError(error.message, 500, 'PLAYLIST_SEED_COUNT_FAILED');
    sendSuccess(res, { seeded: HARDCODED_PLAYLISTS.length, total_in_db: count }, 'Playlists seeded');
  } catch (error) {
    next(error);
  }
});
