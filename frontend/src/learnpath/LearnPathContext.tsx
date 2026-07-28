import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useSession } from '../session';
import {
  getCertificates,
  getEnrolledPlaylists,
  getLearnPathStats,
  getRecommendedPlaylists,
} from './api';
import type { Certificate, LearnPathStats, LearnPathTab, Playlist } from './types';
import { KAVYA_BUNDLE, KAVYA_PLAYLISTS, PROTOTYPE_MODE, PROTOTYPE_TOKEN } from '../prototypeData';
import { VINEET_BUNDLE, VINEET_PLAYLISTS, VINEET_TOKEN } from '../vineetData';

interface LearnPathContextValue {
  isSidebarOpen: boolean;
  openSidebar: (defaultTab?: LearnPathTab, skillTag?: string) => void;
  closeSidebar: () => void;
  activeTab: LearnPathTab;
  setActiveTab: (tab: LearnPathTab) => void;
  skillFilter: string | null;
  setSkillFilter: (skill: string | null) => void;
  recommendedPlaylists: Playlist[];
  enrolledPlaylists: Playlist[];
  certificates: Certificate[];
  stats: LearnPathStats | null;
  isLoading: boolean;
  refreshData: () => Promise<void>;
}

const LearnPathContext = createContext<LearnPathContextValue | null>(null);

export function LearnPathProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<LearnPathTab>('recommended');
  const [skillFilter, setSkillFilter] = useState<string | null>(null);
  const [recommendedPlaylists, setRecommendedPlaylists] = useState<Playlist[]>([]);
  const [enrolledPlaylists, setEnrolledPlaylists] = useState<Playlist[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [stats, setStats] = useState<LearnPathStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshData = useCallback(async () => {
    const token = session.accessToken;
    if (!token || !session.isAuthenticated) {
      setRecommendedPlaylists([]);
      setEnrolledPlaylists([]);
      setCertificates([]);
      setStats(null);
      return;
    }

    if (PROTOTYPE_MODE || token === PROTOTYPE_TOKEN || token === VINEET_TOKEN) {
      const isVineet = token === VINEET_TOKEN;
      const bundle = isVineet ? VINEET_BUNDLE : KAVYA_BUNDLE;
      const playlists = (isVineet ? VINEET_PLAYLISTS : KAVYA_PLAYLISTS) as unknown as Playlist[];
      const certs: Certificate[] = bundle.certificates.map((certificate, index) => ({
        id: certificate.id,
        playlist_id: `pl${index + 1}`,
        playlist_title: certificate.title,
        certificate_code: `ZG-2026-${bundle.profile.id.slice(0, 6).toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
        issued_at: new Date(Date.now() - index * 7 * 86400000).toISOString(),
        overall_quiz_score: 90 - index,
        total_watch_seconds: 11_000 + index * 900,
        pdf_url: certificate.credential_url ?? '',
      }));
      const stats = {
        enrolled_count: playlists.filter((playlist) => playlist.is_enrolled).length,
        certificates_earned: certs.length,
        total_watch_hours: isVineet ? 64 : 96,
        total_xp: bundle.xp?.total_xp ?? 2840,
        current_streak: bundle.xp?.current_streak_days ?? 3,
        longest_streak: bundle.xp?.longest_streak_days ?? 5,
      };
      setRecommendedPlaylists(playlists);
      setEnrolledPlaylists(playlists.filter((playlist) => playlist.is_enrolled));
      setCertificates(certs);
      setStats(stats);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [recommended, enrolled, earnedCertificates, nextStats] = await Promise.all([
        getRecommendedPlaylists(token).catch(() => []),
        getEnrolledPlaylists(token).catch(() => []),
        getCertificates(token).catch(() => []),
        getLearnPathStats(token).catch(() => null),
      ]);
      setRecommendedPlaylists(recommended);
      setEnrolledPlaylists(enrolled);
      setCertificates(earnedCertificates);
      setStats(nextStats);
    } finally {
      setIsLoading(false);
    }
  }, [session.accessToken, session.isAuthenticated]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const openSidebar = useCallback((defaultTab: LearnPathTab = 'recommended', skillTag?: string) => {
    setActiveTab(defaultTab);
    setSkillFilter(skillTag ?? null);
    setIsSidebarOpen(true);
  }, []);

  const value = useMemo<LearnPathContextValue>(() => ({
    isSidebarOpen,
    openSidebar,
    closeSidebar: () => setIsSidebarOpen(false),
    activeTab,
    setActiveTab,
    skillFilter,
    setSkillFilter,
    recommendedPlaylists,
    enrolledPlaylists,
    certificates,
    stats,
    isLoading,
    refreshData,
  }), [
    activeTab,
    certificates,
    enrolledPlaylists,
    isLoading,
    isSidebarOpen,
    openSidebar,
    recommendedPlaylists,
    refreshData,
    skillFilter,
    stats,
  ]);

  return <LearnPathContext.Provider value={value}>{children}</LearnPathContext.Provider>;
}

export function useLearnPath() {
  const context = useContext(LearnPathContext);
  if (!context) {
    throw new Error('useLearnPath must be used inside LearnPathProvider');
  }
  return context;
}
