/**
 * Utility helpers for Siddhi frontend
 */

/** Format ISO date string to human-readable (e.g. "15 Apr 2026") */
export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Format ISO date to YYYY-MM-DD for form inputs */
export function toInputDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  return dateStr.slice(0, 10);
}

/** Calculate age in years from a date of birth */
export function ageFromDob(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/** Capitalize a snake_case or space-separated string */
export function humanize(str: string): string {
  return str
    .split(/[_\s]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Get initials from a full name */
export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('');
}

/** Clamp a number to a range */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Extract detail message from an API error */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'An unexpected error occurred';
}

export const PLOP_DOMAIN_LABELS: Record<string, string> = {
  academic: 'Academic',
  communication: 'Communication',
  social_skills: 'Social Skills',
  behaviour: 'Behaviour',
  motor_skills: 'Motor Skills',
  cognitive_skills: 'Cognitive Skills',
  adl: 'Activities of Daily Living (ADL)',
  emotional_development: 'Emotional Development',
  vocational_skills: 'Vocational Skills',
};

export const THERAPY_TYPE_LABELS: Record<string, string> = {
  speech_therapy: 'Speech Therapy',
  occupational_therapy: 'Occupational Therapy',
  physiotherapy: 'Physiotherapy',
  behaviour_therapy: 'Behaviour Therapy',
  counselling: 'Counselling',
  other: 'Other',
};

export const ACCOMMODATION_AREA_LABELS: Record<string, string> = {
  classroom: 'Classroom',
  examination: 'Examination',
  learning_materials: 'Learning Materials',
  communication: 'Communication',
  mobility: 'Mobility',
};

export const IEP_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  in_review: 'In Review',
  approved: 'Approved',
  archived: 'Archived',
};

export const GOAL_STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  achieved: 'Achieved',
  not_achieved: 'Not Achieved',
  on_hold: 'On Hold',
};

export const RATING_LABELS: Record<number, string> = {
  0: 'Not Achieved',
  1: 'Achieved with Full Support',
  2: 'Achieved with Moderate Support',
  3: 'Achieved with Minimal Support',
  4: 'Achieved Independently',
};
