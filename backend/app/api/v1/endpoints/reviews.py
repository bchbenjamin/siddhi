import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.permissions import get_current_user_context, AuthContext, verify_student_access
from app.core.audit import record_audit_log
from app.models.entities import IEPReview, IEPApproval, IEPPlan, User
from app.schemas.iep import (
    IEPReviewCreate, IEPReviewUpdate, IEPReviewResponse,
    IEPApprovalCreate, ApprovalDecision, IEPApprovalResponse
)

router = APIRouter()

REVIEW_TYPES = {"quarterly", "half_yearly", "annual"}
REVIEW_STATUSES = {"scheduled", "in_progress", "approved", "revision_required"}


def _approval_to_response(a: IEPApproval, db: Session) -> IEPApprovalResponse:
    approver = db.query(User).filter(User.id == a.approver_user_id).first()
    return IEPApprovalResponse(
        id=a.id,
        iep_review_id=a.iep_review_id,
        approver_user_id=a.approver_user_id,
        approver_name=approver.full_name if approver else None,
        required_role=a.required_role,
        status=a.status,
        comment=a.comment,
        decision_at=a.decision_at,
        created_at=a.created_at,
    )


def _review_to_response(r: IEPReview, db: Session) -> IEPReviewResponse:
    approvals = [_approval_to_response(a, db) for a in r.approvals]
    return IEPReviewResponse(
        id=r.id,
        school_id=r.school_id,
        student_id=r.student_id,
        iep_plan_id=r.iep_plan_id,
        review_type=r.review_type,
        scheduled_date=r.scheduled_date,
        conducted_at=r.conducted_at,
        review_notes=r.review_notes,
        status=r.status,
        created_by_user_id=r.created_by_user_id,
        created_at=r.created_at,
        approvals=approvals,
    )


