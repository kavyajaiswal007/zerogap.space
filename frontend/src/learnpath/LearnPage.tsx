import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Award, BookOpen, Clock3, Loader2, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { useSession } from '../session';
import { cn } from '../utils';
import { enrollInPlaylist, getLearningPaths, getPlaylistCatalog } from './api';
import { useLearnPath } from './LearnPathContext';
import PlaylistCard from './PlaylistCard';
import PlaylistDetailModal from './PlaylistDetailModal';
import type { LearningPath, Playlist, PlaylistDifficulty } from './types';
import { KAVYA_ANALYSIS, KAVYA_PLAYLISTS, PROTOTYPE_MODE, PROTOTYPE_TOKEN } from '../prototypeData';
import { VINEET_ANALYSIS, VINEET_PLAYLISTS, VINEET_TOKEN } from '../vineetData';

// Shows while API loads - replaced by real data on response.
const STATIC_FALLBACK_PLAYLISTS: Playlist[] = [
  { id: 'f1', yt_playlist_id: 'PLu0W_9lII9agx66oZnT6-n3iF1k9s2g4K', title: 'React JS Full Course', description: null, channel_name: 'Codevolution', thumbnail_url: 'https://i.ytimg.com/vi/QFaFIcGhPoM/hqdefault.jpg', total_videos: 30, total_duration_seconds: 27000, skill_tags: ['React', 'JavaScript', 'Frontend'], difficulty: 'beginner', category: 'Web Development - Frontend', match_score: 0.6, is_enrolled: false, completion_percentage: 0 },
  { id: 'f2', yt_playlist_id: 'PL0Zuz27SZ-6PRCpm9clX0WiBEMB70FWwd', title: 'HTML & CSS Full Course', description: null, channel_name: 'Dave Gray', thumbnail_url: 'https://i.ytimg.com/vi/mJgBOIoGihA/hqdefault.jpg', total_videos: 22, total_duration_seconds: 36000, skill_tags: ['HTML', 'CSS', 'Responsive UI'], difficulty: 'beginner', category: 'Web Development - Frontend', match_score: 0.6, is_enrolled: false, completion_percentage: 0 },
  { id: 'f3', yt_playlist_id: 'PL0Zuz27SZ-6Oi6xNtL_fwCrwpuqylMsgT', title: 'JavaScript Full Course', description: null, channel_name: 'Dave Gray', thumbnail_url: 'https://i.ytimg.com/vi/EfAl9bwzVZk/hqdefault.jpg', total_videos: 26, total_duration_seconds: 43200, skill_tags: ['JavaScript', 'ES6', 'Frontend'], difficulty: 'beginner', category: 'Web Development - Frontend', match_score: 0.6, is_enrolled: false, completion_percentage: 0 },
  { id: 'f4', yt_playlist_id: 'PLDzeHZWIZsTryvtXdMr6rPh4IDexB5NIA', title: 'DSA with Java - Interview Prep', description: null, channel_name: 'CodeWithHarry', thumbnail_url: 'https://i.ytimg.com/vi/AT14lCXuMKI/hqdefault.jpg', total_videos: 60, total_duration_seconds: 72000, skill_tags: ['DSA', 'Java', 'Interview'], difficulty: 'intermediate', category: 'DSA & CS Fundamentals', match_score: 0.6, is_enrolled: false, completion_percentage: 0 },
  { id: 'f5', yt_playlist_id: 'PLQVvvaa0QuDcjD5BAw2DxE6OF2tius3V3', title: 'Machine Learning with Python', description: null, channel_name: 'Sentdex', thumbnail_url: 'https://i.ytimg.com/vi/OGxgnH8y2NM/hqdefault.jpg', total_videos: 30, total_duration_seconds: 36000, skill_tags: ['Machine Learning', 'Python'], difficulty: 'intermediate', category: 'Data Science & ML', match_score: 0.6, is_enrolled: false, completion_percentage: 0 },
  { id: 'f6', yt_playlist_id: 'PLWKjhJtqVAblpP3C6q6Yx2S5Z7Z7Z7Z7Z', title: 'Docker Complete Course', description: null, channel_name: 'TechWorld with Nana', thumbnail_url: 'https://i.ytimg.com/vi/3c-iBn73dDE/hqdefault.jpg', total_videos: 20, total_duration_seconds: 25200, skill_tags: ['Docker', 'DevOps', 'Containers'], difficulty: 'beginner', category: 'DevOps & Cloud', match_score: 0.6, is_enrolled: false, completion_percentage: 0 },
  { id: 'f7', yt_playlist_id: 'PLu0W_9lII9agS67Uits0UnJyrYiXhDS6q', title: 'Android Dev with Kotlin', description: null, channel_name: 'Philipp Lackner', thumbnail_url: 'https://i.ytimg.com/vi/EExSSotojVI/hqdefault.jpg', total_videos: 35, total_duration_seconds: 63000, skill_tags: ['Android', 'Kotlin', 'Mobile'], difficulty: 'beginner', category: 'Mobile Development', match_score: 0.6, is_enrolled: false, completion_percentage: 0 },
  { id: 'f8', yt_playlist_id: 'PLMCXHnjXnTnvo6alSjVkgxV-VH6EPyvoX', title: 'System Design Masterclass', description: null, channel_name: 'Gaurav Sen', thumbnail_url: 'https://i.ytimg.com/vi/quLrc3PbuIw/hqdefault.jpg', total_videos: 25, total_duration_seconds: 36000, skill_tags: ['System Design', 'Architecture'], difficulty: 'advanced', category: 'System Design', match_score: 0.6, is_enrolled: false, completion_percentage: 0 },
  { id: 'f9', yt_playlist_id: 'PLfqMhTWNBTe0b2nM6JHVCnAkhQRGiZMSJ', title: 'FAANG DSA Sheet - Striver', description: null, channel_name: 'Striver', thumbnail_url: 'https://i.ytimg.com/vi/0IAPZzGSbME/hqdefault.jpg', total_videos: 80, total_duration_seconds: 108000, skill_tags: ['DSA', 'LeetCode', 'FAANG'], difficulty: 'advanced', category: 'DSA & CS Fundamentals', match_score: 0.6, is_enrolled: false, completion_percentage: 0 },
  { id: 'f10', yt_playlist_id: 'PLBf0hzazHTGOEuhPQSnq-Ej8jRyXxfYvl', title: 'Ethical Hacking Full Course', description: null, channel_name: 'freeCodeCamp', thumbnail_url: 'https://i.ytimg.com/vi/3Kq1MIfTWCE/hqdefault.jpg', total_videos: 20, total_duration_seconds: 50400, skill_tags: ['Ethical Hacking', 'Security'], difficulty: 'intermediate', category: 'Cybersecurity', match_score: 0.6, is_enrolled: false, completion_percentage: 0 },
];

