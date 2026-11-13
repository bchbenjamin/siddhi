import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    verify_password, get_password_hash, create_access_token,
    generate_secure_token, hash_token
)
from app.core.audit import record_audit_log
from app.core.permissions import get_current_user_context, AuthContext
from app.models.entities import (
    User, SchoolMembership, UserSession, PasswordResetToken, School
)
from app.schemas.auth import (
    LoginRequest, LoginResponse, TokenResponse, UserProfileResponse,
    RoleMembershipSchema, ForgotPasswordRequest, ResetPasswordRequest,
    ChangePasswordRequest, UserUpdateRequest
)

router = APIRouter()


def build_user_profile(user: User, active_school_id: uuid.UUID, active_role: str, memberships: list) -> UserProfileResponse:
    mem_schemas = []
    roles = []
    for m in memberships:
        school_name = m.school.name if m.school else "School"
        mem_schemas.append(RoleMembershipSchema(
            school_id=m.school_id,
            school_name=school_name,
            role=m.role,
            is_active=m.is_active
        ))
        if m.school_id == active_school_id:
            roles.append(m.role)

    landing_route = "/guardian" if active_role == "guardian" else "/staff"

    return UserProfileResponse(
        id=user.id,
        faculty_id=user.faculty_id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        active_role=active_role,
        active_school_id=active_school_id,
        roles=list(set(roles)),
        memberships=mem_schemas,
        landing_route=landing_route
    )


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, response: Response, db: Session = Depends(get_db)):
    identifier = request.identifier.strip()
    if request.client_mode == "guardian":
        user = db.query(User).filter(User.email == identifier.lower()).first()
    else:
        user = db.query(User).filter(User.faculty_id == identifier.upper()).first()

    # Generic invalid login response to prevent email enumeration
    generic_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not user:
        raise generic_error

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact school administration."
        )

    if not verify_password(request.password, user.password_hash):
        raise generic_error

    # Find active memberships
    memberships = db.query(SchoolMembership).filter(
        SchoolMembership.user_id == user.id,
        SchoolMembership.is_active.is_(True)
    ).all()

    if not memberships:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no active school access."
        )

    # Determine default role based on client_mode preference if available
    target_role = None
    target_school_id = None

    if request.client_mode == "guardian":
        guardian_mems = [m for m in memberships if m.role == "guardian"]
        if guardian_mems:
            target_role = "guardian"
            target_school_id = guardian_mems[0].school_id

    if not target_role:
        # Default to first available membership
        target_role = memberships[0].role
        target_school_id = memberships[0].school_id

    # Update last login timestamp
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    # Create access token and refresh token
    access_token = create_access_token(
        data={"sub": str(user.id), "school_id": str(target_school_id), "role": target_role}
    )
    raw_refresh_token = generate_secure_token()
    refresh_hash = hash_token(raw_refresh_token)

    now = datetime.now(timezone.utc)
    user_session = UserSession(
        user_id=user.id,
        refresh_token_hash=refresh_hash,
        expires_at=now + timedelta(days=settings.SESSION_REFRESH_DAYS),
        last_used_at=now
    )
    db.add(user_session)
    db.commit()

    # Record audit log
    record_audit_log(
        db=db,
        school_id=target_school_id,
        actor_user_id=user.id,
        action="LOGIN_SUCCESS",
        entity_type="user",
        entity_id=str(user.id),
        after_snapshot={"role": target_role}
    )

    # Set secure HttpOnly cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.APP_ENV != "development",
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=raw_refresh_token,
        httponly=True,
        secure=settings.APP_ENV != "development",
        samesite="lax",
        max_age=settings.SESSION_REFRESH_DAYS * 86400,
    )

    profile = build_user_profile(user, target_school_id, target_role, memberships)

    return LoginResponse(
        token=TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_MINUTES * 60,
            refresh_token=raw_refresh_token
        ),
        user=profile
    )


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    context: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db)
):
    # Revoke sessions for this user
    db.query(UserSession).filter(
        UserSession.user_id == context.user.id,
        UserSession.revoked_at.is_(None)
    ).update({"revoked_at": datetime.now(timezone.utc)})
    db.commit()

    # Clear cookies
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")

    record_audit_log(
        db=db,
        school_id=context.active_school_id,
        actor_user_id=context.user.id,
        action="LOGOUT",
        entity_type="user",
        entity_id=str(context.user.id)
    )

    return {"message": "Successfully logged out"}


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
    raw_refresh = request.cookies.get("refresh_token")
    if not raw_refresh:
        # Fallback to body or header if any
        auth_header = request.headers.get("X-Refresh-Token")
        if auth_header:
            raw_refresh = auth_header

    if not raw_refresh:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token required")

    hashed = hash_token(raw_refresh)
    session = db.query(UserSession).filter(
        UserSession.refresh_token_hash == hashed,
        UserSession.revoked_at.is_(None),
        UserSession.expires_at > datetime.now(timezone.utc)
    ).first()

    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")

    user = db.query(User).filter(User.id == session.user_id, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account inactive")

    # Rotate refresh token
    new_raw_refresh = generate_secure_token()
    session.refresh_token_hash = hash_token(new_raw_refresh)
    session.last_used_at = datetime.now(timezone.utc)
    db.commit()

    # Get primary membership
    membership = db.query(SchoolMembership).filter(
        SchoolMembership.user_id == user.id,
        SchoolMembership.is_active.is_(True)
    ).first()

    access_token = create_access_token(
        data={"sub": str(user.id), "school_id": str(membership.school_id if membership else ""), "role": membership.role if membership else ""}
    )

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.APP_ENV != "development",
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=new_raw_refresh,
        httponly=True,
        secure=settings.APP_ENV != "development",
        samesite="lax",
        max_age=settings.SESSION_REFRESH_DAYS * 86400,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_MINUTES * 60,
        refresh_token=new_raw_refresh
    )


