import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api } from '../../lib/api';
import type { StudentListResponse } from '../../types';
import { PageShell } from '../../components/layout/PageShell';
import { PageHeader, LoadingState, ErrorState, EmptyState, Button, Input, StatusBadge } from '../../components/ui';
import { formatDate, ageFromDob } from '../../lib/utils';

export default function StudentsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, error } = useQuery<StudentListResponse>({
    queryKey: ['students', search, page],
    queryFn: () =>
      api.get<StudentListResponse>('/students', {
        search: search || undefined,
        page,
        page_size: pageSize,
      }),
    placeholderData: (prev) => prev,
  });

  return (
    <PageShell>
      <PageHeader title="Students" subtitle="All students in your school" />

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-mist-gray"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Search by name…"
          className="pl-9"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          aria-label="Search students"
        />
      </div>

      {isLoading && <LoadingState />}
      {error && <ErrorState message="Unable to load students." />}

      {data && (
        <>
          {data.items.length === 0 ? (
            <EmptyState
              title="No students found"
              description={search ? 'Try a different search term.' : 'No students are registered yet.'}
            />
          ) : (
            <>
              <div className="space-y-2">
                {data.items.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => navigate(`/students/${student.id}`)}
                    className="w-full flex items-center gap-4 bg-white border border-bone rounded-xl p-4
                      hover:border-burnt-amber/40 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-pale-sage flex items-center justify-center text-sm font-medium text-ink-black flex-shrink-0">
                      {student.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-black truncate">{student.full_name}</p>
                      <p className="text-xs text-slate-gray">
                        {student.grade_class} · {ageFromDob(student.date_of_birth)} yrs ·{' '}
                        {student.disability_category}
                      </p>
                    </div>
                    <div className="hidden sm:block text-xs text-mist-gray">
                      {student.admission_number}
                    </div>
                  </button>
                ))}
              </div>

              {/* Pagination */}
              {data.total > pageSize && (
                <div className="flex items-center justify-between mt-6 text-sm">
                  <p className="text-mist-gray text-xs">
                    {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, data.total)} of {data.total}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page * pageSize >= data.total}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </PageShell>
  );
}
