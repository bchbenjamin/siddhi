import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.permissions import get_current_user_context, AuthContext, verify_student_access
from app.core.audit import record_audit_log
from app.models.entities import (
    Student, GuardianStudentLink, StaffStudentAssignment, SchoolMembership, User
)
from app.schemas.students import (
    StudentCreate, StudentUpdate, StudentResponse, StudentDetailResponse,
    StudentListResponse, GuardianBriefSchema, StaffAssignmentSchema
)

router = APIRouter()

RESTRICTED_FIELDS_ROLES = {"school_head", "school_admin", "special_educator", "psychologist"}


def _mask_udid(udid: Optional[str]) -> Optional[str]:
    if not udid:
        return None
    if len(udid) <= 4:
        return "****"
    return "****-" + udid[-4:]


def _build_student_response(student: Student, ctx: AuthContext) -> StudentResponse:
    show_diagnosis = ctx.active_role in RESTRICTED_FIELDS_ROLES
    return StudentResponse(
        id=student.id,
        school_id=student.school_id,
        admission_number=student.admission_number,
        full_name=student.full_name,
        date_of_birth=student.date_of_birth,
        gender=student.gender,
        disability_category=student.disability_category,
        enrollment_date=student.enrollment_date,
        grade_class=student.grade_class,
        strengths=student.strengths,
        areas_of_need=student.areas_of_need,
        learning_style=student.learning_style,
        languages_known=student.languages_known,
        assistive_devices=student.assistive_devices,
        profile_image_path=student.profile_image_path,
        is_active=student.is_active,
        created_at=student.created_at,
        diagnosis=student.diagnosis if show_diagnosis else None,
        udid_number_masked=_mask_udid(student.udid_number_encrypted),
    )


@router.get("", response_model=StudentListResponse)
def list_students(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    grade_class: Optional[str] = Query(None),
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    if ctx.active_role == "guardian":
        raise HTTPException(status_code=403, detail="Guardians cannot list all students")

    q = db.query(Student).filter(
        Student.school_id == ctx.active_school_id,
        Student.is_active.is_(True)
    )

    # Therapists / psychologists see only assigned students
    if ctx.active_role in ("therapist", "psychologist"):
        assigned_ids = db.query(StaffStudentAssignment.student_id).filter(
            StaffStudentAssignment.staff_user_id == ctx.user.id,
            StaffStudentAssignment.school_id == ctx.active_school_id,
            StaffStudentAssignment.is_active.is_(True)
        ).subquery()
        q = q.filter(Student.id.in_(assigned_ids))

    if search:
        q = q.filter(Student.full_name.ilike(f"%{search}%"))
    if grade_class:
        q = q.filter(Student.grade_class == grade_class)

    total = q.count()
    students = q.order_by(Student.full_name).offset((page - 1) * page_size).limit(page_size).all()

    return StudentListResponse(
        items=[_build_student_response(s, ctx) for s in students],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(
    payload: StudentCreate,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    if ctx.active_role not in ("school_admin", "special_educator", "school_head"):
        raise HTTPException(status_code=403, detail="Not authorized to create students")

    # Check admission number uniqueness in school
    existing = db.query(Student).filter(
        Student.school_id == ctx.active_school_id,
        Student.admission_number == payload.admission_number
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Admission number '{payload.admission_number}' already exists in this school")

    student = Student(
        school_id=ctx.active_school_id,
        **payload.model_dump()
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    record_audit_log(db=db, school_id=ctx.active_school_id, actor_user_id=ctx.user.id,
                     action="STUDENT_CREATE", entity_type="student", entity_id=str(student.id),
                     after_snapshot={"full_name": student.full_name, "admission_number": student.admission_number})

    return _build_student_response(student, ctx)


@router.get("/{student_id}", response_model=StudentDetailResponse)
def get_student(
    student_id: uuid.UUID,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    student = verify_student_access(student_id, ctx, db)

    # Guardians/links
    guardian_links = db.query(GuardianStudentLink).filter(
        GuardianStudentLink.student_id == student_id,
        GuardianStudentLink.is_active.is_(True)
    ).all()
    guardians = []
    for link in guardian_links:
        u = db.query(User).filter(User.id == link.guardian_user_id).first()
        if u:
            guardians.append(GuardianBriefSchema(
                user_id=u.id,
                full_name=u.full_name,
                email=u.email,
                phone=u.phone,
                relationship_label=link.relationship_label,
                is_primary=link.is_primary
            ))

    # Staff assignments
    assignments = db.query(StaffStudentAssignment).filter(
        StaffStudentAssignment.student_id == student_id,
        StaffStudentAssignment.is_active.is_(True)
    ).all()
    assigned_staff = []
    for a in assignments:
        u = db.query(User).filter(User.id == a.staff_user_id).first()
        # Get their role
        mem = db.query(SchoolMembership).filter(
            SchoolMembership.user_id == a.staff_user_id,
            SchoolMembership.school_id == ctx.active_school_id,
            SchoolMembership.is_active.is_(True)
        ).first()
        if u and mem:
            assigned_staff.append(StaffAssignmentSchema(
                user_id=u.id,
                full_name=u.full_name,
                role=mem.role,
                assignment_type=a.assignment_type
            ))

    base = _build_student_response(student, ctx)
    return StudentDetailResponse(
        **base.model_dump(),
        guardians=guardians,
        assigned_staff=assigned_staff
    )


@router.patch("/{student_id}", response_model=StudentResponse)
def update_student(
    student_id: uuid.UUID,
    payload: StudentUpdate,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    if ctx.active_role not in ("school_admin", "special_educator", "school_head"):
        raise HTTPException(status_code=403, detail="Not authorized to update student profiles")

    student = verify_student_access(student_id, ctx, db, for_write=True)

    update_data = payload.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(student, key, val)
    db.commit()
    db.refresh(student)

    record_audit_log(db=db, school_id=ctx.active_school_id, actor_user_id=ctx.user.id,
                     action="STUDENT_UPDATE", entity_type="student", entity_id=str(student_id),
                     after_snapshot=update_data)

    return _build_student_response(student, ctx)


@router.get("/{student_id}/guardians")
def get_student_guardians(
    student_id: uuid.UUID,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    if ctx.active_role not in ("school_admin", "school_head", "special_educator"):
        raise HTTPException(status_code=403, detail="Not authorized")

    verify_student_access(student_id, ctx, db)

    links = db.query(GuardianStudentLink).filter(
        GuardianStudentLink.student_id == student_id,
        GuardianStudentLink.is_active.is_(True)
    ).all()

    result = []
    for link in links:
        u = db.query(User).filter(User.id == link.guardian_user_id).first()
        if u:
            result.append({
                "user_id": str(u.id),
                "full_name": u.full_name,
                "email": u.email,
                "phone": u.phone,
                "relationship_label": link.relationship_label,
                "is_primary": link.is_primary,
            })
    return result
