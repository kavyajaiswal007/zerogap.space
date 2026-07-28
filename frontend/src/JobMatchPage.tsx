import { useDeferredValue, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Briefcase,
  Zap,
  MapPin,
  Clock,
  Search,
  Sparkles,
  ChevronRight,
  Bookmark,
  RefreshCw,
  ExternalLink,
  IndianRupee,
  ClipboardList,
  X,
  Share2,
  Info,
  Star,
  Wifi,
} from 'lucide-react';
import { Button } from './UI';
import { cn } from './utils';
import { Link } from 'react-router-dom';
import type { JobListing, JobMatch, ProfileBundle } from './backend';
import { formatRelativeDate } from './backend';
import { KAVYA_BUNDLE, KAVYA_JOBS } from './prototypeData';

interface JobsPayload {
  profile: ProfileBundle;
  matches: JobMatch[];
}

type SortMode = 'fit' | 'salary' | 'recent';
type JobTab = 'matches' | 'market';

const EMPTY_LISTINGS: JobListing[] = [];

export default function JobMatchPage() {
  const instantData = useMemo<JobsPayload>(() => ({
    profile: KAVYA_BUNDLE,
    matches: KAVYA_JOBS,
  }), []);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<JobTab>('matches');
  const [fitThreshold, setFitThreshold] = useState(0);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [minSalary, setMinSalary] = useState(0);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortMode>('fit');
  const [busyMatchId, setBusyMatchId] = useState<string | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [optimisticMatches, setOptimisticMatches] = useState<Record<string, Partial<Pick<JobMatch, 'saved' | 'applied'>>>>({});
  const deferredSearch = useDeferredValue(search);

  const { data, loading, error, reload } = {
    data: { profile: KAVYA_BUNDLE, matches: KAVYA_JOBS },
    loading: false,
    error: null,
    reload: () => {},
  };

  const { data: liveData, loading: liveLoading } = {
    data: { listings: KAVYA_JOBS.map((match) => match.job_listings) },
    loading: false,
  };

  const rawMatches = data?.matches ?? instantData.matches;
  const matches = useMemo(() => rawMatches.map((match) => ({
    ...match,
    ...optimisticMatches[match.id],
  })), [optimisticMatches, rawMatches]);
  const profileBundle = data?.profile ?? instantData.profile;
  const activeRole = profileBundle.target_roles.find((role) => role.is_active)?.job_title ?? 'Full Stack Developer';
  const liveListings = liveData?.listings ?? EMPTY_LISTINGS;

  const locations = useMemo(() => {
    return Array.from(
      new Set(
        [
          ...matches.map((match) => match.job_listings.location),
          ...liveListings.map((listing) => listing.location),
        ]
          .filter((location): location is string => Boolean(location)),
      ),
    ).slice(0, 12);
  }, [liveListings, matches]);

  const filteredMatches = useMemo(() => {
    let results = matches.filter((match) => {
      const query = deferredSearch.trim().toLowerCase();
      const listing = match.job_listings;
      const haystack = `${listing.title} ${listing.company ?? ''} ${listing.location ?? ''} ${(listing.skills_required ?? []).join(' ')}`.toLowerCase();
      const passesSearch = !query || haystack.includes(query);
      const passesFit = match.fit_percentage >= fitThreshold;
      const passesLocation = !selectedLocations.length || selectedLocations.includes(listing.location ?? '');
      const passesSalary = minSalary === 0 || (listing.salary_lpa_max ?? 0) >= minSalary || (listing.salary_lpa_min ?? 0) >= minSalary;
      const passesType = !selectedTypes.length
        || selectedTypes.some((type) => (
          type === 'Remote'
            ? listing.is_remote
            : (listing.job_type ?? '').toLowerCase().includes(type.toLowerCase())
        ));

      return passesSearch && passesFit && passesLocation && passesSalary && passesType;
    });

    if (sortBy === 'salary') {
      results = [...results].sort((a, b) => (b.job_listings.salary_lpa_max ?? 0) - (a.job_listings.salary_lpa_max ?? 0));
    } else if (sortBy === 'recent') {
      results = [...results].sort((a, b) => (
        new Date(b.job_listings.posted_at ?? 0).getTime() - new Date(a.job_listings.posted_at ?? 0).getTime()
      ));
    }

    return results;
  }, [deferredSearch, fitThreshold, matches, minSalary, selectedLocations, selectedTypes, sortBy]);

  const filteredLiveListings = useMemo(() => {
    let results = liveListings.filter((listing) => {
      const query = deferredSearch.trim().toLowerCase();
      const haystack = `${listing.title} ${listing.company ?? ''} ${listing.location ?? ''} ${(listing.skills_required ?? []).join(' ')}`.toLowerCase();
      const passesSearch = !query || haystack.includes(query);
      const passesLocation = !selectedLocations.length || selectedLocations.includes(listing.location ?? '');
      const passesSalary = minSalary === 0 || (listing.salary_lpa_max ?? 0) >= minSalary || (listing.salary_lpa_min ?? 0) >= minSalary;
      const passesType = !selectedTypes.length
        || selectedTypes.some((type) => (
          type === 'Remote'
            ? listing.is_remote
            : (listing.job_type ?? '').toLowerCase().includes(type.toLowerCase())
        ));

      return passesSearch && passesLocation && passesSalary && passesType;
    });

    if (sortBy === 'salary') {
      results = [...results].sort((a, b) => (b.salary_lpa_max ?? 0) - (a.salary_lpa_max ?? 0));
    } else if (sortBy === 'recent') {
      results = [...results].sort((a, b) => (
        new Date(b.posted_at ?? 0).getTime() - new Date(a.posted_at ?? 0).getTime()
      ));
    }

    return results;
  }, [deferredSearch, liveListings, minSalary, selectedLocations, selectedTypes, sortBy]);

  const expandedMatch = useMemo(
    () => matches.find((match) => match.id === expandedJobId) ?? null,
    [expandedJobId, matches],
  );

  async function refreshMatches() {
    reload();
  }

  async function toggleSaved(match: JobMatch) {
    const nextSaved = !match.saved;
    setBusyMatchId(match.id);
    setOptimisticMatches((current) => ({
      ...current,
      [match.id]: { ...current[match.id], saved: nextSaved },
    }));
    window.setTimeout(() => setBusyMatchId(null), 200);
  }

  async function markApplied(match: JobMatch) {
    setBusyMatchId(match.id);
    setOptimisticMatches((current) => ({
      ...current,
      [match.id]: { ...current[match.id], applied: true },
    }));
    window.setTimeout(() => setBusyMatchId(null), 200);
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 dot-pattern min-h-screen overflow-hidden">
      <div className="flex min-w-0 flex-col lg:flex-row gap-6 xl:gap-8">
        <aside className="w-full lg:w-64 lg:shrink-0 space-y-8">
          <div className="space-y-4">
            <h2 className="text-xl font-black font-display uppercase italic tracking-tight">Search for Jobs</h2>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Type a job name..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border-2 border-slate-900 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-xs font-bold"
              />
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">How good is the match?</h3>
            <div className="px-1">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={fitThreshold}
                onChange={(event) => setFitThreshold(Number(event.target.value))}
                className="w-full accent-primary h-1 bg-slate-200 rounded-full appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[9px] font-black text-slate-400 mt-2 uppercase">
                <span>0%</span>
                <span>{fitThreshold}%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Min Salary (LPA)</h3>
            <div className="px-1">
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={minSalary}
                onChange={(event) => setMinSalary(Number(event.target.value))}
                className="w-full accent-primary h-1 bg-slate-200 rounded-full appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[9px] font-black text-slate-400 mt-2 uppercase">
                <span>Any</span>
                <span>{minSalary > 0 ? `₹${minSalary}+ LPA` : 'Any'}</span>
                <span>₹30 LPA</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Job Type</h4>
            {['Full-time', 'Contract', 'Internship', 'Remote'].map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(type)}
                  onChange={(event) => {
                    setSelectedTypes((values) => (
                      event.target.checked
                        ? [...values, type]
                        : values.filter((value) => value !== type)
                    ));
                  }}
                  className="w-4 h-4 rounded border-2 border-slate-900 accent-primary"
                />
                <span className="text-[11px] font-black text-slate-600 group-hover:text-primary transition-colors uppercase tracking-tight">{type}</span>
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Sort by</h4>
            {[
              { value: 'fit', label: 'Best fit first' },
              { value: 'salary', label: 'Highest salary' },
              { value: 'recent', label: 'Most recent' },
            ].map((option) => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name="sort"
                  value={option.value}
                  checked={sortBy === option.value}
                  onChange={() => setSortBy(option.value as SortMode)}
                  className="w-4 h-4 border-2 border-slate-900 accent-primary"
                />
                <span className="text-[11px] font-black text-slate-600 group-hover:text-primary transition-colors uppercase tracking-tight">{option.label}</span>
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Where do you want to work?</h4>
            {locations.length ? locations.map((location) => (
              <label key={location} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedLocations.includes(location)}
                  onChange={(event) => {
                    setSelectedLocations((values) => (
                      event.target.checked
                        ? [...values, location]
                        : values.filter((value) => value !== location)
                    ));
                  }}
                  className="w-4 h-4 rounded border-2 border-slate-900 accent-primary"
                />
                <span className="text-[11px] font-black text-slate-600 group-hover:text-primary transition-colors uppercase tracking-tight">{location}</span>
              </label>
            )) : (
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-tight">Locations will appear after your first refresh.</p>
            )}
          </div>

          <div className="slab-card !bg-accent/10 border-accent shadow-[4px_4px_0px_0px_rgba(245,158,11,1)]">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Helpful Tip</p>
            <p className="text-[10px] font-bold text-slate-600 leading-relaxed italic uppercase">
              Refresh matches after adding skills or building project proof so fit scores update.
            </p>
            <Button size="sm" variant="outline" className="w-full mt-4 text-[10px]" onClick={() => void refreshMatches()}>
              <RefreshCw size={12} /> REFRESH MATCHES
            </Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 border-[1.5px] border-slate-900 bg-secondary rounded-full text-[9px] font-black uppercase mb-4 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                <Sparkles size={10} className="fill-slate-900" />
                {error ? 'Sync failed - showing predicted jobs' : loading ? 'Scanning live data' : 'Jobs for You'}
              </div>
              <h1 className="text-4xl font-display font-black leading-none text-slate-900">JOBS FOR <br />YOU.</h1>
              <p className="text-slate-500 font-medium text-sm mt-2">
                {activeTab === 'matches' ? filteredMatches.length : filteredLiveListings.length} {activeTab === 'matches' ? 'AI-ranked matches' : 'market listings'} for <span className="text-primary font-black underline decoration-2 decoration-secondary">{activeRole}</span>.
              </p>
            </div>
            <div className="flex max-w-full flex-wrap gap-2 p-1 bg-slate-900/5 rounded-xl border border-slate-900/10">
              {[
                { id: 'matches' as const, label: 'My Matches', count: filteredMatches.length },
                { id: 'market' as const, label: 'Market Listings', count: filteredLiveListings.length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'px-4 py-1.5 border-[1.5px] border-slate-900 rounded-lg font-black text-[10px] uppercase transition-all',
                    activeTab === tab.id
                      ? 'bg-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                      : 'text-slate-500 hover:text-slate-900 border-transparent',
                  )}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
              <button className="px-4 py-1.5 text-slate-500 hover:text-slate-900 font-black text-[10px] uppercase" onClick={() => void refreshMatches()}>
                Refresh
              </button>
            </div>
          </header>

          {activeTab === 'matches' && matches.length > 0 && (
            <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total matches', value: matches.length },
                { label: 'Ready to apply', value: matches.filter((match) => match.fit_percentage >= 70).length },
                { label: 'Avg fit score', value: `${Math.round(matches.reduce((sum, match) => sum + match.fit_percentage, 0) / Math.max(matches.length, 1))}%` },
                { label: 'With salary', value: matches.filter((match) => match.job_listings.salary_range || match.job_listings.salary_lpa_max).length },
              ].map((stat) => (
                <div key={stat.label} className="slab-card !p-4 !rounded-2xl text-center">
                  <p className="text-2xl font-black font-display italic">{stat.value}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="slab-card !p-4 !rounded-2xl mb-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                Sync failed. Showing instant fallback data while the backend catches up.
              </p>
              <Button size="sm" variant="outline" className="text-[10px]" onClick={reload}>
                <RefreshCw size={12} /> RETRY SYNC
              </Button>
            </div>
          )}

          <div className="space-y-6">
            {activeTab === 'matches' ? (
              <>
                {loading && !filteredMatches.length && <InlineJobsLoadingCards />}
                {filteredMatches.map((match, index) => (
                  <div key={match.id}>
                    <JobCard
                      match={match}
                      index={index}
                      busyMatchId={busyMatchId}
                      onOpen={() => setExpandedJobId(match.id)}
                      onSave={toggleSaved}
                      onApply={markApplied}
                    />
                  </div>
                ))}

                {!loading && !filteredMatches.length && (
                  <JobsEmptyState
                    fitThreshold={fitThreshold}
                    minSalary={minSalary}
                    onClear={() => {
                      setFitThreshold(0);
                      setMinSalary(0);
                      setSelectedLocations([]);
                      setSelectedTypes([]);
                    }}
                    onRefresh={refreshMatches}
                  />
                )}
              </>
            ) : (
              <>
                {liveLoading && !filteredLiveListings.length && <InlineJobsLoadingCards />}
                {filteredLiveListings.map((listing, index) => (
                  <div key={listing.id ?? `${listing.external_id}-${index}`}>
                    <MarketListingCard listing={listing} index={index} />
                  </div>
                ))}
                {!liveLoading && !filteredLiveListings.length && (
                  <JobsEmptyState
                    fitThreshold={0}
                    minSalary={minSalary}
                    onClear={() => {
                      setMinSalary(0);
                      setSelectedLocations([]);
                      setSelectedTypes([]);
                    }}
                    onRefresh={refreshMatches}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>

      <AnimatePresence>
        {expandedMatch && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm"
              onClick={() => setExpandedJobId(null)}
            />
            <JobDetailsDrawer
              match={expandedMatch}
              busyMatchId={busyMatchId}
              onClose={() => setExpandedJobId(null)}
              onSave={toggleSaved}
              onApply={markApplied}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function MarketListingCard({ listing, index }: { listing: JobListing; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="slab-card !p-0 !rounded-3xl hover:border-primary transition-all group overflow-hidden min-w-0"
    >
      <div className="flex min-w-0 flex-col xl:flex-row divide-y xl:divide-y-0 xl:divide-x-2 divide-slate-900">
        <div className="min-w-0 flex-1 p-5 sm:p-6 md:p-8 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <CompanyLogo listing={listing} />
              <div className="min-w-0">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest truncate">{listing.company ?? 'Company'}</p>
                <h3 className="break-words text-xl md:text-2xl font-display font-black leading-tight group-hover:text-primary transition-colors">{listing.title}</h3>
              </div>
            </div>
            <span className="hidden sm:inline-flex shrink-0 items-center gap-1 rounded-xl border-2 border-slate-900 bg-secondary px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              Live
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-slate-500">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase">
              <MapPin size={11} className="text-primary" />
              {listing.location ?? 'India'}
            </div>
            {listing.job_type && (
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase">
                <Briefcase size={11} className="text-blue-500" />
                {listing.job_type}
              </div>
            )}
            {listing.is_remote && (
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-purple-600">
                <Wifi size={11} />
                Remote ok
              </div>
            )}
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase">
              <Clock size={11} />
              {formatRelativeDate(listing.posted_at)}
            </div>
          </div>

          <SalaryBadge listing={listing} />

          <div className="flex flex-wrap gap-2">
            {(listing.skills_required ?? []).slice(0, 7).map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 border-[1.5px] rounded-lg text-[9px] font-black uppercase shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] bg-white border-slate-900"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="w-full xl:w-72 xl:shrink-0 p-5 sm:p-6 md:p-8 flex flex-col justify-between bg-slate-50/50">
          <div className="space-y-3">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
              <Briefcase size={10} className="text-primary" /> Market listing
            </p>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight leading-relaxed italic pt-1">
              Raw market signal from the live job feed. Save/apply tracking appears once it becomes one of your AI matches.
            </p>
          </div>

          <div className="pt-6 flex flex-col gap-2">
            {listing.apply_url ? (
              <a
                href={listing.apply_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-wide border-2 border-slate-900 rounded-xl transition-all bg-primary text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px]"
              >
                <ExternalLink size={12} />
                APPLY NOW
              </a>
            ) : (
              <div className="w-full px-4 py-2.5 text-center text-[10px] font-black uppercase bg-slate-100 border border-slate-300 rounded-xl text-slate-400">
                No link available
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function JobCard({
  match,
  index,
  busyMatchId,
  onOpen,
  onSave,
  onApply,
}: {
  match: JobMatch;
  index: number;
  busyMatchId: string | null;
  onOpen: () => void;
  onSave: (match: JobMatch) => Promise<void>;
  onApply: (match: JobMatch) => Promise<void>;
}) {
  const listing = match.job_listings;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="slab-card !p-0 !rounded-3xl hover:border-primary transition-all group overflow-hidden cursor-pointer min-w-0"
      onClick={onOpen}
    >
      <div className="flex min-w-0 flex-col xl:flex-row divide-y xl:divide-y-0 xl:divide-x-2 divide-slate-900">
        <div className="min-w-0 flex-1 p-5 sm:p-6 md:p-8 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <CompanyLogo listing={listing} />
              <div className="min-w-0">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest truncate">{listing.company ?? 'Company'}</p>
                <h3 className="break-words text-xl md:text-2xl font-display font-black leading-tight group-hover:text-primary transition-colors">{listing.title}</h3>
              </div>
            </div>
            <div className="hidden sm:flex flex-col items-end shrink-0">
              <div className="text-success font-black text-3xl italic">{Math.round(match.fit_percentage)}%</div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">fit score</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-slate-500">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase">
              <MapPin size={11} className="text-primary" />
              {listing.location ?? 'India'}
            </div>
            {listing.job_type && (
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase">
                <Briefcase size={11} className="text-blue-500" />
                {listing.job_type}
              </div>
            )}
            {listing.is_remote && (
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-purple-600">
                <Wifi size={11} />
                Remote ok
              </div>
            )}
            {listing.experience_required && (
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase">
                <Star size={11} className="text-amber-500" />
                {listing.experience_required}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase">
              <Clock size={11} />
              {formatRelativeDate(listing.posted_at)}
            </div>
          </div>

          <SalaryBadge listing={listing} />

          <div className="flex flex-wrap gap-2">
            {(listing.skills_required ?? []).slice(0, 7).map((tag) => (
              <span key={tag} className={cn(
                'px-2.5 py-1 border-[1.5px] rounded-lg text-[9px] font-black uppercase shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]',
                !match.missing_skills.includes(tag)
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                  : 'bg-white border-slate-900',
              )}>
                {tag}
              </span>
            ))}
            {(listing.skills_required ?? []).length > 7 && (
              <span className="px-2.5 py-1 bg-slate-100 border border-slate-300 rounded-lg text-[9px] font-black uppercase text-slate-500">
                +{listing.skills_required.length - 7} more
              </span>
            )}
          </div>

          <ApplicationProcess match={match} />
        </div>

        <div
          className="w-full xl:w-72 xl:shrink-0 p-5 sm:p-6 md:p-8 flex flex-col justify-between bg-slate-50/50"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="space-y-3">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
              <Zap size={10} className="fill-primary text-primary" /> Skills to learn
            </p>
            <div className="space-y-1.5">
              {match.missing_skills.length ? match.missing_skills.slice(0, 4).map((gap) => (
                <div key={gap} className="flex min-w-0 items-center justify-between gap-2 text-[9px] font-black text-slate-700 bg-white p-2 rounded-lg border-[1.5px] border-slate-900/10 uppercase tracking-tight">
                  <span className="min-w-0 break-words">{gap}</span>
                  <ChevronRight size={10} className="text-primary" />
                </div>
              )) : (
                <div className="text-[9px] font-black text-success bg-white p-2 rounded-lg border-[1.5px] border-slate-900/10 uppercase tracking-tight">
                  No major gaps - you're ready!
                </div>
              )}
            </div>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight leading-relaxed italic pt-1">
              {match.match_reason}
            </p>
          </div>

          <div className="pt-6 flex flex-col gap-2">
            {listing.apply_url ? (
              <a
                href={listing.apply_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => {
                  event.stopPropagation();
                  void onApply(match);
                }}
                className={cn(
                  'w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-wide border-2 border-slate-900 rounded-xl transition-all',
                  match.applied
                    ? 'bg-success text-white border-success shadow-[2px_2px_0px_0px_rgba(22,163,74,1)]'
                    : 'bg-primary text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px]',
                )}
              >
                <ExternalLink size={12} />
                {match.applied ? 'APPLIED ✓' : 'APPLY NOW'}
              </a>
            ) : (
              <div className="w-full px-4 py-2.5 text-center text-[10px] font-black uppercase bg-slate-100 border border-slate-300 rounded-xl text-slate-400">
                No link available
              </div>
            )}
            <div className="flex flex-col sm:flex-row xl:flex-col 2xl:flex-row gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-[9px]"
                onClick={(event) => {
                  event.stopPropagation();
                  void onSave(match);
                }}
                disabled={busyMatchId === match.id}
              >
                <Bookmark size={11} fill={match.saved ? 'currentColor' : 'none'} />
                {match.saved ? 'SAVED' : 'SAVE'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-[9px]"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpen();
                }}
              >
                <Info size={11} /> DETAILS
              </Button>
            </div>
            <Link to="/projects" onClick={(event) => event.stopPropagation()}>
              <Button size="sm" variant="outline" className="w-full text-[9px]">
                <Sparkles size={11} /> PREP FOR THIS JOB
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function JobDetailsDrawer({
  match,
  busyMatchId,
  onClose,
  onSave,
  onApply,
}: {
  match: JobMatch;
  busyMatchId: string | null;
  onClose: () => void;
  onSave: (match: JobMatch) => Promise<void>;
  onApply: (match: JobMatch) => Promise<void>;
}) {
  const listing = match.job_listings;
  const responsibilities = listing.highlights?.Responsibilities ?? [];
  const benefits = listing.highlights?.Benefits ?? [];
  const qualifications = [
    ...(listing.highlights?.Qualifications ?? []),
    ...splitQualifications(listing.qualifications),
  ].slice(0, 10);

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed top-0 right-0 h-full w-full md:w-[520px] bg-white border-l-2 border-slate-900 z-50 overflow-y-auto shadow-[-8px_0px_0px_0px_rgba(15,23,42,0.1)]"
    >
      <div className="p-8 space-y-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-[10px] font-black text-primary uppercase tracking-widest">{listing.company ?? 'Company'}</p>
            <h2 className="text-2xl font-display font-black uppercase leading-tight mt-1">{listing.title}</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase mt-2">{listing.location ?? 'India'}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full border-2 border-slate-900 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shrink-0">
            <X size={14} />
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          <SalaryBadge listing={listing} />
          {listing.job_type && (
            <span className="px-3 py-1.5 bg-blue-50 border-2 border-blue-600 rounded-xl text-[11px] font-black text-blue-800 uppercase">{listing.job_type}</span>
          )}
          {listing.is_remote && (
            <span className="px-3 py-1.5 bg-purple-50 border-2 border-purple-600 rounded-xl text-[11px] font-black text-purple-800 uppercase">Remote</span>
          )}
          {listing.experience_required && (
            <span className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-xl text-[11px] font-black text-slate-600 uppercase">{listing.experience_required}</span>
          )}
        </div>

        <div className="slab-card !p-5 !rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Your fit score</p>
            <span className="text-3xl font-black text-success italic">{Math.round(match.fit_percentage)}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full border border-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-success transition-all"
              style={{ width: `${match.fit_percentage}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-2">{match.match_reason}</p>
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Skills required</p>
          <div className="flex flex-wrap gap-2">
            {(listing.skills_required ?? []).map((skill) => {
              const hasIt = !match.missing_skills.includes(skill);
              return (
                <span key={skill} className={cn(
                  'px-3 py-1 border-[1.5px] rounded-lg text-[9px] font-black uppercase shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]',
                  hasIt
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-800'
                    : 'bg-red-50 border-red-400 text-red-700',
                )}>
                  {hasIt ? '✓' : '✗'} {skill}
                </span>
              );
            })}
          </div>
        </div>

        {responsibilities.length > 0 && (
          <JobDetailList title="What you'll do" items={responsibilities} color="bg-primary" />
        )}

        {qualifications.length > 0 && (
          <JobDetailList title="Qualifications" items={qualifications} color="bg-secondary" />
        )}

        {benefits.length > 0 && (
          <JobDetailList title="Benefits" items={benefits} color="bg-success" />
        )}

        {listing.description && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">About this role</p>
            <p className="text-[11px] text-slate-600 font-medium leading-relaxed whitespace-pre-line line-clamp-12">
              {listing.description}
            </p>
          </div>
        )}

        <ApplicationProcess match={match} />

        <div className="space-y-3 pt-4">
          {listing.apply_url ? (
            <a
              href={listing.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => void onApply(match)}
              className="neo-btn-primary w-full flex items-center justify-center gap-2 text-sm"
            >
              <ExternalLink size={16} />
              {match.applied ? 'APPLY AGAIN' : 'APPLY NOW'}
            </a>
          ) : (
            <div className="px-4 py-3 bg-slate-100 rounded-xl text-center text-[11px] font-black text-slate-400 uppercase">
              Application link not available - search company careers page
            </div>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-[10px]"
              onClick={() => void onSave(match)}
              disabled={busyMatchId === match.id}
            >
              <Bookmark size={12} /> {match.saved ? 'SAVED' : 'SAVE'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-[10px]"
              onClick={() => {
                void navigator.clipboard?.writeText(listing.apply_url ?? window.location.href);
              }}
            >
              <Share2 size={12} /> SHARE
            </Button>
          </div>
          <Link to="/projects">
            <Button size="sm" variant="outline" className="w-full text-[10px]">
              <Sparkles size={12} /> BUILD SKILLS FOR THIS JOB
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function CompanyLogo({ listing }: { listing: JobListing }) {
  const [failed, setFailed] = useState(false);

  if (listing.company_logo && !failed) {
    return (
      <img
        src={listing.company_logo}
        alt={listing.company ?? 'Company logo'}
        className="w-14 h-14 rounded-2xl border-[2px] border-slate-900 object-contain p-1 bg-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] shrink-0"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="w-14 h-14 rounded-2xl border-[2px] border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] flex items-center justify-center bg-slate-900 text-white shrink-0">
      <Briefcase size={20} strokeWidth={2.5} />
    </div>
  );
}

function SalaryBadge({ listing }: { listing: JobListing }) {
  const salaryRange = listing.salary_range && !/^(?:[A-Z]{3}\s*)?0(?:\.0+)?\s*[-–]\s*0(?:\.0+)?/i.test(listing.salary_range)
    ? listing.salary_range
    : null;

  if (salaryRange) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border-2 border-emerald-600 rounded-xl shadow-[2px_2px_0px_0px_rgba(5,150,105,1)]">
        <IndianRupee size={11} className="text-emerald-700" strokeWidth={3} />
        <span className="text-[11px] font-black text-emerald-800 uppercase tracking-tight">{salaryRange}</span>
      </div>
    );
  }

  if (listing.salary_lpa_min || listing.salary_lpa_max) {
    const min = listing.salary_lpa_min;
    const max = listing.salary_lpa_max;
    const label = min && max
      ? `₹${min}-${max} LPA`
      : max ? `Up to ₹${max} LPA` : `₹${min}+ LPA`;

    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border-2 border-emerald-600 rounded-xl shadow-[2px_2px_0px_0px_rgba(5,150,105,1)]">
        <IndianRupee size={11} className="text-emerald-700" strokeWidth={3} />
        <span className="text-[11px] font-black text-emerald-800 uppercase tracking-tight">{label}</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-xl">
      <span className="text-[11px] font-black text-slate-400 uppercase tracking-tight">Salary not disclosed</span>
    </div>
  );
}

function ApplicationProcess({ match }: { match: JobMatch }) {
  const steps = buildApplicationSteps(match);

  return (
    <div className="mt-4 pt-4 border-t-2 border-dashed border-slate-200">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
        <ClipboardList size={10} /> How to apply
      </p>
      <div className="flex flex-wrap gap-2">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[9px] font-black flex items-center justify-center shrink-0">
              {index + 1}
            </span>
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{step}</span>
            {index < steps.length - 1 && <ChevronRight size={10} className="text-slate-300" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function buildApplicationSteps(match: JobMatch): string[] {
  const steps = ['Check skill fit'];
  if (match.missing_skills.length > 0) steps.push(`Learn ${match.missing_skills[0]}`);
  steps.push('Prepare resume');
  steps.push('Apply directly');
  if (match.fit_percentage < 60) steps.push('Follow up in 1 week');
  return steps;
}

function JobDetailList({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">{title}</p>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex items-start gap-2 text-[11px] text-slate-700 font-medium">
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0 mt-1.5', color)} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function JobsEmptyState({
  fitThreshold,
  minSalary,
  onClear,
  onRefresh,
}: {
  fitThreshold: number;
  minSalary: number;
  onClear: () => void;
  onRefresh: () => Promise<void>;
}) {
  return (
    <div className="slab-card !rounded-[3rem] !p-12 text-center">
      <h2 className="text-3xl font-display font-black uppercase italic mb-3">No matches found.</h2>
      <p className="text-slate-500 font-medium mb-2">
        {fitThreshold > 50 ? `Try lowering the fit threshold below ${fitThreshold}%.` :
          minSalary > 0 ? `No jobs show ${minSalary}+ LPA yet - try refreshing.` :
          'Try refreshing or broadening your filters.'}
      </p>
      <div className="flex flex-wrap gap-3 justify-center mt-6">
        <Button onClick={onClear}>
          CLEAR FILTERS
        </Button>
        <Button variant="outline" onClick={() => void onRefresh()}>
          <RefreshCw size={16} /> REFRESH JOBS
        </Button>
      </div>
    </div>
  );
}

function InlineJobsLoadingCards() {
  return (
    <>
      {[1, 2, 3].map((item) => (
        <div key={item} className="slab-card !p-0 !rounded-3xl overflow-hidden animate-pulse">
          <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x-2 divide-slate-200">
            <div className="flex-1 p-8 space-y-4">
              <div className="flex gap-4">
                <div className="w-14 h-14 bg-slate-200 rounded-2xl" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 bg-slate-200 rounded w-24" />
                  <div className="h-6 bg-slate-200 rounded w-3/4" />
                </div>
              </div>
              <div className="h-8 bg-emerald-50 border-2 border-emerald-100 rounded-xl w-40" />
              <div className="flex gap-2">{[1, 2, 3, 4].map((chip) => <div key={chip} className="h-6 bg-slate-100 rounded-lg w-16" />)}</div>
            </div>
            <div className="w-full md:w-64 p-8 bg-slate-50 space-y-3">
              {[1, 2, 3].map((row) => <div key={row} className="h-8 bg-slate-200 rounded-xl" />)}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function splitQualifications(value: string | null) {
  if (!value) return [];
  return value
    .split(/\n|,\s*/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
}
