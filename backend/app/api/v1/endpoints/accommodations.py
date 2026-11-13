import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.permissions import get_current_user_context, AuthContext, verify_student_access
from app.models.entities import Accommodation, User
from app.schemas.iep import AccommodationCreate, AccommodationUpdate, AccommodationResponse

router = APIRouter()

ACCOMMODATION_AREAS = {"classroom", "examination", "learning_materials", "communication", "mobility"}


def _accom_to_response(a: Accommodation, db: Session) -> AccommodationResponse:
    staff = db.query(User).filter(User.id == a.responsible_staff_user_id).first() if a.responsible_staff_user_id else None
    return AccommodationResponse(
        id=a.id,
        school_id=a.school_id,
        student_id=a.student_id,
        area=a.area,
        accommodation=a.accommodation,
        modification=a.modification,
        assistive_technology=a.assistive_technology,
        responsible_staff_user_id=a.responsible_staff_user_id,
        responsible_staff_name=staff.full_name if staff else None,
        effective_from=a.effective_from,
        effective_to=a.effective_to,
        is_active=a.is_active,
        created_at=a.created_at,
        updated_at=a.updated_at,
    )


@router.get("/students/{student_id}/accommodations", response_model=List[AccommodationResponse])
def list_accommodations(
    student_id: uuid.UUID,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    verify_student_access(student_id, ctx, db)

    items = db.query(Accommodation).filter(
        Accommodation.student_id == student_id,
        Accommodation.school_id == ctx.active_school_id,
    ).order_by(Accommodation.effective_from.desc()).all()
    return [_accom_to_response(a, db) for a in items]


@router.post("/students/{student_id}/accommodations", response_model=AccommodationResponse, status_code=status.HTTP_201_CREATED)
def create_accommodation(
    student_id: uuid.UUID,
    payload: AccommodationCreate,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    if ctx.active_role not in ("special_educator",):
        raise HTTPException(status_code=403, detail="Only special educators can create accommodations")

    if payload.area not in ACCOMMODATION_AREAS:
        raise HTTPException(status_code=422, detail=f"Invalid area. Must be one of: {ACCOMMODATION_AREAS}")

    verify_student_access(student_id, ctx, db, for_write=True)

    accom = Accommodation(
        school_id=ctx.active_school_id,
        student_id=student_id,
        area=payload.area,
        accommodation=payload.accommodation,
        modification=payload.modification,
        assistive_technology=payload.assistive_technology,
        responsible_staff_user_id=payload.responsible_staff_user_id,
        effective_from=payload.effective_from,
        effective_to=payload.effective_to,
        is_active=payload.is_active,
    )
    db.add(accom)
    db.commit()
    db.refresh(accom)
    return _accom_to_response(accom, db)


@router.patch("/accommodations/{accommodation_id}", response_model=AccommodationResponse)
def update_accommodation(
    accommodation_id: uuid.UUID,
    payload: AccommodationUpdate,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    if ctx.active_role not in ("special_educator",):
        raise HTTPException(status_code=403, detail="Not authorized to update accommodations")

    accom = db.query(Accommodation).filter(
        Accommodation.id == accommodation_id,
        Accommodation.school_id == ctx.active_school_id,
    ).first()
    if not accom:
        raise HTTPException(status_code=404, detail="Accommodation not found")

    verify_student_access(accom.student_id, ctx, db, for_write=True)

    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(accom, k, v)
    db.commit()
    db.refresh(accom)
    return _accom_to_response(accom, db)
