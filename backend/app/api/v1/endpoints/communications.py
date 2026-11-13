import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.permissions import get_current_user_context, AuthContext, verify_student_access
from app.core.audit import record_audit_log
from app.models.entities import ParentInteraction, User, GuardianStudentLink
from app.schemas.iep import ParentInteractionCreate, ParentInteractionUpdate, ParentInteractionResponse

router = APIRouter()

INTERACTION_MODES = {"meeting", "call", "email", "other"}


def _interaction_to_response(i: ParentInteraction, db: Session) -> ParentInteractionResponse:
    guardian = db.query(User).filter(User.id == i.guardian_user_id).first() if i.guardian_user_id else None
    recorder = db.query(User).filter(User.id == i.recorded_by_user_id).first()
    return ParentInteractionResponse(
        id=i.id,
        school_id=i.school_id,
        student_id=i.student_id,
        guardian_user_id=i.guardian_user_id,
        guardian_name=guardian.full_name if guardian else None,
        recorded_by_user_id=i.recorded_by_user_id,
        recorded_by_name=recorder.full_name if recorder else None,
        interaction_date=i.interaction_date,
        mode=i.mode,
        discussion_points=i.discussion_points,
        action_taken=i.action_taken,
        acknowledgement_status=i.acknowledgement_status,
        acknowledged_at=i.acknowledged_at,
        created_at=i.created_at,
    )


@router.get("/students/{student_id}/parent-interactions", response_model=List[ParentInteractionResponse])
def list_parent_interactions(
    student_id: uuid.UUID,
    mode: Optional[str] = Query(None),
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    verify_student_access(student_id, ctx, db)

    q = db.query(ParentInteraction).filter(
        ParentInteraction.student_id == student_id,
        ParentInteraction.school_id == ctx.active_school_id,
    )

    # Guardians can only see their own interactions
    if ctx.active_role == "guardian":
        q = q.filter(ParentInteraction.guardian_user_id == ctx.user.id)

    if mode:
        q = q.filter(ParentInteraction.mode == mode)

    items = q.order_by(ParentInteraction.interaction_date.desc()).all()
    return [_interaction_to_response(i, db) for i in items]


@router.post("/students/{student_id}/parent-interactions", response_model=ParentInteractionResponse, status_code=status.HTTP_201_CREATED)
def create_parent_interaction(
    student_id: uuid.UUID,
    payload: ParentInteractionCreate,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    if ctx.active_role not in ("special_educator", "school_head", "school_admin"):
        raise HTTPException(status_code=403, detail="Not authorized to create parent interaction records")

    if payload.mode not in INTERACTION_MODES:
        raise HTTPException(status_code=422, detail=f"Invalid mode. Must be one of: {INTERACTION_MODES}")

    verify_student_access(student_id, ctx, db, for_write=True)

    # Validate guardian_user_id is linked to this student if provided
    if payload.guardian_user_id:
        link = db.query(GuardianStudentLink).filter(
            GuardianStudentLink.guardian_user_id == payload.guardian_user_id,
            GuardianStudentLink.student_id == student_id,
            GuardianStudentLink.school_id == ctx.active_school_id,
            GuardianStudentLink.is_active.is_(True)
        ).first()
        if not link:
            raise HTTPException(status_code=422, detail="Guardian is not linked to this student")

    interaction = ParentInteraction(
        school_id=ctx.active_school_id,
        student_id=student_id,
        guardian_user_id=payload.guardian_user_id,
        recorded_by_user_id=ctx.user.id,
        interaction_date=payload.interaction_date,
        mode=payload.mode,
        discussion_points=payload.discussion_points,
        action_taken=payload.action_taken,
        acknowledgement_status="pending",
    )
    db.add(interaction)
    db.commit()
    db.refresh(interaction)

    record_audit_log(db=db, school_id=ctx.active_school_id, actor_user_id=ctx.user.id,
                     action="PARENT_INTERACTION_CREATE", entity_type="parent_interaction", entity_id=str(interaction.id))
    return _interaction_to_response(interaction, db)


@router.patch("/parent-interactions/{interaction_id}", response_model=ParentInteractionResponse)
def update_parent_interaction(
    interaction_id: uuid.UUID,
    payload: ParentInteractionUpdate,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    if ctx.active_role not in ("special_educator", "school_head"):
        raise HTTPException(status_code=403, detail="Not authorized to update parent interactions")

    interaction = db.query(ParentInteraction).filter(
        ParentInteraction.id == interaction_id,
        ParentInteraction.school_id == ctx.active_school_id,
    ).first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")

    verify_student_access(interaction.student_id, ctx, db, for_write=True)

    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(interaction, k, v)
    db.commit()
    db.refresh(interaction)
    return _interaction_to_response(interaction, db)


@router.post("/parent-interactions/{interaction_id}/acknowledge")
def acknowledge_interaction(
    interaction_id: uuid.UUID,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    """Guardian can acknowledge only their own interaction records."""
    if ctx.active_role != "guardian":
        raise HTTPException(status_code=403, detail="Only guardians can acknowledge interactions")

    interaction = db.query(ParentInteraction).filter(
        ParentInteraction.id == interaction_id,
        ParentInteraction.school_id == ctx.active_school_id,
        ParentInteraction.guardian_user_id == ctx.user.id,
    ).first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found or not associated with your account")

    interaction.acknowledgement_status = "acknowledged"
    interaction.acknowledged_at = datetime.now(timezone.utc)
    db.commit()

    record_audit_log(db=db, school_id=ctx.active_school_id, actor_user_id=ctx.user.id,
                     action="PARENT_INTERACTION_ACKNOWLEDGE", entity_type="parent_interaction", entity_id=str(interaction_id))

    return {"message": "Acknowledged successfully"}
