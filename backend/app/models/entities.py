import uuid
from datetime import date, datetime, timezone
from typing import Optional, List
from sqlalchemy import (
    String, Boolean, Integer, BigInteger, Date, DateTime, Text,
    ForeignKey, UniqueConstraint, CheckConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin, utc_now


class School(Base):
    __tablename__ = "schools"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    memberships: Mapped[List["SchoolMembership"]] = relationship("SchoolMembership", back_populates="school", cascade="all, delete-orphan")
    students: Mapped[List["Student"]] = relationship("Student", back_populates="school")


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    memberships: Mapped[List["SchoolMembership"]] = relationship("SchoolMembership", back_populates="user", cascade="all, delete-orphan")
    sessions: Mapped[List["UserSession"]] = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    guardian_links: Mapped[List["GuardianStudentLink"]] = relationship("GuardianStudentLink", back_populates="guardian_user")
    staff_assignments: Mapped[List["StaffStudentAssignment"]] = relationship("StaffStudentAssignment", back_populates="staff_user")


class SchoolMembership(Base):
    __tablename__ = "school_memberships"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("schools.id", ondelete="RESTRICT"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # guardian, special_educator, therapist, psychologist, school_head, school_admin
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    school: Mapped["School"] = relationship("School", back_populates="memberships")
    user: Mapped["User"] = relationship("User", back_populates="memberships")

    __table_args__ = (
        UniqueConstraint("school_id", "user_id", "role", name="uq_school_user_role"),
    )


class UserSession(Base):
    __tablename__ = "user_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    refresh_token_hash: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="sessions")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class Student(Base, TimestampMixin):
    __tablename__ = "students"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("schools.id", ondelete="RESTRICT"), nullable=False, index=True)
    admission_number: Mapped[str] = mapped_column(String(100), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    disability_category: Mapped[str] = mapped_column(String(150), nullable=False)
    udid_number_encrypted: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    enrollment_date: Mapped[date] = mapped_column(Date, nullable=False)
    grade_class: Mapped[str] = mapped_column(String(50), nullable=False)
    diagnosis: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    strengths: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    areas_of_need: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    learning_style: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    languages_known: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    assistive_devices: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    profile_image_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    school: Mapped["School"] = relationship("School", back_populates="students")
    guardian_links: Mapped[List["GuardianStudentLink"]] = relationship("GuardianStudentLink", back_populates="student", cascade="all, delete-orphan")
    staff_assignments: Mapped[List["StaffStudentAssignment"]] = relationship("StaffStudentAssignment", back_populates="student", cascade="all, delete-orphan")
    plop_records: Mapped[List["PresentLevelRecord"]] = relationship("PresentLevelRecord", back_populates="student", cascade="all, delete-orphan")
    iep_plans: Mapped[List["IEPPlan"]] = relationship("IEPPlan", back_populates="student", cascade="all, delete-orphan")
    therapy_sessions: Mapped[List["TherapySession"]] = relationship("TherapySession", back_populates="student", cascade="all, delete-orphan")
    accommodations: Mapped[List["Accommodation"]] = relationship("Accommodation", back_populates="student", cascade="all, delete-orphan")
    parent_interactions: Mapped[List["ParentInteraction"]] = relationship("ParentInteraction", back_populates="student", cascade="all, delete-orphan")
    assessments: Mapped[List["AssessmentRecord"]] = relationship("AssessmentRecord", back_populates="student", cascade="all, delete-orphan")
    attendance_records: Mapped[List["AttendanceRecord"]] = relationship("AttendanceRecord", back_populates="student", cascade="all, delete-orphan")
    iep_reviews: Mapped[List["IEPReview"]] = relationship("IEPReview", back_populates="student", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("school_id", "admission_number", name="uq_school_student_admission"),
    )


class GuardianStudentLink(Base):
    __tablename__ = "guardian_student_links"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("schools.id", ondelete="RESTRICT"), nullable=False, index=True)
    guardian_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    relationship_label: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    guardian_user: Mapped["User"] = relationship("User", back_populates="guardian_links")
    student: Mapped["Student"] = relationship("Student", back_populates="guardian_links")

    __table_args__ = (
        UniqueConstraint("guardian_user_id", "student_id", name="uq_guardian_student"),
    )


class StaffStudentAssignment(Base):
    __tablename__ = "staff_student_assignments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("schools.id", ondelete="RESTRICT"), nullable=False, index=True)
    staff_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    assignment_type: Mapped[str] = mapped_column(String(100), nullable=False)  # special_educator, therapist, psychologist, etc.
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    staff_user: Mapped["User"] = relationship("User", back_populates="staff_assignments")
    student: Mapped["Student"] = relationship("Student", back_populates="staff_assignments")


class PresentLevelRecord(Base):
    __tablename__ = "present_level_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("schools.id", ondelete="RESTRICT"), nullable=False, index=True)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    domain: Mapped[str] = mapped_column(String(100), nullable=False)  # academic, communication, social_skills, behaviour, motor_skills, cognitive_skills, adl, emotional_development, vocational_skills
    current_performance: Mapped[str] = mapped_column(Text, nullable=False)
    assessment_method: Mapped[str] = mapped_column(String(255), nullable=False)
    baseline_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    assessed_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    assessed_at: Mapped[date] = mapped_column(Date, nullable=False)
    guardian_visible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    student: Mapped["Student"] = relationship("Student", back_populates="plop_records")
    assessed_by: Mapped["User"] = relationship("User")


class IEPPlan(Base, TimestampMixin):
    __tablename__ = "iep_plans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("schools.id", ondelete="RESTRICT"), nullable=False, index=True)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_year: Mapped[str] = mapped_column(String(50), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)  # draft, active, in_review, approved, archived
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    student: Mapped["Student"] = relationship("Student", back_populates="iep_plans")
    goals: Mapped[List["IEPGoal"]] = relationship("IEPGoal", back_populates="iep_plan", cascade="all, delete-orphan")
    reviews: Mapped[List["IEPReview"]] = relationship("IEPReview", back_populates="iep_plan", cascade="all, delete-orphan")


class IEPGoal(Base, TimestampMixin):
    __tablename__ = "iep_goals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("schools.id", ondelete="RESTRICT"), nullable=False, index=True)
    iep_plan_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("iep_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    domain: Mapped[str] = mapped_column(String(100), nullable=False)
    annual_goal: Mapped[str] = mapped_column(Text, nullable=False)
    teaching_strategies: Mapped[str] = mapped_column(Text, nullable=False)
    responsible_staff_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    timeline: Mapped[str] = mapped_column(String(100), nullable=False)
    evaluation_method: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="not_started", nullable=False)  # not_started, in_progress, achieved, not_achieved, on_hold
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)

    iep_plan: Mapped["IEPPlan"] = relationship("IEPPlan", back_populates="goals")
    objectives: Mapped[List["GoalObjective"]] = relationship("GoalObjective", back_populates="goal", cascade="all, delete-orphan")
    progress_entries: Mapped[List["ProgressEntry"]] = relationship("ProgressEntry", back_populates="goal", cascade="all, delete-orphan")
    responsible_staff: Mapped[Optional["User"]] = relationship("User", foreign_keys=[responsible_staff_user_id])


