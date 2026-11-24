import uuid
import argparse
import json
from datetime import date, datetime, timezone
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.entities import (
    School, User, SchoolMembership, Student, GuardianStudentLink,
    StaffStudentAssignment, PresentLevelRecord, IEPPlan, IEPGoal,
    GoalObjective, ProgressEntry, TherapySession, Accommodation,
    ParentInteraction, AssessmentRecord, AttendanceRecord,
    IEPReview, IEPApproval,
)
# Great generator library for synthetic data
try:
    from great_generator import generate_students, generate_staff, generate_guardians
except ImportError:
    # Fallback simple generator using Faker for students
    from faker import Faker
    import random
    fake = Faker()
    def generate_students(n):
        students = []
        for i in range(n):
            admission = f"ADM-{2026+i:04d}"
            name = fake.name()
            dob = fake.date_of_birth(minimum_age=5, maximum_age=18)
            gender = random.choice(['Male', 'Female'])
            category = random.choice(['Autism Spectrum Disorder', 'Specific Learning Disability', 'ADHD', 'Locomotor Disability', 'Intellectual Disability'])
            enrollment_date = fake.date_between(start_date='-5y', end_date='today')
            grade = f"Grade {random.randint(1,12)}-{random.choice(['A','B','C'])}"
            students.append({
                "admission_number": admission,
                "full_name": name,
                "date_of_birth": dob,
                "gender": gender,
                "disability_category": category,
                "enrollment_date": enrollment_date,
                "grade_class": grade,
                "diagnosis": "",
                "strengths": "",
                "areas_of_need": "",
                "learning_style": "",
                "languages_known": "English",
                "assistive_devices": "",
            })
        return students
    def generate_staff(n):
        return []
    def generate_guardians(n):
        return []

def truncate_tables(db: Session):
    """Truncate all tables in proper order for SQLite.
    Uses DELETE FROM for each table and resets AUTOINCREMENT.
    Ignores missing tables (e.g., during early runs).
    """
    from sqlalchemy import text
    from sqlalchemy.exc import OperationalError
    tables = [
        "guardian_student_links",
        "staff_student_assignments",
        "attendance_records",
        "assessment_records",
        "parent_interactions",
        "accommodations",
        "therapy_sessions",
        "progress_entries",
        "goal_objectives",
        "iep_goals",
        "iep_plans",
        "present_level_records",
        "students",
        "users",
        "school_memberships",
        "schools",
    ]
    for tbl in tables:
        try:
            db.execute(text(f"DELETE FROM {tbl};"))
            if db.bind.dialect.name == "sqlite": db.execute(text(f"DELETE FROM sqlite_sequence WHERE name='{tbl}';"))
        except OperationalError:
            # Table may not exist yet; ignore
            continue
    db.commit()

