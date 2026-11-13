import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import type { GuardianProfile } from '../../types';
import { PageShell } from '../../components/layout/PageShell';
import { LoadingState, ErrorState, Avatar, Card, EmptyState } from '../../components/ui';
import { Mail, Phone, ChevronRight } from 'lucide-react';
import { ageFromDob } from '../../lib/utils';

export default function GuardianProfilePage() {
  const navigate = useNavigate();
  const { data: profile, isLoading, error } = useQuery<GuardianProfile>({
    queryKey: ['guardian-profile'],
    queryFn: () => api.get('/guardians/me/profile'),
  });

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-medium text-ink-black mb-6 tracking-tight">My Profile</h1>

        {isLoading && <LoadingState />}
        {error && <ErrorState message="Unable to load profile." />}

        {profile && (
          <>
            {/* Guardian info panel */}
            <Card className="mb-6">
              <div className="flex items-start gap-4">
                <Avatar name={profile.full_name} size="lg" />
                <div>
                  <h2 className="text-lg font-medium text-ink-black">{profile.full_name}</h2>
                  {profile.email && (
                    <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-gray">
                      <Mail size={14} aria-hidden="true" />
                      <span>{profile.email}</span>
                    </div>
                  )}
                  {profile.phone && (
                    <div className="flex items-center gap-1.5 mt-0.5 text-sm text-slate-gray">
                      <Phone size={14} aria-hidden="true" />
                      <span>{profile.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Children section */}
            <h2 className="text-base font-medium text-ink-black mb-3">Children</h2>

            {profile.children.length === 0 ? (
              <EmptyState
                title="No children linked"
                description="Contact the school administration to link your children."
              />
            ) : (
              <div className="space-y-2">
                {profile.children.map((child) => (
                  <button
                    key={child.student_id}
                    onClick={() => navigate(`/students/${child.student_id}`)}
                    className="w-full flex items-center gap-4 bg-white border border-bone rounded-2xl p-4
                      hover:border-burnt-amber/40 hover:bg-bone/20 transition-colors text-left"
                    aria-label={`Open ${child.full_name}'s profile`}
                  >
                    <Avatar name={child.full_name} imageUrl={child.profile_image_path} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-black truncate">{child.full_name}</p>
                      <p className="text-xs text-slate-gray">
                        {child.grade_class} · {ageFromDob(child.date_of_birth)} yrs ·{' '}
                        {child.relationship_label || 'Guardian'}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-mist-gray flex-shrink-0" aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
