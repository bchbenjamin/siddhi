"""
Siddhi Excel Export Service
Generates the 8-sheet IEP workbook using openpyxl.
All data is fetched server-side with full permission scoping.
"""
import io
import uuid
from datetime import date, datetime, timezone
from typing import List, Optional, Dict, Any
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from sqlalchemy.orm import Session
from app.models.entities import (
    Student, IEPPlan, IEPGoal, ProgressEntry, TherapySession,
    AttendanceRecord, ParentInteraction, AssessmentRecord,
    GuardianStudentLink, User
)
from app.schemas.iep import RATING_LABELS


# --- Style constants (Siddhi design palette) ---
HDR_FILL = PatternFill("solid", fgColor="D3E5E9")  # pale sage
HDR_FONT = Font(bold=True, color="151515", size=11)
THIN_BORDER = Border(
    left=Side(style="thin", color="BBBBBB"),
    right=Side(style="thin", color="BBBBBB"),
    top=Side(style="thin", color="BBBBBB"),
    bottom=Side(style="thin", color="BBBBBB"),
)
TITLE_FONT = Font(bold=True, color="453B60", size=12)
NOTE_FONT = Font(italic=True, color="808080", size=9)


def _safe_text(value: Any) -> str:
    """Sanitize a value so it is never interpreted as a formula."""
    if value is None:
        return ""
    text = str(value)
    if text and text[0] in ("=", "+", "-", "@"):
        return "'" + text
    return text


def _fmt_date(d) -> str:
    if d is None:
        return ""
    if isinstance(d, (date, datetime)):
        return d.strftime("%Y-%m-%d")
    return str(d)


def _write_header_row(ws, headers: List[str], row: int = 1):
    for col, h in enumerate(headers, 1):
        cell = ws.cell(row=row, column=col, value=h)
        cell.font = HDR_FONT
        cell.fill = HDR_FILL
        cell.alignment = Alignment(wrap_text=True, vertical="center")
        cell.border = THIN_BORDER


def _style_data_row(ws, row: int, num_cols: int):
    for col in range(1, num_cols + 1):
        cell = ws.cell(row=row, column=col)
        cell.border = THIN_BORDER
        cell.alignment = Alignment(wrap_text=True, vertical="top")


def _auto_width(ws, min_width=10, max_width=50):
    for column_cells in ws.columns:
        length = min_width
        for cell in column_cells:
            if cell.value:
                length = max(length, min(len(str(cell.value)), max_width))
        ws.column_dimensions[get_column_letter(column_cells[0].column)].width = length + 2


def _add_title_block(ws, title: str, generated_at: datetime):
    ws.insert_rows(1, 2)
    ws["A1"] = f"Siddhi IEP — {title}"
    ws["A1"].font = TITLE_FONT
    ws["A2"] = f"Generated: {generated_at.strftime('%Y-%m-%d %H:%M UTC')} | Scale: 0=Not Achieved  1=Full Support  2=Moderate Support  3=Minimal Support  4=Independent"
    ws["A2"].font = NOTE_FONT


