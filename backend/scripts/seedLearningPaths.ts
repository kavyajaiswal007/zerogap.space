import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to seed learning paths.');
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const LEARNING_PATHS = [
  {
    slug: 'full-stack-zero-to-hero',
    title: 'Full Stack Developer - Zero to Hero',
    description: 'Go from zero to employable Full Stack Developer in 16 weeks. HTML, CSS, JS, React, Node.js, PostgreSQL, Docker, and deploy.',
    category: 'Web Development - Frontend',
    badge_label: 'Full Stack',
    playlist_ids_in_order: [
      'PL0Zuz27SZ-6PRCpm9clX0WiBEMB70FWwd',
      'PL0Zuz27SZ-6Oi6xNtL_fwCrwpuqylMsgT',
      'PLu0W_9lII9agx66oZnT6-n3iF1k9s2g4K',
      'PLu0W_9lII9ah7DDtYtflgwMwpT3xmjXY9',
    ],
  },
  {
    slug: 'ml-engineer-path',
    title: 'Machine Learning Engineer Path',
    description: 'From Python basics to deploying ML models in production.',
    category: 'Data Science & ML',
    badge_label: 'ML Engineer',
    playlist_ids_in_order: [
      'PLu0W_9lII9agwh1XjRt242xIpHhPT2llg',
      'PLQVvvaa0QuDcjD5BAw2DxE6OF2tius3V3',
      'PLWKjhJtqVAblStefaz_YOVpDWqcRScc2s',
      'PLZoTAELRMXVMdJ5sqbCK2LiM0HhQVWNzm',
    ],
  },
  {
    slug: 'dsa-interview-prep',
    title: 'DSA Interview Prep - FAANG Ready',
    description: 'Crack DSA interviews at top product companies.',
    category: 'DSA & CS Fundamentals',
    badge_label: 'DSA Champion',
    playlist_ids_in_order: [
      'PLDzeHZWIZsTryvtXdMr6rPh4IDexB5NIA',
      'PLgUwDviBIf0rENwdL0nEH0uGom9no0nyB',
      'PLi9RQVmJD2fZqMccp1L0j3H5hG5j2w7dA',
      'PLfqMhTWNBTe0b2nM6JHVCnAkhQRGiZMSJ',
    ],
  },
  {
    slug: 'devops-cloud-path',
    title: 'DevOps & Cloud Engineer Path',
    description: 'Docker, Kubernetes, CI/CD, AWS, and production monitoring.',
    category: 'DevOps & Cloud',
    badge_label: 'Cloud Native',
    playlist_ids_in_order: [
      'PLGLfVvz_LVvRzA3zX9Z8Z1K4z9b9d9k9Z',
      'PLWKjhJtqVAblpP3C6q6Yx2S5Z7Z7Z7Z7Z',
    ],
  },
  {
    slug: 'android-dev-path',
    title: 'Android Developer Path',
    description: 'Kotlin, Android SDK, Jetpack Compose, Firebase, and Play Store readiness.',
    category: 'Mobile Development',
    badge_label: 'Android Dev',
    playlist_ids_in_order: [
      'PLu0W_9lII9agS67Uits0UnJyrYiXhDS6q',
      'PLS1QulWo1RIaUGP446_pWLgTZPiFizEMq',
    ],
  },
];

async function seedPaths() {
  for (const path of LEARNING_PATHS) {
    const { data: pathRow, error } = await supabase
      .from('learning_paths')
      .upsert({
        slug: path.slug,
        title: path.title,
        description: path.description,
        category: path.category,
        badge_label: path.badge_label,
      }, { onConflict: 'slug' })
      .select()
      .single();

    if (error) {
      console.error(path.slug, error.message);
      continue;
    }

    for (let index = 0; index < path.playlist_ids_in_order.length; index += 1) {
      const playlistId = path.playlist_ids_in_order[index];
      const { data: playlist } = await supabase
        .from('playlists')
        .select('id')
        .eq('yt_playlist_id', playlistId)
        .maybeSingle();

      if (!playlist) {
        console.warn(`Playlist not found: ${playlistId}`);
        continue;
      }

      await supabase.from('learning_path_playlists').upsert({
        path_id: pathRow.id,
        playlist_id: playlist.id,
        step_number: index + 1,
      }, { onConflict: 'path_id,playlist_id' });
    }

    console.log(`Path seeded: ${path.title}`);
  }
}

void seedPaths();