def seed_database():
    parser = argparse.ArgumentParser(description="Seed the Siddhi database.")
    parser.add_argument("--reset", action="store_true", help="Truncate tables before seeding.")
    args, _ = parser.parse_known_args()

    db: Session = SessionLocal()
    try:
        if args.reset:
            truncate_tables(db)

        # 1. School
        school = School(
            id=uuid.uuid4(),
            name="St. Jude Inclusive Academy",
            code="SJA-001",
            address="12 Garden Valley Road, Knowledge Hub",
            is_active=True,
        )
        db.add(school)
        db.commit()

        # Helper functions
        def make_user(email: str, name: str, password: str, phone: str = "555-0100", faculty_id: str | None = None):
            u = User(
                id=uuid.uuid4(),
                faculty_id=faculty_id,
                email=email.lower().strip(),
                password_hash=get_password_hash(password),
                full_name=name,
                phone=phone,
                is_active=True,
            )
            db.add(u)
            db.commit()
            return u

        def add_membership(user_id: uuid.UUID, role: str):
            mem = SchoolMembership(
                id=uuid.uuid4(),
                school_id=school.id,
                user_id=user_id,
                role=role,
                is_active=True,
            )
            db.add(mem)
            db.commit()
            return mem

        # 2. Staff & Guardian accounts (including a demo student for quick test)
        accounts = []
        # Core admin accounts
        accounts.append(("admin@siddhi.test", "Sanjay Deshmukh (Admin)", "SiddhiAdmin2026!", "555-0101", "FAC-ADMIN-001", "school_admin"))
        accounts.append(("principal@siddhi.test", "Dr. Shalini Menon (School Head)", "SiddhiHead2026!", "555-0102", "FAC-HEAD-001", "school_head"))
        # Generate 15 special educators
        for i in range(1, 16):
            accounts.append((f"educator{i}@siddhi.test", f"Educator {i} (Special Educator)", "SiddhiEducator2026!", f"555-01{i:03d}", f"FAC-EDU-{i:03d}", "special_educator"))
        # Generate 15 therapists
        for i in range(1, 16):
            accounts.append((f"therapist{i}@siddhi.test", f"Therapist {i} (Lead Therapist)", "SiddhiTherapy2026!", f"555-02{i:03d}", f"FAC-THER-{i:03d}", "therapist"))
        # Generate 15 psychologists
        for i in range(1, 16):
            accounts.append((f"psychologist{i}@siddhi.test", f"Psychologist {i}", "SiddhiPsych2026!", f"555-03{i:03d}", f"FAC-PSY-{i:03d}", "psychologist"))
        # Generate 15 psychiatrists
        for i in range(1, 16):
            accounts.append((f"psychiatrist{i}@siddhi.test", f"Psychiatrist {i}", "SiddhiPsychiatrist2026!", f"555-04{i:03d}", f"FAC-PSYCH-{i:03d}", "psychiatrist"))
        # Demo guardians and demo student (kept for compatibility)
        accounts.append(("guardian.single@siddhi.test", "Sunita Patel", "SiddhiGuardian2026!", "555-0107", None, "guardian"))
        accounts.append(("guardian.multi@siddhi.test", "Meera Iyer", "SiddhiGuardian2026!", "555-0108", None, "guardian"))
        accounts.append(("aarav.student@siddhi.test", "Aarav Patel", "SiddhiStudent2026!", "555-0111", None, "student"))
        users = {}
        for email, name, pwd, phone, fac_id, role in accounts:
            user = make_user(email, name, pwd, phone, fac_id)
            add_membership(user.id, role)
            users[email] = user

        # 3. Generate 500 synthetic students using great-generator
        synthetic_students = generate_students(500)
        # Expect each dict to contain keys matching our Student model fields; adjust if needed.
        student_password = "StudentPass2026!"
        all_credentials = []
        for spec in synthetic_students:
            # Mapping – assume spec provides: admission_number, full_name, date_of_birth (date), gender,
            # disability_category, enrollment_date, grade_class, diagnosis, strengths, areas_of_need,
            # learning_style, languages_known, assistive_devices
            admission = spec.get("admission_number") or f"ADM-{uuid.uuid4().hex[:8].upper()}"
            name = spec.get("full_name", "Student")
            dob = spec.get("date_of_birth", date(2015, 1, 1))
            gender = spec.get("gender", "Other")
            category = spec.get("disability_category", "Other")
            enrolled = spec.get("enrollment_date", date.today())
            grade = spec.get("grade_class", "Grade 1-A")
            diagnosis = spec.get("diagnosis", "")
            strengths = spec.get("strengths", "")
            needs = spec.get("areas_of_need", "")
            learning_style = spec.get("learning_style", "")
            languages = spec.get("languages_known", "English")
            devices = spec.get("assistive_devices", "")

            # Create Student record
            student = Student(
                id=uuid.uuid4(),
                school_id=school.id,
                admission_number=admission,
                full_name=name,
                date_of_birth=dob,
                gender=gender,
                disability_category=category,
                enrollment_date=enrolled,
                grade_class=grade,
                diagnosis=diagnosis,
                strengths=strengths,
                areas_of_need=needs,
                learning_style=learning_style,
                languages_known=languages,
                assistive_devices=devices,
                is_active=True,
            )
            db.add(student)
            db.flush()
            # Create linked User for login
            email = f"{admission.lower()}@student.siddhi.test"
            user = make_user(email, name, student_password, phone="555-0123")
            # Bind login
            student.login_user_id = user.id
            db.add(student)  # update with login_user_id
            db.flush()
            # Add school membership for the student user
            add_membership(user.id, "student")
            # Record credential
            all_credentials.append({
                "role": "student",
                "admission_number": admission,
                "email": email,
                "password": student_password,
                "grade_class": grade,
            })