class GoalObjective(Base, TimestampMixin):
    __tablename__ = "goal_objectives"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("schools.id", ondelete="RESTRICT"), nullable=False, index=True)
    goal_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("iep_goals.id", ondelete="CASCADE"), nullable=False, index=True)
    objective_text: Mapped[str] = mapped_column(Text, nullable=False)
    sequence_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    target_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    success_criteria: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    goal: Mapped["IEPGoal"] = relationship("IEPGoal", back_populates="objectives")


class ProgressEntry(Base):
    __tablename__ = "progress_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("schools.id", ondelete="RESTRICT"), nullable=False, index=True)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    goal_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("iep_goals.id", ondelete="CASCADE"), nullable=False, index=True)
    objective_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("goal_objectives.id", ondelete="SET NULL"), nullable=True)
    term: Mapped[str] = mapped_column(String(50), nullable=False)  # baseline, term_1, term_2, term_3, final
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 0 to 4
    observation: Mapped[str] = mapped_column(Text, nullable=False)
    assessed_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    observed_at: Mapped[date] = mapped_column(Date, nullable=False)
    evidence_attachment_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    goal: Mapped["IEPGoal"] = relationship("IEPGoal", back_populates="progress_entries")
    assessed_by: Mapped["User"] = relationship("User")

    __table_args__ = (
        CheckConstraint("rating >= 0 AND rating <= 4", name="chk_progress_rating_range"),
        Index("ix_progress_student_term", "student_id", "term"),
    )


