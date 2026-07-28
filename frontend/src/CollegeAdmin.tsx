import {
  Building2,
  Users,
  BarChart3,
  ShieldCheck,
  FileText,
  Search,
  ExternalLink,
  Filter,
  Plus,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { Button } from './UI';
import { cn } from './utils';
import type { CollegeDashboardData, CollegeStudent } from './backend';
import { useBackendResource } from './useBackendResource';
import { useSession } from './session';

interface CollegePayload {
  dashboard: {
    college_name: string;
    analytics: CollegeDashboardData | null;
    student_count: number;
  };
  students: CollegeStudent[];
  readiness: {
    total_students: number;
    job_ready_students: number;
    placement_readiness_percentage: number;
  };
  heatmap: Array<{ skill: string; average_proficiency: number }>;
  recommendations: string[];
}

export default function CollegeAdmin() {
  const session = useSession();
  const canAccess = session.user?.role === 'college' || session.user?.role === 'admin';
  const { data, loading, error, reload } = useBackendResource<CollegePayload>(async (request) => {
    const [dashboard, students, readiness, heatmap, recommendations] = await Promise.all([
      request<CollegePayload['dashboard']>('/api/college/dashboard'),
      request<CollegeStudent[]>('/api/college/students'),
      request<CollegePayload['readiness']>('/api/college/placement-readiness'),
      request<Array<{ skill: string; average_proficiency: number }>>('/api/college/skill-heatmap'),
      request<string[]>('/api/college/training-recommendations'),
    ]);

    return { dashboard, students, readiness, heatmap, recommendations };
  }, canAccess ? [] : ['skip']);

  if (!canAccess) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8 dot-pattern min-h-screen">
        <div className="slab-card !rounded-[3rem] !p-12 text-center">
          <Lock className="mx-auto mb-6 text-primary" size={40} />
          <h1 className="text-4xl font-display font-black uppercase italic tracking-tight mb-4">Admin access only.</h1>
          <p className="text-slate-500 font-medium">
            This view is wired to real college-admin endpoints. Switch this account to the <strong className="font-black text-slate-900">college</strong> or <strong className="font-black text-slate-900">admin</strong> role to use it.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8 dot-pattern min-h-screen">
        <div className="slab-card !rounded-[3rem] !p-12 text-center">
          <h1 className="text-4xl font-display font-black uppercase italic tracking-tight mb-4">Loading college dashboard.</h1>
          <p className="text-slate-500 font-medium">Pulling analytics, student roster, and training recommendations.</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8 dot-pattern min-h-screen">
        <div className="slab-card !rounded-[3rem] !p-12 text-center">
          <h1 className="text-4xl font-display font-black uppercase italic tracking-tight mb-4">College dashboard unavailable.</h1>
          <p className="text-slate-500 font-medium mb-8">{error ?? 'We could not load college analytics right now.'}</p>
          <Button onClick={reload}>
            <RefreshCw size={16} /> TRY AGAIN
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 dot-pattern min-h-screen">
      <header className="mb-12 flex flex-col md:flex-row justify-between items-end gap-10">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 border-[1.5px] border-slate-900 bg-secondary rounded-full text-[9px] font-black uppercase mb-4 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            College Home
          </div>
          <h1 className="text-4xl font-display font-black text-slate-900 leading-none">ADMIN <br />DASHBOARD.</h1>
          <p className="text-slate-500 font-medium text-sm mt-3 max-w-xl underline decoration-primary/20 decoration-2 underline-offset-4">
            {data.dashboard.college_name}
          </p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" size="sm" icon={FileText} className="text-[10px]" onClick={reload}>
            EXPORT REPORT
          </Button>
          <Button size="sm" icon={Plus} className="text-[10px] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            ADD STUDENTS
          </Button>
        </div>
      </header>

      <div className="grid md:grid-cols-4 gap-6 mb-16">
        {[
          { label: 'Active Students', value: String(data.dashboard.student_count), icon: Users, color: 'bg-primary' },
          { label: 'Ready for Hiring', value: String(data.readiness.job_ready_students), icon: ShieldCheck, color: 'bg-success' },
          { label: 'Avg Skill Score', value: String(Math.round(data.dashboard.analytics?.avg_skill_score ?? 0)), icon: BarChart3, color: 'bg-secondary' },
          { label: 'Placement Ready %', value: `${Math.round(data.readiness.placement_readiness_percentage)}%`, icon: Building2, color: 'bg-slate-900' },
        ].map((stat) => (
          <div key={stat.label} className="slab-card !p-6 flex flex-col items-center group hover:border-primary transition-all">
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4 border-2 border-slate-900 shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] text-white group-hover:scale-105 transition-transform', stat.color)}>
              <stat.icon size={22} strokeWidth={2.5} />
            </div>
            <p className="text-3xl font-display font-black text-slate-900 italic leading-none">{stat.value}</p>
            <p className="text-[9px] uppercase font-black text-slate-400 mt-2 tracking-widest">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-10">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 slab-card !rounded-[2.5rem] !p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
              <h2 className="text-2xl font-display font-black uppercase italic tracking-tight">Student Success List</h2>
              <div className="flex gap-4 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <input type="text" placeholder="Search roster..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border-2 border-slate-900 outline-none focus:ring-2 focus:ring-primary/10 text-[10px] font-black uppercase tracking-tight" />
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                </div>
                <Button variant="outline" size="sm" icon={Filter} className="text-[10px]">FILTER</Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-900">
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Student</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Degree</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Email</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-900/5 bg-white">
                  {data.students.map((student) => (
                    <tr key={student.id ?? student.email} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <p className="font-black text-slate-900 uppercase italic tracking-tight text-xs leading-none">{student.full_name ?? 'Unknown student'}</p>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{student.degree ?? 'N/A'}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[10px] font-black text-slate-500 tracking-tight">{student.email ?? 'N/A'}</span>
                      </td>
                      <td className="px-6 py-5">
                        <button className="p-2 h-9 w-9 flex items-center justify-center rounded-xl bg-slate-50 border-[2.5px] border-slate-900/10 hover:border-primary hover:text-primary transition-all text-slate-400 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5">
                          <ExternalLink size={14} strokeWidth={3} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-8">
            <div className="slab-card !rounded-[2.5rem] !p-8">
              <h3 className="text-xl font-display font-black uppercase mb-4">Skill Heatmap</h3>
              <div className="space-y-4">
                {data.heatmap.slice(0, 5).map((item) => (
                  <div key={item.skill}>
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                      <span>{item.skill}</span>
                      <span className="text-slate-900">{Math.round(item.average_proficiency)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full border-2 border-slate-900 overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${item.average_proficiency}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="slab-card !bg-accent/10 border-accent shadow-[4px_4px_0px_0px_rgba(245,158,11,1)]">
              <h3 className="text-md font-black uppercase tracking-widest text-accent mb-6">Training Recommendations</h3>
              <div className="space-y-3">
                {data.recommendations.map((item) => (
                  <p key={item} className="text-[10px] font-black uppercase tracking-tight text-slate-600">
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
