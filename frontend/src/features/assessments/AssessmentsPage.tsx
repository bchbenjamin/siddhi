import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { api } from '../../lib/api';
import type { AssessmentRecord } from '../../types';
import { useAuth } from '../../app/AuthContext';
import { PageShell } from '../../components/layout/PageShell';
import {
  PageHeader, Card, LoadingState, ErrorState, EmptyState, Button,
  Modal, Field, Input, Textarea, Select
} from '../../components/ui';
import { formatDate } from '../../lib/utils';

const schema = z.object({
  assessment_type: z.string().min(1),
  domain: z.string().optional(),
  assessment_date: z.string().min(1),
  external_assessor_name: z.string().optional(),
  summary: z.string().min(1),
  recommendations: z.string().optional(),
  guardian_visible: z.boolean(),
  next_review_date: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const TYPES = ['psychological', 'educational', 'medical', 'observation', 'functional', 'other'];

export default function AssessmentsPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const canWrite = user?.active_role && ['psychologist', 'special_educator', 'therapist', 'school_head'].includes(user.active_role);

  const { data, isLoading, error } = useQuery<AssessmentRecord[]>({
    queryKey: ['assessments', studentId],
    queryFn: () => api.get(`/students/${studentId}/assessments`),
    enabled: !!studentId,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { guardian_visible: false },
  });

  const mutation = useMutation({
    mutationFn: (d: FormValues) => api.post(`/students/${studentId}/assessments`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments', studentId] });
      setModalOpen(false);
      reset();
    },
    onError: (err) => setServerError(err instanceof Error ? err.message : 'Failed'),
  });

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Assessment Records"
          subtitle="Psychological, educational and medical assessments"
          actions={canWrite && (
            <Button onClick={() => { setModalOpen(true); setServerError(null); }}>
              <Plus size={16} /> Add Assessment
            </Button>
          )}
        />

        {isLoading && <LoadingState />}
        {error && <ErrorState message="Unable to load assessments." />}

        {data && data.length === 0 && (
          <EmptyState title="No assessment records yet" />
        )}

        <div className="space-y-3">
          {data?.map(a => (
            <Card key={a.id}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-burnt-amber uppercase">{a.assessment_type}</span>
                  {a.domain && <span className="text-xs text-mist-gray">{a.domain}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-mist-gray">{formatDate(a.assessment_date)}</span>
                  {!a.guardian_visible && (
                    <span className="text-xs bg-bone text-mist-gray px-2 py-0.5 rounded">Staff only</span>
                  )}
                </div>
              </div>
              <p className="text-sm text-ink-black mb-1">{a.summary}</p>
              {a.recommendations && (
                <p className="text-xs text-slate-gray"><span className="font-medium">Recommendations:</span> {a.recommendations}</p>
              )}
              <div className="flex items-center gap-4 mt-1 text-xs text-mist-gray">
                {(a.assessor_name || a.external_assessor_name) && (
                  <span>Assessor: {a.assessor_name || a.external_assessor_name}</span>
                )}
                {a.next_review_date && <span>Next review: {formatDate(a.next_review_date)}</span>}
              </div>
            </Card>
          ))}
        </div>

        <Modal open={modalOpen} onClose={() => { setModalOpen(false); reset(); }} title="Add Assessment Record" maxWidth="max-w-xl"
          footer={
            <>
              <Button variant="ghost" onClick={() => { setModalOpen(false); reset(); }}>Cancel</Button>
              <Button form="assessment-form" type="submit" loading={isSubmitting}>Save</Button>
            </>
          }
        >
          <form id="assessment-form" onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Assessment Type" htmlFor="assessment_type" error={errors.assessment_type?.message} required>
                <Select id="assessment_type" {...register('assessment_type')}>
                  <option value="">Select…</option>
                  {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </Select>
              </Field>
              <Field label="Domain (optional)" htmlFor="domain">
                <Input id="domain" {...register('domain')} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Assessment Date" htmlFor="assessment_date" error={errors.assessment_date?.message} required>
                <Input id="assessment_date" type="date" {...register('assessment_date')} />
              </Field>
              <Field label="Next Review Date" htmlFor="next_review_date">
                <Input id="next_review_date" type="date" {...register('next_review_date')} />
              </Field>
            </div>
            <Field label="External Assessor (if applicable)" htmlFor="external_assessor_name">
              <Input id="external_assessor_name" {...register('external_assessor_name')} />
            </Field>
            <Field label="Summary" htmlFor="summary" error={errors.summary?.message} required>
              <Textarea id="summary" rows={3} {...register('summary')} />
            </Field>
            <Field label="Recommendations" htmlFor="recommendations">
              <Textarea id="recommendations" rows={2} {...register('recommendations')} />
            </Field>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="guardian_visible_as" className="rounded" {...register('guardian_visible')} />
              <label htmlFor="guardian_visible_as" className="text-sm text-slate-gray">Visible to guardians</label>
            </div>
            {serverError && <p className="text-xs text-burgundy" role="alert">{serverError}</p>}
          </form>
        </Modal>
      </div>
    </PageShell>
  );
}
