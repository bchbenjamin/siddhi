import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.permissions import get_current_user_context, AuthContext, verify_student_access
from app.core.audit import record_audit_log
from app.models.entities import AssessmentRecord, User
from app.schemas.iep import AssessmentCreate, AssessmentUpdate, AssessmentResponse

router = APIRouter()

ASSESSMENT_TYPES = {"psychological", "educational", "medical", "observation", "functional", "other"}
WRITER_ROLES = {"psychologist", "special_educator", "therapist", "school_head"}


def _assessment_to_response(a: AssessmentRecord, db: Session) -> AssessmentResponse:
    assessor = db.query(User).filter(User.id == a.assessor_user_id).first() if a.assessor_user_id else None
    return AssessmentResponse(
        id=a.id,
        school_id=a.school_id,
        student_id=a.student_id,
        assessment_type=a.assessment_type,
        domain=a.domain,
        assessment_date=a.assessment_date,
        assessor_user_id=a.assessor_user_id,
        assessor_name=assessor.full_name if assessor else None,
        external_assessor_name=a.external_assessor_name,
        summary=a.summary,
        recommendations=a.recommendations,
        guardian_visible=a.guardian_visible,
        next_review_date=a.next_review_date,
        created_at=a.created_at,
    )


@router.get("/students/{student_id}/assessments", response_model=List[AssessmentResponse])
def list_assessments(
    student_id: uuid.UUID,
    assessment_type: Optional[str] = Query(None),
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    verify_student_access(student_id, ctx, db)

    q = db.query(AssessmentRecord).filter(
        AssessmentRecord.student_id == student_id,
        AssessmentRecord.school_id == ctx.active_school_id,
    )

    # Guardians see only guardian_visible records
    if ctx.active_role == "guardian":
        q = q.filter(AssessmentRecord.guardian_visible.is_(True))

    if assessment_type:
        q = q.filter(AssessmentRecord.assessment_type == assessment_type)

    items = q.order_by(AssessmentRecord.assessment_date.desc()).all()
    return [_assessment_to_response(a, db) for a in items]


@router.post("/students/{student_id}/assessments", response_model=AssessmentResponse, status_code=status.HTTP_201_CREATED)
def create_assessment(
    student_id: uuid.UUID,
    payload: AssessmentCreate,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    if ctx.active_role not in WRITER_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized to create assessment records")

    if payload.assessment_type not in ASSESSMENT_TYPES:
        raise HTTPException(status_code=422, detail=f"Invalid assessment type. Must be one of: {ASSESSMENT_TYPES}")

    # Role-specific type restrictions
    if ctx.active_role == "therapist" and payload.assessment_type == "psychological":
        raise HTTPException(status_code=403, detail="Therapists cannot create psychological assessments")
    if ctx.active_role == "psychologist" and payload.assessment_type == "educational":
        # Allow but audit
        pass

    verify_student_access(student_id, ctx, db, for_write=True)

    record = AssessmentRecord(
        school_id=ctx.active_school_id,
        student_id=student_id,
        assessment_type=payload.assessment_type,
        domain=payload.domain,
        assessment_date=payload.assessment_date,
        assessor_user_id=payload.assessor_user_id or ctx.user.id,
        external_assessor_name=payload.external_assessor_name,
        summary=payload.summary,
        recommendations=payload.recommendations,
        guardian_visible=payload.guardian_visible,
        next_review_date=payload.next_review_date,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    record_audit_log(db=db, school_id=ctx.active_school_id, actor_user_id=ctx.user.id,
                     action="ASSESSMENT_CREATE", entity_type="assessment_record", entity_id=str(record.id))
    return _assessment_to_response(record, db)


@router.patch("/assessments/{assessment_id}", response_model=AssessmentResponse)
def update_assessment(
    assessment_id: uuid.UUID,
    payload: AssessmentUpdate,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    if ctx.active_role not in WRITER_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized to update assessments")

    record = db.query(AssessmentRecord).filter(
        AssessmentRecord.id == assessment_id,
        AssessmentRecord.school_id == ctx.active_school_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Assessment record not found")

    verify_student_access(record.student_id, ctx, db, for_write=True)

    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(record, k, v)
    db.commit()
    db.refresh(record)
    return _assessment_to_response(record, db)
