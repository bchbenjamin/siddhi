import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText } from 'lucide-react';
import { api, downloadBlob } from '../../lib/api';
import type { ReportsSummary } from '../../types';
import { useAuth } from '../../app/AuthContext';
import { PageShell } from '../../components/layout/PageShell';
import {
  PageHeader, Card, LoadingState, ErrorState, Button, Modal,
  Field, Input, Select
} from '../../components/ui';
import { getErrorMessage } from '../../lib/utils';

export default function ReportsPage() {
  const { user } = useAuth();
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Export form state
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [includeDiagnosis, setIncludeDiagnosis] = useState(false);
  const [includeGuardianContact, setIncludeGuardianContact] = useState(false);

  const { data: summary, isLoading, error } = useQuery<ReportsSummary>({
    queryKey: ['reports-summary'],
    queryFn: () => api.get('/reports/summary'),
  });

  const canShowDiagnosis = user?.active_role && ['school_head', 'school_admin', 'special_educator'].includes(user.active_role);
  const canShowGuardianContact = user?.active_role && ['school_head', 'school_admin'].includes(user.active_role);

  async function handleExport() {
    setExportError(null);
    setExporting(true);
    setExportSuccess(false);
    try {
      const blob = await api.postBlob('/exports/iep-workbook', {
        from_date: fromDate || null,
        to_date: toDate || null,
        include_diagnosis: includeDiagnosis,
        include_guardian_contact: includeGuardianContact,
      });
      const now = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      downloadBlob(blob, `Siddhi_IEP_${now}.xlsx`);
      setExportSuccess(true);
      setTimeout(() => setExportModalOpen(false), 1500);
    } catch (err) {
      setExportError(getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Reports & Export Centre"
          subtitle="Summary data and Excel workbook export"
          actions={
            <Button onClick={() => { setExportModalOpen(true); setExportError(null); setExportSuccess(false); }}>
              <Download size={16} /> Export Excel
            </Button>
          }
        />

        {isLoading && <LoadingState />}
        {error && <ErrorState message="Unable to load report summary." />}

        {summary && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="p-4 text-center">
                <p className="text-2xl font-medium text-ink-black">{summary.total_students}</p>
                <p className="text-xs text-mist-gray">Students</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl font-medium text-ink-black">{summary.active_plans}</p>
                <p className="text-xs text-mist-gray">Active IEPs</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl font-medium text-ink-black">{summary.total_goals}</p>
                <p className="text-xs text-mist-gray">Total Goals</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl font-medium text-ink-black">{summary.achieved_goals}</p>
                <p className="text-xs text-mist-gray">Goals Achieved</p>
              </Card>
            </div>

            {summary.students.length > 0 && (
              <>
                <h2 className="text-base font-medium text-ink-black mb-3">Student Summary</h2>
                <div className="overflow-x-auto rounded-lg border border-bone">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-bone bg-bone/50">
                        {['Student', 'Grade', 'Disability', 'IEP', 'Goals', 'Achieved', 'Attainment %'].map(h => (
                          <th key={h} className="px-4 py-2 text-left text-xs text-slate-gray font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {summary.students.map(s => (
                        <tr key={s.student_id} className="border-b border-bone last:border-0 hover:bg-bone/20">
                          <td className="px-4 py-2 font-medium text-ink-black">{s.full_name}</td>
                          <td className="px-4 py-2 text-slate-gray">{s.grade_class}</td>
                          <td className="px-4 py-2 text-slate-gray text-xs">{s.disability_category}</td>
                          <td className="px-4 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${s.active_iep ? 'bg-pale-sage text-ink-black' : 'bg-bone text-mist-gray'}`}>
                              {s.active_iep ? (s.academic_year || 'Active') : 'None'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center text-slate-gray">{s.total_goals}</td>
                          <td className="px-4 py-2 text-center text-slate-gray">{s.achieved_goals}</td>
                          <td className="px-4 py-2 text-center font-medium text-ink-black">
                            {s.goal_attainment_pct != null ? `${s.goal_attainment_pct}%` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {/* Export modal */}
        <Modal
          open={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          title="Export IEP Workbook"
          footer={
            <>
              <Button variant="ghost" onClick={() => setExportModalOpen(false)} disabled={exporting}>Cancel</Button>
              <Button onClick={handleExport} loading={exporting} disabled={exportSuccess}>
                <Download size={14} />
                {exportSuccess ? 'Downloaded!' : 'Download Excel'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-gray">
              Select options below. The export will only include data you are permitted to see.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Field label="From Date" htmlFor="export_from">
                <Input id="export_from" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
              </Field>
              <Field label="To Date" htmlFor="export_to">
                <Input id="export_to" type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
              </Field>
            </div>

            {canShowDiagnosis && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="include_diagnosis"
                  checked={includeDiagnosis}
                  onChange={e => setIncludeDiagnosis(e.target.checked)}
                />
                <label htmlFor="include_diagnosis" className="text-sm text-slate-gray">
                  Include diagnosis column (staff only)
                </label>
              </div>
            )}

            {canShowGuardianContact && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="include_guardian_contact"
                  checked={includeGuardianContact}
                  onChange={e => setIncludeGuardianContact(e.target.checked)}
                />
                <label htmlFor="include_guardian_contact" className="text-sm text-slate-gray">
                  Include guardian contact details
                </label>
              </div>
            )}

            <div className="rounded-lg border border-bone bg-bone/30 p-3">
              <p className="text-xs font-medium text-slate-gray mb-1 flex items-center gap-1">
                <FileText size={12} /> Export includes 8 worksheets:
              </p>
              <ul className="text-xs text-mist-gray space-y-0.5">
                {[
                  'Student Database',
                  'IEP Goals',
                  'Progress Monitoring Dashboard',
                  'Therapy Tracker',
                  'Attendance Record',
                  'Parent Communication Log',
                  'Assessment Reports',
                  'Automated Report Cards',
                ].map(sheet => <li key={sheet}>· {sheet}</li>)}
              </ul>
            </div>

            {exportError && (
              <p className="text-xs text-burgundy" role="alert">{exportError}</p>
            )}
          </div>
        </Modal>
      </div>
    </PageShell>
  );
}
