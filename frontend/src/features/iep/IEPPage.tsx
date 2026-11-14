import { useState } from 'react';
import { useParams } from '../../lib/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../../lib/api';
import type { IEPPlan, IEPGoal } from '../../types';
import { useAuth } from '../../app/AuthContext';
import { PageShell } from '../../components/layout/PageShell';
import {
  PageHeader, Card, LoadingState, ErrorState, EmptyState, Button,
  Modal, Field, Input, Textarea, Select, StatusBadge
} from '../../components/ui';
import { formatDate, PLOP_DOMAIN_LABELS } from '../../lib/utils';

const planSchema = z.object({
  academic_year: z.string().min(1),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  status: z.string().default('draft'),
});
type PlanInput = z.input<typeof planSchema>;
type PlanForm = z.output<typeof planSchema>;

const goalSchema = z.object({
  domain: z.string().min(1),
  annual_goal: z.string().min(1),
  teaching_strategies: z.string().min(1),
  timeline: z.string().min(1),
  evaluation_method: z.string().min(1),
  status: z.string().default('not_started'),
});
type GoalInput = z.input<typeof goalSchema>;
type GoalForm = z.output<typeof goalSchema>;

function GoalCard({ goal }: { goal: IEPGoal }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-bone rounded-lg p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-burnt-amber uppercase">{goal.domain}</span>
            <StatusBadge status={goal.status} />
          </div>
          <p className="text-sm text-ink-black">{goal.annual_goal}</p>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse goal' : 'Expand goal'}
          className="text-mist-gray hover:text-ink-black"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 text-xs text-slate-gray border-t border-bone pt-3">
          <p><span className="font-medium">Strategies:</span> {goal.teaching_strategies}</p>
          <p><span className="font-medium">Timeline:</span> {goal.timeline}</p>
          <p><span className="font-medium">Evaluation:</span> {goal.evaluation_method}</p>
          {goal.responsible_staff_name && (
            <p><span className="font-medium">Responsible:</span> {goal.responsible_staff_name}</p>
          )}
          {goal.objectives.length > 0 && (
            <div>
              <p className="font-medium mb-1">Short-term Objectives:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                {goal.objectives.map(obj => (
                  <li key={obj.id}>{obj.objective_text}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function IEPPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<IEPPlan | null>(null);
  const [planServerError, setPlanServerError] = useState<string | null>(null);
  const [goalServerError, setGoalServerError] = useState<string | null>(null);

  const isEducator = user?.active_role === 'special_educator';

  const { data: plans, isLoading, error } = useQuery<IEPPlan[]>({
    queryKey: ['iep-plans', studentId],
    queryFn: () => api.get(`/students/${studentId}/iep-plans`),
    enabled: !!studentId,
  });

  const { data: goals } = useQuery<IEPGoal[]>({
    queryKey: ['iep-goals', selectedPlan?.id],
    queryFn: () => api.get(`/iep-plans/${selectedPlan!.id}/goals`),
    enabled: !!selectedPlan,
  });

  // Auto-select first active plan
  if (plans && !selectedPlan) {
    const active = plans.find(p => p.status === 'active') || plans[0];
    if (active) setSelectedPlan(active);
  }

  const planForm = useForm<PlanInput, unknown, PlanForm>({ resolver: zodResolver(planSchema) });
  const goalForm = useForm<GoalInput, unknown, GoalForm>({ resolver: zodResolver(goalSchema) });

  const createPlanMutation = useMutation({
    mutationFn: (data: PlanForm) => api.post(`/students/${studentId}/iep-plans`, data),
    onSuccess: (newPlan) => {
      queryClient.invalidateQueries({ queryKey: ['iep-plans', studentId] });
      setSelectedPlan(newPlan as IEPPlan);
      setPlanModalOpen(false);
      planForm.reset();
    },
    onError: (err) => setPlanServerError(err instanceof Error ? err.message : 'Failed'),
  });

  const createGoalMutation = useMutation({
    mutationFn: (data: GoalForm) => api.post(`/iep-plans/${selectedPlan!.id}/goals`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iep-goals', selectedPlan?.id] });
      setGoalModalOpen(false);
      goalForm.reset();
    },
    onError: (err) => setGoalServerError(err instanceof Error ? err.message : 'Failed'),
  });

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="IEP Plan & Goals"
          subtitle="Annual goals and short-term objectives"
          actions={
            isEducator && (
              <Button onClick={() => { setPlanModalOpen(true); setPlanServerError(null); }}>
                <Plus size={16} /> New Plan
              </Button>
            )
          }
        />

        {isLoading && <LoadingState />}
        {error && <ErrorState message="Unable to load IEP plans." />}

        {plans && plans.length === 0 && (
          <EmptyState title="No IEP plans yet" description="Create the first IEP plan for this student." />
        )}

        {plans && plans.length > 0 && (
          <>
            {/* Plan selector */}
            <div className="flex gap-2 mb-5 flex-wrap">
              {plans.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlan(p)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selectedPlan?.id === p.id
                      ? 'bg-burnt-amber text-white border-burnt-amber'
                      : 'border-bone text-slate-gray hover:border-burnt-amber/50'
                  }`}
                >
                  {p.academic_year} <StatusBadge status={p.status} />
                </button>
              ))}
            </div>

            {selectedPlan && (
              <>
                <Card className="mb-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-mist-gray">Academic Year</p>
                      <p className="font-medium text-ink-black">{selectedPlan.academic_year}</p>
                    </div>
                    <StatusBadge status={selectedPlan.status} />
                  </div>
                  <div className="mt-2 flex gap-6 text-xs text-mist-gray">
                    <span>Start: {formatDate(selectedPlan.start_date)}</span>
                    <span>End: {formatDate(selectedPlan.end_date)}</span>
                    <span>Version {selectedPlan.version}</span>
                  </div>
                </Card>

                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-medium text-ink-black">Goals</h2>
                  {isEducator && (
                    <Button size="sm" variant="outline" onClick={() => { setGoalModalOpen(true); setGoalServerError(null); }}>
                      <Plus size={14} /> Add Goal
                    </Button>
                  )}
                </div>

                {!goals ? (
                  <LoadingState />
                ) : goals.length === 0 ? (
                  <EmptyState title="No goals yet" description="Add annual goals to this IEP plan." />
                ) : (
                  <div className="space-y-3">
                    {goals.map(g => <GoalCard key={g.id} goal={g} />)}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Plan modal */}
        <Modal open={planModalOpen} onClose={() => { setPlanModalOpen(false); planForm.reset(); }} title="Create IEP Plan"
          footer={
            <>
              <Button variant="ghost" onClick={() => setPlanModalOpen(false)}>Cancel</Button>
              <Button form="plan-form" type="submit" loading={createPlanMutation.isPending}>Create Plan</Button>
            </>
          }
        >
          <form id="plan-form" onSubmit={planForm.handleSubmit(d => createPlanMutation.mutate(d))} className="space-y-4">
            <Field label="Academic Year" htmlFor="academic_year" error={planForm.formState.errors.academic_year?.message} required>
              <Input id="academic_year" placeholder="e.g. 2026-2027" {...planForm.register('academic_year')} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Date" htmlFor="start_date" error={planForm.formState.errors.start_date?.message} required>
                <Input id="start_date" type="date" {...planForm.register('start_date')} />
              </Field>
              <Field label="End Date" htmlFor="end_date" error={planForm.formState.errors.end_date?.message} required>
                <Input id="end_date" type="date" {...planForm.register('end_date')} />
              </Field>
            </div>
            <Field label="Status" htmlFor="status">
              <Select id="status" {...planForm.register('status')}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
              </Select>
            </Field>
            {planServerError && <p className="text-xs text-burgundy" role="alert">{planServerError}</p>}
          </form>
        </Modal>

        {/* Goal modal */}
        <Modal open={goalModalOpen} onClose={() => { setGoalModalOpen(false); goalForm.reset(); }} title="Add Goal" maxWidth="max-w-xl"
          footer={
            <>
              <Button variant="ghost" onClick={() => setGoalModalOpen(false)}>Cancel</Button>
              <Button form="goal-form" type="submit" loading={createGoalMutation.isPending}>Save Goal</Button>
            </>
          }
        >
          <form id="goal-form" onSubmit={goalForm.handleSubmit(d => createGoalMutation.mutate(d))} className="space-y-4">
            <Field label="Domain" htmlFor="domain" error={goalForm.formState.errors.domain?.message} required>
              <Select id="domain" {...goalForm.register('domain')}>
                <option value="">Select domain…</option>
                {Object.entries(PLOP_DOMAIN_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Annual Goal" htmlFor="annual_goal" error={goalForm.formState.errors.annual_goal?.message} required>
              <Textarea id="annual_goal" rows={3} {...goalForm.register('annual_goal')} />
            </Field>
            <Field label="Teaching Strategies" htmlFor="teaching_strategies" error={goalForm.formState.errors.teaching_strategies?.message} required>
              <Textarea id="teaching_strategies" rows={2} {...goalForm.register('teaching_strategies')} />
            </Field>
            <Field label="Timeline" htmlFor="timeline" error={goalForm.formState.errors.timeline?.message} required>
              <Input id="timeline" placeholder="e.g. 10 months" {...goalForm.register('timeline')} />
            </Field>
            <Field label="Evaluation Method" htmlFor="evaluation_method" error={goalForm.formState.errors.evaluation_method?.message} required>
              <Input id="evaluation_method" {...goalForm.register('evaluation_method')} />
            </Field>
            {goalServerError && <p className="text-xs text-burgundy" role="alert">{goalServerError}</p>}
          </form>
        </Modal>
      </div>
    </PageShell>
  );
}
