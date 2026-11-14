import { useState } from 'react';
import { useParams } from '../../lib/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, CheckCircle } from 'lucide-react';
import { api } from '../../lib/api';
import type { ParentInteraction } from '../../types';
import { useAuth } from '../../app/AuthContext';
import { PageShell } from '../../components/layout/PageShell';
import {
  PageHeader, Card, LoadingState, ErrorState, EmptyState, Button,
  Modal, Field, Input, Textarea, Select, StatusBadge
} from '../../components/ui';
import { formatDate } from '../../lib/utils';

const schema = z.object({
  interaction_date: z.string().min(1),
  mode: z.enum(['meeting', 'call', 'email', 'other']),
  discussion_points: z.string().min(1),
  action_taken: z.string().min(1),
});
type FormValues = z.infer<typeof schema>;

const MODE_LABELS: Record<string, string> = { meeting: 'Meeting', call: 'Phone Call', email: 'Email', other: 'Other' };

export default function CommunicationsPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const isGuardian = user?.active_role === 'guardian';
  const canWrite = user?.active_role && ['special_educator', 'school_head', 'school_admin'].includes(user.active_role);

  const { data, isLoading, error } = useQuery<ParentInteraction[]>({
    queryKey: ['communications', studentId],
    queryFn: () => api.get(`/students/${studentId}/parent-interactions`),
    enabled: !!studentId,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: (d: FormValues) => api.post(`/students/${studentId}/parent-interactions`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications', studentId] });
      setModalOpen(false);
      reset();
    },
    onError: (err) => setServerError(err instanceof Error ? err.message : 'Failed'),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/parent-interactions/${id}/acknowledge`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['communications', studentId] }),
  });

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Parent Communication Log"
          subtitle="Record of meetings, calls and email interactions"
          actions={canWrite && (
            <Button onClick={() => { setModalOpen(true); setServerError(null); }}>
              <Plus size={16} /> Log Interaction
            </Button>
          )}
        />

        {isLoading && <LoadingState />}
        {error && <ErrorState message="Unable to load communication records." />}

        {data && data.length === 0 && (
          <EmptyState title="No interactions recorded yet" />
        )}

        <div className="space-y-3">
          {data?.map(i => (
            <Card key={i.id}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-burnt-amber uppercase">{MODE_LABELS[i.mode] || i.mode}</span>
                  <span className="text-xs text-mist-gray">{formatDate(i.interaction_date)}</span>
                </div>
                <StatusBadge status={i.acknowledgement_status} />
              </div>
              <div className="space-y-1 text-sm">
                <div>
                  <p className="text-xs text-mist-gray">Discussion Points</p>
                  <p className="text-ink-black">{i.discussion_points}</p>
                </div>
                <div>
                  <p className="text-xs text-mist-gray">Action Taken</p>
                  <p className="text-ink-black">{i.action_taken}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-mist-gray">
                  Recorded by: {i.recorded_by_name || 'Staff'}
                  {i.guardian_name && ` · Guardian: ${i.guardian_name}`}
                </p>
                {isGuardian && i.acknowledgement_status === 'pending' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => acknowledgeMutation.mutate(i.id)}
                    loading={acknowledgeMutation.isPending}
                  >
                    <CheckCircle size={14} /> Acknowledge
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>

        <Modal open={modalOpen} onClose={() => { setModalOpen(false); reset(); }} title="Log Interaction"
          footer={
            <>
              <Button variant="ghost" onClick={() => { setModalOpen(false); reset(); }}>Cancel</Button>
              <Button form="comm-form" type="submit" loading={isSubmitting}>Save</Button>
            </>
          }
        >
          <form id="comm-form" onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date" htmlFor="interaction_date" error={errors.interaction_date?.message} required>
                <Input id="interaction_date" type="date" {...register('interaction_date')} />
              </Field>
              <Field label="Mode" htmlFor="mode" error={errors.mode?.message} required>
                <Select id="mode" {...register('mode')}>
                  <option value="">Select…</option>
                  {Object.entries(MODE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Discussion Points" htmlFor="discussion_points" error={errors.discussion_points?.message} required>
              <Textarea id="discussion_points" rows={3} {...register('discussion_points')} />
            </Field>
            <Field label="Action Taken" htmlFor="action_taken" error={errors.action_taken?.message} required>
              <Textarea id="action_taken" rows={2} {...register('action_taken')} />
            </Field>
            {serverError && <p className="text-xs text-burgundy" role="alert">{serverError}</p>}
          </form>
        </Modal>
      </div>
    </PageShell>
  );
}
