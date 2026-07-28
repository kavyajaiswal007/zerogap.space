export type LearnPathTab = 'recommended' | 'enrolled' | 'certificates';
export type PlaylistDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface Playlist {
  id: string;
  yt_playlist_id: string;
  title: string;
  description: string | null;
  channel_name: string;
  thumbnail_url: string;
  total_videos: number;
  total_duration_seconds: number;
  skill_tags: string[];
  difficulty: PlaylistDifficulty;
  category: string;
  match_score?: number;
  is_enrolled?: boolean;
  completion_percentage?: number;
}

export interface VideoProgress {
  watch_seconds: number;
  is_watch_complete: boolean;
  quiz_passed: boolean;
  quiz_score: number | null;
}

export interface PlaylistVideo {
  id: string;
  playlist_id: string;
  yt_video_id: string;
  title: string;
  thumbnail_url: string;
  duration_seconds: number;
  position: number;
  progress: VideoProgress;
  note_text?: string;
}

export interface QuizQuestion {
  id: string;
  question_text: string;
  options: { id: string; text: string }[];
  position: number;
}

export interface QuizResult {
  score: number;
  passed: boolean;
  correct_count: number;
  total: number;
  explanations: { question_id: string; explanation: string; correct_option_id: string }[];
}

export interface Certificate {
  id: string;
  playlist_id: string;
  playlist_title: string;
  certificate_code: string;
  issued_at: string;
  overall_quiz_score: number;
  total_watch_seconds: number;
  pdf_url: string;
}

export interface CatalogParams {
  category?: string;
  difficulty?: PlaylistDifficulty | 'all';
  tag?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PlaylistProgressData {
  playlist: Playlist;
  videos: PlaylistVideo[];
  completed_videos: number;
  total_videos: number;
  playlist_completion_percentage: number;
  is_eligible_for_certificate: boolean;
  blockers: string[];
}

export interface CertificateEligibility {
  eligible: boolean;
  blockers: string[];
  videos?: Array<{
    id: string;
    title: string;
    position: number;
    watch_complete: boolean;
    quiz_passed: boolean;
    quiz_score: number | null;
  }>;
}

export interface LearnPathStats {
  enrolled_count: number;
  certificates_earned: number;
  total_watch_hours: number;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
}

export interface VideoNote {
  id?: string;
  video_id: string;
  playlist_id: string;
  note_text: string;
  updated_at?: string;
}

export interface LearningPath {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  badge_label: string | null;
  learning_path_playlists?: Array<{
    step_number: number;
    playlists: Playlist | Playlist[] | null;
  }>;
}
