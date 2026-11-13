import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { api } from '../../lib/api';
import type { TherapySession } from '../../types';
import { useAuth } from '../../app/AuthContext';
import { PageShell } from '../../components/layout/PageShell';
import {
  PageHeader, Card, LoadingState, ErrorState, EmptyState, Button,
  Modal, Field, Input, Textarea, Select, StatusBadge
} from '../../components/ui';
import { formatDate, THERAPY_TYPE_LABELS } from '../../lib/utils';

const schema = z.object({
  therapy_type: z.string().min(1),
  session_date: z.string().min(1),
  duration_minutes: z.coerce.number().int().min(1),
  progress_notes: z.string().min(1),
  outcome: z.string().optional(),
  next_steps: z.string().optional(),
  guardian_visible: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export default function TherapyPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);

  const isTherapist = user?.active_role === 'therapist';

  const { data: sessions, isLoading, error } = useQuery<TherapySession[]>({
    queryKey: ['therapy', studentId, filterType],
    queryFn: () => api.get(`/students/${studentId}/therapy-sessions`, {
      therapy_type: filterType || undefined,
    }),
    enabled: !!studentId,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { guardian_visible: true },
  });

  const mutation = useMutation({
    mutationFn: (data: FormValues) => api.post(`/students/${studentId}/therapy-sessions`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapy', studentId] });
      setModalOpen(false);
      reset();
    },
    onError: (err) => setServerError(err instanceof Error ? err.message : 'Failed'),
  });

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Therapy Tracker"
          subtitle="Therapy sessions and progress notes"
          actions={
            isTherapist && (
              <Button onClick={() => { setModalOpen(true); setServerError(null); }}>
                <Plus size={16} /> Add Session
              </Button>
            )
          }
        />

        {/* Filter */}
        <div className="mb-5">
          <Select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="w-auto"
            aria-label="Filter by therapy type"
          >
            <option value="">All types</option>
            {Object.entries(THERAPY_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </div>

        {isLoading && <LoadingState />}
        {error && <ErrorState message="Unable to load therapy sessions." />}

        {sessions && sessions.length === 0 && (
          <EmptyState title="No therapy sessions recorded" description="Sessions will appear here once recorded." />
        )}

        <div className="space-y-3">
          {sessions?.map(s => (
            <Card key={s.id}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-xs font-medium text-burnt-amber uppercase">
                    {THERAPY_TYPE_LABELS[s.therapy_type] || s.therapy_type}
                  </span>
                  <span className="text-xs text-mist-gray ml-2">{formatDate(s.session_date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-mist-gray">{s.duration_minutes} min</span>
                  {!s.guardian_visible && (
                    <span className="text-xs bg-bone text-mist-gray px-2 py-0.5 rounded">Staff only</span>
                  )}
                </div>
              </div>
              <p className="text-sm text-ink-black mb-1">{s.progress_notes}</p>
              {s.outcome && <p className="text-xs text-slate-gray"><span className="font-medium">Outcome:</span> {s.outcome}</p>}
              {s.next_steps && <p className="text-xs text-slate-gray"><span className="font-medium">Next steps:</span> {s.next_steps}</p>}
              {s.therapist_name && <p className="text-xs text-mist-gray mt-1">By: {s.therapist_name}</p>}
            </Card>
          ))}
        </div>

        <Modal
          open={modalOpen}
          onClose={() => { setModalOpen(false); reset(); }}
          title="Add Therapy Session"
          footer={
            <>
              <Button variant="ghost" onClick={() => { setModalOpen(false); reset(); }}>Cancel</Button>
              <Button form="therapy-form" type="submit" loading={isSubmitting}>Save Session</Button>
            </>
          }
        >
          <form id="therapy-form" onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
            <Field label="Therapy Type" htmlFor="therapy_type" error={errors.therapy_type?.message} required>
              <Select id="therapy_type" error={!!errors.therapy_type} {...register('therapy_type')}>
                <option value="">Select type…</option>
                {Object.entries(THERAPY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Session Date" htmlFor="session_date" error={errors.session_date?.message} required>
                <Input id="session_date" type="date" {...register('session_date')} />
              </Field>
              <Field label="Duration (minutes)" htmlFor="duration_minutes" error={errors.duration_minutes?.message} required>
                <Input id="duration_minutes" type="number" min={1} {...register('duration_minutes')} />
              </Field>
            </div>
            <Field label="Progress Notes" htmlFor="progress_notes" error={errors.progress_notes?.message} required>
              <Textarea id="progress_notes" rows={3} {...register('progress_notes')} />
            </Field>
            <Field label="Outcome" htmlFor="outcome">
              <Input id="outcome" {...register('outcome')} />
            </Field>
            <Field label="Next Steps" htmlFor="next_steps">
              <Textarea id="next_steps" rows={2} {...register('next_steps')} />
            </Field>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="guardian_visible_t" className="rounded" {...register('guardian_visible')} />
              <label htmlFor="guardian_visible_t" className="text-sm text-slate-gray">Visible to guardians</label>
            </div>
            {serverError && <p className="text-xs text-burgundy" role="alert">{serverError}</p>}
          </form>
        </Modal>
      </div>
    </PageShell>
  );
}
