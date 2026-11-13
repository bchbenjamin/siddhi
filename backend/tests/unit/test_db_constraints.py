import uuid
from datetime import date
import pytest
from sqlalchemy.exc import IntegrityError
from app.core.database import SessionLocal
from app.models import (
    School, User, Student, ProgressEntry, IEPPlan, IEPGoal
)


def test_rating_constraint_enforced():
    """Verify that database check constraint rejects rating < 0 or > 4."""
    db = SessionLocal()
    try:
        # Create a school, user, student, plan, goal
        school = School(name="Test School", code=f"SCH-{uuid.uuid4().hex[:6]}")
        user = User(email=f"tester-{uuid.uuid4().hex[:6]}@example.com", password_hash="dummy", full_name="Tester")
        db.add_all([school, user])
        db.commit()

        student = Student(
            school_id=school.id,
            admission_number=f"ADM-{uuid.uuid4().hex[:6]}",
            full_name="Test Student",
            date_of_birth=date(2015, 1, 1),
            disability_category="Autism Spectrum Disorder",
            enrollment_date=date(2023, 6, 1),
            grade_class="Grade 3"
        )
        db.add(student)
        db.commit()

        plan = IEPPlan(
            school_id=school.id,
            student_id=student.id,
            academic_year="2026-2027",
            start_date=date(2026, 6, 1),
            end_date=date(2027, 4, 30),
            created_by_user_id=user.id
        )
        db.add(plan)
        db.commit()

        goal = IEPGoal(
            school_id=school.id,
            iep_plan_id=plan.id,
            student_id=student.id,
            domain="academic",
            annual_goal="Improve reading skills",
            teaching_strategies="Phonics instruction",
            timeline="10 months",
            evaluation_method="Oral reading tests",
            created_by_user_id=user.id
        )
        db.add(goal)
        db.commit()

        # Valid rating (4) should succeed
        valid_entry = ProgressEntry(
            school_id=school.id,
            student_id=student.id,
            goal_id=goal.id,
            term="term_1",
            rating=4,
            observation="Excellent performance",
            assessed_by_user_id=user.id,
            observed_at=date(2026, 9, 30)
        )
        db.add(valid_entry)
        db.commit()

        # Invalid rating (5) should raise IntegrityError
        invalid_entry_high = ProgressEntry(
            school_id=school.id,
            student_id=student.id,
            goal_id=goal.id,
            term="term_2",
            rating=5,
            observation="Invalid rating test",
            assessed_by_user_id=user.id,
            observed_at=date(2026, 12, 15)
        )
        db.add(invalid_entry_high)
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()

        # Invalid rating (-1) should raise IntegrityError
        invalid_entry_low = ProgressEntry(
            school_id=school.id,
            student_id=student.id,
            goal_id=goal.id,
            term="term_2",
            rating=-1,
            observation="Invalid negative rating",
            assessed_by_user_id=user.id,
            observed_at=date(2026, 12, 15)
        )
        db.add(invalid_entry_low)
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()

        # Clean up
        db.delete(valid_entry)
        db.delete(goal)
        db.delete(plan)
        db.delete(student)
        db.delete(user)
        db.delete(school)
        db.commit()

    finally:
        db.close()


def test_student_unique_admission_number():
    """Verify unique admission number per school constraint."""
    db = SessionLocal()
    try:
        school = School(name="Test School 2", code=f"SCH2-{uuid.uuid4().hex[:6]}")
        db.add(school)
        db.commit()

        adm_no = f"ADM-UNIQ-{uuid.uuid4().hex[:4]}"
        s1 = Student(
            school_id=school.id,
            admission_number=adm_no,
            full_name="Student One",
            date_of_birth=date(2016, 2, 2),
            disability_category="ADHD",
            enrollment_date=date(2023, 6, 1),
            grade_class="Grade 2"
        )
        db.add(s1)
        db.commit()

        # Duplicate admission number in same school must fail
        s2 = Student(
            school_id=school.id,
            admission_number=adm_no,
            full_name="Student Two",
            date_of_birth=date(2016, 5, 5),
            disability_category="ADHD",
            enrollment_date=date(2023, 6, 1),
            grade_class="Grade 2"
        )
        db.add(s2)
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()

        # Clean up
        db.delete(s1)
        db.delete(school)
        db.commit()
    finally:
        db.close()