const STATIC_FALLBACK_IDS = new Set(STATIC_FALLBACK_PLAYLISTS.map((playlist) => playlist.id));

const categories = [
  'All',
  'Web Development - Frontend',
  'Web Development - Backend',
  'Data Science & ML',
  'DevOps & Cloud',
  'Databases',
  'System Design',
  'DSA & CS Fundamentals',
  'Mobile Development',
  'Cybersecurity',
  'Soft Skills & Career',
];

const CATEGORY_ICONS: Record<string, string> = {
  All: '🌐',
  'Web Development - Frontend': '⚛️',
  'Web Development - Backend': '🔧',
  'Data Science & ML': '🤖',
  'DevOps & Cloud': '☁️',
  Databases: '🗄️',
  'System Design': '🏗️',
  'DSA & CS Fundamentals': '🧠',
  'Mobile Development': '📱',
  Cybersecurity: '🔒',
  'Soft Skills & Career': '🚀',
};

const difficulties: Array<PlaylistDifficulty | 'all'> = ['all', 'beginner', 'intermediate', 'advanced'];

function shortCategory(category: string) {
  if (category === 'Web Development - Frontend') return 'Frontend';
  if (category === 'Web Development - Backend') return 'Backend';
  if (category === 'Data Science & ML') return 'ML / AI';
  if (category === 'DSA & CS Fundamentals') return 'DSA';
  if (category === 'Soft Skills & Career') return 'Career';
  return category;
}

function isLocalPlaylist(playlistId: string) {
  return STATIC_FALLBACK_IDS.has(playlistId) || playlistId.startsWith('local-') || playlistId.startsWith('fallback-');
}

function filterLocalPlaylists(category: string, difficulty: PlaylistDifficulty | 'all', search: string) {
  return filterPlaylists(STATIC_FALLBACK_PLAYLISTS, category, difficulty, search);
}

