import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import type { StudentDetail } from '../../types';
import { useAuth } from '../../app/AuthContext';
import { PageShell } from '../../components/layout/PageShell';
import { LoadingState, ErrorState, Card, Avatar, StatusBadge, Button } from '../../components/ui';
import { formatDate, ageFromDob } from '../../lib/utils';
import {
  BookOpen, TrendingUp, Heart, Settings2, MessageSquare,
  FileText, Calendar, ClipboardCheck, ChevronRight
} from 'lucide-react';

function StudentNavLink({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-2 p-3 rounded-lg border border-bone
        hover:border-burnt-amber/40 hover:bg-bone/20 transition-colors"
    >
      <div className="flex items-center gap-2">
        <span className="text-burnt-amber" aria-hidden="true">{icon}</span>
        <span className="text-sm text-ink-black">{label}</span>
      </div>
      <ChevronRight size={14} className="text-mist-gray" aria-hidden="true" />
    </Link>
  );
}

export default function StudentProfilePage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: student, isLoading, error } = useQuery<StudentDetail>({
    queryKey: ['student', studentId],
    queryFn: () => api.get<StudentDetail>(`/students/${studentId}`),
    enabled: !!studentId,
  });

  if (isLoading) return <PageShell><LoadingState /></PageShell>;
  if (error || !student) return <PageShell><ErrorState message="Student not found or access denied." /></PageShell>;

  const canEdit = user?.active_role && ['school_admin', 'special_educator', 'school_head'].includes(user.active_role);

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <Avatar name={student.full_name} imageUrl={student.profile_image_path} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-2xl font-medium text-ink-black tracking-tight">{student.full_name}</h1>
                <p className="text-sm text-slate-gray mt-0.5">
                  {student.grade_class} · {ageFromDob(student.date_of_birth)} years old
                </p>
              </div>
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => navigate(`/students/${student.id}/edit`)}>
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: core info */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <h2 className="text-sm font-medium text-slate-gray uppercase tracking-wide mb-3">Student Information</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-mist-gray">Admission No.</dt>
                  <dd className="font-medium text-ink-black font-mono">{student.admission_number}</dd>
                </div>
                <div>
                  <dt className="text-xs text-mist-gray">Date of Birth</dt>
                  <dd className="font-medium text-ink-black">{formatDate(student.date_of_birth)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-mist-gray">Gender</dt>
                  <dd className="font-medium text-ink-black">{student.gender || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-mist-gray">Enrolment Date</dt>
                  <dd className="font-medium text-ink-black">{formatDate(student.enrollment_date)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-mist-gray">Disability Category</dt>
                  <dd className="font-medium text-ink-black">{student.disability_category}</dd>
                </div>
                {student.udid_number_masked && (
                  <div>
                    <dt className="text-xs text-mist-gray">UDID (masked)</dt>
                    <dd className="font-mono text-ink-black">{student.udid_number_masked}</dd>
                  </div>
                )}
                {student.languages_known && (
                  <div>
                    <dt className="text-xs text-mist-gray">Languages</dt>
                    <dd className="font-medium text-ink-black">{student.languages_known}</dd>
                  </div>
                )}
                {student.assistive_devices && (
                  <div>
                    <dt className="text-xs text-mist-gray">Assistive Devices</dt>
                    <dd className="font-medium text-ink-black">{student.assistive_devices}</dd>
                  </div>
                )}
              </dl>
            </Card>

            {(student.strengths || student.areas_of_need || student.learning_style) && (
              <Card>
                <h2 className="text-sm font-medium text-slate-gray uppercase tracking-wide mb-3">Learning Profile</h2>
                <div className="space-y-3 text-sm">
                  {student.strengths && (
                    <div>
                      <p className="text-xs text-mist-gray mb-1">Strengths</p>
                      <p className="text-ink-black">{student.strengths}</p>
                    </div>
                  )}
                  {student.areas_of_need && (
                    <div>
                      <p className="text-xs text-mist-gray mb-1">Areas of Need</p>
                      <p className="text-ink-black">{student.areas_of_need}</p>
                    </div>
                  )}
                  {student.learning_style && (
                    <div>
                      <p className="text-xs text-mist-gray mb-1">Learning Style</p>
                      <p className="text-ink-black">{student.learning_style}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Diagnosis — only shown to authorized roles */}
            {student.diagnosis && (
              <Card>
                <h2 className="text-sm font-medium text-slate-gray uppercase tracking-wide mb-2">Diagnosis</h2>
                <p className="text-sm text-ink-black">{student.diagnosis}</p>
              </Card>
            )}
          </div>

          {/* Right: quick links and people */}
          <div className="space-y-4">
            <Card>
              <h2 className="text-sm font-medium text-slate-gray uppercase tracking-wide mb-3">IEP Sections</h2>
              <div className="space-y-2">
                <StudentNavLink to={`/students/${student.id}/plop`} icon={<FileText size={16} />} label="PLOP" />
                <StudentNavLink to={`/students/${student.id}/iep`} icon={<BookOpen size={16} />} label="IEP Goals" />
                <StudentNavLink to={`/students/${student.id}/progress`} icon={<TrendingUp size={16} />} label="Progress" />
                <StudentNavLink to={`/students/${student.id}/therapy`} icon={<Heart size={16} />} label="Therapy" />
                <StudentNavLink to={`/students/${student.id}/accommodations`} icon={<Settings2 size={16} />} label="Accommodations" />
                <StudentNavLink to={`/students/${student.id}/communications`} icon={<MessageSquare size={16} />} label="Communications" />
                <StudentNavLink to={`/students/${student.id}/assessments`} icon={<FileText size={16} />} label="Assessments" />
                <StudentNavLink to={`/students/${student.id}/attendance`} icon={<Calendar size={16} />} label="Attendance" />
                <StudentNavLink to={`/students/${student.id}/reviews`} icon={<ClipboardCheck size={16} />} label="IEP Reviews" />
              </div>
            </Card>

            {student.assigned_staff.length > 0 && (
              <Card>
                <h2 className="text-sm font-medium text-slate-gray uppercase tracking-wide mb-3">Assigned Staff</h2>
                <ul className="space-y-2">
                  {student.assigned_staff.map((s) => (
                    <li key={s.user_id} className="flex items-center gap-2 text-sm">
                      <div className="w-7 h-7 rounded-full bg-lavender-mist flex items-center justify-center text-xs text-deep-violet font-medium">
                        {s.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-ink-black">{s.full_name}</p>
                        <p className="text-xs text-mist-gray capitalize">{s.role.replace(/_/g, ' ')}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {student.guardians.length > 0 && (
              <Card>
                <h2 className="text-sm font-medium text-slate-gray uppercase tracking-wide mb-3">Guardians</h2>
                <ul className="space-y-2">
                  {student.guardians.map((g) => (
                    <li key={g.user_id} className="flex items-center gap-2 text-sm">
                      <div className="w-7 h-7 rounded-full bg-dusty-rose flex items-center justify-center text-xs text-ink-black font-medium">
                        {g.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-ink-black">{g.full_name}</p>
                        <p className="text-xs text-mist-gray">{g.relationship_label || 'Guardian'}{g.is_primary ? ' (Primary)' : ''}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
