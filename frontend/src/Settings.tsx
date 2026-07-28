import { useEffect, useState } from 'react';
import {
  UserCircle,
  User,
  Shield,
  Palette,
  Moon,
  Volume2,
  Save,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { Card, Button } from './UI';
import type { ProfileBundle } from './backend';
import { useSession } from './session';
import { normalizeGithubUsername, normalizeInt, normalizeName, normalizeOptionalUrl } from './stockDefaults';
import { KAVYA_BUNDLE } from './prototypeData';

export default function ProfileSettings() {
  const session = useSession();
  const { data, loading, error, reload } = {
    data: KAVYA_BUNDLE as ProfileBundle,
    loading: false,
    error: null,
    reload: () => {},
  };

  const [fullName, setFullName] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [degree, setDegree] = useState('');
  const [location, setLocation] = useState('');
  const [learningStyle, setLearningStyle] = useState('project-based');
  const [timeAvailability, setTimeAvailability] = useState('3');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) {
      return;
    }

    setFullName(data.profile.full_name ?? '');
    setCollegeName(data.profile.college_name ?? '');
    setDegree(data.profile.degree ?? '');
    setLocation(data.profile.location ?? '');
    setLearningStyle(data.profile.learning_style ?? 'project-based');
    setTimeAvailability(String(data.profile.time_availability_hours ?? 3));
    setLinkedinUrl(data.profile.linkedin_url ?? '');
    setGithubUsername(data.profile.github_username ?? '');
  }, [data]);

  async function saveProfile() {
    setSaving(true);
    setMessage(null);

    try {
      normalizeName(fullName, data?.profile.email);
      collegeName.trim() || 'Independent learner';
      degree.trim() || 'B.Tech CSE';
      location.trim() || undefined;
      learningStyle;
      normalizeInt(timeAvailability, 3, 1, 12);
      normalizeOptionalUrl(linkedinUrl);
      normalizeGithubUsername(githubUsername);
      setMessage('Profile saved locally for prototype mode.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to save your profile right now.');
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await session.logout();
    window.location.assign('/');
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8 dot-pattern min-h-screen text-left">
        <div className="slab-card !rounded-[3rem] !p-12 text-center">
          <h1 className="text-4xl font-display font-black uppercase italic tracking-tight mb-4">Loading profile.</h1>
          <p className="text-slate-500 font-medium">Pulling your saved profile and app preferences.</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8 dot-pattern min-h-screen text-left">
        <div className="slab-card !rounded-[3rem] !p-12 text-center">
          <h1 className="text-4xl font-display font-black uppercase italic tracking-tight mb-4">Profile unavailable.</h1>
          <p className="text-slate-500 font-medium mb-8">{error ?? 'We could not load your profile right now.'}</p>
          <Button onClick={reload}>
            <RefreshCw size={16} /> TRY AGAIN
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 dot-pattern min-h-screen text-left">
      <header className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary border-2 border-slate-900 rounded-full text-[10px] font-black uppercase mb-4 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
          <UserCircle size={12} />
          Profile
        </div>
        <h1 className="text-4xl md:text-6xl font-display font-black leading-tight mb-2 tracking-tighter uppercase">
          YOUR <br />PROFILE.
        </h1>
        <p className="text-lg text-slate-500 font-medium italic">Account details, career setup, app preferences, and security in one place.</p>
      </header>

      <div className="space-y-8">
        <Card title="About Me" subtitle="Profile details synced with Supabase" icon={User}>
          <div className="grid md:grid-cols-2 gap-4 pt-4">
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Full name"
              className="px-4 py-4 bg-slate-50 border-2 border-slate-900 rounded-2xl font-black text-sm tracking-tight outline-none"
            />
            <input
              value={collegeName}
              onChange={(event) => setCollegeName(event.target.value)}
              placeholder="College name"
              className="px-4 py-4 bg-slate-50 border-2 border-slate-900 rounded-2xl font-black text-sm tracking-tight outline-none"
            />
            <input
              value={degree}
              onChange={(event) => setDegree(event.target.value)}
              placeholder="Degree"
              className="px-4 py-4 bg-slate-50 border-2 border-slate-900 rounded-2xl font-black text-sm tracking-tight outline-none"
            />
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Location"
              className="px-4 py-4 bg-slate-50 border-2 border-slate-900 rounded-2xl font-black text-sm tracking-tight outline-none"
            />
          </div>
        </Card>

        <Card title="Career Setup" subtitle="This affects your roadmap and predictions" icon={Palette}>
          <div className="grid md:grid-cols-2 gap-4 pt-4">
            <select
              value={learningStyle}
              onChange={(event) => setLearningStyle(event.target.value)}
              className="px-4 py-4 bg-slate-50 border-2 border-slate-900 rounded-2xl font-black text-sm tracking-tight outline-none"
            >
              <option value="project-based">Project-based</option>
              <option value="guided">Guided practice</option>
              <option value="self-paced">Self-paced</option>
              <option value="mentor-led">Mentor-led</option>
            </select>
            <input
              type="number"
              min={1}
              max={12}
              value={timeAvailability}
              onChange={(event) => setTimeAvailability(event.target.value)}
              placeholder="Hours per day"
              className="px-4 py-4 bg-slate-50 border-2 border-slate-900 rounded-2xl font-black text-sm tracking-tight outline-none"
            />
            <input
              value={githubUsername}
              onChange={(event) => setGithubUsername(event.target.value)}
              placeholder="GitHub username"
              className="px-4 py-4 bg-slate-50 border-2 border-slate-900 rounded-2xl font-black text-sm tracking-tight outline-none"
            />
            <input
              value={linkedinUrl}
              onChange={(event) => setLinkedinUrl(event.target.value)}
              placeholder="LinkedIn URL"
              className="px-4 py-4 bg-slate-50 border-2 border-slate-900 rounded-2xl font-black text-sm tracking-tight outline-none"
            />
          </div>
        </Card>

        <Card title="App Preferences" subtitle="These stay local on this device" icon={Palette}>
          <div className="space-y-4 pt-4">
            {[
              { label: 'Dark Mode', value: darkModeEnabled, setValue: setDarkModeEnabled, icon: Moon },
              { label: 'App Sounds', value: soundEnabled, setValue: setSoundEnabled, icon: Volume2 },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-4 bg-slate-50 border-2 border-slate-900 rounded-2xl">
                <div className="flex items-center gap-3">
                  <item.icon size={18} className="text-slate-400" />
                  <span className="text-xs font-black uppercase tracking-tight">{item.label}</span>
                </div>
                <button
                  onClick={() => item.setValue(!item.value)}
                  className={`w-12 h-6 rounded-full border-2 border-slate-900 relative transition-colors ${item.value ? 'bg-secondary' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-slate-900 rounded-full transition-all ${item.value ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Security" subtitle="Email is managed by your auth account" icon={Shield}>
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 border-2 border-slate-900 rounded-2xl">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Signed in as</span>
                <p className="text-sm font-black tracking-tight">{data.profile.email}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => void session.refreshProfile()}>
                <RefreshCw size={14} /> REFRESH
              </Button>
            </div>
            <Button size="sm" variant="outline" className="w-full justify-center text-[9px]" onClick={() => void signOut()}>
              <LogOut size={14} /> SIGN OUT
            </Button>
          </div>
        </Card>
      </div>

      <div className="mt-12 text-center p-8 border-2 border-slate-900 border-dashed rounded-[2rem]">
        {message && <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-4 italic">{message}</p>}
        <Button className="h-12 text-[10px]" onClick={() => void saveProfile()} disabled={saving}>
          <Save size={14} /> {saving ? 'SAVING...' : 'SAVE PROFILE'}
        </Button>
      </div>
    </div>
  );
}
