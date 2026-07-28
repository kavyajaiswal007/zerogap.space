import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Lock,
  Play,
  Send,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useSession } from '../session';
import { cn } from '../utils';
import { PROTOTYPE_MODE, PROTOTYPE_TOKEN } from '../prototypeData';
import {
  exportPlaylistNotes,
  getPlaylistProgress,
  getVideoQuiz,
  reportWatchProgress,
  saveVideoNote,
  submitQuiz,
} from './api';
import CertificateModal from './CertificateModal';
import type { Playlist, PlaylistProgressData, PlaylistVideo, QuizQuestion, QuizResult } from './types';
import { useYouTubePlayer } from './useYouTubePlayer';

interface PlaylistDetailModalProps {
  playlist: Playlist;
  onClose: () => void;
  onChanged: () => void;
}

type RightPanel = 'quiz' | 'notes';

function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}

function progressPercent(video: PlaylistVideo) {
  return Math.min(100, Math.round((video.progress.watch_seconds / Math.max(video.duration_seconds * 0.8, 1)) * 100));
}

function isLocalId(id: string) {
  return id.startsWith('local-') || id.startsWith('fallback-');
}

function firstVideoIdFromThumbnail(thumbnailUrl: string) {
  return thumbnailUrl.match(/\/vi\/([^/]+)\//)?.[1] ?? 'PkZNo7MFNFg';
}

function makeLocalProgress(playlist: Playlist): PlaylistProgressData {
  const existingCompletion = Math.round(playlist.completion_percentage ?? 0);
  const videoIds = [
    firstVideoIdFromThumbnail(playlist.thumbnail_url),
    'Ke90Tje7VS0',
    'W6NZfCO5SIk',
  ];
  const completedCount = existingCompletion >= 100 ? videoIds.length : Math.floor((existingCompletion / 100) * videoIds.length);
  const videos: PlaylistVideo[] = videoIds.map((videoId, index) => ({
    id: `${playlist.id}-video-${index + 1}`,
    playlist_id: playlist.id,
    yt_video_id: videoId,
    title: index === 0 ? `${playlist.title} - Start here` : `${playlist.title} - Practice ${index + 1}`,
    thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    duration_seconds: 720 + index * 240,
    position: index + 1,
    progress: {
      watch_seconds: index < completedCount ? 720 + index * 240 : 0,
      is_watch_complete: index < completedCount,
      quiz_passed: index < completedCount,
      quiz_score: index < completedCount ? 92 : null,
    },
    note_text: '',
  }));

  return {
    playlist,
    videos,
    completed_videos: completedCount,
    total_videos: videos.length,
    playlist_completion_percentage: existingCompletion,
    is_eligible_for_certificate: completedCount === videos.length,
    blockers: videos.filter((video) => !video.progress.quiz_passed).map((video) => `Video ${video.position}: ${video.title}`),
  };
}

function localQuizQuestions(video: PlaylistVideo): QuizQuestion[] {
  return [
    {
      id: `${video.id}-q1`,
      question_text: `What is the best next step after watching "${video.title}"?`,
      options: [
        { id: 'a', text: 'Build a small project using the concept' },
        { id: 'b', text: 'Skip practice and only read notes' },
        { id: 'c', text: 'Ignore debugging and testing' },
        { id: 'd', text: 'Memorize only the video title' },
      ],
      position: 1,
    },
    {
      id: `${video.id}-q2`,
      question_text: 'What does ZeroGap reward most in LearnPath?',
      options: [
        { id: 'a', text: 'Applied skill proof and consistent practice' },
        { id: 'b', text: 'Random clicking through lessons' },
        { id: 'c', text: 'Leaving every project unfinished' },
        { id: 'd', text: 'Avoiding portfolio evidence' },
      ],
      position: 2,
    },
    {
      id: `${video.id}-q3`,
      question_text: 'How should you use this playlist for career progress?',
      options: [
        { id: 'a', text: 'Watch, practice, note learnings, and add proof' },
        { id: 'b', text: 'Watch once without building anything' },
        { id: 'c', text: 'Only save it for later' },
        { id: 'd', text: 'Use it without reviewing your gaps' },
      ],
      position: 3,
    },
  ];
}

export default function PlaylistDetailModal({ playlist, onClose, onChanged }: PlaylistDetailModalProps) {
  const session = useSession();
  const isPrototype = PROTOTYPE_MODE || session.accessToken === PROTOTYPE_TOKEN;
  const [data, setData] = useState<PlaylistProgressData | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [rightPanel, setRightPanel] = useState<RightPanel>('quiz');
  const [quizOpen, setQuizOpen] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [certificateOpen, setCertificateOpen] = useState(false);

  const selectedVideo = useMemo(() => data?.videos.find((video) => video.id === selectedVideoId) ?? data?.videos[0] ?? null, [data, selectedVideoId]);

  const loadProgress = useCallback(async () => {
    if (!session.accessToken) return;
    if (isPrototype) {
      const next = makeLocalProgress(playlist);
      setData(next);
      setSelectedVideoId((current) => current ?? next.videos[0]?.id ?? null);
      return;
    }
    const next = await getPlaylistProgress(session.accessToken, playlist.id).catch(() => makeLocalProgress(playlist));
    setData(next);
    setSelectedVideoId((current) => current ?? next.videos[0]?.id ?? null);
  }, [isPrototype, playlist, session.accessToken]);

  useEffect(() => {
    void loadProgress();
  }, [loadProgress]);

  const handleReport = useCallback(async (seconds: number) => {
    if (!session.accessToken || !selectedVideo) return;
    if (isPrototype) {
      const progress = {
        ...selectedVideo.progress,
        watch_seconds: Math.max(selectedVideo.progress.watch_seconds, seconds),
        is_watch_complete: true,
      };
      setData((current) => current ? {
        ...current,
        videos: current.videos.map((video) => video.id === selectedVideo.id ? { ...video, progress } : video),
      } : current);
      return;
    }
    const progress = await reportWatchProgress(session.accessToken, selectedVideo.id, seconds).catch(() => null);
    if (!progress) return;
    setData((current) => current ? {
      ...current,
      videos: current.videos.map((video) => video.id === selectedVideo.id ? { ...video, progress } : video),
    } : current);
    if (progress.is_watch_complete) onChanged();
  }, [isPrototype, onChanged, selectedVideo, session.accessToken]);

  const player = useYouTubePlayer({
    videoId: selectedVideo?.yt_video_id ?? null,
    enabled: Boolean(selectedVideo && data),
    onReport: handleReport,
  });

  useEffect(() => {
    setQuestions([]);
    setAnswers({});
    setQuestionIndex(0);
    setQuizResult(null);
    setQuizOpen(false);
    setRightPanel('quiz');
  }, [selectedVideoId]);

  useEffect(() => {
    if (!selectedVideo || !session.accessToken) return undefined;
    if (isPrototype) return undefined;
    if (isLocalId(selectedVideo.id)) return undefined;
    const timeout = window.setTimeout(() => {
      setSavingNote(true);
      void saveVideoNote(session.accessToken!, selectedVideo.id, selectedVideo.note_text ?? '')
        .catch(() => null)
        .finally(() => {
          setSavingNote(false);
        });
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [isPrototype, selectedVideo?.id, selectedVideo?.note_text, session.accessToken]);

  async function openQuiz() {
    if (!session.accessToken || !selectedVideo) return;
    setRightPanel('quiz');
    setQuizOpen(true);
    setLoadingQuiz(true);
    try {
      if (isPrototype || isLocalId(selectedVideo.id)) {
        setQuestions(localQuizQuestions(selectedVideo));
        return;
      }
      setQuestions(await getVideoQuiz(session.accessToken, selectedVideo.id));
    } catch {
      setQuestions(localQuizQuestions(selectedVideo));
    } finally {
      setLoadingQuiz(false);
    }
  }

  async function handleSubmitQuiz() {
    if (!session.accessToken || !selectedVideo) return;
    setLoadingQuiz(true);
    try {
      if (isPrototype || isLocalId(selectedVideo.id)) {
        const correctCount = questions.filter((question) => answers[question.id] === 'a').length;
        const score = Math.round((correctCount / Math.max(questions.length, 1)) * 100);
        const result = {
          score,
          passed: score >= 60,
          correct_count: correctCount,
          total: questions.length,
          explanations: questions.map((question) => ({
            question_id: question.id,
            explanation: 'Practice and proof are the fastest way to close a skill gap.',
            correct_option_id: 'a',
          })),
        };
        setQuizResult(result);
        setData((current) => current ? {
          ...current,
          videos: current.videos.map((video) => video.id === selectedVideo.id ? {
            ...video,
            progress: {
              ...video.progress,
              quiz_score: Math.max(score, video.progress.quiz_score ?? 0),
              quiz_passed: video.progress.quiz_passed || result.passed,
            },
          } : video),
          completed_videos: current.videos.filter((video) => (
            video.id === selectedVideo.id ? result.passed : video.progress.quiz_passed
          )).length,
          playlist_completion_percentage: Math.round((current.videos.filter((video) => (
            video.id === selectedVideo.id ? result.passed : video.progress.quiz_passed
          )).length / Math.max(current.videos.length, 1)) * 100),
          is_eligible_for_certificate: current.videos.every((video) => (
            video.id === selectedVideo.id ? result.passed : video.progress.quiz_passed
          )),
          blockers: current.videos
            .filter((video) => !(video.id === selectedVideo.id ? result.passed : video.progress.quiz_passed))
            .map((video) => `Video ${video.position}: ${video.title}`),
        } : current);
        onChanged();
        return;
      }
      const result = await submitQuiz(session.accessToken, selectedVideo.id, answers);
      setQuizResult(result);
      await loadProgress();
      onChanged();
    } finally {
      setLoadingQuiz(false);
    }
  }

  async function handleExportNotes() {
    if (!session.accessToken || !data) return;
    if (isPrototype || isLocalId(data.playlist.id)) {
      const blob = new Blob([data.videos.map((video) => `${video.title}\n${video.note_text ?? ''}`).join('\n\n---\n\n')], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${data.playlist.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-notes.txt`;
      link.click();
      window.URL.revokeObjectURL(url);
      return;
    }
    const exported = await exportPlaylistNotes(session.accessToken, data.playlist.id);
    const blob = new Blob([exported.content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exported.filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  const activeQuestion = questions[questionIndex];
  const allAnswered = questions.length > 0 && questions.every((question) => answers[question.id]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-slate-900/35 p-2 backdrop-blur-sm md:p-5"
      >
        <motion.div
          initial={{ y: 24, scale: 0.98 }}
          animate={{ y: 0, scale: 1 }}
          exit={{ y: 24, scale: 0.98 }}
          className="flex h-full overflow-hidden rounded-[1.5rem] border-[3px] border-slate-900 bg-white shadow-[10px_10px_0px_0px_rgba(15,23,42,1)] max-lg:flex-col"
        >
          <aside className="w-full shrink-0 overflow-y-auto border-b-[3px] border-slate-900 bg-slate-50 p-4 lg:h-full lg:w-72 lg:border-b-0 lg:border-r-[3px]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-black uppercase leading-none">{playlist.title}</h2>
                <p className="mt-2 text-xs font-bold text-slate-500">{playlist.channel_name}</p>
              </div>
              <button type="button" className="neo-btn-outline !px-3 !py-2 lg:hidden" onClick={onClose}>
                <X size={16} />
              </button>
            </div>
            {!data ? (
              <div className="slab-card !p-5 text-center">
                <Loader2 className="mx-auto mb-3 animate-spin" size={22} />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading playlist</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.videos.map((video) => {
                  const active = video.id === selectedVideo?.id;
                  const done = video.progress.is_watch_complete && video.progress.quiz_passed;
                  return (
                    <button
                      type="button"
                      key={video.id}
                      onClick={() => setSelectedVideoId(video.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-2xl border-2 p-2 text-left transition-all',
                        active ? 'border-slate-900 bg-secondary shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]' : 'border-slate-200 bg-white',
                      )}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 bg-white text-[10px] font-black">
                        {video.position}
                      </span>
                      <img src={video.thumbnail_url} alt="" className="h-10 w-14 rounded-lg border-2 border-slate-900 object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-black uppercase leading-tight">{video.title}</span>
                        <span className="text-[10px] font-bold text-slate-500">{formatDuration(video.duration_seconds)}</span>
                      </span>
                      {active ? <Play size={16} /> : done ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Lock size={15} className="text-slate-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <main className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-white">
            <div className="flex items-center justify-between gap-4 border-b-[3px] border-slate-900 p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">LearnPath player</p>
                <h3 className="font-display text-2xl font-black uppercase leading-none">{selectedVideo?.title ?? 'Select a video'}</h3>
              </div>
              <button type="button" className="neo-btn-outline hidden !px-3 !py-2 lg:flex" onClick={onClose}>
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 p-4">
              {selectedVideo && (
                <>
                  <div className="overflow-hidden rounded-[1.5rem] border-[3px] border-slate-900 bg-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]">
                    <iframe
                      ref={player.playerRef}
                      title={selectedVideo.title}
                      src={`https://www.youtube.com/embed/${selectedVideo.yt_video_id}?enablejsapi=1`}
                      className="aspect-video w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div>
                      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Watch progress · {progressPercent(selectedVideo)}%
                      </p>
                      <div className="h-4 overflow-hidden rounded-full border-2 border-slate-900 bg-white">
                        <div className="h-full rounded-full bg-secondary" style={{ width: `${progressPercent(selectedVideo)}%` }} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {selectedVideo.progress.quiz_passed ? (
                        <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm font-black uppercase text-emerald-700 shadow-[3px_3px_0px_0px_rgba(16,185,129,1)]">
                          Quiz passed · {Math.round(selectedVideo.progress.quiz_score ?? 0)}%
                        </div>
                      ) : selectedVideo.progress.is_watch_complete ? (
                        <motion.button
                          animate={{ boxShadow: ['4px 4px 0px rgba(245,158,11,1)', '7px 7px 0px rgba(245,158,11,1)', '4px 4px 0px rgba(245,158,11,1)'] }}
                          transition={{ repeat: Infinity, duration: 1.6 }}
                          type="button"
                          className="neo-btn-primary"
                          onClick={openQuiz}
                        >
                          Take Quiz <ChevronRight size={18} />
                        </motion.button>
                      ) : (
                        <div className="rounded-2xl border-2 border-slate-900 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-500">
                          Watch 80% to unlock quiz
                        </div>
                      )}
                      <button type="button" className="neo-btn-outline" onClick={() => { setRightPanel('notes'); setQuizOpen(true); }}>
                        <FileText size={18} /> My Notes
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {data && (
              <footer className="sticky bottom-0 border-t-[3px] border-slate-900 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <span>{data.completed_videos}/{data.total_videos} videos complete · {data.playlist_completion_percentage}%</span>
                  {data.is_eligible_for_certificate && (
                    <button type="button" className="neo-btn-secondary !px-4 !py-2" onClick={() => setCertificateOpen(true)}>
                      <Award size={16} /> Generate Certificate
                    </button>
                  )}
                </div>
                <div className="h-3 overflow-hidden rounded-full border-2 border-slate-900 bg-slate-50">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${data.playlist_completion_percentage}%` }} />
                </div>
              </footer>
            )}
          </main>

          <AnimatePresence>
            {quizOpen && selectedVideo && (
              <motion.aside
                initial={{ x: 320, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 320, opacity: 0 }}
                className="w-full shrink-0 overflow-y-auto border-t-[3px] border-slate-900 bg-slate-50 p-4 lg:h-full lg:w-80 lg:border-l-[3px] lg:border-t-0"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="inline-flex rounded-2xl border-2 border-slate-900 bg-white p-1 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                    {(['quiz', 'notes'] as RightPanel[]).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        className={cn('rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest', rightPanel === tab && 'bg-secondary')}
                        onClick={() => setRightPanel(tab)}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  <button type="button" className="neo-btn-outline !px-3 !py-2" onClick={() => setQuizOpen(false)}>
                    <X size={16} />
                  </button>
                </div>

                {rightPanel === 'notes' ? (
                  <div className="space-y-4">
                    <textarea
                      value={selectedVideo.note_text ?? ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        setData((current) => current ? {
                          ...current,
                          videos: current.videos.map((video) => video.id === selectedVideo.id ? { ...video, note_text: value } : video),
                        } : current);
                      }}
                      className="min-h-72 w-full resize-none rounded-2xl border-[3px] border-slate-900 bg-white p-4 text-sm font-medium outline-none shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
                      placeholder="Write notes for this video..."
                    />
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{savingNote ? 'Saving' : 'Saved'}</span>
                      <button type="button" className="neo-btn-outline !px-3 !py-2 text-[10px]" onClick={handleExportNotes}>
                        <Download size={14} /> Export Notes
                      </button>
                    </div>
                  </div>
                ) : loadingQuiz ? (
                  <div className="slab-card !p-6 text-center">
                    <Loader2 className="mx-auto mb-3 animate-spin" size={24} />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading quiz</p>
                  </div>
                ) : quizResult ? (
                  <div className="space-y-4">
                    <div className="rounded-[2rem] border-[3px] border-slate-900 bg-white p-6 text-center shadow-[5px_5px_0px_0px_rgba(15,23,42,1)]">
                      <p className="font-display text-5xl font-black">{quizResult.score}%</p>
                      <p className={cn('mt-2 text-xs font-black uppercase tracking-widest', quizResult.passed ? 'text-emerald-600' : 'text-red-600')}>
                        {quizResult.passed ? 'Passed' : 'Try again'}
                      </p>
                    </div>
                    <div className="space-y-3">
                      {quizResult.explanations.map((item, index) => (
                        <div key={item.question_id} className="rounded-2xl border-2 border-slate-900 bg-white p-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Question {index + 1} · Correct {item.correct_option_id}</p>
                          <p className="mt-1 text-xs font-medium text-slate-600">{item.explanation}</p>
                        </div>
                      ))}
                    </div>
                    <button type="button" className="neo-btn-secondary w-full" onClick={() => setQuizResult(null)}>
                      {quizResult.passed ? 'Continue Learning' : 'Retry Quiz'}
                    </button>
                  </div>
                ) : activeQuestion ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Question {questionIndex + 1} of {questions.length}</p>
                      <h3 className="mt-2 font-display text-lg font-black leading-tight">{activeQuestion.question_text}</h3>
                    </div>
                    <div className="space-y-3">
                      {activeQuestion.options.map((option) => {
                        const selected = answers[activeQuestion.id] === option.id;
                        return (
                          <button
                            type="button"
                            key={option.id}
                            className={cn(
                              'w-full rounded-xl border-2 p-3 text-left text-sm font-bold transition-all',
                              selected ? 'border-slate-900 bg-sky-50 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]' : 'border-slate-200 bg-white',
                            )}
                            onClick={() => setAnswers((current) => ({ ...current, [activeQuestion.id]: option.id }))}
                          >
                            <span className="mr-2 font-black uppercase">{option.id}.</span>{option.text}
                          </button>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" className="neo-btn-outline !px-3" disabled={questionIndex === 0} onClick={() => setQuestionIndex((value) => Math.max(0, value - 1))}>
                        <ChevronLeft size={16} /> Previous
                      </button>
                      {questionIndex === questions.length - 1 ? (
                        <button type="button" className="neo-btn-primary !px-3" disabled={!allAnswered} onClick={handleSubmitQuiz}>
                          <Send size={16} /> Submit
                        </button>
                      ) : (
                        <button type="button" className="neo-btn-secondary !px-3" onClick={() => setQuestionIndex((value) => Math.min(questions.length - 1, value + 1))}>
                          Next <ChevronRight size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="slab-card !p-6 text-center">
                    <p className="text-sm font-black uppercase text-slate-500">Quiz is ready after watch completion.</p>
                  </div>
                )}
              </motion.aside>
            )}
          </AnimatePresence>
        </motion.div>

        {certificateOpen && data && (
          <CertificateModal
            playlistProgress={data}
            onClose={() => setCertificateOpen(false)}
            onGenerated={() => {
              void loadProgress();
              onChanged();
            }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
