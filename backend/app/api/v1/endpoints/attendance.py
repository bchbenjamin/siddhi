import uuid
from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.permissions import get_current_user_context, AuthContext, verify_student_access
from app.models.entities import AttendanceRecord, User
from app.schemas.iep import AttendanceCreate, AttendanceUpdate, AttendanceResponse, AttendanceSummary

router = APIRouter()

ATTENDANCE_STATUSES = {"present", "absent", "leave", "other"}


def _att_to_response(a: AttendanceRecord, db: Session) -> AttendanceResponse:
    recorder = db.query(User).filter(User.id == a.recorded_by_user_id).first()
    return AttendanceResponse(
        id=a.id,
        student_id=a.student_id,
        attendance_date=a.attendance_date,
        status=a.status,
        reason=a.reason,
        recorded_by_user_id=a.recorded_by_user_id,
        recorded_by_name=recorder.full_name if recorder else None,
        created_at=a.created_at,
    )


@router.get("/students/{student_id}/attendance", response_model=List[AttendanceResponse])
def list_attendance(
    student_id: uuid.UUID,
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    verify_student_access(student_id, ctx, db)

    q = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_id == student_id,
        AttendanceRecord.school_id == ctx.active_school_id,
    )

    if from_date:
        q = q.filter(AttendanceRecord.attendance_date >= from_date)
    if to_date:
        q = q.filter(AttendanceRecord.attendance_date <= to_date)

    records = q.order_by(AttendanceRecord.attendance_date.desc()).all()
    return [_att_to_response(a, db) for a in records]


@router.get("/students/{student_id}/attendance/summary", response_model=AttendanceSummary)
def get_attendance_summary(
    student_id: uuid.UUID,
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    verify_student_access(student_id, ctx, db)

    q = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_id == student_id,
        AttendanceRecord.school_id == ctx.active_school_id,
    )
    if from_date:
        q = q.filter(AttendanceRecord.attendance_date >= from_date)
    if to_date:
        q = q.filter(AttendanceRecord.attendance_date <= to_date)

    records = q.all()
    total = len(records)
    present = sum(1 for r in records if r.status == "present")
    absent = sum(1 for r in records if r.status == "absent")
    leave = sum(1 for r in records if r.status == "leave")
    other = sum(1 for r in records if r.status == "other")
    pct = round((present / total * 100), 1) if total > 0 else 0.0

    return AttendanceSummary(
        student_id=student_id,
        total_days=total,
        present=present,
        absent=absent,
        leave=leave,
        other=other,
        attendance_pct=pct,
    )


@router.post("/students/{student_id}/attendance", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
def create_attendance(
    student_id: uuid.UUID,
    payload: AttendanceCreate,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    if ctx.active_role not in ("special_educator", "school_head", "school_admin"):
        raise HTTPException(status_code=403, detail="Not authorized to record attendance")

    if payload.status not in ATTENDANCE_STATUSES:
        raise HTTPException(status_code=422, detail=f"Invalid status. Must be one of: {ATTENDANCE_STATUSES}")

    verify_student_access(student_id, ctx, db, for_write=True)

    # Check uniqueness
    existing = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_id == student_id,
        AttendanceRecord.attendance_date == payload.attendance_date,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Attendance already recorded for {payload.attendance_date}")

    record = AttendanceRecord(
        school_id=ctx.active_school_id,
        student_id=student_id,
        attendance_date=payload.attendance_date,
        status=payload.status,
        reason=payload.reason,
        recorded_by_user_id=ctx.user.id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _att_to_response(record, db)


@router.patch("/attendance/{attendance_id}", response_model=AttendanceResponse)
def update_attendance(
    attendance_id: uuid.UUID,
    payload: AttendanceUpdate,
    ctx: AuthContext = Depends(get_current_user_context),
    db: Session = Depends(get_db),
):
    if ctx.active_role not in ("special_educator", "school_head", "school_admin"):
        raise HTTPException(status_code=403, detail="Not authorized to update attendance")

    record = db.query(AttendanceRecord).filter(
        AttendanceRecord.id == attendance_id,
        AttendanceRecord.school_id == ctx.active_school_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(record, k, v)
    db.commit()
    db.refresh(record)
    return _att_to_response(record, db)
