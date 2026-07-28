import { apiRequest } from '../backend';
import type {
  CatalogParams,
  Certificate,
  CertificateEligibility,
  LearnPathStats,
  LearningPath,
  Playlist,
  PlaylistProgressData,
  QuizQuestion,
  QuizResult,
  VideoNote,
  VideoProgress,
} from './types';

function queryString(params: CatalogParams) {
  const query = new URLSearchParams();
  if (params.category && params.category !== 'All') query.set('category', params.category);
  if (params.difficulty && params.difficulty !== 'all') query.set('difficulty', params.difficulty);
  if (params.tag) query.set('tag', params.tag);
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const text = query.toString();
  return text ? `?${text}` : '';
}

export async function getRecommendedPlaylists(token: string): Promise<Playlist[]> {
  return apiRequest<Playlist[]>('/api/learnpath/recommended', { token });
}

export async function getPlaylistCatalog(token: string, params: CatalogParams): Promise<{ playlists: Playlist[]; total: number }> {
  return apiRequest<{ playlists: Playlist[]; total: number }>(`/api/learnpath/catalog${queryString(params)}`, { token });
}

export async function enrollInPlaylist(token: string, playlistId: string): Promise<void> {
  await apiRequest('/api/learnpath/enroll/' + playlistId, { method: 'POST', token });
}

export async function unenrollFromPlaylist(token: string, playlistId: string): Promise<void> {
  await apiRequest('/api/learnpath/enroll/' + playlistId, { method: 'DELETE', token });
}

export async function getEnrolledPlaylists(token: string): Promise<Playlist[]> {
  return apiRequest<Playlist[]>('/api/learnpath/enrolled', { token });
}

export async function getPlaylistProgress(token: string, playlistId: string): Promise<PlaylistProgressData> {
  return apiRequest<PlaylistProgressData>('/api/learnpath/progress/' + playlistId, { token });
}

export async function reportWatchProgress(token: string, videoId: string, secondsWatched: number): Promise<VideoProgress> {
  return apiRequest<VideoProgress>('/api/learnpath/progress/watch', {
    method: 'POST',
    token,
    body: { video_id: videoId, seconds_watched: secondsWatched },
  });
}

export async function getVideoQuiz(token: string, videoId: string): Promise<QuizQuestion[]> {
  return apiRequest<QuizQuestion[]>('/api/learnpath/quiz/' + videoId, { token });
}

export async function submitQuiz(token: string, videoId: string, answers: Record<string, string>): Promise<QuizResult> {
  return apiRequest<QuizResult>('/api/learnpath/quiz/' + videoId + '/submit', {
    method: 'POST',
    token,
    body: { answers },
  });
}

export async function checkCertificateEligibility(token: string, playlistId: string): Promise<CertificateEligibility> {
  return apiRequest<CertificateEligibility>('/api/learnpath/certificate/' + playlistId + '/check', { token });
}

export async function generateCertificate(token: string, playlistId: string): Promise<Certificate> {
  return apiRequest<Certificate>('/api/learnpath/certificate/' + playlistId + '/generate', { method: 'POST', token });
}

export async function getCertificate(token: string, playlistId: string): Promise<Certificate> {
  return apiRequest<Certificate>('/api/learnpath/certificate/' + playlistId, { token });
}

export async function getCertificates(token: string): Promise<Certificate[]> {
  return apiRequest<Certificate[]>('/api/learnpath/certificates', { token });
}

export async function getLearnPathStats(token: string): Promise<LearnPathStats> {
  return apiRequest<LearnPathStats>('/api/learnpath/stats', { token });
}

export async function getVideoNote(token: string, videoId: string): Promise<VideoNote> {
  return apiRequest<VideoNote>('/api/learnpath/notes/' + videoId, { token });
}

export async function saveVideoNote(token: string, videoId: string, noteText: string): Promise<VideoNote> {
  return apiRequest<VideoNote>('/api/learnpath/notes/' + videoId, {
    method: 'PUT',
    token,
    body: { note_text: noteText },
  });
}

export async function exportPlaylistNotes(token: string, playlistId: string): Promise<{ filename: string; content: string }> {
  return apiRequest<{ filename: string; content: string }>('/api/learnpath/notes/' + playlistId + '/export', { token });
}

export async function getLearningPaths(token: string): Promise<LearningPath[]> {
  return apiRequest<LearningPath[]>('/api/learnpath/paths', { token });
}