@router.get("/students/{student_id}/iep-reviews", response_model=List[IEPReviewResponse])
def list_reviews(
    student_id: uuid.UUID,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    verify_student_access(student_id, ctx, db)

    reviews = db.query(IEPReview).filter(
        IEPReview.student_id == student_id,
        IEPReview.school_id == ctx.active_school_id,
    ).order_by(IEPReview.scheduled_date.desc()).all()
    return [_review_to_response(r, db) for r in reviews]


@router.post("/students/{student_id}/iep-reviews", response_model=IEPReviewResponse, status_code=status.HTTP_201_CREATED)
def create_review(
    student_id: uuid.UUID,
    payload: IEPReviewCreate,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    if ctx.active_role not in ("special_educator", "school_head"):
        raise HTTPException(status_code=403, detail="Not authorized to create IEP reviews")

    if payload.review_type not in REVIEW_TYPES:
        raise HTTPException(status_code=422, detail=f"Invalid review type. Must be one of: {REVIEW_TYPES}")

    verify_student_access(student_id, ctx, db, for_write=True)

    # Verify the IEP plan belongs to this student and school
    plan = db.query(IEPPlan).filter(
        IEPPlan.id == payload.iep_plan_id,
        IEPPlan.student_id == student_id,
        IEPPlan.school_id == ctx.active_school_id,
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="IEP plan not found for this student")

    review = IEPReview(
        school_id=ctx.active_school_id,
        student_id=student_id,
        iep_plan_id=payload.iep_plan_id,
        review_type=payload.review_type,
        scheduled_date=payload.scheduled_date,
        review_notes=payload.review_notes,
        status="scheduled",
        created_by_user_id=ctx.user.id,
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    # Auto-create pending approvals for required roles
    required_roles = ["special_educator", "school_head", "guardian"]
    if plan.status in ("active", "in_review"):
        # For quarterly - educator, head, guardian; for annual add therapist and psychologist
        if payload.review_type == "annual":
            required_roles = ["special_educator", "school_head", "therapist", "psychologist", "guardian"]

    for role in required_roles:
        approval = IEPApproval(
            school_id=ctx.active_school_id,
            iep_review_id=review.id,
            approver_user_id=ctx.user.id,  # placeholder; will be updated when person approves
            required_role=role,
            status="pending",
        )
        db.add(approval)
    db.commit()
    db.refresh(review)

    record_audit_log(db=db, school_id=ctx.active_school_id, actor_user_id=ctx.user.id,
                     action="REVIEW_CREATE", entity_type="iep_review", entity_id=str(review.id))
    return _review_to_response(review, db)


@router.patch("/iep-reviews/{review_id}", response_model=IEPReviewResponse)
def update_review(
    review_id: uuid.UUID,
    payload: IEPReviewUpdate,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    if ctx.active_role not in ("special_educator", "school_head"):
        raise HTTPException(status_code=403, detail="Not authorized to update reviews")

    review = db.query(IEPReview).filter(
        IEPReview.id == review_id,
        IEPReview.school_id == ctx.active_school_id,
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    verify_student_access(review.student_id, ctx, db, for_write=True)

    update_data = payload.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] not in REVIEW_STATUSES:
        raise HTTPException(status_code=422, detail="Invalid review status")

    for k, v in update_data.items():
        setattr(review, k, v)
    db.commit()
    db.refresh(review)
    return _review_to_response(review, db)


@router.post("/iep-reviews/{review_id}/approvals", response_model=IEPApprovalResponse, status_code=status.HTTP_201_CREATED)
def add_approval_slot(
    review_id: uuid.UUID,
    payload: IEPApprovalCreate,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    """School head/admin can add or reassign approval slots."""
    if ctx.active_role not in ("school_head", "school_admin", "special_educator"):
        raise HTTPException(status_code=403, detail="Not authorized to manage approval slots")

    review = db.query(IEPReview).filter(
        IEPReview.id == review_id,
        IEPReview.school_id == ctx.active_school_id,
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    verify_student_access(review.student_id, ctx, db)

    approval = IEPApproval(
        school_id=ctx.active_school_id,
        iep_review_id=review_id,
        approver_user_id=payload.approver_user_id,
        required_role=payload.required_role,
        status="pending",
    )
    db.add(approval)
    db.commit()
    db.refresh(approval)
    return _approval_to_response(approval, db)


@router.post("/approvals/{approval_id}/decision", response_model=IEPApprovalResponse)
def submit_approval_decision(
    approval_id: uuid.UUID,
    payload: ApprovalDecision,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    """Each approver can only submit their own approval decision."""
    approval = db.query(IEPApproval).filter(
        IEPApproval.id == approval_id,
        IEPApproval.school_id == ctx.active_school_id,
    ).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval record not found")

    # Verify this is the right person for this approval
    # Guardians can only approve their own guardian slot, and must be linked to the student
    if ctx.active_role == "guardian":
        if approval.required_role != "guardian":
            raise HTTPException(status_code=403, detail="Guardians can only submit guardian approvals")
        # Must be assigned guardian
        if approval.approver_user_id != ctx.user.id:
            # Check if guardian is linked to this review's student
            review = db.query(IEPReview).filter(IEPReview.id == approval.iep_review_id).first()
            from app.models.entities import GuardianStudentLink
            link = db.query(GuardianStudentLink).filter(
                GuardianStudentLink.guardian_user_id == ctx.user.id,
                GuardianStudentLink.student_id == review.student_id,
                GuardianStudentLink.school_id == ctx.active_school_id,
                GuardianStudentLink.is_active.is_(True)
            ).first()
            if not link:
                raise HTTPException(status_code=403, detail="Not linked to this student")
    else:
        # Staff can only approve their own required-role slot
        if approval.required_role != ctx.active_role:
            raise HTTPException(status_code=403, detail=f"This approval requires role '{approval.required_role}'")

    if payload.status not in ("approved", "rejected"):
        raise HTTPException(status_code=422, detail="Decision must be 'approved' or 'rejected'")

    if approval.status != "pending":
        raise HTTPException(status_code=409, detail="This approval has already been decided")

    approval.approver_user_id = ctx.user.id
    approval.status = payload.status
    approval.comment = payload.comment
    approval.decision_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(approval)

    record_audit_log(db=db, school_id=ctx.active_school_id, actor_user_id=ctx.user.id,
                     action="APPROVAL_DECISION", entity_type="iep_approval", entity_id=str(approval_id),
                     after_snapshot={"status": payload.status, "role": ctx.active_role})

    return _approval_to_response(approval, db)
