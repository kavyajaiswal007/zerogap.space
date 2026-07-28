import {
  BarChart3,
  TrendingUp,
  Target,
  Zap,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { Card, Button } from './UI';
import { cn } from './utils';
import { KAVYA_BENCHMARK, KAVYA_BUNDLE, KAVYA_SCORE } from './prototypeData';

export default function PeerBenchmark() {
  const { data, loading, error, reload } = {
    data: { benchmark: KAVYA_BENCHMARK, score: KAVYA_SCORE, profile: KAVYA_BUNDLE },
    loading: false,
    error: null,
    reload: () => {},
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8 dot-pattern min-h-screen">
        <div className="slab-card !rounded-[3rem] !p-12 text-center">
          <h1 className="text-4xl font-display font-black uppercase italic tracking-tight mb-4">Loading benchmarks.</h1>
          <p className="text-slate-500 font-medium">Crunching your college and national percentile positions.</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8 dot-pattern min-h-screen">
        <div className="slab-card !rounded-[3rem] !p-12 text-center">
          <h1 className="text-4xl font-display font-black uppercase italic tracking-tight mb-4">Benchmark unavailable.</h1>
          <p className="text-slate-500 font-medium mb-8">{error ?? 'We could not load benchmark data right now.'}</p>
          <Button onClick={reload}>
            <RefreshCw size={16} /> TRY AGAIN
          </Button>
        </div>
      </div>
    );
  }

  const { benchmark, score, profile } = data;
  const userName = profile.profile.full_name ?? 'ZeroGap User';
  const role = benchmark.target_role;
  const topBand = Math.max(1, 100 - Math.round(benchmark.national_percentile));

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 dot-pattern min-h-screen">
      <header className="mb-12 flex flex-col md:flex-row justify-between items-end gap-10">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 border-[1.5px] border-slate-900 bg-secondary rounded-full text-[9px] font-black uppercase mb-4 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            How You Compare
          </div>
          <h1 className="text-4xl font-display font-black text-slate-900 leading-none">PEER <br />STATS.</h1>
          <p className="text-slate-500 font-medium text-sm mt-3 max-w-xl">
            Live percentile ranking for <span className="text-primary font-black underline decoration-2 decoration-secondary">{role}</span>.
          </p>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-10">
          <section>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-display font-black uppercase italic tracking-tight">Your Position</h2>
              <div className="px-3 py-1 bg-primary text-white border-[2px] border-slate-900 rounded-lg font-black text-[10px] shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] uppercase">
                Top {topBand}%
              </div>
            </div>

            <div className="slab-card flex items-center justify-between group transition-all hover:border-primary border-primary bg-primary/5">
              <div className="flex items-center gap-5">
                <div className="text-xl font-black italic text-slate-300 w-8">#1</div>
                <div className="w-12 h-12 rounded-2xl border-[2px] border-slate-900 flex items-center justify-center shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] bg-white">
                  <span className="text-lg font-black italic">{userName.slice(0, 1)}</span>
                </div>
                <div>
                  <p className="font-black text-slate-900 uppercase italic tracking-tight leading-none mb-1">
                    {userName} <span className="text-[10px] text-primary">(You)</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-tight">
                    Verified score: <span className="text-slate-900">{Math.round(score.finalScore)}</span>
                  </p>
                </div>
              </div>

              <div className="text-right flex flex-col items-end">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl font-black italic text-slate-900 leading-none">{Math.round(benchmark.national_percentile)}%</span>
                  <TrendingUp className="text-success" size={16} strokeWidth={3} />
                </div>
                <p className="text-[8px] uppercase font-black text-slate-400 tracking-widest">National percentile</p>
              </div>
            </div>
          </section>

          <Card title="Signal Breakdown" icon={Target} variant="highlight">
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { label: 'College percentile', value: benchmark.college_percentile, tone: 'bg-primary' },
                { label: 'Branch percentile', value: benchmark.branch_percentile, tone: 'bg-secondary' },
                { label: 'National percentile', value: benchmark.national_percentile, tone: 'bg-accent' },
              ].map((item) => (
                <div key={item.label} className="rounded-[2rem] border-2 border-slate-900 bg-white p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                  <div className={cn('w-10 h-10 rounded-xl border-2 border-slate-900 mb-4', item.tone)} />
                  <p className="text-3xl font-display font-black italic leading-none mb-2">{Math.round(item.value)}%</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Benchmark Context" icon={Zap}>
            <div className="space-y-4">
              <p className="text-sm font-medium text-slate-600 leading-relaxed">
                Total same-role users tracked: <strong className="font-black text-slate-900">{benchmark.ranking_data.total_role_users ?? 0}</strong>
              </p>
              <p className="text-sm font-medium text-slate-600 leading-relaxed">
                Total same-college users tracked: <strong className="font-black text-slate-900">{benchmark.ranking_data.total_college_users ?? 0}</strong>
              </p>
              <Button variant="ghost" className="text-[10px] font-black uppercase text-slate-400 hover:text-primary">
                VIEW FRESH BENCHMARK <ArrowUpRight size={14} />
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          <Card title="Percentile Insights" icon={BarChart3} variant="highlight">
            <div className="space-y-6 py-4">
              {[
                { label: 'Technical Depth', value: score.skillsMatchPercentage },
                { label: 'Execution Velocity', value: benchmark.branch_percentile },
                { label: 'Collaborative Proof', value: benchmark.college_percentile },
              ].map((stat) => (
                <div key={stat.label} className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-500 uppercase tracking-widest">{stat.label}</span>
                    <span className="text-primary">{Math.round(stat.value)}%</span>
                  </div>
                  <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${Math.min(100, stat.value)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card variant="warning" title="Growth Sprint">
            <p className="text-sm font-medium text-slate-800 mb-4 italic">
              “Improve consistency and missing-skill coverage together to move your percentile faster than raw practice alone.”
            </p>
            <Button variant="secondary" size="sm" className="w-full" onClick={reload}>
              Refresh Benchmark
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