def build_iep_workbook(
    db: Session,
    student_ids: List[uuid.UUID],
    school_id: uuid.UUID,
    requesting_role: str,
    requesting_user_id: uuid.UUID,
    include_guardian_contact: bool = False,
    include_diagnosis: bool = False,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    terms: Optional[List[str]] = None,
) -> bytes:
    wb = Workbook()
    generated_at = datetime.now(timezone.utc)
    ws_default = wb.active
    wb.remove(ws_default)

    # Fetch all permitted students
    students_q = db.query(Student).filter(
        Student.id.in_(student_ids),
        Student.school_id == school_id,
        Student.is_active.is_(True)
    ).order_by(Student.full_name)
    students = students_q.all()

    # --- Sheet 1: Student Database ---
    ws1 = wb.create_sheet("Student Database")
    headers1 = [
        "Admission Number", "Student Name", "Date of Birth", "Gender",
        "Disability Category", "Enrollment Date", "Grade/Class", "School",
    ]
    if include_diagnosis:
        headers1.append("Diagnosis")
    headers1 += ["Strengths", "Areas of Need", "Learning Style", "Languages Known", "Assistive Devices"]
    if include_guardian_contact:
        headers1 += ["Guardian Name", "Guardian Phone", "Guardian Relationship"]

    _write_header_row(ws1, headers1, 1)
    ws1.freeze_panes = "A2"
    ws1.auto_filter.ref = f"A1:{get_column_letter(len(headers1))}1"

    for rix, student in enumerate(students, 2):
        vals = [
            _safe_text(student.admission_number),
            _safe_text(student.full_name),
            _fmt_date(student.date_of_birth),
            _safe_text(student.gender),
            _safe_text(student.disability_category),
            _fmt_date(student.enrollment_date),
            _safe_text(student.grade_class),
            "",  # school name placeholder
        ]
        if include_diagnosis:
            vals.append(_safe_text(student.diagnosis))
        vals += [
            _safe_text(student.strengths),
            _safe_text(student.areas_of_need),
            _safe_text(student.learning_style),
            _safe_text(student.languages_known),
            _safe_text(student.assistive_devices),
        ]
        if include_guardian_contact:
            links = db.query(GuardianStudentLink).filter(
                GuardianStudentLink.student_id == student.id,
                GuardianStudentLink.is_active.is_(True)
            ).all()
            guardian_names = []
            guardian_phones = []
            guardian_rels = []
            for link in links:
                g = db.query(User).filter(User.id == link.guardian_user_id).first()
                if g:
                    guardian_names.append(g.full_name)
                    guardian_phones.append(g.phone or "")
                    guardian_rels.append(link.relationship_label or "")
            vals += [
                "; ".join(guardian_names),
                "; ".join(guardian_phones),
                "; ".join(guardian_rels),
            ]
        for col, val in enumerate(vals, 1):
            ws1.cell(row=rix, column=col, value=val)
        _style_data_row(ws1, rix, len(headers1))

    _auto_width(ws1)
    _add_title_block(ws1, "Student Database", generated_at)

    # --- Sheet 2: IEP Goals ---
    ws2 = wb.create_sheet("IEP Goals")
    headers2 = [
        "Student", "Academic Year", "Domain", "Annual Goal",
        "Short-Term Objective", "Teaching Strategies", "Responsible Staff",
        "Timeline", "Evaluation Method", "Goal Status"
    ]
    _write_header_row(ws2, headers2, 1)
    ws2.freeze_panes = "A2"
    ws2.auto_filter.ref = f"A1:{get_column_letter(len(headers2))}1"

    r = 2
    for student in students:
        plans = db.query(IEPPlan).filter(
            IEPPlan.student_id == student.id,
            IEPPlan.school_id == school_id,
        ).all()
        for plan in plans:
            goals = db.query(IEPGoal).filter(IEPGoal.iep_plan_id == plan.id).all()
            for goal in goals:
                objectives = goal.objectives
                obj_texts = "; ".join(o.objective_text for o in sorted(objectives, key=lambda x: x.sequence_number))
                staff = db.query(User).filter(User.id == goal.responsible_staff_user_id).first() if goal.responsible_staff_user_id else None
                row_vals = [
                    _safe_text(student.full_name),
                    _safe_text(plan.academic_year),
                    _safe_text(goal.domain),
                    _safe_text(goal.annual_goal),
                    _safe_text(obj_texts),
                    _safe_text(goal.teaching_strategies),
                    _safe_text(staff.full_name if staff else ""),
                    _safe_text(goal.timeline),
                    _safe_text(goal.evaluation_method),
                    _safe_text(goal.status),
                ]
                for col, val in enumerate(row_vals, 1):
                    ws2.cell(row=r, column=col, value=val)
                _style_data_row(ws2, r, len(headers2))
                r += 1

    if r == 2:
        ws2.cell(row=2, column=1, value="No permitted records in this export")

    _auto_width(ws2)
    _add_title_block(ws2, "IEP Goals", generated_at)

    # --- Sheet 3: Progress Monitoring Dashboard ---
    ws3 = wb.create_sheet("Progress Monitoring Dashboard")
    headers3 = [
        "Student", "Goal Domain", "Annual Goal",
        "Baseline Rating", "Term 1 Rating", "Term 2 Rating", "Term 3 Rating", "Final Rating",
        "Final Status", "Latest Observation Date"
    ]
    _write_header_row(ws3, headers3, 1)
    ws3.freeze_panes = "A2"
    ws3.auto_filter.ref = f"A1:{get_column_letter(len(headers3))}1"

    r = 2
    for student in students:
        goals = db.query(IEPGoal).filter(
            IEPGoal.student_id == student.id,
            IEPGoal.school_id == school_id,
        ).all()
        for goal in goals:
            entries_q = db.query(ProgressEntry).filter(
                ProgressEntry.goal_id == goal.id,
                ProgressEntry.school_id == school_id,
            )
            if from_date:
                entries_q = entries_q.filter(ProgressEntry.observed_at >= from_date)
            if to_date:
                entries_q = entries_q.filter(ProgressEntry.observed_at <= to_date)
            if terms:
                entries_q = entries_q.filter(ProgressEntry.term.in_(terms))

            entries = entries_q.order_by(ProgressEntry.observed_at.asc()).all()

            term_ratings: Dict[str, int] = {}
            for e in entries:
                term_ratings[e.term] = e.rating

            latest_entry = max(entries, key=lambda e: e.observed_at) if entries else None

            def rating_label(val):
                if val is None:
                    return ""
                return f"{val} – {RATING_LABELS.get(val, '')}"

            row_vals = [
                _safe_text(student.full_name),
                _safe_text(goal.domain),
                _safe_text(goal.annual_goal),
                rating_label(term_ratings.get("baseline")),
                rating_label(term_ratings.get("term_1")),
                rating_label(term_ratings.get("term_2")),
                rating_label(term_ratings.get("term_3")),
                rating_label(term_ratings.get("final")),
                _safe_text(goal.status),
                _fmt_date(latest_entry.observed_at if latest_entry else None),
            ]
            for col, val in enumerate(row_vals, 1):
                ws3.cell(row=r, column=col, value=val)
            _style_data_row(ws3, r, len(headers3))
            r += 1

    # Scale legend below data
    r += 1
    ws3.cell(row=r, column=1, value="PERFORMANCE SCALE LEGEND").font = Font(bold=True)
    r += 1
    for rating_val, label in RATING_LABELS.items():
        ws3.cell(row=r, column=1, value=f"{rating_val} – {label}")
        r += 1

    if r == 2:
        ws3.cell(row=2, column=1, value="No permitted records in this export")

    _auto_width(ws3)
    _add_title_block(ws3, "Progress Monitoring Dashboard", generated_at)

    # --- Sheet 4: Therapy Tracker ---
    ws4 = wb.create_sheet("Therapy Tracker")
    headers4 = [
        "Date", "Student", "Therapy Type", "Goal Addressed",
        "Therapist Name", "Duration (minutes)", "Progress Notes", "Guardian Visible"
    ]
    _write_header_row(ws4, headers4, 1)
    ws4.freeze_panes = "A2"
    ws4.auto_filter.ref = f"A1:{get_column_letter(len(headers4))}1"

    r = 2
    for student in students:
        sessions_q = db.query(TherapySession).filter(
            TherapySession.student_id == student.id,
            TherapySession.school_id == school_id,
        )
        if requesting_role == "guardian":
            sessions_q = sessions_q.filter(TherapySession.guardian_visible.is_(True))
        if from_date:
            sessions_q = sessions_q.filter(TherapySession.session_date >= from_date)
        if to_date:
            sessions_q = sessions_q.filter(TherapySession.session_date <= to_date)
        sessions = sessions_q.order_by(TherapySession.session_date).all()

        for s in sessions:
            therapist = db.query(User).filter(User.id == s.therapist_user_id).first()
            goal = db.query(IEPGoal).filter(IEPGoal.id == s.goal_id).first() if s.goal_id else None
            row_vals = [
                _fmt_date(s.session_date),
                _safe_text(student.full_name),
                _safe_text(s.therapy_type.replace("_", " ").title()),
                _safe_text(goal.annual_goal[:80] if goal else ""),
                _safe_text(therapist.full_name if therapist else ""),
                s.duration_minutes,
                _safe_text(s.progress_notes),
                "Yes" if s.guardian_visible else "No",
            ]
            for col, val in enumerate(row_vals, 1):
                ws4.cell(row=r, column=col, value=val)
            _style_data_row(ws4, r, len(headers4))
            r += 1

    if r == 2:
        ws4.cell(row=2, column=1, value="No permitted records in this export")

    _auto_width(ws4)
    _add_title_block(ws4, "Therapy Tracker", generated_at)

    # --- Sheet 5: Attendance Record ---
    ws5 = wb.create_sheet("Attendance Record")
    headers5 = ["Date", "Student", "Status", "Reason", "Recorded By"]
    _write_header_row(ws5, headers5, 1)
    ws5.freeze_panes = "A2"
    ws5.auto_filter.ref = f"A1:{get_column_letter(len(headers5))}1"

    r = 2
    for student in students:
        att_q = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id == student.id,
            AttendanceRecord.school_id == school_id,
        )
        if from_date:
            att_q = att_q.filter(AttendanceRecord.attendance_date >= from_date)
        if to_date:
            att_q = att_q.filter(AttendanceRecord.attendance_date <= to_date)
        records = att_q.order_by(AttendanceRecord.attendance_date).all()

        for a in records:
            recorder = db.query(User).filter(User.id == a.recorded_by_user_id).first()
            row_vals = [
                _fmt_date(a.attendance_date),
                _safe_text(student.full_name),
                _safe_text(a.status.capitalize()),
                _safe_text(a.reason),
                _safe_text(recorder.full_name if recorder else ""),
            ]
            for col, val in enumerate(row_vals, 1):
                ws5.cell(row=r, column=col, value=val)
            _style_data_row(ws5, r, len(headers5))
            r += 1

    if r == 2:
        ws5.cell(row=2, column=1, value="No permitted records in this export")

    _auto_width(ws5)
    _add_title_block(ws5, "Attendance Record", generated_at)

    # --- Sheet 6: Parent Communication Log ---
    ws6 = wb.create_sheet("Parent Communication Log")
    headers6 = [
        "Date", "Student", "Guardian", "Mode of Communication",
        "Discussion Points", "Action Taken", "Acknowledgement Status", "Recorded By"
    ]
    _write_header_row(ws6, headers6, 1)
    ws6.freeze_panes = "A2"
    ws6.auto_filter.ref = f"A1:{get_column_letter(len(headers6))}1"

    r = 2
    for student in students:
        comm_q = db.query(ParentInteraction).filter(
            ParentInteraction.student_id == student.id,
            ParentInteraction.school_id == school_id,
        )
        if requesting_role == "guardian":
            comm_q = comm_q.filter(ParentInteraction.guardian_user_id == requesting_user_id)
        if from_date:
            comm_q = comm_q.filter(ParentInteraction.interaction_date >= from_date)
        if to_date:
            comm_q = comm_q.filter(ParentInteraction.interaction_date <= to_date)
        interactions = comm_q.order_by(ParentInteraction.interaction_date).all()

        for i in interactions:
            guardian = db.query(User).filter(User.id == i.guardian_user_id).first() if i.guardian_user_id else None
            recorder = db.query(User).filter(User.id == i.recorded_by_user_id).first()
            row_vals = [
                _fmt_date(i.interaction_date),
                _safe_text(student.full_name),
                _safe_text(guardian.full_name if guardian else ""),
                _safe_text(i.mode.capitalize()),
                _safe_text(i.discussion_points),
                _safe_text(i.action_taken),
                _safe_text(i.acknowledgement_status.capitalize()),
                _safe_text(recorder.full_name if recorder else ""),
            ]
            for col, val in enumerate(row_vals, 1):
                ws6.cell(row=r, column=col, value=val)
            _style_data_row(ws6, r, len(headers6))
            r += 1

    if r == 2:
        ws6.cell(row=2, column=1, value="No permitted records in this export")

    _auto_width(ws6)
    _add_title_block(ws6, "Parent Communication Log", generated_at)

    # --- Sheet 7: Assessment Reports ---
    ws7 = wb.create_sheet("Assessment Reports")
    headers7 = [
        "Date", "Student", "Assessment Type", "Domain", "Assessor",
        "Summary", "Recommendations", "Next Review Date", "Guardian Visible"
    ]
    _write_header_row(ws7, headers7, 1)
    ws7.freeze_panes = "A2"
    ws7.auto_filter.ref = f"A1:{get_column_letter(len(headers7))}1"

    r = 2
    for student in students:
        from app.models.entities import AssessmentRecord
        ass_q = db.query(AssessmentRecord).filter(
            AssessmentRecord.student_id == student.id,
            AssessmentRecord.school_id == school_id,
        )
        if requesting_role == "guardian":
            ass_q = ass_q.filter(AssessmentRecord.guardian_visible.is_(True))
        if from_date:
            ass_q = ass_q.filter(AssessmentRecord.assessment_date >= from_date)
        if to_date:
            ass_q = ass_q.filter(AssessmentRecord.assessment_date <= to_date)
        assessments = ass_q.order_by(AssessmentRecord.assessment_date).all()

        for a in assessments:
            assessor = db.query(User).filter(User.id == a.assessor_user_id).first() if a.assessor_user_id else None
            assessor_name = assessor.full_name if assessor else (a.external_assessor_name or "")
            row_vals = [
                _fmt_date(a.assessment_date),
                _safe_text(student.full_name),
                _safe_text(a.assessment_type.capitalize()),
                _safe_text(a.domain or ""),
                _safe_text(assessor_name),
                _safe_text(a.summary),
                _safe_text(a.recommendations or ""),
                _fmt_date(a.next_review_date),
                "Yes" if a.guardian_visible else "No",
            ]
            for col, val in enumerate(row_vals, 1):
                ws7.cell(row=r, column=col, value=val)
            _style_data_row(ws7, r, len(headers7))
            r += 1

    if r == 2:
        ws7.cell(row=2, column=1, value="No permitted records in this export")

    _auto_width(ws7)
    _add_title_block(ws7, "Assessment Reports", generated_at)

    # --- Sheet 8: Automated Report Cards ---
    ws8 = wb.create_sheet("Automated Report Cards")
    headers8 = [
        "Student", "Academic Year", "Total Goals", "Achieved Goals",
        "In-Progress Goals", "Not-Achieved Goals", "Goal Attainment %",
        "Mean Rating (0-4)", "Latest Review Date", "Report Generated At"
    ]
    _write_header_row(ws8, headers8, 1)
    ws8.freeze_panes = "A2"
    ws8.auto_filter.ref = f"A1:{get_column_letter(len(headers8))}1"

    r = 2
    for student in students:
        plans = db.query(IEPPlan).filter(
            IEPPlan.student_id == student.id,
            IEPPlan.school_id == school_id,
        ).all()

        for plan in plans:
            goals = db.query(IEPGoal).filter(IEPGoal.iep_plan_id == plan.id).all()
            total_goals = len(goals)
            achieved = sum(1 for g in goals if g.status == "achieved")
            in_progress = sum(1 for g in goals if g.status == "in_progress")
            not_achieved = sum(1 for g in goals if g.status == "not_achieved")
            attainment_pct = round((achieved / total_goals * 100), 1) if total_goals > 0 else "N/A"

            # Mean latest rating: for each goal, get the latest progress entry rating
            latest_ratings = []
            for goal in goals:
                entries_q = db.query(ProgressEntry).filter(
                    ProgressEntry.goal_id == goal.id,
                    ProgressEntry.school_id == school_id,
                )
                if from_date:
                    entries_q = entries_q.filter(ProgressEntry.observed_at >= from_date)
                if to_date:
                    entries_q = entries_q.filter(ProgressEntry.observed_at <= to_date)
                if terms:
                    entries_q = entries_q.filter(ProgressEntry.term.in_(terms))
                latest_entry = entries_q.order_by(ProgressEntry.observed_at.desc()).first()
                if latest_entry:
                    latest_ratings.append(latest_entry.rating)
            mean_rating = round(sum(latest_ratings) / len(latest_ratings), 2) if latest_ratings else "N/A"

            # Latest review date
            from app.models.entities import IEPReview
            latest_review = db.query(IEPReview).filter(
                IEPReview.iep_plan_id == plan.id
            ).order_by(IEPReview.conducted_at.desc()).first()
            latest_review_date = latest_review.conducted_at if latest_review else None

            row_vals = [
                _safe_text(student.full_name),
                _safe_text(plan.academic_year),
                total_goals,
                achieved,
                in_progress,
                not_achieved,
                attainment_pct,
                mean_rating,
                _fmt_date(latest_review_date),
                generated_at.strftime("%Y-%m-%d %H:%M UTC"),
            ]
            for col, val in enumerate(row_vals, 1):
                ws8.cell(row=r, column=col, value=val)
            _style_data_row(ws8, r, len(headers8))
            r += 1

    if r == 2:
        ws8.cell(row=2, column=1, value="No permitted records in this export")

    _auto_width(ws8)
    _add_title_block(ws8, "Automated Report Cards", generated_at)

    # Serialize to bytes
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.getvalue()
