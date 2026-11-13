import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { api } from '../../lib/api';
import type { AttendanceRecord, AttendanceSummary } from '../../types';
import { useAuth } from '../../app/AuthContext';
import { PageShell } from '../../components/layout/PageShell';
import {
  PageHeader, Card, LoadingState, ErrorState, EmptyState, Button,
  Modal, Field, Input, Select, StatusBadge, DataTable
} from '../../components/ui';
import { formatDate } from '../../lib/utils';

const schema = z.object({
  attendance_date: z.string().min(1),
  status: z.enum(['present', 'absent', 'leave', 'other']),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function AttendancePage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const canWrite = user?.active_role && ['special_educator', 'school_head', 'school_admin'].includes(user.active_role);

  const { data: summary } = useQuery<AttendanceSummary>({
    queryKey: ['attendance-summary', studentId],
    queryFn: () => api.get(`/students/${studentId}/attendance/summary`),
    enabled: !!studentId,
  });

  const { data, isLoading, error } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendance', studentId, fromDate, toDate],
    queryFn: () => api.get(`/students/${studentId}/attendance`, {
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
    }),
    enabled: !!studentId,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (d: FormValues) => api.post(`/students/${studentId}/attendance`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', studentId] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary', studentId] });
      setModalOpen(false);
      reset();
    },
    onError: (err) => setServerError(err instanceof Error ? err.message : 'Failed'),
  });

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Attendance"
          subtitle="Daily attendance records"
          actions={canWrite && (
            <Button onClick={() => { setModalOpen(true); setServerError(null); }}>
              <Plus size={16} /> Record Attendance
            </Button>
          )}
        />

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {[
              { label: 'Total Days', value: summary.total_days },
              { label: 'Present', value: summary.present },
              { label: 'Absent', value: summary.absent },
              { label: 'Leave', value: summary.leave },
              { label: 'Attendance %', value: `${summary.attendance_pct}%` },
            ].map(({ label, value }) => (
              <Card key={label} className="p-3 text-center">
                <p className="text-xs text-mist-gray mb-1">{label}</p>
                <p className="text-xl font-medium text-ink-black">{value}</p>
              </Card>
            ))}
          </div>
        )}

        {/* Date filters */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-mist-gray">From:</label>
            <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-auto" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-mist-gray">To:</label>
            <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-auto" />
          </div>
          {(fromDate || toDate) && (
            <Button variant="ghost" size="sm" onClick={() => { setFromDate(''); setToDate(''); }}>Clear</Button>
          )}
        </div>

        {isLoading && <LoadingState />}
        {error && <ErrorState message="Unable to load attendance records." />}

        {data && data.length === 0 && (
          <EmptyState title="No attendance records found" />
        )}

        {data && data.length > 0 && (
          <DataTable
            columns={[
              { key: 'date', header: 'Date', render: r => formatDate(r.attendance_date) },
              { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status} /> },
              { key: 'reason', header: 'Reason', render: r => <span className="text-xs text-slate-gray">{r.reason || '—'}</span> },
              { key: 'by', header: 'Recorded By', render: r => <span className="text-xs text-mist-gray">{r.recorded_by_name || '—'}</span> },
            ]}
            data={data}
            keyExtractor={r => r.id}
          />
        )}

        <Modal open={modalOpen} onClose={() => { setModalOpen(false); reset(); }} title="Record Attendance"
          footer={
            <>
              <Button variant="ghost" onClick={() => { setModalOpen(false); reset(); }}>Cancel</Button>
              <Button form="att-form" type="submit" loading={isSubmitting}>Save</Button>
            </>
          }
        >
          <form id="att-form" onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
            <Field label="Date" htmlFor="attendance_date" error={errors.attendance_date?.message} required>
              <Input id="attendance_date" type="date" {...register('attendance_date')} />
            </Field>
            <Field label="Status" htmlFor="status" error={errors.status?.message} required>
              <Select id="status" {...register('status')}>
                <option value="">Select…</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="leave">Leave</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Reason (optional)" htmlFor="reason">
              <Input id="reason" {...register('reason')} />
            </Field>
            {serverError && <p className="text-xs text-burgundy" role="alert">{serverError}</p>}
          </form>
        </Modal>
      </div>
    </PageShell>
  );
}
