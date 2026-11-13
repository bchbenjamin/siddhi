import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.permissions import get_current_user_context, AuthContext, require_roles
from app.models.entities import (
    GuardianStudentLink, Student, IEPPlan
)
from app.schemas.iep import GuardianChildCard, GuardianProfileResponse

router = APIRouter()


@router.get("/me/children")
def get_my_children(
    ctx: AuthContext = Depends(require_roles("guardian")),
    db: Session = Depends(get_db),
):
    links = db.query(GuardianStudentLink).filter(
        GuardianStudentLink.guardian_user_id == ctx.user.id,
        GuardianStudentLink.school_id == ctx.active_school_id,
        GuardianStudentLink.is_active.is_(True)
    ).all()

    children = []
    for link in links:
        student = db.query(Student).filter(
            Student.id == link.student_id,
            Student.is_active.is_(True)
        ).first()
        if not student:
            continue

        # Get active IEP plan
        active_plan = db.query(IEPPlan).filter(
            IEPPlan.student_id == student.id,
            IEPPlan.status.in_(["active", "approved", "in_review"])
        ).order_by(IEPPlan.created_at.desc()).first()

        children.append(GuardianChildCard(
            student_id=student.id,
            full_name=student.full_name,
            date_of_birth=student.date_of_birth,
            grade_class=student.grade_class,
            disability_category=student.disability_category,
            profile_image_path=student.profile_image_path,
            relationship_label=link.relationship_label,
            is_primary=link.is_primary,
            active_iep_plan_id=active_plan.id if active_plan else None,
            active_iep_status=active_plan.status if active_plan else None,
            academic_year=active_plan.academic_year if active_plan else None,
        ))

    return children


@router.get("/me/profile", response_model=GuardianProfileResponse)
def get_guardian_profile(
    ctx: AuthContext = Depends(require_roles("guardian")),
    db: Session = Depends(get_db),
):
    links = db.query(GuardianStudentLink).filter(
        GuardianStudentLink.guardian_user_id == ctx.user.id,
        GuardianStudentLink.school_id == ctx.active_school_id,
        GuardianStudentLink.is_active.is_(True)
    ).all()

    children = []
    for link in links:
        student = db.query(Student).filter(
            Student.id == link.student_id,
            Student.is_active.is_(True)
        ).first()
        if not student:
            continue

        active_plan = db.query(IEPPlan).filter(
            IEPPlan.student_id == student.id,
            IEPPlan.status.in_(["active", "approved", "in_review"])
        ).order_by(IEPPlan.created_at.desc()).first()

        children.append(GuardianChildCard(
            student_id=student.id,
            full_name=student.full_name,
            date_of_birth=student.date_of_birth,
            grade_class=student.grade_class,
            disability_category=student.disability_category,
            profile_image_path=student.profile_image_path,
            relationship_label=link.relationship_label,
            is_primary=link.is_primary,
            active_iep_plan_id=active_plan.id if active_plan else None,
            active_iep_status=active_plan.status if active_plan else None,
            academic_year=active_plan.academic_year if active_plan else None,
        ))

    return GuardianProfileResponse(
        id=ctx.user.id,
        full_name=ctx.user.full_name,
        email=ctx.user.email,
        phone=ctx.user.phone,
        children=children,
    )
