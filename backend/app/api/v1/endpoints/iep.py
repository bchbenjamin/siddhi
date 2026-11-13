import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.permissions import get_current_user_context, AuthContext, verify_student_access
from app.core.audit import record_audit_log
from app.models.entities import IEPPlan, IEPGoal, GoalObjective, User
from app.schemas.iep import (
    IEPPlanCreate, IEPPlanUpdate, IEPPlanResponse,
    IEPGoalCreate, IEPGoalUpdate, IEPGoalResponse,
    GoalObjectiveCreate, GoalObjectiveUpdate, GoalObjectiveResponse
)

router = APIRouter()

IEP_PLAN_STATUSES = {"draft", "active", "in_review", "approved", "archived"}
GOAL_STATUSES = {"not_started", "in_progress", "achieved", "not_achieved", "on_hold"}


def _goal_to_response(goal: IEPGoal, db: Session) -> IEPGoalResponse:
    staff = db.query(User).filter(User.id == goal.responsible_staff_user_id).first() if goal.responsible_staff_user_id else None
    objectives = [
        GoalObjectiveResponse(
            id=obj.id,
            goal_id=obj.goal_id,
            objective_text=obj.objective_text,
            sequence_number=obj.sequence_number,
            target_date=obj.target_date,
            success_criteria=obj.success_criteria,
            created_at=obj.created_at,
        )
        for obj in sorted(goal.objectives, key=lambda o: o.sequence_number)
    ]
    return IEPGoalResponse(
        id=goal.id,
        school_id=goal.school_id,
        iep_plan_id=goal.iep_plan_id,
        student_id=goal.student_id,
        domain=goal.domain,
        annual_goal=goal.annual_goal,
        teaching_strategies=goal.teaching_strategies,
        responsible_staff_user_id=goal.responsible_staff_user_id,
        responsible_staff_name=staff.full_name if staff else None,
        timeline=goal.timeline,
        evaluation_method=goal.evaluation_method,
        status=goal.status,
        created_by_user_id=goal.created_by_user_id,
        created_at=goal.created_at,
        updated_at=goal.updated_at,
        objectives=objectives,
    )


# --- IEP Plans ---