# 4. Guardian links (simple 1‑to‑many mapping for demo purposes)
        # Generate a pool of 200 guardian accounts (including the original two)
        guardian_emails = [f"guardian{i}@siddhi.test" for i in range(1, 201)]
        guardian_users = []
        for email in guardian_emails:
            name = f"Guardian {email.split('@')[0].replace('guardian', '').title()}"
            pwd = "SiddhiGuardian2026!"
            user = make_user(email, name, pwd, phone="555-0200")
            add_membership(user.id, "guardian")
            guardian_users.append(user)
        # Track children per guardian for credentials output
        guardian_children: dict[uuid.UUID, list[dict]] = {guardian.id: [] for guardian in guardian_users}
        # Staff users for assignments
        # Staff users for assignments (generated above)
        educator_users = [users[email] for email in sorted([e for e in users if e.startswith('educator')])]
        therapist_users = [users[email] for email in sorted([e for e in users if e.startswith('therapist')])]
        psychologist_users = [users[email] for email in sorted([e for e in users if e.startswith('psychologist')])]
        psychiatrist_users = [users[email] for email in sorted([e for e in users if e.startswith('psychiatrist')])]
        for i, (admission, student_id) in enumerate(db.query(Student.admission_number, Student.id).filter(Student.school_id == school.id).all()):
            guardian = guardian_users[i % len(guardian_users)]
            # Link guardian to student
            link = GuardianStudentLink(
                school_id=school.id,
                guardian_user_id=guardian.id,
                student_id=student_id,
                relationship_label="Parent",
                is_primary=True,
                is_active=True,
            )
            db.add(link)
            # Optionally assign a second guardian for ~20% of students
            if i % 5 == 0:  # roughly 20% of students get a second guardian
                # Choose a different guardian (next in list)
                second_guardian = guardian_users[(i + 1) % len(guardian_users)]
                second_link = GuardianStudentLink(
                    school_id=school.id,
                    guardian_user_id=second_guardian.id,
                    student_id=student_id,
                    relationship_label="Secondary",
                    is_primary=False,
                    is_active=True,
                )
                db.add(second_link)
                # Record child info for second guardian as well
                child = db.query(Student).filter(Student.id == student_id).one()
                guardian_children[second_guardian.id].append({
                    "admission_number": child.admission_number,
                    "full_name": child.full_name,
                })
            # Record child info for credentials
            child = db.query(Student).filter(Student.id == student_id).one()
            guardian_children[guardian.id].append({
                "admission_number": child.admission_number,
                "full_name": child.full_name,
            })
            # Assign staff to student

            # Assign staff to student with round‑robin selection
            educator = educator_users[i % len(educator_users)]

            therapist = therapist_users[i % len(therapist_users)]
            psychologist = psychologist_users[i % len(psychologist_users)]
            psychiatrist = psychiatrist_users[i % len(psychiatrist_users)]
            db.add(StaffStudentAssignment(
                school_id=school.id,
                staff_user_id=educator.id,
                student_id=student_id,
                assignment_type="special_educator",
                is_active=True,
            ))
            db.add(StaffStudentAssignment(
                school_id=school.id,
                staff_user_id=therapist.id,
                student_id=student_id,
                assignment_type="therapist",
                is_active=True,
            ))
            db.add(StaffStudentAssignment(
                school_id=school.id,
                staff_user_id=psychologist.id,
                student_id=student_id,
                assignment_type="psychologist",
                is_active=True,
            ))
            db.add(StaffStudentAssignment(
                school_id=school.id,
                staff_user_id=psychiatrist.id,
                student_id=student_id,
                assignment_type="psychiatrist",
                is_active=True,
            ))
            # PLOP records for each domain
            domains = ["academic", "communication", "social_skills", "behaviour", "motor_skills", "cognitive_skills", "adl", "emotional_development", "vocational_skills"]
            for domain in domains:
                db.add(PresentLevelRecord(
                    school_id=school.id,
                    student_id=student_id,
                    domain=domain,
                    current_performance="Baseline",
                    assessment_method="Observation",
                    assessed_by_user_id=educator.id,
                    assessed_at=date.today(),
                    guardian_visible=True,
                ))
            # IEP Plan and goals
            iep_plan = IEPPlan(
                school_id=school.id,
                student_id=student_id,
                academic_year="2026-2027",
                start_date=date.today(),
                end_date=date.today().replace(year=date.today().year + 1),
                status="active",
                version=1,
                created_by_user_id=educator.id,
            )
            db.add(iep_plan)
            db.flush()
            for g_idx in range(2):
                goal = IEPGoal(
                    school_id=school.id,
                    iep_plan_id=iep_plan.id,
                    student_id=student_id,
                    domain=domains[g_idx % len(domains)],
                    annual_goal=f"Goal {g_idx+1}",
                    teaching_strategies="Strategy A, Strategy B",
                    responsible_staff_user_id=educator.id,
                    timeline="2026-12-31",
                    evaluation_method="Observational",
                    status="not_started",
                    created_by_user_id=educator.id,
                )
                db.add(goal)
                db.flush()
                # One objective per goal
                db.add(GoalObjective(
                    school_id=school.id,
                    goal_id=goal.id,
                    objective_text=f"Objective for goal {g_idx+1}",
                    sequence_number=1,
                    target_date=date.today().replace(month=12, day=31),
                    success_criteria="Meets criteria",
                ))
                # Progress entries (baseline and term_1)
                for term, rating in [("baseline", 2), ("term_1", 3)]:
                    db.add(ProgressEntry(
                        school_id=school.id,
                        student_id=student_id,
                        goal_id=goal.id,
                        objective_id=None,
                        term=term,
                        rating=rating,
                        observation=f"Observed {term}",
                        assessed_by_user_id=educator.id,
                        observed_at=date.today(),
                    ))
            for ts_idx in range(2):
                db.add(TherapySession(
                    school_id=school.id,
                    student_id=student_id,
                    goal_id=None,
                    therapy_type="speech_therapy" if ts_idx % 2 == 0 else "occupational_therapy",
                    therapist_user_id=therapist.id,
                    session_date=date.today(),
                    duration_minutes=60,
                    progress_notes="Session notes",
                    outcome="Positive",
                    next_steps="Continue",
                    guardian_visible=True,
                ))
                # Add an assessment record visible to guardians
                db.add(AssessmentRecord(
                    school_id=school.id,
                    student_id=student_id,
                    assessment_type="initial",
                    domain="academic",
                    assessment_date=date.today(),
                    assessor_user_id=educator.id,
                    summary="Baseline academic assessment",
                    recommendations="Continue monitoring",
                    guardian_visible=True,
                    next_review_date=None,
                ))
            for ts_idx in range(2):
                db.add(TherapySession(
                    school_id=school.id,
                    student_id=student_id,
                    goal_id=None,
                    therapy_type="speech_therapy" if ts_idx % 2 == 0 else "occupational_therapy",
                    therapist_user_id=therapist.id,
                    session_date=date.today(),
                    duration_minutes=60,
                    progress_notes="Session notes",
                    outcome="Positive",
                    next_steps="Continue",
                    guardian_visible=True,
                ))
            # Accommodation
            db.add(Accommodation(
                school_id=school.id,
                student_id=student_id,
                area="examination",
                accommodation="Extended test time",
                modification=None,
                assistive_technology=None,
                responsible_staff_user_id=educator.id,
                effective_from=date.today(),
                effective_to=None,
                is_active=True,
            ))
            # Attendance for past 5 days
            for d_offset in range(5):
                att_date = date.today().fromordinal(date.today().toordinal() - d_offset)
                db.add(AttendanceRecord(
                    school_id=school.id,
                    student_id=student_id,
                    attendance_date=att_date,
                    status="present",
                    reason=None,
                    recorded_by_user_id=educator.id,
                ))
            # IEP Review and approvals
            review = IEPReview(
                school_id=school.id,
                student_id=student_id,
                iep_plan_id=iep_plan.id,
                review_type="quarterly",
                scheduled_date=date.today(),
                status="scheduled",
                created_by_user_id=educator.id,
            )
            db.add(review)
            db.flush()
            for required_role in ["special_educator", "school_head", "guardian"]:
                db.add(IEPApproval(
                    school_id=school.id,
                    iep_review_id=review.id,
                    approver_user_id=educator.id,
                    required_role=required_role,
                    status="pending",
                ))
        # End of student loop
        db.commit()
        # Write credentials to JSON file (added to .gitignore)
        cred_path = "seed_credentials.json"
        # Build guardian credentials list
        guardian_credentials = []
        for guardian in guardian_users:
            guardian_credentials.append({
                "role": "guardian",
                "email": guardian.email,
                "password": "SiddhiGuardian2026!",
                "linked_children": guardian_children.get(guardian.id, []),
            })
        # Combine with student credentials
        output = {
            "students": all_credentials,
            "guardians": guardian_credentials,
        }
        with open(cred_path, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, default=str)
        # Print concise info
        print("=== Seeded Student Credentials (first 10) ===")
        for cred in all_credentials[:10]:
            print(f"{cred['admission_number']}: {cred['email']} / {cred['password']} (Grade: {cred['grade_class']})")
        print(f"... {len(all_credentials)-10} more students seeded ...")
        print(f"Full credential list written to {cred_path}")
        print("Seeding complete: 500 synthetic students, staff, guardians, and full demo data.")
        # Write credentials to JSON file (added to .gitignore)
        cred_path = "seed_credentials.json"
        with open(cred_path, "w", encoding="utf-8") as f:
            json.dump(all_credentials, f, indent=2, default=str)
        # Print concise table to console
        print("=== Seeded Student Credentials ===")
        for cred in all_credentials[:10]:  # show first 10 for brevity
            print(f"{cred['admission_number']}: {cred['email']} / {cred['password']} (Grade: {cred['grade_class']})")
        print(f"... {len(all_credentials)-10} more students seeded ...")
        print(f"Full list written to {cred_path}")
        print("Seeding complete: 500 synthetic students, staff, guardians, and school.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
