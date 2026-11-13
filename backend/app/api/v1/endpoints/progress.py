import uuid
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.permissions import get_current_user_context, AuthContext, verify_student_access
from app.models.entities import ProgressEntry, IEPGoal, User, StaffStudentAssignment
from app.schemas.iep import (
    ProgressEntryCreate, ProgressEntryResponse, GoalProgressSummary, RATING_LABELS
)

router = APIRouter()

VALID_TERMS = {"baseline", "term_1", "term_2", "term_3", "final"}


def _entry_to_response(entry: ProgressEntry, db: Session) -> ProgressEntryResponse:
    assessor = db.query(User).filter(User.id == entry.assessed_by_user_id).first()
    return ProgressEntryResponse(
        id=entry.id,
        student_id=entry.student_id,
        goal_id=entry.goal_id,
        objective_id=entry.objective_id,
        term=entry.term,
        rating=entry.rating,
        rating_label=RATING_LABELS.get(entry.rating),
        observation=entry.observation,
        assessed_by_user_id=entry.assessed_by_user_id,
        assessed_by_name=assessor.full_name if assessor else None,
        observed_at=entry.observed_at,
        created_at=entry.created_at,
    )


@router.get("/students/{student_id}/progress", response_model=List[GoalProgressSummary])
def get_progress_summary(
    student_id: uuid.UUID,
    iep_plan_id: Optional[uuid.UUID] = None,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    verify_student_access(student_id, ctx, db)

    q = db.query(IEPGoal).filter(
        IEPGoal.student_id == student_id,
        IEPGoal.school_id == ctx.active_school_id,
    )
    if iep_plan_id:
        q = q.filter(IEPGoal.iep_plan_id == iep_plan_id)

    goals = q.order_by(IEPGoal.created_at).all()

    result = []
    for goal in goals:
        entries = db.query(ProgressEntry).filter(
            ProgressEntry.goal_id == goal.id,
            ProgressEntry.school_id == ctx.active_school_id,
        ).order_by(ProgressEntry.observed_at.desc()).all()

        # Build term → latest rating mapping
        term_ratings: Dict[str, int] = {}
        for entry in reversed(entries):  # chronological order
            term_ratings[entry.term] = entry.rating

        # Latest entry
        latest = entries[0] if entries else None

        entry_responses = [_entry_to_response(e, db) for e in entries]

        result.append(GoalProgressSummary(
            goal_id=goal.id,
            domain=goal.domain,
            annual_goal=goal.annual_goal,
            goal_status=goal.status,
            baseline=term_ratings.get("baseline"),
            term_1=term_ratings.get("term_1"),
            term_2=term_ratings.get("term_2"),
            term_3=term_ratings.get("term_3"),
            final=term_ratings.get("final"),
            latest_rating=latest.rating if latest else None,
            latest_rating_label=RATING_LABELS.get(latest.rating) if latest else None,
            latest_observed_at=latest.observed_at if latest else None,
            entries=entry_responses,
        ))

    return result


@router.get("/goals/{goal_id}/progress-entries", response_model=List[ProgressEntryResponse])
def list_progress_entries(
    goal_id: uuid.UUID,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    goal = db.query(IEPGoal).filter(
        IEPGoal.id == goal_id,
        IEPGoal.school_id == ctx.active_school_id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    verify_student_access(goal.student_id, ctx, db)

    entries = db.query(ProgressEntry).filter(
        ProgressEntry.goal_id == goal_id,
        ProgressEntry.school_id == ctx.active_school_id,
    ).order_by(ProgressEntry.observed_at.desc()).all()

    return [_entry_to_response(e, db) for e in entries]


@router.post("/goals/{goal_id}/progress-entries", response_model=ProgressEntryResponse, status_code=status.HTTP_201_CREATED)
def create_progress_entry(
    goal_id: uuid.UUID,
    payload: ProgressEntryCreate,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    # Educators can add progress; therapists only for assigned students
    allowed_roles = ("special_educator", "therapist", "school_head")
    if ctx.active_role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Not authorized to add progress entries")

    goal = db.query(IEPGoal).filter(
        IEPGoal.id == goal_id,
        IEPGoal.school_id == ctx.active_school_id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    verify_student_access(goal.student_id, ctx, db, for_write=True)

    # Therapists: must be assigned to this student
    if ctx.active_role == "therapist":
        assignment = db.query(StaffStudentAssignment).filter(
            StaffStudentAssignment.staff_user_id == ctx.user.id,
            StaffStudentAssignment.student_id == goal.student_id,
            StaffStudentAssignment.school_id == ctx.active_school_id,
            StaffStudentAssignment.is_active.is_(True)
        ).first()
        if not assignment:
            raise HTTPException(status_code=403, detail="Not assigned to this student")

    if payload.term not in VALID_TERMS:
        raise HTTPException(status_code=422, detail=f"Invalid term. Must be one of: {VALID_TERMS}")

    entry = ProgressEntry(
        school_id=ctx.active_school_id,
        student_id=goal.student_id,
        goal_id=goal_id,
        objective_id=payload.objective_id,
        term=payload.term,
        rating=payload.rating,
        observation=payload.observation,
        assessed_by_user_id=ctx.user.id,
        observed_at=payload.observed_at,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _entry_to_response(entry, db)
