import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import type { GuardianChildCard } from '../../types';
import { PageShell } from '../../components/layout/PageShell';
import { LoadingState, ErrorState, EmptyState, Avatar, StatusBadge, Button } from '../../components/ui';
import { ageFromDob } from '../../lib/utils';
import { ChevronRight } from 'lucide-react';

function ChildCard({ child, wide = false }: { child: GuardianChildCard; wide?: boolean }) {
  const navigate = useNavigate();
  const age = ageFromDob(child.date_of_birth);

  return (
    <article
      className={`bg-white border border-bone rounded-xl p-6 cursor-pointer hover:border-burnt-amber/40 transition-colors
        ${wide ? 'flex gap-6 items-start' : ''}`}
      onClick={() => navigate(`/students/${child.student_id}`)}
      tabIndex={0}
      role="button"
      aria-label={`Open ${child.full_name}'s profile`}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/students/${child.student_id}`)}
    >
      <div className={`flex-shrink-0 ${wide ? '' : 'flex justify-center mb-4'}`}>
        <Avatar name={child.full_name} imageUrl={child.profile_image_path} size={wide ? 'xl' : 'lg'} />
      </div>

      {/* Divider for wide layout */}
      {wide && <div className="hidden sm:block w-px bg-bone self-stretch" aria-hidden="true" />}

      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-medium text-ink-black mb-1 truncate">{child.full_name}</h2>
        <p className="text-sm text-slate-gray mb-3">
          {child.grade_class} · {age} years old · {child.disability_category}
        </p>

        {child.relationship_label && (
          <p className="text-xs text-mist-gray mb-3">Relationship: {child.relationship_label}</p>
        )}

        {child.active_iep_status ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-mist-gray">IEP Status:</span>
              <StatusBadge status={child.active_iep_status} />
            </div>
            {child.academic_year && (
              <p className="text-xs text-mist-gray">Academic Year: {child.academic_year}</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-mist-gray">No active IEP plan</p>
        )}

        <div className="mt-4 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/students/${child.student_id}`);
            }}
          >
            View Profile <ChevronRight size={14} />
          </Button>
          {child.active_iep_plan_id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/students/${child.student_id}/progress`);
              }}
            >
              Progress
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function GuardianDashboard() {
  const { data: children, isLoading, error, refetch } = useQuery<GuardianChildCard[]>({
    queryKey: ['guardian-children'],
    queryFn: () => api.get('/guardians/me/children'),
  });

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-medium text-ink-black tracking-tight">My Children</h1>
          <p className="text-sm text-slate-gray mt-0.5">
            View and track your children's IEP progress.
          </p>
        </div>

        {isLoading && <LoadingState />}

        {error && (
          <ErrorState
            message="Unable to load your children's information."
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !error && children && (
          <>
            {children.length === 0 && (
              <EmptyState
                title="No children linked yet"
                description="Contact your school administration to link your account to your child's profile."
              />
            )}

            {children.length === 1 && (
              <ChildCard child={children[0]} wide />
            )}

            {children.length >= 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {children.map((child) => (
                  <ChildCard key={child.student_id} child={child} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
