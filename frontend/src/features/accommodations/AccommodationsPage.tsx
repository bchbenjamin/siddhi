import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { api } from '../../lib/api';
import type { Accommodation } from '../../types';
import { useAuth } from '../../app/AuthContext';
import { PageShell } from '../../components/layout/PageShell';
import {
  PageHeader, Card, LoadingState, ErrorState, EmptyState, Button,
  Modal, Field, Input, Textarea, Select
} from '../../components/ui';
import { formatDate, ACCOMMODATION_AREA_LABELS } from '../../lib/utils';

const schema = z.object({
  area: z.string().min(1),
  accommodation: z.string().min(1),
  modification: z.string().optional(),
  assistive_technology: z.string().optional(),
  effective_from: z.string().min(1),
  effective_to: z.string().optional(),
  is_active: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export default function AccommodationsPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const canWrite = user?.active_role === 'special_educator';

  const { data, isLoading, error } = useQuery<Accommodation[]>({
    queryKey: ['accommodations', studentId],
    queryFn: () => api.get(`/students/${studentId}/accommodations`),
    enabled: !!studentId,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { is_active: true },
  });

  const mutation = useMutation({
    mutationFn: (d: FormValues) => api.post(`/students/${studentId}/accommodations`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodations', studentId] });
      setModalOpen(false);
      reset();
    },
    onError: (err) => setServerError(err instanceof Error ? err.message : 'Failed'),
  });

  // Group by area
  const areaMap: Record<string, Accommodation[]> = {};
  if (data) {
    for (const a of data) {
      if (!areaMap[a.area]) areaMap[a.area] = [];
      areaMap[a.area].push(a);
    }
  }

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Accommodations & Modifications"
          subtitle="Classroom, examination and other support arrangements"
          actions={canWrite && (
            <Button onClick={() => { setModalOpen(true); setServerError(null); }}>
              <Plus size={16} /> Add Accommodation
            </Button>
          )}
        />

        {isLoading && <LoadingState />}
        {error && <ErrorState message="Unable to load accommodations." />}

        {data && Object.keys(areaMap).length === 0 && (
          <EmptyState title="No accommodations recorded" />
        )}

        <div className="space-y-4">
          {Object.entries(ACCOMMODATION_AREA_LABELS).map(([area, label]) => {
            const items = areaMap[area];
            if (!items) return null;
            return (
              <Card key={area}>
                <h2 className="text-sm font-medium text-burnt-amber uppercase tracking-wide mb-3">{label}</h2>
                <div className="space-y-3">
                  {items.map(a => (
                    <div key={a.id} className="border-t border-bone pt-3 first:border-0 first:pt-0">
                      <div className="flex items-start justify-between">
                        <p className="text-sm text-ink-black">{a.accommodation}</p>
                        {!a.is_active && <span className="text-xs text-mist-gray">(inactive)</span>}
                      </div>
                      {a.modification && (
                        <p className="text-xs text-slate-gray mt-0.5"><span className="font-medium">Modification:</span> {a.modification}</p>
                      )}
                      {a.assistive_technology && (
                        <p className="text-xs text-slate-gray mt-0.5"><span className="font-medium">Assistive tech:</span> {a.assistive_technology}</p>
                      )}
                      <p className="text-xs text-mist-gray mt-1">
                        From: {formatDate(a.effective_from)}
                        {a.effective_to && ` · Until: ${formatDate(a.effective_to)}`}
                        {a.responsible_staff_name && ` · By: ${a.responsible_staff_name}`}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>

        <Modal open={modalOpen} onClose={() => { setModalOpen(false); reset(); }} title="Add Accommodation"
          footer={
            <>
              <Button variant="ghost" onClick={() => { setModalOpen(false); reset(); }}>Cancel</Button>
              <Button form="accom-form" type="submit" loading={isSubmitting}>Save</Button>
            </>
          }
        >
          <form id="accom-form" onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
            <Field label="Area" htmlFor="area" error={errors.area?.message} required>
              <Select id="area" error={!!errors.area} {...register('area')}>
                <option value="">Select area…</option>
                {Object.entries(ACCOMMODATION_AREA_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Accommodation" htmlFor="accommodation" error={errors.accommodation?.message} required>
              <Textarea id="accommodation" rows={2} {...register('accommodation')} />
            </Field>
            <Field label="Modification" htmlFor="modification">
              <Textarea id="modification" rows={2} {...register('modification')} />
            </Field>
            <Field label="Assistive Technology" htmlFor="assistive_technology">
              <Input id="assistive_technology" {...register('assistive_technology')} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Effective From" htmlFor="effective_from" error={errors.effective_from?.message} required>
                <Input id="effective_from" type="date" {...register('effective_from')} />
              </Field>
              <Field label="Effective To" htmlFor="effective_to">
                <Input id="effective_to" type="date" {...register('effective_to')} />
              </Field>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active_a" className="rounded" defaultChecked {...register('is_active')} />
              <label htmlFor="is_active_a" className="text-sm text-slate-gray">Currently active</label>
            </div>
            {serverError && <p className="text-xs text-burgundy" role="alert">{serverError}</p>}
          </form>
        </Modal>
      </div>
    </PageShell>
  );
}
