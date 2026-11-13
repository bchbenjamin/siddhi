// Core shared types

export interface User {
  id: string;
  faculty_id?: string;
  email: string;
  full_name: string;
  phone?: string;
  active_role: Role;
  active_school_id: string;
  roles: Role[];
  memberships: RoleMembership[];
  landing_route: string;
}

export type Role =
  | 'guardian'
  | 'special_educator'
  | 'therapist'
  | 'psychologist'
  | 'school_head'
  | 'school_admin';

export interface RoleMembership {
  school_id: string;
  school_name: string;
  role: Role;
  is_active: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

export interface LoginResponse {
  token: TokenResponse;
  user: User;
}

// Students
export interface Student {
  id: string;
  school_id: string;
  admission_number: string;
  full_name: string;
  date_of_birth: string;
  gender?: string;
  disability_category: string;
  enrollment_date: string;
  grade_class: string;
  strengths?: string;
  areas_of_need?: string;
  learning_style?: string;
  languages_known?: string;
  assistive_devices?: string;
  profile_image_path?: string;
  is_active: boolean;
  created_at: string;
  diagnosis?: string;
  udid_number_masked?: string;
}

export interface StudentDetail extends Student {
  guardians: GuardianBrief[];
  assigned_staff: StaffAssignment[];
}

export interface GuardianBrief {
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  relationship_label?: string;
  is_primary: boolean;
}

export interface StaffAssignment {
  user_id: string;
  full_name: string;
  role: Role;
  assignment_type: string;
}

export interface StudentListResponse {
  items: Student[];
  total: number;
  page: number;
  page_size: number;
}

// Guardian
export interface GuardianChildCard {
  student_id: string;
  full_name: string;
  date_of_birth: string;
  grade_class: string;
  disability_category: string;
  profile_image_path?: string;
  relationship_label?: string;
  is_primary: boolean;
  active_iep_plan_id?: string;
  active_iep_status?: string;
  academic_year?: string;
}

export interface GuardianProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  children: GuardianChildCard[];
}

// PLOP
export interface PLOPRecord {
  id: string;
  student_id: string;
  domain: string;
  current_performance: string;
  assessment_method: string;
  baseline_value?: string;
  remarks?: string;
  assessed_by_user_id: string;
  assessed_by_name?: string;
  assessed_at: string;
  guardian_visible: boolean;
  created_at: string;
}

// IEP
export interface IEPPlan {
  id: string;
  school_id: string;
  student_id: string;
  academic_year: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'in_review' | 'approved' | 'archived';
  version: number;
  created_by_user_id: string;
  approved_at?: string;
  archived_at?: string;
  created_at: string;
  updated_at: string;
}

export interface GoalObjective {
  id: string;
  goal_id: string;
  objective_text: string;
  sequence_number: number;
  target_date?: string;
  success_criteria?: string;
  created_at: string;
}

export interface IEPGoal {
  id: string;
  school_id: string;
  iep_plan_id: string;
  student_id: string;
  domain: string;
  annual_goal: string;
  teaching_strategies: string;
  responsible_staff_user_id?: string;
  responsible_staff_name?: string;
  timeline: string;
  evaluation_method: string;
  status: 'not_started' | 'in_progress' | 'achieved' | 'not_achieved' | 'on_hold';
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  objectives: GoalObjective[];
}

// Progress
export type ProgressTerm = 'baseline' | 'term_1' | 'term_2' | 'term_3' | 'final';

export const RATING_LABELS: Record<number, string> = {
  0: 'Not Achieved',
  1: 'Achieved with Full Support',
  2: 'Achieved with Moderate Support',
  3: 'Achieved with Minimal Support',
  4: 'Achieved Independently',
};

export interface ProgressEntry {
  id: string;
  student_id: string;
  goal_id: string;
  objective_id?: string;
  term: ProgressTerm;
  rating: number;
  rating_label?: string;
  observation: string;
  assessed_by_user_id: string;
  assessed_by_name?: string;
  observed_at: string;
  created_at: string;
}

export interface GoalProgressSummary {
  goal_id: string;
  domain: string;
  annual_goal: string;
  goal_status: string;
  baseline?: number;
  term_1?: number;
  term_2?: number;
  term_3?: number;
  final?: number;
  latest_rating?: number;
  latest_rating_label?: string;
  latest_observed_at?: string;
  entries: ProgressEntry[];
}

// Therapy
export interface TherapySession {
  id: string;
  school_id: string;
  student_id: string;
  goal_id?: string;
  therapy_type: string;
  therapist_user_id: string;
  therapist_name?: string;
  session_date: string;
  duration_minutes: number;
  progress_notes: string;
  outcome?: string;
  next_steps?: string;
  guardian_visible: boolean;
  created_at: string;
  updated_at: string;
}

// Accommodations
export interface Accommodation {
  id: string;
  school_id: string;
  student_id: string;
  area: string;
  accommodation: string;
  modification?: string;
  assistive_technology?: string;
  responsible_staff_user_id?: string;
  responsible_staff_name?: string;
  effective_from: string;
  effective_to?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Communications
export interface ParentInteraction {
  id: string;
  school_id: string;
  student_id: string;
  guardian_user_id?: string;
  guardian_name?: string;
  recorded_by_user_id: string;
  recorded_by_name?: string;
  interaction_date: string;
  mode: 'meeting' | 'call' | 'email' | 'other';
  discussion_points: string;
  action_taken: string;
  acknowledgement_status: 'pending' | 'acknowledged' | 'declined';
  acknowledged_at?: string;
  created_at: string;
}

// Assessments
export interface AssessmentRecord {
  id: string;
  school_id: string;
  student_id: string;
  assessment_type: string;
  domain?: string;
  assessment_date: string;
  assessor_user_id?: string;
  assessor_name?: string;
  external_assessor_name?: string;
  summary: string;
  recommendations?: string;
  guardian_visible: boolean;
  next_review_date?: string;
  created_at: string;
}

// Attendance
export interface AttendanceRecord {
  id: string;
  student_id: string;
  attendance_date: string;
  status: 'present' | 'absent' | 'leave' | 'other';
  reason?: string;
  recorded_by_user_id: string;
  recorded_by_name?: string;
  created_at: string;
}

export interface AttendanceSummary {
  student_id: string;
  total_days: number;
  present: number;
  absent: number;
  leave: number;
  other: number;
  attendance_pct: number;
}

// Reviews
export interface IEPApproval {
  id: string;
  iep_review_id: string;
  approver_user_id: string;
  approver_name?: string;
  required_role: string;
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
  decision_at?: string;
  created_at: string;
}

export interface IEPReview {
  id: string;
  school_id: string;
  student_id: string;
  iep_plan_id: string;
  review_type: 'quarterly' | 'half_yearly' | 'annual';
  scheduled_date: string;
  conducted_at?: string;
  review_notes?: string;
  status: 'scheduled' | 'in_progress' | 'approved' | 'revision_required';
  created_by_user_id: string;
  created_at: string;
  approvals: IEPApproval[];
}

// Reports summary
export interface ReportsSummary {
  total_students: number;
  active_plans: number;
  total_goals: number;
  achieved_goals: number;
  students: StudentSummary[];
}

export interface StudentSummary {
  student_id: string;
  full_name: string;
  grade_class: string;
  disability_category: string;
  active_iep: boolean;
  academic_year?: string;
  total_goals: number;
  achieved_goals: number;
  goal_attainment_pct?: number;
}

// API error shape
export interface ApiError {
  detail: string | { msg: string; type: string }[];
}
