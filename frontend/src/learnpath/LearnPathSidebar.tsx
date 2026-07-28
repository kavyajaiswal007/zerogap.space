import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Award, BookOpen, Copy, Flame, Loader2, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useSession } from '../session';
import { cn } from '../utils';
import { PROTOTYPE_MODE, PROTOTYPE_TOKEN } from '../prototypeData';
import { enrollInPlaylist } from './api';
import { useLearnPath } from './LearnPathContext';
import PlaylistCard from './PlaylistCard';
import PlaylistDetailModal from './PlaylistDetailModal';
import type { LearnPathTab, Playlist } from './types';

const tabs: Array<{ id: LearnPathTab; label: string }> = [
  { id: 'recommended', label: 'For You' },
  { id: 'enrolled', label: 'My Learning' },
  { id: 'certificates', label: 'Certificates' },
];

export function LearnPathSidebarToggle() {
  const { openSidebar, recommendedPlaylists, enrolledPlaylists } = useLearnPath();
  const count = recommendedPlaylists.filter((playlist) => !playlist.is_enrolled && !enrolledPlaylists.some((item) => item.id === playlist.id)).length;

  return (
    <button
      type="button"
      aria-label="Open LearnPath"
      onClick={() => openSidebar('recommended')}
      className="fixed right-0 top-1/2 z-[120] flex h-20 w-11 -translate-y-1/2 items-center justify-center rounded-l-2xl border-[2px] border-r-0 border-slate-900 bg-secondary shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all hover:w-12"
    >
      <BookOpen size={20} strokeWidth={3} />
      {count > 0 && (
        <motion.span
          initial={{ scale: 0.7 }}
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
          className="absolute -left-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-slate-900 bg-accent px-1 text-[10px] font-black text-white"
        >
          {Math.min(99, count)}
        </motion.span>
      )}
    </button>
  );
}

