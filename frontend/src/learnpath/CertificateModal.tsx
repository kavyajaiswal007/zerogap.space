import { useState } from 'react';
import { Award, CheckCircle2, Copy, Download, ExternalLink, Loader2, XCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useSession } from '../session';
import { cn } from '../utils';
import { PROTOTYPE_MODE, PROTOTYPE_TOKEN } from '../prototypeData';
import { checkCertificateEligibility, generateCertificate } from './api';
import type { Certificate, CertificateEligibility, PlaylistProgressData } from './types';

interface CertificateModalProps {
  playlistProgress: PlaylistProgressData;
  onClose: () => void;
  onGenerated: () => void;
}

function certificateSkillName(playlistProgress: PlaylistProgressData) {
  return playlistProgress.playlist.skill_tags[0] ?? playlistProgress.playlist.category;
}

export default function CertificateModal({ playlistProgress, onClose, onGenerated }: CertificateModalProps) {
  const session = useSession();
  const isPrototype = PROTOTYPE_MODE || session.accessToken === PROTOTYPE_TOKEN;
  const [eligibility, setEligibility] = useState<CertificateEligibility | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function checkEligibility() {
    if (!session.accessToken) return;
    setLoading(true);
    try {
      if (isPrototype) {
        setEligibility({
          eligible: playlistProgress.is_eligible_for_certificate,
          blockers: playlistProgress.blockers,
          videos: playlistProgress.videos.map((video) => ({
            id: video.id,
            title: video.title,
            position: video.position,
            watch_complete: video.progress.is_watch_complete,
            quiz_passed: video.progress.quiz_passed,
            quiz_score: video.progress.quiz_score,
          })),
        });
        return;
      }
      setEligibility(await checkCertificateEligibility(session.accessToken, playlistProgress.playlist.id));
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    if (!session.accessToken) return;
    setLoading(true);
    try {
      if (isPrototype) {
        const skillName = certificateSkillName(playlistProgress);
        setCertificate({
          id: `proto-cert-${playlistProgress.playlist.id}`,
          playlist_id: playlistProgress.playlist.id,
          playlist_title: skillName,
          certificate_code: `ZG-${playlistProgress.playlist.id.toUpperCase()}-2026`,
          issued_at: new Date().toISOString(),
          overall_quiz_score: 92,
          total_watch_seconds: playlistProgress.videos.reduce((sum, video) => sum + video.progress.watch_seconds, 0),
          pdf_url: `https://placehold.co/1200x800/0f172a/f8fafc?text=${encodeURIComponent(`${skillName} Certificate`)}`,
        });
        onGenerated();
        return;
      }
      const next = await generateCertificate(session.accessToken, playlistProgress.playlist.id);
      setCertificate(next);
      onGenerated();
    } finally {
      setLoading(false);
    }
  }

  const videos = eligibility?.videos ?? playlistProgress.videos.map((video) => ({
    id: video.id,
    title: video.title,
    position: video.position,
    watch_complete: video.progress.is_watch_complete,
    quiz_passed: video.progress.quiz_passed,
    quiz_score: video.progress.quiz_score,
  }));
  const ready = eligibility?.eligible ?? playlistProgress.is_eligible_for_certificate;
  const verificationUrl = certificate?.certificate_code ? `https://zerogap.io/verify/${certificate.certificate_code}` : '';
  const linkedInShareUrl = certificate
    ? `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(verificationUrl)}&title=${encodeURIComponent(`I earned a ${certificate.playlist_title} certificate on ZeroGap!`)}&summary=${encodeURIComponent(`Earned a verified skill certificate with ${Math.round(certificate.overall_quiz_score)}% quiz score. Verify at zerogap.io/verify/${certificate.certificate_code}`)}`
    : '';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ y: 24, scale: 0.96 }}
          animate={{ y: 0, scale: 1 }}
          exit={{ y: 24, scale: 0.96 }}
          className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border-[3px] border-slate-900 bg-white p-5 shadow-[10px_10px_0px_0px_rgba(15,23,42,1)]"
        >
          <div className="mb-5 flex items-start justify-between gap-4 border-b-[3px] border-slate-900 pb-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-accent">LearnPath certificate</p>
              <h2 className="font-display text-3xl font-black uppercase leading-none">Completion proof.</h2>
            </div>
            <button type="button" className="neo-btn-outline !px-3 !py-2" onClick={onClose}>
              <XCircle size={18} />
            </button>
          </div>

          {!certificate ? (
            <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
              <div className="space-y-3">
                {videos.map((video) => (
                  <div key={video.id} className="flex items-start gap-3 rounded-2xl border-2 border-slate-900 bg-slate-50 p-3">
                    <div className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 border-slate-900',
                      video.watch_complete && video.quiz_passed ? 'bg-success text-white' : 'bg-white text-slate-400',
                    )}>
                      {video.watch_complete && video.quiz_passed ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black uppercase leading-tight">{video.position}. {video.title}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Watch {video.watch_complete ? 'done' : 'pending'} · Quiz {video.quiz_passed ? `${Math.round(video.quiz_score ?? 0)}%` : 'pending'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="slab-card !rounded-[2rem] !p-6">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-slate-900 bg-accent text-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                  <Award size={30} />
                </div>
                <h3 className="mb-3 font-display text-2xl font-black uppercase leading-none">
                  {ready ? "You're ready." : 'Almost there.'}
                </h3>
                <p className="mb-6 text-sm font-medium leading-relaxed text-slate-500">
                  {ready
                    ? 'Generate your ZeroGap certificate and it will become available for your resume profile.'
                    : 'Complete every watch and quiz item to unlock your branded certificate.'}
                </p>
                <div className="flex flex-col gap-3">
                  <button type="button" className="neo-btn-outline w-full" onClick={checkEligibility} disabled={loading}>
                    Recheck
                  </button>
                  <button type="button" className="neo-btn-primary w-full" onClick={handleGenerate} disabled={!ready || loading}>
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Award size={18} />} Generate Certificate
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-[1.75rem] border-4 border-amber-500 bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-center text-white shadow-[8px_8px_0px_0px_rgba(245,158,11,1)]">
                <p className="font-display text-3xl font-black">ZeroGap</p>
                <p className="mt-4 font-display text-xl font-black text-amber-400">Certificate of Completion</p>
                <p className="mt-8 text-sm text-slate-300">Awarded to</p>
                <p className="mt-2 font-display text-3xl font-black">{session.user?.full_name ?? 'ZeroGap Learner'}</p>
                <p className="mt-6 text-sm text-slate-300">for demonstrating skill in</p>
                <p className="mt-2 font-display text-2xl font-black text-amber-400">{certificate.playlist_title}</p>
                <div className="mt-8 grid gap-3 text-sm font-black uppercase tracking-widest text-slate-300 sm:grid-cols-3">
                  <span>Quiz {Math.round(certificate.overall_quiz_score)}%</span>
                  <span>{Math.max(0.1, certificate.total_watch_seconds / 3600).toFixed(1)}h watched</span>
                  <span>{certificate.certificate_code}</span>
                </div>
                <p className="mt-6 font-mono text-xs text-slate-400">{verificationUrl}</p>
              </div>

              <div className="flex flex-col flex-wrap gap-3 sm:flex-row">
                <a href={certificate.pdf_url} target="_blank" rel="noreferrer" className="neo-btn-primary flex-1">
                  <Download size={18} /> Download PDF
                </a>
                <a href={linkedInShareUrl} target="_blank" rel="noreferrer" className="neo-btn-outline flex-1">
                  <ExternalLink size={16} /> Share on LinkedIn
                </a>
                <button
                  type="button"
                  className="neo-btn-outline flex-1 text-[10px]"
                  onClick={() => {
                    void navigator.clipboard.writeText(verificationUrl);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1400);
                  }}
                >
                  <Copy size={18} /> {copied ? 'Copied' : 'Copy Verification Link'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