@router.get("/students/{student_id}/iep-plans", response_model=List[IEPPlanResponse])
def list_iep_plans(
    student_id: uuid.UUID,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    verify_student_access(student_id, ctx, db)
    plans = db.query(IEPPlan).filter(
        IEPPlan.student_id == student_id,
        IEPPlan.school_id == ctx.active_school_id,
    ).order_by(IEPPlan.created_at.desc()).all()
    return plans


@router.post("/students/{student_id}/iep-plans", response_model=IEPPlanResponse, status_code=status.HTTP_201_CREATED)
def create_iep_plan(
    student_id: uuid.UUID,
    payload: IEPPlanCreate,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    if ctx.active_role not in ("special_educator", "school_head"):
        raise HTTPException(status_code=403, detail="Not authorized to create IEP plans")

    verify_student_access(student_id, ctx, db, for_write=True)

    if payload.status not in IEP_PLAN_STATUSES:
        raise HTTPException(status_code=422, detail=f"Invalid status. Must be one of: {IEP_PLAN_STATUSES}")

    plan = IEPPlan(
        school_id=ctx.active_school_id,
        student_id=student_id,
        academic_year=payload.academic_year,
        start_date=payload.start_date,
        end_date=payload.end_date,
        status=payload.status,
        version=1,
        created_by_user_id=ctx.user.id,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)

    record_audit_log(db=db, school_id=ctx.active_school_id, actor_user_id=ctx.user.id,
                     action="IEP_PLAN_CREATE", entity_type="iep_plan", entity_id=str(plan.id))
    return plan


@router.get("/iep-plans/{iep_plan_id}", response_model=IEPPlanResponse)
def get_iep_plan(
    iep_plan_id: uuid.UUID,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    plan = db.query(IEPPlan).filter(
        IEPPlan.id == iep_plan_id,
        IEPPlan.school_id == ctx.active_school_id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="IEP plan not found")
    verify_student_access(plan.student_id, ctx, db)
    return plan


@router.patch("/iep-plans/{iep_plan_id}", response_model=IEPPlanResponse)
def update_iep_plan(
    iep_plan_id: uuid.UUID,
    payload: IEPPlanUpdate,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    if ctx.active_role not in ("special_educator", "school_head"):
        raise HTTPException(status_code=403, detail="Not authorized to update IEP plans")

    plan = db.query(IEPPlan).filter(
        IEPPlan.id == iep_plan_id,
        IEPPlan.school_id == ctx.active_school_id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="IEP plan not found")

    verify_student_access(plan.student_id, ctx, db, for_write=True)

    update_data = payload.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] not in IEP_PLAN_STATUSES:
        raise HTTPException(status_code=422, detail="Invalid status value")

    for k, v in update_data.items():
        setattr(plan, k, v)
    db.commit()
    db.refresh(plan)

    record_audit_log(db=db, school_id=ctx.active_school_id, actor_user_id=ctx.user.id,
                     action="IEP_PLAN_UPDATE", entity_type="iep_plan", entity_id=str(iep_plan_id),
                     after_snapshot=update_data)
    return plan


# --- Goals ---

@router.get("/iep-plans/{iep_plan_id}/goals", response_model=List[IEPGoalResponse])
def list_goals(
    iep_plan_id: uuid.UUID,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    plan = db.query(IEPPlan).filter(
        IEPPlan.id == iep_plan_id,
        IEPPlan.school_id == ctx.active_school_id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="IEP plan not found")
    verify_student_access(plan.student_id, ctx, db)

    goals = db.query(IEPGoal).filter(
        IEPGoal.iep_plan_id == iep_plan_id,
        IEPGoal.school_id == ctx.active_school_id
    ).order_by(IEPGoal.created_at).all()
    return [_goal_to_response(g, db) for g in goals]


@router.post("/iep-plans/{iep_plan_id}/goals", response_model=IEPGoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(
    iep_plan_id: uuid.UUID,
    payload: IEPGoalCreate,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    if ctx.active_role not in ("special_educator",):
        raise HTTPException(status_code=403, detail="Only special educators can create IEP goals")

    plan = db.query(IEPPlan).filter(
        IEPPlan.id == iep_plan_id,
        IEPPlan.school_id == ctx.active_school_id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="IEP plan not found")

    verify_student_access(plan.student_id, ctx, db, for_write=True)

    if payload.status not in GOAL_STATUSES:
        raise HTTPException(status_code=422, detail=f"Invalid goal status. Must be one of: {GOAL_STATUSES}")

    goal = IEPGoal(
        school_id=ctx.active_school_id,
        iep_plan_id=iep_plan_id,
        student_id=plan.student_id,
        domain=payload.domain,
        annual_goal=payload.annual_goal,
        teaching_strategies=payload.teaching_strategies,
        responsible_staff_user_id=payload.responsible_staff_user_id,
        timeline=payload.timeline,
        evaluation_method=payload.evaluation_method,
        status=payload.status,
        created_by_user_id=ctx.user.id,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)

    record_audit_log(db=db, school_id=ctx.active_school_id, actor_user_id=ctx.user.id,
                     action="GOAL_CREATE", entity_type="iep_goal", entity_id=str(goal.id))
    return _goal_to_response(goal, db)


@router.patch("/goals/{goal_id}", response_model=IEPGoalResponse)
def update_goal(
    goal_id: uuid.UUID,
    payload: IEPGoalUpdate,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    if ctx.active_role not in ("special_educator",):
        raise HTTPException(status_code=403, detail="Only special educators can update IEP goals")

    goal = db.query(IEPGoal).filter(
        IEPGoal.id == goal_id,
        IEPGoal.school_id == ctx.active_school_id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    verify_student_access(goal.student_id, ctx, db, for_write=True)

    update_data = payload.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] not in GOAL_STATUSES:
        raise HTTPException(status_code=422, detail="Invalid goal status value")

    for k, v in update_data.items():
        setattr(goal, k, v)
    db.commit()
    db.refresh(goal)

    record_audit_log(db=db, school_id=ctx.active_school_id, actor_user_id=ctx.user.id,
                     action="GOAL_UPDATE", entity_type="iep_goal", entity_id=str(goal_id),
                     after_snapshot=update_data)
    return _goal_to_response(goal, db)


# --- Objectives ---

@router.post("/goals/{goal_id}/objectives", response_model=GoalObjectiveResponse, status_code=status.HTTP_201_CREATED)
def create_objective(
    goal_id: uuid.UUID,
    payload: GoalObjectiveCreate,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    if ctx.active_role not in ("special_educator",):
        raise HTTPException(status_code=403, detail="Not authorized to add objectives")

    goal = db.query(IEPGoal).filter(
        IEPGoal.id == goal_id,
        IEPGoal.school_id == ctx.active_school_id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    verify_student_access(goal.student_id, ctx, db, for_write=True)

    obj = GoalObjective(
        school_id=ctx.active_school_id,
        goal_id=goal_id,
        objective_text=payload.objective_text,
        sequence_number=payload.sequence_number,
        target_date=payload.target_date,
        success_criteria=payload.success_criteria,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return GoalObjectiveResponse(
        id=obj.id,
        goal_id=obj.goal_id,
        objective_text=obj.objective_text,
        sequence_number=obj.sequence_number,
        target_date=obj.target_date,
        success_criteria=obj.success_criteria,
        created_at=obj.created_at,
    )


@router.patch("/objectives/{objective_id}", response_model=GoalObjectiveResponse)
def update_objective(
    objective_id: uuid.UUID,
    payload: GoalObjectiveUpdate,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    if ctx.active_role not in ("special_educator",):
        raise HTTPException(status_code=403, detail="Not authorized to update objectives")

    obj = db.query(GoalObjective).filter(
        GoalObjective.id == objective_id,
        GoalObjective.school_id == ctx.active_school_id
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Objective not found")

    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return GoalObjectiveResponse(
        id=obj.id,
        goal_id=obj.goal_id,
        objective_text=obj.objective_text,
        sequence_number=obj.sequence_number,
        target_date=obj.target_date,
        success_criteria=obj.success_criteria,
        created_at=obj.created_at,
    )
