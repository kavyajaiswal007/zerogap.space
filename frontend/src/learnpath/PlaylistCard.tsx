import { BookOpen, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import type { FC } from 'react';
import { cn } from '../utils';
import type { Playlist } from './types';

interface PlaylistCardProps {
  playlist: Playlist;
  compact?: boolean;
  isBusy?: boolean;
  onEnroll?: (playlist: Playlist) => void;
  onOpen?: (playlist: Playlist) => void;
}

const difficultyClass: Record<Playlist['difficulty'], string> = {
  beginner: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  intermediate: 'bg-amber-50 text-amber-700 border-amber-200',
  advanced: 'bg-red-50 text-red-700 border-red-200',
};

function formatDuration(seconds?: number | null) {
  if (!seconds) return 'Self paced';
  const hours = Math.max(1, Math.round(seconds / 3600));
  return `${hours}h`;
}

const PlaylistCard: FC<PlaylistCardProps> = ({ playlist, compact = false, isBusy = false, onEnroll, onOpen }) => {
  const progress = Math.round(playlist.completion_percentage ?? 0);
  const highMatch = (playlist.match_score ?? 0) > 0;

  return (
    <motion.article
      layout
      whileHover={{ y: -3 }}
      className="slab-card group cursor-pointer overflow-hidden !rounded-2xl !p-0"
      onClick={() => onOpen?.(playlist)}
    >
      <div className="relative">
        <img
          src={playlist.thumbnail_url}
          alt={playlist.title}
          className={cn('w-full object-cover bg-slate-100', compact ? 'h-32' : 'h-40')}
          loading="lazy"
          onError={(event) => {
            const img = event.target as HTMLImageElement;
            if (img.src.includes('hqdefault')) {
              img.src = img.src.replace('hqdefault', 'mqdefault');
            } else if (img.src.includes('mqdefault')) {
              img.src = img.src.replace('mqdefault', 'default');
            } else {
              img.onerror = null;
              img.src = `https://placehold.co/320x180/0f172a/38bdf8?text=${encodeURIComponent(playlist.skill_tags[0] ?? 'ZeroGap')}`;
            }
          }}
        />

        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          <span className={cn('rounded-md border px-2 py-0.5 text-[8px] font-black uppercase tracking-widest', difficultyClass[playlist.difficulty])}>
            {playlist.difficulty}
          </span>
          {highMatch && (
            <span className="flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[8px] font-black uppercase text-amber-700">
              <Sparkles size={9} /> {Math.round((playlist.match_score ?? 0) * 100)}% match
            </span>
          )}
        </div>

        <div className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-[8px] font-black uppercase text-white">
          {playlist.total_videos} videos · {formatDuration(playlist.total_duration_seconds)}
        </div>

        {playlist.is_enrolled && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200">
            <div className="h-full bg-secondary" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
        )}
      </div>

      <div className={cn('p-4', compact && 'p-3')}>
        <h3 className={cn('line-clamp-2 font-display font-black uppercase leading-tight tracking-tight text-slate-900', compact ? 'text-xs' : 'text-sm')}>
          {playlist.title}
        </h3>
        <p className="mb-3 mt-1 truncate text-[10px] font-bold text-slate-400">{playlist.channel_name}</p>

        <div className="mb-4 flex flex-wrap gap-1">
          {playlist.skill_tags.slice(0, compact ? 2 : 3).map((tag) => (
            <span key={tag} className="rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[9px] font-bold uppercase text-sky-700">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          {playlist.is_enrolled ? (
            <button
              type="button"
              className="neo-btn-outline flex-1 !px-3 !py-2 text-[9px]"
              onClick={(event) => {
                event.stopPropagation();
                onOpen?.(playlist);
              }}
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              disabled={isBusy}
              className="neo-btn-secondary flex-1 !px-3 !py-2 text-[9px] disabled:cursor-not-allowed disabled:opacity-60"
              onClick={(event) => {
                event.stopPropagation();
                onEnroll?.(playlist);
              }}
            >
              <BookOpen size={12} /> Enroll Free
            </button>
          )}
          <button
            type="button"
            className="neo-btn-outline !px-3 !py-2 text-[9px]"
            onClick={(event) => {
              event.stopPropagation();
              onOpen?.(playlist);
            }}
          >
            Preview
          </button>
        </div>
      </div>
    </motion.article>
  );
};

export default PlaylistCard;
