import uuid
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# --- PLOP ---
class PLOPCreate(BaseModel):
    domain: str = Field(..., description="academic|communication|social_skills|behaviour|motor_skills|cognitive_skills|adl|emotional_development|vocational_skills")
    current_performance: str = Field(..., min_length=1)
    assessment_method: str = Field(..., min_length=1, max_length=255)
    baseline_value: Optional[str] = None
    remarks: Optional[str] = None
    assessed_at: date
    guardian_visible: bool = True


class PLOPUpdate(BaseModel):
    current_performance: Optional[str] = None
    assessment_method: Optional[str] = None
    baseline_value: Optional[str] = None
    remarks: Optional[str] = None
    assessed_at: Optional[date] = None
    guardian_visible: Optional[bool] = None


class PLOPResponse(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    domain: str
    current_performance: str
    assessment_method: str
    baseline_value: Optional[str]
    remarks: Optional[str]
    assessed_by_user_id: uuid.UUID
    assessed_by_name: Optional[str] = None
    assessed_at: date
    guardian_visible: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# --- IEP Plans ---
class IEPPlanCreate(BaseModel):
    academic_year: str = Field(..., min_length=1, max_length=50)
    start_date: date
    end_date: date
    status: str = "draft"


class IEPPlanUpdate(BaseModel):
    academic_year: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None


class IEPPlanResponse(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    student_id: uuid.UUID
    academic_year: str
    start_date: date
    end_date: date
    status: str
    version: int
    created_by_user_id: uuid.UUID
    approved_at: Optional[datetime]
    archived_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- IEP Goals ---
class GoalObjectiveCreate(BaseModel):
    objective_text: str = Field(..., min_length=1)
    sequence_number: int = 1
    target_date: Optional[date] = None
    success_criteria: Optional[str] = None


class GoalObjectiveUpdate(BaseModel):
    objective_text: Optional[str] = None
    sequence_number: Optional[int] = None
    target_date: Optional[date] = None
    success_criteria: Optional[str] = None


class GoalObjectiveResponse(BaseModel):
    id: uuid.UUID
    goal_id: uuid.UUID
    objective_text: str
    sequence_number: int
    target_date: Optional[date]
    success_criteria: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class IEPGoalCreate(BaseModel):
    domain: str = Field(..., min_length=1, max_length=100)
    annual_goal: str = Field(..., min_length=1)
    teaching_strategies: str = Field(..., min_length=1)
    responsible_staff_user_id: Optional[uuid.UUID] = None
    timeline: str = Field(..., min_length=1, max_length=100)
    evaluation_method: str = Field(..., min_length=1, max_length=255)
    status: str = "not_started"


class IEPGoalUpdate(BaseModel):
    domain: Optional[str] = None
    annual_goal: Optional[str] = None
    teaching_strategies: Optional[str] = None
    responsible_staff_user_id: Optional[uuid.UUID] = None
    timeline: Optional[str] = None
    evaluation_method: Optional[str] = None
    status: Optional[str] = None


class IEPGoalResponse(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    iep_plan_id: uuid.UUID
    student_id: uuid.UUID
    domain: str
    annual_goal: str
    teaching_strategies: str
    responsible_staff_user_id: Optional[uuid.UUID]
    responsible_staff_name: Optional[str] = None
    timeline: str
    evaluation_method: str
    status: str
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    objectives: List[GoalObjectiveResponse] = []

    model_config = {"from_attributes": True}


# --- Progress Entries ---
RATING_LABELS = {
    0: "Not Achieved",
    1: "Achieved with Full Support",
    2: "Achieved with Moderate Support",
    3: "Achieved with Minimal Support",
    4: "Achieved Independently",
}


class ProgressEntryCreate(BaseModel):
    term: str = Field(..., description="baseline|term_1|term_2|term_3|final")
    rating: int = Field(..., ge=0, le=4)
    observation: str = Field(..., min_length=1)
    observed_at: date
    objective_id: Optional[uuid.UUID] = None


class ProgressEntryResponse(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    goal_id: uuid.UUID
    objective_id: Optional[uuid.UUID]
    term: str
    rating: int
    rating_label: Optional[str] = None
    observation: str
    assessed_by_user_id: uuid.UUID
    assessed_by_name: Optional[str] = None
    observed_at: date
    created_at: datetime

    model_config = {"from_attributes": True}


class GoalProgressSummary(BaseModel):
    goal_id: uuid.UUID
    domain: str
    annual_goal: str
    goal_status: str
    baseline: Optional[int] = None
    term_1: Optional[int] = None
    term_2: Optional[int] = None
    term_3: Optional[int] = None
    final: Optional[int] = None
    latest_rating: Optional[int] = None
    latest_rating_label: Optional[str] = None
    latest_observed_at: Optional[date] = None
    entries: List[ProgressEntryResponse] = []


# --- Therapy Sessions ---
class TherapySessionCreate(BaseModel):
    therapy_type: str = Field(..., description="speech_therapy|occupational_therapy|physiotherapy|behaviour_therapy|counselling|other")
    session_date: date
    duration_minutes: int = Field(..., gt=0)
    progress_notes: str = Field(..., min_length=1)
    goal_id: Optional[uuid.UUID] = None
    outcome: Optional[str] = None
    next_steps: Optional[str] = None
    guardian_visible: bool = True


class TherapySessionUpdate(BaseModel):
    therapy_type: Optional[str] = None
    session_date: Optional[date] = None
    duration_minutes: Optional[int] = None
    progress_notes: Optional[str] = None
    goal_id: Optional[uuid.UUID] = None
    outcome: Optional[str] = None
    next_steps: Optional[str] = None
    guardian_visible: Optional[bool] = None


class TherapySessionResponse(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    student_id: uuid.UUID
    goal_id: Optional[uuid.UUID]
    therapy_type: str
    therapist_user_id: uuid.UUID
    therapist_name: Optional[str] = None
    session_date: date
    duration_minutes: int
    progress_notes: str
    outcome: Optional[str]
    next_steps: Optional[str]
    guardian_visible: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Accommodations ---
class AccommodationCreate(BaseModel):
    area: str = Field(..., description="classroom|examination|learning_materials|communication|mobility")
    accommodation: str = Field(..., min_length=1)
    modification: Optional[str] = None
    assistive_technology: Optional[str] = None
    responsible_staff_user_id: Optional[uuid.UUID] = None
    effective_from: date
    effective_to: Optional[date] = None
    is_active: bool = True


class AccommodationUpdate(BaseModel):
    area: Optional[str] = None
    accommodation: Optional[str] = None
    modification: Optional[str] = None
    assistive_technology: Optional[str] = None
    responsible_staff_user_id: Optional[uuid.UUID] = None
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    is_active: Optional[bool] = None


class AccommodationResponse(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    student_id: uuid.UUID
    area: str
    accommodation: str
    modification: Optional[str]
    assistive_technology: Optional[str]
    responsible_staff_user_id: Optional[uuid.UUID]
    responsible_staff_name: Optional[str] = None
    effective_from: date
    effective_to: Optional[date]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Parent Interactions ---
class ParentInteractionCreate(BaseModel):
    interaction_date: date
    mode: str = Field(..., description="meeting|call|email|other")
    discussion_points: str = Field(..., min_length=1)
    action_taken: str = Field(..., min_length=1)
    guardian_user_id: Optional[uuid.UUID] = None


class ParentInteractionUpdate(BaseModel):
    interaction_date: Optional[date] = None
    mode: Optional[str] = None
    discussion_points: Optional[str] = None
    action_taken: Optional[str] = None


class ParentInteractionResponse(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    student_id: uuid.UUID
    guardian_user_id: Optional[uuid.UUID]
    guardian_name: Optional[str] = None
    recorded_by_user_id: uuid.UUID
    recorded_by_name: Optional[str] = None
    interaction_date: date
    mode: str
    discussion_points: str
    action_taken: str
    acknowledgement_status: str
    acknowledged_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Assessment Records ---
class AssessmentCreate(BaseModel):
    assessment_type: str = Field(..., description="psychological|educational|medical|observation|functional|other")
    domain: Optional[str] = None
    assessment_date: date
    assessor_user_id: Optional[uuid.UUID] = None
    external_assessor_name: Optional[str] = None
    summary: str = Field(..., min_length=1)
    recommendations: Optional[str] = None
    guardian_visible: bool = False
    next_review_date: Optional[date] = None


class AssessmentUpdate(BaseModel):
    assessment_type: Optional[str] = None
    domain: Optional[str] = None
    assessment_date: Optional[date] = None
    summary: Optional[str] = None
    recommendations: Optional[str] = None
    guardian_visible: Optional[bool] = None
    next_review_date: Optional[date] = None


class AssessmentResponse(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    student_id: uuid.UUID
    assessment_type: str
    domain: Optional[str]
    assessment_date: date
    assessor_user_id: Optional[uuid.UUID]
    assessor_name: Optional[str] = None
    external_assessor_name: Optional[str]
    summary: str
    recommendations: Optional[str]
    guardian_visible: bool
    next_review_date: Optional[date]
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Attendance ---
class AttendanceCreate(BaseModel):
    attendance_date: date
    status: str = Field(..., description="present|absent|leave|other")
    reason: Optional[str] = None


class AttendanceUpdate(BaseModel):
    status: Optional[str] = None
    reason: Optional[str] = None


class AttendanceResponse(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    attendance_date: date
    status: str
    reason: Optional[str]
    recorded_by_user_id: uuid.UUID
    recorded_by_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AttendanceSummary(BaseModel):
    student_id: uuid.UUID
    total_days: int
    present: int
    absent: int
    leave: int
    other: int
    attendance_pct: float


# --- IEP Reviews & Approvals ---
class IEPReviewCreate(BaseModel):
    iep_plan_id: uuid.UUID
    review_type: str = Field(..., description="quarterly|half_yearly|annual")
    scheduled_date: date
    review_notes: Optional[str] = None


class IEPReviewUpdate(BaseModel):
    scheduled_date: Optional[date] = None
    review_notes: Optional[str] = None
    status: Optional[str] = None
    conducted_at: Optional[datetime] = None


class IEPApprovalCreate(BaseModel):
    approver_user_id: uuid.UUID
    required_role: str


class ApprovalDecision(BaseModel):
    status: str = Field(..., description="approved|rejected")
    comment: Optional[str] = None


class IEPApprovalResponse(BaseModel):
    id: uuid.UUID
    iep_review_id: uuid.UUID
    approver_user_id: uuid.UUID
    approver_name: Optional[str] = None
    required_role: str
    status: str
    comment: Optional[str]
    decision_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class IEPReviewResponse(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    student_id: uuid.UUID
    iep_plan_id: uuid.UUID
    review_type: str
    scheduled_date: date
    conducted_at: Optional[datetime]
    review_notes: Optional[str]
    status: str
    created_by_user_id: uuid.UUID
    created_at: datetime
    approvals: List[IEPApprovalResponse] = []

    model_config = {"from_attributes": True}


# --- Guardian-specific ---
class GuardianChildCard(BaseModel):
    student_id: uuid.UUID
    full_name: str
    date_of_birth: date
    grade_class: str
    disability_category: str
    profile_image_path: Optional[str]
    relationship_label: Optional[str]
    is_primary: bool
    active_iep_plan_id: Optional[uuid.UUID] = None
    active_iep_status: Optional[str] = None
    academic_year: Optional[str] = None


class GuardianProfileResponse(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    phone: Optional[str]
    children: List[GuardianChildCard] = []