export default function LearnPathSidebar() {
  const navigate = useNavigate();
  const session = useSession();
  const {
    activeTab,
    certificates,
    closeSidebar,
    enrolledPlaylists,
    isLoading,
    isSidebarOpen,
    openSidebar,
    recommendedPlaylists,
    refreshData,
    setActiveTab,
    setSkillFilter,
    skillFilter,
    stats,
  } = useLearnPath();
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const filteredRecommended = useMemo(() => {
    if (!skillFilter) return recommendedPlaylists;
    const needle = skillFilter.toLowerCase();
    return recommendedPlaylists.filter((playlist) => playlist.skill_tags.some((tag) => tag.toLowerCase().includes(needle)));
  }, [recommendedPlaylists, skillFilter]);

  async function handleEnroll(playlist: Playlist) {
    if (!session.accessToken) return;
    if (PROTOTYPE_MODE || session.accessToken === PROTOTYPE_TOKEN) {
      setActiveTab('enrolled');
      return;
    }
    setBusyId(playlist.id);
    try {
      await enrollInPlaylist(session.accessToken, playlist.id);
      await refreshData();
      setActiveTab('enrolled');
    } finally {
      setBusyId(null);
    }
  }

  function openLearnPage() {
    closeSidebar();
    navigate('/learn');
  }

  return (
    <>
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[130] bg-slate-900/20 backdrop-blur-[2px] lg:hidden"
              onClick={closeSidebar}
            />
            <motion.aside
              initial={{ x: 340, y: 0 }}
              animate={{ x: 0, y: 0 }}
              exit={{ x: 340, y: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed bottom-0 right-0 z-[140] flex h-[85vh] w-full flex-col rounded-t-[1.75rem] border-[3px] border-b-0 border-slate-900 bg-white shadow-[-8px_0px_0px_0px_rgba(15,23,42,1)] lg:top-0 lg:h-full lg:w-80 lg:rounded-none lg:border-y-0 lg:border-l-[3px] lg:border-r-0"
            >
              <header className="border-b-[3px] border-slate-900 p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-black uppercase leading-none">LearnPath</h2>
                    <p className="mt-1 text-xs font-bold text-slate-500">Recommended for you</p>
                  </div>
                  <button type="button" className="neo-btn-outline !px-3 !py-2" onClick={closeSidebar}>
                    <X size={16} />
                  </button>
                </div>
                <div className="mb-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border-2 border-slate-900 bg-amber-50 px-3 py-2">
                    <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
                      <Flame size={13} /> {stats?.current_streak ?? 0} day streak
                    </p>
                  </div>
                  <div className="rounded-xl border-2 border-slate-900 bg-sky-50 px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">{stats?.total_xp ?? 0} XP</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={cn(
                        'rounded-xl border-2 border-slate-900 px-2 py-2 text-[9px] font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all',
                        activeTab === tab.id ? 'bg-secondary text-slate-900' : 'bg-white text-slate-500',
                      )}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {isLoading && (
                  <div className="mb-4 flex items-center gap-2 rounded-2xl border-2 border-slate-900 bg-slate-50 p-3 text-xs font-black uppercase tracking-widest text-slate-500">
                    <Loader2 className="animate-spin" size={14} /> Syncing LearnPath
                  </div>
                )}

                {activeTab === 'recommended' && (
                  <div className="space-y-4">
                    {skillFilter && (
                      <div className="flex items-center justify-between gap-2 rounded-2xl border-2 border-slate-900 bg-sky-50 p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">Filtered: {skillFilter}</p>
                        <button type="button" className="text-[10px] font-black uppercase text-slate-500" onClick={() => setSkillFilter(null)}>
                          Clear
                        </button>
                      </div>
                    )}
                    {filteredRecommended.length ? filteredRecommended.map((playlist) => (
                      <PlaylistCard
                        key={playlist.id}
                        playlist={playlist}
                        compact
                        isBusy={busyId === playlist.id}
                        onEnroll={handleEnroll}
                        onOpen={setSelectedPlaylist}
                      />
                    )) : (
                      <div className="slab-card !p-5 text-center">
                        <Search className="mx-auto mb-3 text-slate-400" size={24} />
                        <p className="text-sm font-black uppercase">Complete your profile to get personalized recommendations.</p>
                        <Link to="/profile" className="neo-btn-secondary mt-4 !px-4 !py-2 text-[10px]" onClick={closeSidebar}>
                          Open Profile
                        </Link>
                      </div>
                    )}
                    <button type="button" className="neo-btn-secondary w-full" onClick={openLearnPage}>
                      Browse All 100 Playlists
                    </button>
                  </div>
                )}

                {activeTab === 'enrolled' && (
                  <div className="space-y-4">
                    {enrolledPlaylists.length ? enrolledPlaylists.map((playlist) => (
                      <PlaylistCard key={playlist.id} playlist={playlist} compact onOpen={setSelectedPlaylist} />
                    )) : (
                      <div className="slab-card !p-5 text-center">
                        <BookOpen className="mx-auto mb-3 text-slate-400" size={24} />
                        <p className="text-sm font-black uppercase">No playlists enrolled yet.</p>
                        <button type="button" className="neo-btn-outline mt-4 !px-4 !py-2 text-[10px]" onClick={() => openSidebar('recommended')}>
                          Browse Recommendations
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'certificates' && (
                  <div className="space-y-4">
                    {certificates.length ? certificates.map((certificate) => {
                      const verificationUrl = `https://zerogap.io/verify/${certificate.certificate_code}`;
                      return (
                        <div key={certificate.id} className="slab-card !rounded-2xl !p-4">
                          <div className="mb-3 flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 bg-accent text-white">
                              <Award size={21} />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-display text-sm font-black uppercase leading-tight">{certificate.playlist_title}</h3>
                              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {Math.round(certificate.overall_quiz_score)}% · {new Date(certificate.issued_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <a href={certificate.pdf_url} target="_blank" rel="noreferrer" className="neo-btn-primary !px-3 !py-2 text-[10px]">
                              Download
                            </a>
                            <button
                              type="button"
                              className="neo-btn-outline !px-3 !py-2 text-[10px]"
                              onClick={() => {
                                void navigator.clipboard.writeText(verificationUrl);
                                setCopiedCode(certificate.certificate_code);
                                window.setTimeout(() => setCopiedCode(null), 1200);
                              }}
                            >
                              <Copy size={13} /> {copiedCode === certificate.certificate_code ? 'Copied' : 'Share'}
                            </button>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="slab-card !p-5 text-center">
                        <Award className="mx-auto mb-3 text-slate-400" size={24} />
                        <p className="text-sm font-black uppercase">Complete a playlist to earn your first certificate.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {selectedPlaylist && (
        <PlaylistDetailModal
          playlist={selectedPlaylist}
          onClose={() => setSelectedPlaylist(null)}
          onChanged={() => {
            void refreshData();
          }}
        />
      )}
    </>
  );
}