class TherapySession(Base, TimestampMixin):
    __tablename__ = "therapy_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("schools.id", ondelete="RESTRICT"), nullable=False, index=True)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    goal_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("iep_goals.id", ondelete="SET NULL"), nullable=True)
    therapy_type: Mapped[str] = mapped_column(String(100), nullable=False)  # speech_therapy, occupational_therapy, physiotherapy, behaviour_therapy, counselling, other
    therapist_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    session_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    progress_notes: Mapped[str] = mapped_column(Text, nullable=False)
    outcome: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    next_steps: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    guardian_visible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    student: Mapped["Student"] = relationship("Student", back_populates="therapy_sessions")
    therapist: Mapped["User"] = relationship("User")
    goal: Mapped[Optional["IEPGoal"]] = relationship("IEPGoal")


class Accommodation(Base, TimestampMixin):
    __tablename__ = "accommodations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("schools.id", ondelete="RESTRICT"), nullable=False, index=True)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    area: Mapped[str] = mapped_column(String(100), nullable=False)  # classroom, examination, learning_materials, communication, mobility
    accommodation: Mapped[str] = mapped_column(Text, nullable=False)
    modification: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    assistive_technology: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    responsible_staff_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    student: Mapped["Student"] = relationship("Student", back_populates="accommodations")
    responsible_staff: Mapped[Optional["User"]] = relationship("User")


class ParentInteraction(Base, TimestampMixin):
    __tablename__ = "parent_interactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("schools.id", ondelete="RESTRICT"), nullable=False, index=True)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    guardian_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    recorded_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    interaction_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    mode: Mapped[str] = mapped_column(String(50), nullable=False)  # meeting, call, email, other
    discussion_points: Mapped[str] = mapped_column(Text, nullable=False)
    action_taken: Mapped[str] = mapped_column(Text, nullable=False)
    acknowledgement_status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)  # pending, acknowledged, declined
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    student: Mapped["Student"] = relationship("Student", back_populates="parent_interactions")
    guardian: Mapped[Optional["User"]] = relationship("User", foreign_keys=[guardian_user_id])
    recorded_by: Mapped["User"] = relationship("User", foreign_keys=[recorded_by_user_id])


class AssessmentRecord(Base, TimestampMixin):
    __tablename__ = "assessment_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("schools.id", ondelete="RESTRICT"), nullable=False, index=True)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    assessment_type: Mapped[str] = mapped_column(String(100), nullable=False)  # psychological, educational, medical, observation, functional, other
    domain: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    assessment_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    assessor_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    external_assessor_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    recommendations: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    guardian_visible: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    attachment_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    next_review_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    student: Mapped["Student"] = relationship("Student", back_populates="assessments")
    assessor_user: Mapped[Optional["User"]] = relationship("User")


class AttendanceRecord(Base, TimestampMixin):
    __tablename__ = "attendance_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("schools.id", ondelete="RESTRICT"), nullable=False, index=True)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    attendance_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False)  # present, absent, leave, other
    reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    recorded_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)

    student: Mapped["Student"] = relationship("Student", back_populates="attendance_records")
    recorded_by: Mapped["User"] = relationship("User")

    __table_args__ = (
        UniqueConstraint("student_id", "attendance_date", name="uq_student_attendance_date"),
    )


class IEPReview(Base, TimestampMixin):
    __tablename__ = "iep_reviews"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("schools.id", ondelete="RESTRICT"), nullable=False, index=True)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    iep_plan_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("iep_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    review_type: Mapped[str] = mapped_column(String(50), nullable=False)  # quarterly, half_yearly, annual
    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False)
    conducted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    review_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="scheduled", nullable=False)  # scheduled, in_progress, approved, revision_required
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)

    student: Mapped["Student"] = relationship("Student", back_populates="iep_reviews")
    iep_plan: Mapped["IEPPlan"] = relationship("IEPPlan", back_populates="reviews")
    approvals: Mapped[List["IEPApproval"]] = relationship("IEPApproval", back_populates="review", cascade="all, delete-orphan")


class IEPApproval(Base, TimestampMixin):
    __tablename__ = "iep_approvals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("schools.id", ondelete="RESTRICT"), nullable=False, index=True)
    iep_review_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("iep_reviews.id", ondelete="CASCADE"), nullable=False, index=True)
    approver_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    required_role: Mapped[str] = mapped_column(String(50), nullable=False)  # special_educator, school_head, therapist, psychologist, guardian
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)  # pending, approved, rejected
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    decision_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    review: Mapped["IEPReview"] = relationship("IEPReview", back_populates="approvals")
    approver: Mapped["User"] = relationship("User")


class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("schools.id", ondelete="RESTRICT"), nullable=False, index=True)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    uploaded_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    checksum: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("schools.id", ondelete="SET NULL"), nullable=True, index=True)
    actor_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    before_snapshot: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    after_snapshot: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
