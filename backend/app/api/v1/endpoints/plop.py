import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.permissions import get_current_user_context, AuthContext, verify_student_access
from app.core.audit import record_audit_log
from app.models.entities import PresentLevelRecord, User
from app.schemas.iep import PLOPCreate, PLOPUpdate, PLOPResponse

router = APIRouter()

PLOP_DOMAINS = {
    "academic", "communication", "social_skills", "behaviour",
    "motor_skills", "cognitive_skills", "adl", "emotional_development", "vocational_skills"
}


def _can_write_plop(role: str) -> bool:
    return role in ("special_educator", "psychologist", "therapist")


def _plop_to_response(plop: PresentLevelRecord, db: Session) -> PLOPResponse:
    assessor = db.query(User).filter(User.id == plop.assessed_by_user_id).first()
    return PLOPResponse(
        id=plop.id,
        student_id=plop.student_id,
        domain=plop.domain,
        current_performance=plop.current_performance,
        assessment_method=plop.assessment_method,
        baseline_value=plop.baseline_value,
        remarks=plop.remarks,
        assessed_by_user_id=plop.assessed_by_user_id,
        assessed_by_name=assessor.full_name if assessor else None,
        assessed_at=plop.assessed_at,
        guardian_visible=plop.guardian_visible,
        created_at=plop.created_at,
    )


@router.get("/students/{student_id}/plop")
def list_plop(
    student_id: uuid.UUID,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    student = verify_student_access(student_id, ctx, db)

    q = db.query(PresentLevelRecord).filter(
        PresentLevelRecord.student_id == student_id,
        PresentLevelRecord.school_id == ctx.active_school_id,
    )

    # Guardians see only guardian_visible records
    if ctx.active_role == "guardian":
        q = q.filter(PresentLevelRecord.guardian_visible.is_(True))

    records = q.order_by(PresentLevelRecord.assessed_at.desc()).all()
    return [_plop_to_response(r, db) for r in records]


@router.post("/students/{student_id}/plop", status_code=status.HTTP_201_CREATED)
def create_plop(
    student_id: uuid.UUID,
    payload: PLOPCreate,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    if not _can_write_plop(ctx.active_role):
        raise HTTPException(status_code=403, detail="Not authorized to create PLOP records")

    if payload.domain not in PLOP_DOMAINS:
        raise HTTPException(status_code=422, detail=f"Invalid domain. Must be one of: {sorted(PLOP_DOMAINS)}")

    verify_student_access(student_id, ctx, db, for_write=True)

    plop = PresentLevelRecord(
        school_id=ctx.active_school_id,
        student_id=student_id,
        domain=payload.domain,
        current_performance=payload.current_performance,
        assessment_method=payload.assessment_method,
        baseline_value=payload.baseline_value,
        remarks=payload.remarks,
        assessed_by_user_id=ctx.user.id,
        assessed_at=payload.assessed_at,
        guardian_visible=payload.guardian_visible,
    )
    db.add(plop)
    db.commit()
    db.refresh(plop)

    record_audit_log(db=db, school_id=ctx.active_school_id, actor_user_id=ctx.user.id,
                     action="PLOP_CREATE", entity_type="present_level_record", entity_id=str(plop.id))

    return _plop_to_response(plop, db)


@router.patch("/plop/{record_id}")
def update_plop(
    record_id: uuid.UUID,
    payload: PLOPUpdate,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    if not _can_write_plop(ctx.active_role):
        raise HTTPException(status_code=403, detail="Not authorized to update PLOP records")

    plop = db.query(PresentLevelRecord).filter(
        PresentLevelRecord.id == record_id,
        PresentLevelRecord.school_id == ctx.active_school_id
    ).first()

    if not plop:
        raise HTTPException(status_code=404, detail="PLOP record not found")

    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(plop, k, v)
    db.commit()
    db.refresh(plop)

    return _plop_to_response(plop, db)
