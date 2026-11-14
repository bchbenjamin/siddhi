import { useState } from 'react';
import { useParams } from '../../lib/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../../lib/api';
import type { IEPReview, IEPPlan } from '../../types';
import { useAuth } from '../../app/AuthContext';
import { PageShell } from '../../components/layout/PageShell';
import {
  PageHeader, Card, LoadingState, ErrorState, EmptyState, Button,
  Modal, Field, Input, Textarea, Select, StatusBadge
} from '../../components/ui';
import { formatDate } from '../../lib/utils';

const reviewSchema = z.object({
  iep_plan_id: z.string().uuid('Must select a plan'),
  review_type: z.enum(['quarterly', 'half_yearly', 'annual']),
  scheduled_date: z.string().min(1),
  review_notes: z.string().optional(),
});
type ReviewForm = z.infer<typeof reviewSchema>;

const decisionSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  comment: z.string().optional(),
});
type DecisionForm = z.infer<typeof decisionSchema>;

function ApprovalRow({
  approval,
  onDecide,
  canDecide,
}: {
  approval: IEPReview['approvals'][0];
  onDecide: (id: string) => void;
  canDecide: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-bone last:border-0">
      <div>
        <p className="text-xs font-medium text-ink-black capitalize">{approval.required_role.replace(/_/g, ' ')}</p>
        {approval.approver_name && approval.status !== 'pending' && (
          <p className="text-xs text-mist-gray">{approval.approver_name}</p>
        )}
        {approval.comment && <p className="text-xs text-slate-gray italic mt-0.5">"{approval.comment}"</p>}
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={approval.status} />
        {canDecide && approval.status === 'pending' && (
          <Button size="sm" variant="outline" onClick={() => onDecide(approval.id)}>
            Decide
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ReviewsPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [activeApprovalId, setActiveApprovalId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const canCreate = user?.active_role && ['special_educator', 'school_head'].includes(user.active_role);

  const { data: reviews, isLoading, error } = useQuery<IEPReview[]>({
    queryKey: ['reviews', studentId],
    queryFn: () => api.get(`/students/${studentId}/iep-reviews`),
    enabled: !!studentId,
  });

  const { data: plans } = useQuery<IEPPlan[]>({
    queryKey: ['iep-plans', studentId],
    queryFn: () => api.get(`/students/${studentId}/iep-plans`),
    enabled: !!studentId,
  });

  const reviewForm = useForm<ReviewForm>({ resolver: zodResolver(reviewSchema) });
  const decisionForm = useForm<DecisionForm>({ resolver: zodResolver(decisionSchema) });

  const createMutation = useMutation({
    mutationFn: (d: ReviewForm) => api.post(`/students/${studentId}/iep-reviews`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', studentId] });
      setReviewModalOpen(false);
      reviewForm.reset();
    },
    onError: (err) => setServerError(err instanceof Error ? err.message : 'Failed'),
  });

  const decisionMutation = useMutation({
    mutationFn: (d: DecisionForm) => api.post(`/approvals/${activeApprovalId}/decision`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', studentId] });
      setDecisionModalOpen(false);
      decisionForm.reset();
    },
    onError: (err) => setServerError(err instanceof Error ? err.message : 'Failed'),
  });

  function canDecideApproval(_review: IEPReview, approval: IEPReview['approvals'][0]): boolean {
    if (!user) return false;
    if (approval.status !== 'pending') return false;
    if (user.active_role === 'guardian') return approval.required_role === 'guardian';
    return approval.required_role === user.active_role;
  }

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="IEP Reviews & Approvals"
          subtitle="Quarterly, half-yearly and annual review records"
          actions={canCreate && (
            <Button onClick={() => { setReviewModalOpen(true); setServerError(null); }}>
              <Plus size={16} /> Schedule Review
            </Button>
          )}
        />

        {isLoading && <LoadingState />}
        {error && <ErrorState message="Unable to load reviews." />}

        {reviews && reviews.length === 0 && (
          <EmptyState title="No reviews scheduled yet" />
        )}

        <div className="space-y-3">
          {reviews?.map(r => (
            <Card key={r.id}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-burnt-amber uppercase">
                      {r.review_type.replace(/_/g, ' ')} Review
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-xs text-mist-gray">
                    Scheduled: {formatDate(r.scheduled_date)}
                    {r.conducted_at && ` · Conducted: ${formatDate(r.conducted_at)}`}
                  </p>
                </div>
                <button
                  onClick={() => setExpandedId(prev => prev === r.id ? null : r.id)}
                  aria-expanded={expandedId === r.id}
                  aria-label="Toggle approval details"
                  className="text-mist-gray hover:text-ink-black"
                >
                  {expandedId === r.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {r.review_notes && (
                <p className="text-sm text-slate-gray mb-2">{r.review_notes}</p>
              )}

              {expandedId === r.id && r.approvals.length > 0 && (
                <div className="mt-2 border-t border-bone pt-2">
                  <p className="text-xs font-medium text-mist-gray mb-2">Approvals</p>
                  {r.approvals.map(a => (
                    <ApprovalRow
                      key={a.id}
                      approval={a}
                      canDecide={canDecideApproval(r, a)}
                      onDecide={(id) => {
                        setActiveApprovalId(id);
                        setServerError(null);
                        setDecisionModalOpen(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Schedule review modal */}
        <Modal open={reviewModalOpen} onClose={() => { setReviewModalOpen(false); reviewForm.reset(); }} title="Schedule IEP Review"
          footer={
            <>
              <Button variant="ghost" onClick={() => { setReviewModalOpen(false); reviewForm.reset(); }}>Cancel</Button>
              <Button form="review-form" type="submit" loading={createMutation.isPending}>Schedule</Button>
            </>
          }
        >
          <form id="review-form" onSubmit={reviewForm.handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
            <Field label="IEP Plan" htmlFor="iep_plan_id" error={reviewForm.formState.errors.iep_plan_id?.message} required>
              <Select id="iep_plan_id" {...reviewForm.register('iep_plan_id')}>
                <option value="">Select plan…</option>
                {plans?.map(p => <option key={p.id} value={p.id}>{p.academic_year} ({p.status})</option>)}
              </Select>
            </Field>
            <Field label="Review Type" htmlFor="review_type" error={reviewForm.formState.errors.review_type?.message} required>
              <Select id="review_type" {...reviewForm.register('review_type')}>
                <option value="">Select…</option>
                <option value="quarterly">Quarterly</option>
                <option value="half_yearly">Half-Yearly</option>
                <option value="annual">Annual</option>
              </Select>
            </Field>
            <Field label="Scheduled Date" htmlFor="scheduled_date" error={reviewForm.formState.errors.scheduled_date?.message} required>
              <Input id="scheduled_date" type="date" {...reviewForm.register('scheduled_date')} />
            </Field>
            <Field label="Review Notes" htmlFor="review_notes">
              <Textarea id="review_notes" rows={2} {...reviewForm.register('review_notes')} />
            </Field>
            {serverError && <p className="text-xs text-burgundy" role="alert">{serverError}</p>}
          </form>
        </Modal>

        {/* Decision modal */}
        <Modal open={decisionModalOpen} onClose={() => { setDecisionModalOpen(false); decisionForm.reset(); }} title="Record Decision"
          footer={
            <>
              <Button variant="ghost" onClick={() => { setDecisionModalOpen(false); decisionForm.reset(); }}>Cancel</Button>
              <Button form="decision-form" type="submit" loading={decisionMutation.isPending}>Submit Decision</Button>
            </>
          }
        >
          <form id="decision-form" onSubmit={decisionForm.handleSubmit(d => decisionMutation.mutate(d))} className="space-y-4">
            <Field label="Decision" htmlFor="decision_status" error={decisionForm.formState.errors.status?.message} required>
              <Select id="decision_status" {...decisionForm.register('status')}>
                <option value="">Select…</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </Select>
            </Field>
            <Field label="Comment (optional)" htmlFor="comment">
              <Textarea id="comment" rows={2} {...decisionForm.register('comment')} />
            </Field>
            {serverError && <p className="text-xs text-burgundy" role="alert">{serverError}</p>}
          </form>
        </Modal>
      </div>
    </PageShell>
  );
}