function filterPlaylists(source: Playlist[], category: string, difficulty: PlaylistDifficulty | 'all', search: string) {
  const normalizedSearch = search.trim().toLowerCase();
  const matchesCategoryAndDifficulty = (playlist: Playlist) => {
    if (category !== 'All' && playlist.category !== category) return false;
    if (difficulty !== 'all' && playlist.difficulty !== difficulty) return false;
    return true;
  };
  const matchesSearch = (playlist: Playlist) => {
    if (!normalizedSearch) return true;
    return [
      playlist.title,
      playlist.description ?? '',
      playlist.channel_name,
      playlist.category,
      ...playlist.skill_tags,
    ].some((value) => value.toLowerCase().includes(normalizedSearch));
  };

  const exact = source.filter((playlist) => matchesCategoryAndDifficulty(playlist) && matchesSearch(playlist));
  if (exact.length) return exact;

  const withoutSearch = source.filter(matchesCategoryAndDifficulty);
  if (withoutSearch.length) return withoutSearch;

  const categoryOnly = source.filter((playlist) => category === 'All' || playlist.category === category);
  return categoryOnly.length ? categoryOnly : source;
}

export default function LearnPage() {
  const session = useSession();
  const learnPath = useLearnPath();
  const isVineet = session.accessToken === VINEET_TOKEN;
  const activePrototypePlaylists = (isVineet ? VINEET_PLAYLISTS : KAVYA_PLAYLISTS) as unknown as Playlist[];
  const activeAnalysis = isVineet ? VINEET_ANALYSIS : KAVYA_ANALYSIS;
  const isPrototypeSession = PROTOTYPE_MODE || session.accessToken === PROTOTYPE_TOKEN || session.accessToken === VINEET_TOKEN;
  const [searchParams, setSearchParams] = useSearchParams();
  const [category, setCategory] = useState(searchParams.get('category') ?? 'All');
  const [difficulty, setDifficulty] = useState<PlaylistDifficulty | 'all'>((searchParams.get('difficulty') as PlaylistDifficulty | null) ?? 'all');
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [page, setPage] = useState(Number(searchParams.get('page') ?? 1) || 1);
  const [playlists, setPlaylists] = useState<Playlist[]>(activePrototypePlaylists);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [total, setTotal] = useState(activePrototypePlaylists.length);
  const [loading, setLoading] = useState(false);
  const [localEnrolledIds, setLocalEnrolledIds] = useState<Set<string>>(() => new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [missingSkillsFromProfile, setMissingSkillsFromProfile] = useState<string[]>([]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (category !== 'All') next.set('category', category);
    if (difficulty !== 'all') next.set('difficulty', difficulty);
    if (debouncedSearch) next.set('search', debouncedSearch);
    if (page > 1) next.set('page', String(page));
    setSearchParams(next, { replace: true });
  }, [category, debouncedSearch, difficulty, page, setSearchParams]);

  useEffect(() => {
    if (!session.accessToken) return;
    if (session.accessToken && isPrototypeSession) {
      const nextPlaylists = filterPlaylists(activePrototypePlaylists, category, difficulty, debouncedSearch);
      setPlaylists(nextPlaylists);
      setTotal(nextPlaylists.length);
      setPaths([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    void Promise.all([
      getPlaylistCatalog(session.accessToken, {
        category,
        difficulty,
        search: debouncedSearch,
        page,
        limit: 20,
      }).catch(() => ({ playlists: [], total: 0 })),
      getLearningPaths(session.accessToken).catch(() => []),
    ]).then(([catalog, nextPaths]) => {
      setPlaylists((current) => {
        if (catalog.playlists.length === 0) return [];
        return page === 1 ? catalog.playlists : [...current.filter((playlist) => !isLocalPlaylist(playlist.id)), ...catalog.playlists];
      });
      setTotal(catalog.playlists.length > 0 ? catalog.total : 0);
      setPaths(nextPaths);
    }).finally(() => setLoading(false));
  }, [activePrototypePlaylists, category, debouncedSearch, difficulty, isPrototypeSession, page, session.accessToken]);

  useEffect(() => {
    setMissingSkillsFromProfile(session.accessToken ? activeAnalysis.missing_skills : []);
  }, [activeAnalysis, session.accessToken]);

  useEffect(() => {
    setPage(1);
    if (session.accessToken && isPrototypeSession) {
      const nextPlaylists = filterPlaylists(activePrototypePlaylists, category, difficulty, debouncedSearch);
      setPlaylists(nextPlaylists);
      setTotal(nextPlaylists.length);
      return;
    }
    setPlaylists([]);
    setTotal(0);
  }, [activePrototypePlaylists, category, difficulty, debouncedSearch, isPrototypeSession, session.accessToken]);

  async function handleEnroll(playlist: Playlist) {
    if (!session.accessToken) return;
    if (isPrototypeSession || isLocalPlaylist(playlist.id)) {
      setLocalEnrolledIds((current) => new Set(current).add(playlist.id));
      setPlaylists((current) => current.map((item) => item.id === playlist.id ? { ...item, is_enrolled: true, completion_percentage: 0 } : item));
      return;
    }

    setBusyId(playlist.id);
    try {
      await enrollInPlaylist(session.accessToken, playlist.id);
      await learnPath.refreshData();
      setPlaylists((current) => current.map((item) => item.id === playlist.id ? { ...item, is_enrolled: true, completion_percentage: 0 } : item));
    } finally {
      setBusyId(null);
    }
  }

  const fallbackPlaylists = filterLocalPlaylists(category, difficulty, debouncedSearch).map((playlist) => ({
    ...playlist,
    is_enrolled: localEnrolledIds.has(playlist.id) || playlist.is_enrolled,
  }));
  const hasCatalogPlaylists = playlists.length > 0;
  const displayPlaylists = hasCatalogPlaylists ? playlists : fallbackPlaylists;
  const displayTotal = hasCatalogPlaylists ? total : fallbackPlaylists.length;
  const canLoadMore = !PROTOTYPE_MODE && session.accessToken !== PROTOTYPE_TOKEN && session.accessToken !== VINEET_TOKEN && hasCatalogPlaylists && playlists.length < total;

  return (
    <div className="min-h-screen bg-soft-lavender px-6 py-8 text-left">
      <section className="dot-pattern mb-8 rounded-[2.5rem] border-[3px] border-slate-900 bg-white p-7 shadow-[10px_10px_0px_0px_rgba(15,23,42,1)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border-2 border-slate-900 bg-secondary px-3 py-1.5 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              <BookOpen size={12} /> LearnPath — Skill Gap Courses
            </div>
            <h1 className="font-display text-5xl font-black uppercase leading-none tracking-tight md:text-6xl">
              Learn. Quiz.<br />Get Certified.
            </h1>
            <p className="mt-4 font-medium text-slate-500">
              Every playlist is curated to close your specific skill gap. Watch videos, pass MCQ quizzes, earn certificates that go straight into your resume.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Enrolled', value: learnPath.stats?.enrolled_count ?? learnPath.enrolledPlaylists.length, color: 'bg-secondary' },
              { label: 'Certificates', value: learnPath.stats?.certificates_earned ?? learnPath.certificates.length, color: 'bg-primary text-white' },
              { label: 'Hours Watched', value: `${learnPath.stats?.total_watch_hours ?? 0}h`, color: 'bg-accent' },
              { label: 'Day Streak', value: learnPath.stats?.current_streak ?? 0, color: 'bg-emerald-100 text-emerald-800' },
            ].map((stat) => (
              <div key={stat.label} className={cn('slab-card flex min-w-[80px] flex-col items-center !rounded-2xl !p-4', stat.color)}>
                <span className="font-display text-2xl font-black leading-none">{stat.value}</span>
                <span className="mt-1 text-[8px] font-black uppercase tracking-widest opacity-70">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3 border-t-2 border-slate-100 pt-6 sm:grid-cols-3">
          {[
            {
              icon: '🎯',
              title: 'Gap-Matched Courses',
              desc: 'Every recommendation is based on your skill gap analysis, not generic algorithms.',
            },
            {
              icon: '📜',
              title: 'Verified Certificates',
              desc: 'Pass video MCQ quizzes, earn proof, and add it to your ZeroGap resume.',
            },
            {
              icon: '🔥',
              title: 'Streak + XP System',
              desc: 'Watch daily to maintain your streak. XP earns badges on your public profile.',
            },
          ].map((feature) => (
            <div key={feature.title} className="flex items-start gap-3 rounded-2xl border-2 border-slate-100 bg-slate-50 p-4">
              <span className="text-2xl">{feature.icon}</span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest">{feature.title}</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {missingSkillsFromProfile.length > 0 && (
        <section className="mb-6 rounded-[2rem] border-2 border-slate-900 bg-slate-900 p-6 text-white shadow-[6px_6px_0px_0px_rgba(56,189,248,1)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                ZeroGap Intelligence — Skill Gap Detected
              </p>
              <p className="font-display text-lg font-black uppercase italic">
                We found courses for your top gaps:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {missingSkillsFromProfile.slice(0, 4).map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => {
                      setSearch(skill);
                      setCategory('All');
                    }}
                    className="rounded-lg border-2 border-secondary bg-secondary px-3 py-1.5 text-[10px] font-black uppercase text-slate-900 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)] hover:brightness-110"
                  >
                    🎯 {skill}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => learnPath.openSidebar('recommended', missingSkillsFromProfile[0])}
              className="neo-btn-secondary h-12 shrink-0 !px-6 text-[10px]"
            >
              View My Recommendations →
            </button>
          </div>
        </section>
      )}

      {paths.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 font-display text-lg font-black uppercase">
            Guided Paths — Start to Finish
          </h2>
          <div className="-mx-2 flex gap-4 overflow-x-auto px-2 pb-3">
            {paths.map((path) => {
              const stepCount = path.learning_path_playlists?.length ?? 0;
              return (
                <motion.button
                  key={path.id}
                  type="button"
                  whileHover={{ y: -3 }}
                  className="slab-card w-64 shrink-0 cursor-pointer text-left !rounded-2xl !p-5"
                  onClick={() => setCategory(path.category)}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded-lg border-2 border-slate-900 bg-secondary px-2 py-1 text-[9px] font-black uppercase tracking-widest">
                      {path.badge_label ?? 'Path'}
                    </span>
                    <span className="text-[9px] font-black text-slate-400">{stepCount} playlists</span>
                  </div>
                  <h3 className="mb-2 font-display text-sm font-black uppercase leading-tight tracking-tight">
                    {path.title}
                  </h3>
                  <p className="line-clamp-2 text-[9px] font-medium text-slate-500">{path.description}</p>
                  <div className="mt-3 flex gap-1">
                    {Array.from({ length: Math.max(1, stepCount) }, (_item, index) => (
                      <div key={index} className="h-1.5 flex-1 rounded-full border border-slate-300 bg-secondary/40" />
                    ))}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>
      )}

      <section className="mb-8 rounded-[2rem] border-[3px] border-slate-900 bg-white p-4 shadow-[7px_7px_0px_0px_rgba(15,23,42,1)]">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto_auto] xl:items-center">
          <div className="flex flex-wrap gap-2">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl border-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all active:translate-x-0.5 active:shadow-none',
                  category === item
                    ? 'border-slate-900 bg-primary text-white'
                    : 'border-slate-900 bg-white text-slate-900 hover:bg-secondary/20',
                )}
              >
                <span>{CATEGORY_ICONS[item] ?? '📚'}</span>
                <span className="hidden sm:inline">{shortCategory(item)}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {difficulties.map((item) => (
              <button
                key={item}
                type="button"
                className={cn(
                  'rounded-xl border-2 border-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]',
                  difficulty === item ? 'bg-accent text-white' : 'bg-white text-slate-500',
                )}
                onClick={() => setDifficulty(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <label className="flex min-w-64 items-center gap-2 rounded-xl border-[2px] border-slate-900 bg-white px-3 py-2 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <Search size={16} className="text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search playlists"
              className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none"
            />
          </label>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-black uppercase">Playlist library</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{displayTotal} found</p>
        </div>

        {loading && displayPlaylists.length === 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_item, index) => (
              <div key={index} className="slab-card h-72 animate-pulse !rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {displayPlaylists.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                isBusy={busyId === playlist.id}
                onEnroll={handleEnroll}
                onOpen={setSelectedPlaylist}
              />
            ))}
          </div>
        )}

        {canLoadMore && (
          <div className="mt-8 flex justify-center">
            <button type="button" className="neo-btn-outline" onClick={() => setPage((value) => value + 1)} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Clock3 size={18} />} Load More
            </button>
          </div>
        )}
      </section>

      {learnPath.certificates.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 font-display text-2xl font-black uppercase">My certificates</h2>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {learnPath.certificates.map((certificate) => (
              <a
                key={certificate.id}
                href={certificate.pdf_url}
                target="_blank"
                rel="noreferrer"
                className="slab-card min-w-72 !rounded-2xl !p-5 shadow-[4px_4px_0px_0px_rgba(245,158,11,1)]"
              >
                <Award className="mb-4 text-accent" size={30} />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">ZeroGap Certificate</p>
                <h3 className="mt-2 font-display text-xl font-black uppercase leading-tight">{certificate.playlist_title}</h3>
                <p className="mt-3 text-xs font-black uppercase tracking-widest text-slate-500">
                  {Math.round(certificate.overall_quiz_score)}% score
                </p>
              </a>
            ))}
          </div>
        </section>
      )}

      {selectedPlaylist && (
        <PlaylistDetailModal
          playlist={selectedPlaylist}
          onClose={() => setSelectedPlaylist(null)}
          onChanged={() => {
            void learnPath.refreshData();
          }}
        />
      )}
    </div>
  );
}
