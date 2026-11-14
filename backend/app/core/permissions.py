import uuid
from typing import Optional, List, Callable
from dataclasses import dataclass
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.entities import (
    User, SchoolMembership, Student, GuardianStudentLink, StaffStudentAssignment
)

security_scheme = HTTPBearer(auto_error=False)


@dataclass
class AuthContext:
    user: User
    active_role: str
    active_school_id: uuid.UUID
    roles: List[str]
    memberships: List[SchoolMembership]


def get_current_user_context(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> AuthContext:
    token = None
    if credentials:
        token = credentials.credentials
    elif "access_token" in request.cookies:
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = uuid.UUID(payload["sub"])
    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or deactivated",
        )

    memberships = db.query(SchoolMembership).filter(
        SchoolMembership.user_id == user.id,
        SchoolMembership.is_active.is_(True)
    ).all()

    if not memberships:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no active school memberships",
        )

    # Resolve active school and role
    active_school_id = None
    active_role = None

    # Check if requested in token payload or header
    req_school_id = request.headers.get("X-School-Id") or payload.get("school_id")
    req_role = request.headers.get("X-Active-Role") or payload.get("role")

    if req_school_id:
        try:
            req_school_uuid = uuid.UUID(req_school_id)
            matching = [m for m in memberships if m.school_id == req_school_uuid]
            if matching:
                active_school_id = req_school_uuid
                if req_role and any(m.role == req_role for m in matching):
                    active_role = req_role
                else:
                    active_role = matching[0].role
        except ValueError:
            pass

    if not active_school_id:
        # Default to first active membership
        active_school_id = memberships[0].school_id
        active_role = memberships[0].role

    roles = list({m.role for m in memberships if m.school_id == active_school_id})

    return AuthContext(
        user=user,
        active_role=active_role,
        active_school_id=active_school_id,
        roles=roles,
        memberships=memberships
    )


def require_roles(*allowed_roles: str) -> Callable:
    """Dependency factory checking that user holds at least one of the allowed roles."""
    def role_checker(context: AuthContext = Depends(get_current_user_context)) -> AuthContext:
        if context.active_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action forbidden for role '{context.active_role}'. Required one of: {allowed_roles}"
            )
        return context
    return role_checker


def verify_student_access(
    student_id: uuid.UUID,
    context: AuthContext,
    db: Session,
    for_write: bool = False
) -> Student:
    """
    Enforce multi-tenant and role-based student boundaries.
    Guardians can only access linked children.
    Staff can only access students in their school and within assignment permissions.
    """
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.school_id == context.active_school_id,
        Student.is_active.is_(True)
    ).first()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found or access denied"
        )

    # Guardian check
    if context.active_role == "guardian":
        if for_write:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Guardians cannot modify student records directly"
            )
        link = db.query(GuardianStudentLink).filter(
            GuardianStudentLink.guardian_user_id == context.user.id,
            GuardianStudentLink.student_id == student_id,
            GuardianStudentLink.school_id == context.active_school_id,
            GuardianStudentLink.is_active.is_(True)
        ).first()
        if not link:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Student is not linked to your guardian account"
            )
        return student

    # School head / admin has full school access
    if context.active_role in ("school_head", "school_admin"):
        return student

    # Special educator has school access to assigned or school students
    if context.active_role == "special_educator":
        return student

    # Therapists and psychologists must be assigned or belong to school
    if context.active_role in ("therapist", "psychologist", "psychiatrist"):
        # Check explicit assignment
        assignment = db.query(StaffStudentAssignment).filter(
            StaffStudentAssignment.staff_user_id == context.user.id,
            StaffStudentAssignment.student_id == student_id,
            StaffStudentAssignment.school_id == context.active_school_id,
            StaffStudentAssignment.is_active.is_(True)
        ).first()
        if not assignment and for_write:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned to this student"
            )
        return student

    return student
