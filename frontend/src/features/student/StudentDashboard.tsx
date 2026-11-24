import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../app/AuthContext';
interface StudentSelfProfile { full_name: string; admission_number: string; grade_class: string; date_of_birth: string; strengths?: string | null; learning_style?: string | null; languages_known?: string | null; assistive_devices?: string | null; }
function Detail({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return <div className="border-b border-ink/10 py-3 last:border-0"><p className="text-xs uppercase tracking-wide text-graphite">{label}</p><p className="mt-1 text-sm text-ink">{value}</p></div>;
}
export default function StudentDashboard() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery<StudentSelfProfile>({ queryKey: ['student-self-profile'], queryFn: () => api.get('/student/me') });
  return <div className="mx-auto w-full max-w-3xl space-y-6">
    <div><p className="text-xs uppercase tracking-[0.16em] text-graphite">Student portal</p><h1 className="mt-2 font-display text-3xl text-ink">Hello, {data?.full_name ?? user?.full_name}</h1><p className="mt-2 text-sm text-graphite">Your personal student profile.</p></div>
    {isLoading && <p className="text-sm text-graphite">Loading your profile…</p>}
    {isError && <p className="rounded-lg bg-dusty-rose/20 px-4 py-3 text-sm text-error-text" role="alert">We could not load your student profile. Please try again later.</p>}
    {data && <section className="rounded-xl border border-stone-border bg-white p-5 sm:p-7">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-medium text-ink">{data.full_name}</h2><p className="mt-1 text-sm text-graphite">{data.grade_class}</p></div><span className="rounded-full bg-bone/50 px-3 py-1 text-xs text-graphite">{data.admission_number}</span></div>
      <Detail label="Date of birth" value={(() => {
    if (!data?.date_of_birth) return '';
    const d = new Date(data.date_of_birth);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
  })()} />
      <Detail label="My strengths" value={data.strengths} /><Detail label="Learning preferences" value={data.learning_style} />
      <Detail label="Languages" value={data.languages_known} /><Detail label="Learning tools" value={data.assistive_devices} />
    </section>}
  </div>;
}
