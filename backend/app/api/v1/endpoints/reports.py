import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.permissions import get_current_user_context, AuthContext, require_roles
from app.models.entities import (
    Student, IEPPlan, IEPGoal, ProgressEntry, TherapySession,
    AttendanceRecord, GuardianStudentLink, StaffStudentAssignment
)

router = APIRouter()


@router.get("/summary")
def get_reports_summary(
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    """Summary data for Reports screen – scoped to current user's permissions."""
    if ctx.active_role == "guardian":
        # Guardians see their own children's summary
        links = db.query(GuardianStudentLink).filter(
            GuardianStudentLink.guardian_user_id == ctx.user.id,
            GuardianStudentLink.school_id == ctx.active_school_id,
            GuardianStudentLink.is_active.is_(True)
        ).all()
        student_ids = [l.student_id for l in links]
    elif ctx.active_role in ("therapist", "psychologist"):
        assigned = db.query(StaffStudentAssignment).filter(
            StaffStudentAssignment.staff_user_id == ctx.user.id,
            StaffStudentAssignment.school_id == ctx.active_school_id,
            StaffStudentAssignment.is_active.is_(True)
        ).all()
        student_ids = [a.student_id for a in assigned]
    else:
        # Educators, heads, admins see all school students
        all_students = db.query(Student).filter(
            Student.school_id == ctx.active_school_id,
            Student.is_active.is_(True)
        ).all()
        student_ids = [s.id for s in all_students]

    if not student_ids:
        return {"total_students": 0, "active_plans": 0, "total_goals": 0, "students": []}

    total_students = len(student_ids)
    active_plans = db.query(IEPPlan).filter(
        IEPPlan.student_id.in_(student_ids),
        IEPPlan.school_id == ctx.active_school_id,
        IEPPlan.status.in_(["active", "approved"])
    ).count()

    total_goals = db.query(IEPGoal).filter(
        IEPGoal.student_id.in_(student_ids),
        IEPGoal.school_id == ctx.active_school_id
    ).count()

    achieved_goals = db.query(IEPGoal).filter(
        IEPGoal.student_id.in_(student_ids),
        IEPGoal.school_id == ctx.active_school_id,
        IEPGoal.status == "achieved"
    ).count()

    # Student summaries
    student_summaries = []
    for sid in student_ids:
        student = db.query(Student).filter(Student.id == sid, Student.is_active.is_(True)).first()
        if not student:
            continue
        plan = db.query(IEPPlan).filter(
            IEPPlan.student_id == sid,
            IEPPlan.status.in_(["active", "approved"])
        ).order_by(IEPPlan.created_at.desc()).first()

        goals_count = db.query(IEPGoal).filter(IEPGoal.student_id == sid).count()
        achieved_count = db.query(IEPGoal).filter(IEPGoal.student_id == sid, IEPGoal.status == "achieved").count()
        attainment_pct = round((achieved_count / goals_count * 100), 1) if goals_count > 0 else None

        student_summaries.append({
            "student_id": str(student.id),
            "full_name": student.full_name,
            "grade_class": student.grade_class,
            "disability_category": student.disability_category,
            "active_iep": plan is not None,
            "academic_year": plan.academic_year if plan else None,
            "total_goals": goals_count,
            "achieved_goals": achieved_count,
            "goal_attainment_pct": attainment_pct,
        })

    return {
        "total_students": total_students,
        "active_plans": active_plans,
        "total_goals": total_goals,
        "achieved_goals": achieved_goals,
        "students": student_summaries,
    }