@router.get("/me", response_model=UserProfileResponse)
def get_me(context: AuthContext = Depends(get_current_user_context)):
    return build_user_profile(
        user=context.user,
        active_school_id=context.active_school_id,
        active_role=context.active_role,
        memberships=context.memberships
    )


@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    email_clean = req.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean, User.is_active.is_(True)).first()
    if user:
        raw_token = generate_secure_token()
        hashed = hash_token(raw_token)
        now = datetime.now(timezone.utc)
        reset_entry = PasswordResetToken(
            user_id=user.id,
            token_hash=hashed,
            expires_at=now + timedelta(hours=2)
        )
        db.add(reset_entry)
        db.commit()

        # In dev mode, log reset URL to console
        print(f"\n[DEV PASSWORD RESET] Email: {user.email} | Reset Token: {raw_token}")
        print(f"[DEV PASSWORD RESET] Reset URL: {settings.FRONTEND_ORIGIN}/reset-password?token={raw_token}\n")

    return {"message": "If this email address exists in the system, password reset instructions have been sent."}


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    hashed = hash_token(req.token)
    now = datetime.now(timezone.utc)
    reset_entry = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == hashed,
        PasswordResetToken.used_at.is_(None),
        PasswordResetToken.expires_at > now
    ).first()

    if not reset_entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token."
        )

    user = db.query(User).filter(User.id == reset_entry.user_id, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.password_hash = get_password_hash(req.new_password)
    reset_entry.used_at = now
    # Revoke existing sessions
    db.query(UserSession).filter(UserSession.user_id == user.id).update({"revoked_at": now})
    db.commit()

    record_audit_log(
        db=db,
        actor_user_id=user.id,
        action="PASSWORD_RESET_SUCCESS",
        entity_type="user",
        entity_id=str(user.id)
    )

    return {"message": "Password successfully reset. You may now log in with your new password."}


@router.patch("/users/me")
def update_profile(
    req: UserUpdateRequest,
    context: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db)
):
    user = context.user
    if req.full_name is not None:
        user.full_name = req.full_name.strip()
    if req.phone is not None:
        user.phone = req.phone.strip()
    db.commit()

    return {"message": "Profile updated", "full_name": user.full_name, "phone": user.phone}
