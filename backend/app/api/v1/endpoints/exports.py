import uuid
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.core.permissions import get_current_user_context, AuthContext
from app.core.audit import record_audit_log
from app.models.entities import Student, GuardianStudentLink, StaffStudentAssignment
from app.exports.excel_service import build_iep_workbook

router = APIRouter()


class ExportRequest(BaseModel):
    student_ids: Optional[List[uuid.UUID]] = None  # None = all permitted
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    terms: Optional[List[str]] = None  # e.g. ["baseline","term_1"]
    include_guardian_contact: bool = False
    include_diagnosis: bool = False


@router.post("/iep-workbook")
def export_iep_workbook(
    payload: ExportRequest,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    # Determine permitted student IDs for this role/user
    if ctx.active_role == "guardian":
        links = db.query(GuardianStudentLink).filter(
            GuardianStudentLink.guardian_user_id == ctx.user.id,
            GuardianStudentLink.school_id == ctx.active_school_id,
            GuardianStudentLink.is_active.is_(True)
        ).all()
        permitted_ids = {l.student_id for l in links}
        # Guardians cannot include diagnosis or guardian contact data
        include_diagnosis = False
        include_guardian_contact = False
    elif ctx.active_role in ("therapist", "psychologist", "psychiatrist"):
        assigned = db.query(StaffStudentAssignment).filter(
            StaffStudentAssignment.staff_user_id == ctx.user.id,
            StaffStudentAssignment.school_id == ctx.active_school_id,
            StaffStudentAssignment.is_active.is_(True)
        ).all()
        permitted_ids = {a.student_id for a in assigned}
        include_diagnosis = False
        include_guardian_contact = False
    else:
        all_students = db.query(Student).filter(
            Student.school_id == ctx.active_school_id,
            Student.is_active.is_(True)
        ).all()
        permitted_ids = {s.id for s in all_students}
        include_diagnosis = payload.include_diagnosis and ctx.active_role in ("school_head", "school_admin", "special_educator")
        include_guardian_contact = payload.include_guardian_contact and ctx.active_role in ("school_head", "school_admin")

    # Validate requested student_ids against permitted set
    if payload.student_ids:
        requested = set(payload.student_ids)
        forbidden = requested - permitted_ids
        if forbidden:
            raise HTTPException(
                status_code=403,
                detail=f"Export access denied for {len(forbidden)} requested student(s)"
            )
        final_ids = list(requested & permitted_ids)
    else:
        final_ids = list(permitted_ids)

    if not final_ids:
        raise HTTPException(status_code=404, detail="No permitted students found for export")

    # Build workbook
    workbook_bytes = build_iep_workbook(
        db=db,
        student_ids=final_ids,
        school_id=ctx.active_school_id,
        requesting_role=ctx.active_role,
        requesting_user_id=ctx.user.id,
        include_guardian_contact=include_guardian_contact,
        include_diagnosis=include_diagnosis,
        from_date=payload.from_date,
        to_date=payload.to_date,
        terms=payload.terms,
    )

    # Audit log - no sensitive field values
    record_audit_log(
        db=db,
        school_id=ctx.active_school_id,
        actor_user_id=ctx.user.id,
        action="EXPORT_IEP_WORKBOOK",
        entity_type="export",
        entity_id="iep_workbook",
        after_snapshot={
            "student_count": len(final_ids),
            "role": ctx.active_role,
            "from_date": str(payload.from_date) if payload.from_date else None,
            "to_date": str(payload.to_date) if payload.to_date else None,
        }
    )

    from datetime import datetime, timezone
    ts = datetime.now(timezone.utc).strftime("%Y%m%d")
    filename = f"Siddhi_IEP_{ts}.xlsx"

    return Response(
        content=workbook_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(workbook_bytes)),
        }
    )
