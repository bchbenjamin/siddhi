import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { api } from '../../lib/api';
import type { GoalProgressSummary } from '../../types';
import { useAuth } from '../../app/AuthContext';
import { PageShell } from '../../components/layout/PageShell';
import {
  PageHeader, Card, LoadingState, ErrorState, EmptyState, Button,
  Modal, Field, Input, Textarea, Select, StatusBadge, RatingScale
} from '../../components/ui';
import { formatDate, RATING_LABELS } from '../../lib/utils';

const schema = z.object({
  term: z.string().min(1),
  rating: z.coerce.number().int().min(0).max(4),
  observation: z.string().min(1),
  observed_at: z.string().min(1),
});
type FormValues = z.infer<typeof schema>;

const TERM_LABELS: Record<string, string> = {
  baseline: 'Baseline',
  term_1: 'Term 1',
  term_2: 'Term 2',
  term_3: 'Term 3',
  final: 'Final',
};

const CHART_COLORS = ['#808080', '#bbb2ce', '#d3e5e9', '#65451d', '#453b60'];

function GoalProgressCard({
  summary,
  canAdd,
  onAddEntry,
}: {
  summary: GoalProgressSummary;
  canAdd: boolean;
  onAddEntry: (goalId: string) => void;
}) {
  const terms = ['baseline', 'term_1', 'term_2', 'term_3', 'final'];
  const chartData: Array<{ term: string; rating: number }> = terms
    .map(t => ({ term: TERM_LABELS[t], rating: summary[t as 'baseline' | 'term_1' | 'term_2' | 'term_3' | 'final'] }))
    .filter((d): d is { term: string; rating: number } => d.rating !== undefined && d.rating !== null);

  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-burnt-amber uppercase">{summary.domain}</span>
            <StatusBadge status={summary.goal_status} />
          </div>
          <p className="text-sm text-ink-black">{summary.annual_goal}</p>
        </div>
        {canAdd && (
          <Button size="sm" variant="outline" className="ml-2 flex-shrink-0" onClick={() => onAddEntry(summary.goal_id)}>
            <Plus size={14} /> Add Progress
          </Button>
        )}
      </div>

      {/* Term summary */}
      <div className="grid grid-cols-5 gap-1 mb-4">
        {terms.map(t => {
          const val = summary[t as keyof GoalProgressSummary] as number | undefined;
          return (
            <div key={t} className="text-center">
              <p className="text-xs text-mist-gray mb-1">{TERM_LABELS[t]}</p>
              <div
                className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border
                  ${val !== undefined && val !== null
                    ? 'bg-burnt-amber text-white border-burnt-amber'
                    : 'bg-bone text-mist-gray border-bone'
                  }`}
                aria-label={val !== undefined && val !== null ? `${TERM_LABELS[t]}: ${val} – ${RATING_LABELS[val]}` : `${TERM_LABELS[t]}: not recorded`}
              >
                {val !== undefined && val !== null ? val : '–'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div aria-label="Progress chart" role="img">
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e6e1" />
              <XAxis dataKey="term" tick={{ fontSize: 10, fill: '#808080' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={{ fontSize: 10, fill: '#808080' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v: number) => [RATING_LABELS[v] || v, 'Rating']}
                contentStyle={{ fontSize: 11, border: '1px solid #e5e6e1', borderRadius: 6 }}
              />
              <Bar dataKey="rating" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Accessible text table */}
          <table className="sr-only">
            <caption>Progress ratings for {summary.annual_goal}</caption>
            <thead><tr><th>Term</th><th>Rating</th><th>Label</th></tr></thead>
            <tbody>
              {chartData.map(d => (
                <tr key={d.term}>
                  <td>{d.term}</td>
                  <td>{d.rating}</td>
                  <td>{RATING_LABELS[d.rating as number] || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {summary.latest_observed_at && (
        <p className="text-xs text-mist-gray mt-2">
          Latest: {formatDate(summary.latest_observed_at)}
          {summary.latest_rating_label && ` · ${summary.latest_rating_label}`}
        </p>
      )}
    </Card>
  );
}

export default function ProgressPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const canAdd = user?.active_role && ['special_educator', 'therapist', 'school_head'].includes(user.active_role);

  const { data: summaries, isLoading, error } = useQuery<GoalProgressSummary[]>({
    queryKey: ['progress', studentId],
    queryFn: () => api.get(`/students/${studentId}/progress`),
    enabled: !!studentId,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data: FormValues) => api.post(`/goals/${activeGoalId}/progress-entries`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress', studentId] });
      setModalOpen(false);
      reset();
    },
    onError: (err) => setServerError(err instanceof Error ? err.message : 'Failed'),
  });

  function openAddModal(goalId: string) {
    setActiveGoalId(goalId);
    setServerError(null);
    setModalOpen(true);
  }

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Progress Monitoring"
          subtitle="Goal-wise ratings across baseline, Term 1–3 and final"
          actions={<RatingScale />}
        />

        {isLoading && <LoadingState />}
        {error && <ErrorState message="Unable to load progress data." />}

        {summaries && summaries.length === 0 && (
          <EmptyState title="No goals found" description="Add IEP goals to start tracking progress." />
        )}

        <div className="space-y-4">
          {summaries?.map(s => (
            <GoalProgressCard
              key={s.goal_id}
              summary={s}
              canAdd={!!canAdd}
              onAddEntry={openAddModal}
            />
          ))}
        </div>

        <Modal
          open={modalOpen}
          onClose={() => { setModalOpen(false); reset(); }}
          title="Add Progress Entry"
          footer={
            <>
              <Button variant="ghost" onClick={() => { setModalOpen(false); reset(); }}>Cancel</Button>
              <Button form="progress-form" type="submit" loading={isSubmitting}>Save Entry</Button>
            </>
          }
        >
          <form id="progress-form" onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
            <Field label="Term" htmlFor="term" error={errors.term?.message} required>
              <Select id="term" error={!!errors.term} {...register('term')}>
                <option value="">Select term…</option>
                {Object.entries(TERM_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Rating (0–4)" htmlFor="rating" error={errors.rating?.message} required>
              <Select id="rating" error={!!errors.rating} {...register('rating')}>
                <option value="">Select rating…</option>
                {Object.entries(RATING_LABELS).map(([v, l]) => <option key={v} value={v}>{v} – {l}</option>)}
              </Select>
            </Field>
            <Field label="Observation" htmlFor="observation" error={errors.observation?.message} required>
              <Textarea id="observation" rows={3} {...register('observation')} />
            </Field>
            <Field label="Observation Date" htmlFor="observed_at" error={errors.observed_at?.message} required>
              <Input id="observed_at" type="date" {...register('observed_at')} />
            </Field>
            {serverError && <p className="text-xs text-burgundy" role="alert">{serverError}</p>}
          </form>
        </Modal>
      </div>
    </PageShell>
  );
}
