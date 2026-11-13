import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { api } from '../../lib/api';
import type { PLOPRecord } from '../../types';
import { useAuth } from '../../app/AuthContext';
import { PageShell } from '../../components/layout/PageShell';
import { PageHeader, Card, LoadingState, ErrorState, EmptyState, Button, Modal, Field, Input, Textarea, Select, StatusBadge } from '../../components/ui';
import { formatDate, PLOP_DOMAIN_LABELS } from '../../lib/utils';

const DOMAINS = Object.entries(PLOP_DOMAIN_LABELS).map(([value, label]) => ({ value, label }));

const schema = z.object({
  domain: z.string().min(1, 'Domain is required'),
  current_performance: z.string().min(1, 'Performance description is required'),
  assessment_method: z.string().min(1, 'Assessment method is required'),
  baseline_value: z.string().optional(),
  remarks: z.string().optional(),
  assessed_at: z.string().min(1, 'Assessment date is required'),
  guardian_visible: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export default function PLOPPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const canWrite = user?.active_role && ['special_educator', 'psychologist', 'therapist'].includes(user.active_role);

  const { data: records, isLoading, error } = useQuery<PLOPRecord[]>({
    queryKey: ['plop', studentId],
    queryFn: () => api.get(`/students/${studentId}/plop`),
    enabled: !!studentId,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { guardian_visible: true },
  });

  const mutation = useMutation({
    mutationFn: (data: FormValues) => api.post(`/students/${studentId}/plop`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plop', studentId] });
      setModalOpen(false);
      reset();
    },
    onError: (err) => setServerError(err instanceof Error ? err.message : 'Failed to save'),
  });

  // Group by domain
  const domainMap: Record<string, PLOPRecord[]> = {};
  if (records) {
    for (const r of records) {
      if (!domainMap[r.domain]) domainMap[r.domain] = [];
      domainMap[r.domain].push(r);
    }
  }

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Present Level of Performance (PLOP)"
          subtitle="Current performance across all nine developmental domains"
          actions={
            canWrite && (
              <Button onClick={() => { setModalOpen(true); setServerError(null); }}>
                <Plus size={16} /> Add Assessment
              </Button>
            )
          }
        />

        {isLoading && <LoadingState />}
        {error && <ErrorState message="Unable to load PLOP records." />}

        {!isLoading && !error && records && Object.keys(domainMap).length === 0 && (
          <EmptyState title="No PLOP records yet" description="Create the first assessment to establish a baseline." />
        )}

        <div className="space-y-4">
          {Object.entries(PLOP_DOMAIN_LABELS).map(([domain, label]) => {
            const recs = domainMap[domain];
            if (!recs) return null;
            const latest = recs[0];
            return (
              <Card key={domain}>
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-base font-medium text-ink-black">{label}</h2>
                  <span className="text-xs text-mist-gray">{formatDate(latest.assessed_at)}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-xs text-mist-gray mb-0.5">Current Performance</p>
                    <p className="text-ink-black">{latest.current_performance}</p>
                  </div>
                  {latest.baseline_value && (
                    <div>
                      <p className="text-xs text-mist-gray mb-0.5">Baseline</p>
                      <p className="text-ink-black">{latest.baseline_value}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-mist-gray">Method: {latest.assessment_method}</span>
                    {latest.assessed_by_name && (
                      <span className="text-xs text-mist-gray">By: {latest.assessed_by_name}</span>
                    )}
                    {!latest.guardian_visible && (
                      <span className="text-xs bg-bone text-mist-gray px-2 py-0.5 rounded">Staff only</span>
                    )}
                  </div>
                  {recs.length > 1 && (
                    <p className="text-xs text-mist-gray">{recs.length - 1} earlier record(s) archived</p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Add modal */}
        <Modal
          open={modalOpen}
          onClose={() => { setModalOpen(false); reset(); setServerError(null); }}
          title="Add PLOP Assessment"
          footer={
            <>
              <Button variant="ghost" onClick={() => { setModalOpen(false); reset(); }}>Cancel</Button>
              <Button form="plop-form" type="submit" loading={isSubmitting}>Save Assessment</Button>
            </>
          }
        >
          <form id="plop-form" onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <Field label="Domain" htmlFor="domain" error={errors.domain?.message} required>
              <Select id="domain" error={!!errors.domain} {...register('domain')}>
                <option value="">Select domain…</option>
                {DOMAINS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </Select>
            </Field>
            <Field label="Current Performance" htmlFor="current_performance" error={errors.current_performance?.message} required>
              <Textarea id="current_performance" rows={3} error={!!errors.current_performance} {...register('current_performance')} />
            </Field>
            <Field label="Assessment Method" htmlFor="assessment_method" error={errors.assessment_method?.message} required>
              <Input id="assessment_method" error={!!errors.assessment_method} {...register('assessment_method')} />
            </Field>
            <Field label="Baseline Value" htmlFor="baseline_value" error={errors.baseline_value?.message}>
              <Input id="baseline_value" placeholder="e.g. Grade 1 level, 70% independent" {...register('baseline_value')} />
            </Field>
            <Field label="Remarks" htmlFor="remarks" error={errors.remarks?.message}>
              <Textarea id="remarks" rows={2} {...register('remarks')} />
            </Field>
            <Field label="Assessment Date" htmlFor="assessed_at" error={errors.assessed_at?.message} required>
              <Input id="assessed_at" type="date" error={!!errors.assessed_at} {...register('assessed_at')} />
            </Field>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="guardian_visible" className="rounded" {...register('guardian_visible')} />
              <label htmlFor="guardian_visible" className="text-sm text-slate-gray">Visible to guardians</label>
            </div>
            {serverError && <p className="text-xs text-burgundy" role="alert">{serverError}</p>}
          </form>
        </Modal>
      </div>
    </PageShell>
  );
}
