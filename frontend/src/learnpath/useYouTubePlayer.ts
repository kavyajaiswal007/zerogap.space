import { useEffect, useRef, useState } from 'react';

type PlayerState = 'idle' | 'playing' | 'paused' | 'ended';

interface UseYouTubePlayerOptions {
  videoId: string | null;
  enabled: boolean;
  onReport: (seconds: number) => void;
}

export function useYouTubePlayer({ videoId, enabled, onReport }: UseYouTubePlayerOptions) {
  const playerRef = useRef<HTMLIFrameElement | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const reportRef = useRef(onReport);

  useEffect(() => {
    reportRef.current = onReport;
  }, [onReport]);

  useEffect(() => {
    if (!enabled || !videoId) {
      setPlayerState('idle');
      return undefined;
    }

    setPlayerState('playing');
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      setCurrentTime((value) => value + 15);
      reportRef.current(15);
    }, 15_000);

    return () => {
      window.clearInterval(interval);
      const remainder = Math.floor((Date.now() - startedAt) / 1000) % 15;
      if (remainder > 2) {
        reportRef.current(remainder);
      }
      setPlayerState('paused');
    };
  }, [enabled, videoId]);

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
  }, [videoId]);

  return {
    playerRef,
    playerState,
    currentTime,
    duration,
    isReady: Boolean(videoId),
    setDuration,
    markEnded: () => setPlayerState('ended'),
  };
}
