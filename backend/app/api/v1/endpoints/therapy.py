import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.permissions import get_current_user_context, AuthContext, verify_student_access
from app.core.audit import record_audit_log
from app.models.entities import TherapySession, User, StaffStudentAssignment
from app.schemas.iep import TherapySessionCreate, TherapySessionUpdate, TherapySessionResponse

router = APIRouter()

THERAPY_TYPES = {"speech_therapy", "occupational_therapy", "physiotherapy", "behaviour_therapy", "counselling", "other"}


def _session_to_response(s: TherapySession, db: Session) -> TherapySessionResponse:
    therapist = db.query(User).filter(User.id == s.therapist_user_id).first()
    return TherapySessionResponse(
        id=s.id,
        school_id=s.school_id,
        student_id=s.student_id,
        goal_id=s.goal_id,
        therapy_type=s.therapy_type,
        therapist_user_id=s.therapist_user_id,
        therapist_name=therapist.full_name if therapist else None,
        session_date=s.session_date,
        duration_minutes=s.duration_minutes,
        progress_notes=s.progress_notes,
        outcome=s.outcome,
        next_steps=s.next_steps,
        guardian_visible=s.guardian_visible,
        created_at=s.created_at,
        updated_at=s.updated_at,
    )


@router.get("/students/{student_id}/therapy-sessions", response_model=List[TherapySessionResponse])
def list_therapy_sessions(
    student_id: uuid.UUID,
    therapy_type: Optional[str] = Query(None),
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    verify_student_access(student_id, ctx, db)

    q = db.query(TherapySession).filter(
        TherapySession.student_id == student_id,
        TherapySession.school_id == ctx.active_school_id,
    )

    # Guardians see only guardian_visible sessions
    if ctx.active_role == "guardian":
        q = q.filter(TherapySession.guardian_visible.is_(True))

    if therapy_type:
        q = q.filter(TherapySession.therapy_type == therapy_type)

    sessions = q.order_by(TherapySession.session_date.desc()).all()
    return [_session_to_response(s, db) for s in sessions]


@router.post("/students/{student_id}/therapy-sessions", response_model=TherapySessionResponse, status_code=status.HTTP_201_CREATED)
def create_therapy_session(
    student_id: uuid.UUID,
    payload: TherapySessionCreate,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    if ctx.active_role not in ("therapist",):
        raise HTTPException(status_code=403, detail="Only therapists can record therapy sessions")

    if payload.therapy_type not in THERAPY_TYPES:
        raise HTTPException(status_code=422, detail=f"Invalid therapy type. Must be one of: {THERAPY_TYPES}")

    # Therapist must be assigned to this student
    assignment = db.query(StaffStudentAssignment).filter(
        StaffStudentAssignment.staff_user_id == ctx.user.id,
        StaffStudentAssignment.student_id == student_id,
        StaffStudentAssignment.school_id == ctx.active_school_id,
        StaffStudentAssignment.is_active.is_(True)
    ).first()
    if not assignment:
        raise HTTPException(status_code=403, detail="You are not assigned to this student")

    verify_student_access(student_id, ctx, db, for_write=True)

    session = TherapySession(
        school_id=ctx.active_school_id,
        student_id=student_id,
        goal_id=payload.goal_id,
        therapy_type=payload.therapy_type,
        therapist_user_id=ctx.user.id,
        session_date=payload.session_date,
        duration_minutes=payload.duration_minutes,
        progress_notes=payload.progress_notes,
        outcome=payload.outcome,
        next_steps=payload.next_steps,
        guardian_visible=payload.guardian_visible,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    record_audit_log(db=db, school_id=ctx.active_school_id, actor_user_id=ctx.user.id,
                     action="THERAPY_SESSION_CREATE", entity_type="therapy_session", entity_id=str(session.id))
    return _session_to_response(session, db)


@router.patch("/therapy-sessions/{session_id}", response_model=TherapySessionResponse)
def update_therapy_session(
    session_id: uuid.UUID,
    payload: TherapySessionUpdate,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    if ctx.active_role not in ("therapist",):
        raise HTTPException(status_code=403, detail="Only therapists can update therapy sessions")

    session = db.query(TherapySession).filter(
        TherapySession.id == session_id,
        TherapySession.school_id == ctx.active_school_id,
        TherapySession.therapist_user_id == ctx.user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Therapy session not found or not yours to edit")

    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(session, k, v)
    db.commit()
    db.refresh(session)
    return _session_to_response(session, db)
