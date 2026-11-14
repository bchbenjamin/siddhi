import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '../../lib/navigation';
import { api } from '../../lib/api';
import type { ReportsSummary } from '../../types';
import { useAuth } from '../../app/AuthContext';
import { PageShell } from '../../components/layout/PageShell';
import { Card, LoadingState, ErrorState, StatusBadge } from '../../components/ui';
import { Users, BookOpen, TrendingUp, ClipboardCheck } from 'lucide-react';

export default function StaffDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery<ReportsSummary>({
    queryKey: ['reports-summary'],
    queryFn: () => api.get('/reports/summary'),
  });

  if (!user) return null;

  const roleName = user.active_role.replace(/_/g, ' ');
  const greeting = `Welcome, ${user.full_name.split(' ')[0]}`;

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-medium text-ink-black tracking-tight">{greeting}</h1>
          <p className="text-sm text-slate-gray capitalize">{roleName} · Dashboard</p>
        </div>

        {isLoading && <LoadingState />}
        {error && <ErrorState message="Unable to load dashboard data." />}

        {data && (
          <>
            {/* Summary tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Users size={18} className="text-burnt-amber" aria-hidden="true" />
                  <span className="text-xs text-slate-gray uppercase tracking-wide">Students</span>
                </div>
                <p className="text-2xl font-medium text-ink-black">{data.total_students}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <BookOpen size={18} className="text-deep-violet" aria-hidden="true" />
                  <span className="text-xs text-slate-gray uppercase tracking-wide">Active IEPs</span>
                </div>
                <p className="text-2xl font-medium text-ink-black">{data.active_plans}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp size={18} className="text-slate-gray" aria-hidden="true" />
                  <span className="text-xs text-slate-gray uppercase tracking-wide">Total Goals</span>
                </div>
                <p className="text-2xl font-medium text-ink-black">{data.total_goals}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <ClipboardCheck size={18} className="text-pale-sage" aria-hidden="true" />
                  <span className="text-xs text-slate-gray uppercase tracking-wide">Achieved</span>
                </div>
                <p className="text-2xl font-medium text-ink-black">{data.achieved_goals}</p>
              </Card>
            </div>

            {/* Student list */}
            <h2 className="text-base font-medium text-ink-black mb-3">
              {data.students.length > 0 ? 'Your Students' : 'Students'}
            </h2>

            {data.students.length === 0 ? (
              <p className="text-sm text-mist-gray">No students assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {data.students.slice(0, 10).map((s) => (
                  <button
                    key={s.student_id}
                    onClick={() => navigate(`/students/${s.student_id}`)}
                    className="w-full flex items-center gap-4 bg-white border border-bone rounded-xl p-4
                      hover:border-burnt-amber/40 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-black truncate">{s.full_name}</p>
                      <p className="text-xs text-slate-gray">{s.grade_class} · {s.disability_category}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-3 text-xs text-mist-gray">
                      {s.academic_year && <span>{s.academic_year}</span>}
                      {s.goal_attainment_pct != null && (
                        <span>{s.goal_attainment_pct}% attainment</span>
                      )}
                    </div>
                    {s.active_iep && <StatusBadge status="active" />}
                  </button>
                ))}
                {data.students.length > 10 && (
                  <button
                    onClick={() => navigate('/students')}
                    className="w-full text-center text-xs text-burnt-amber hover:underline py-2"
                  >
                    View all {data.students.length} students →
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
