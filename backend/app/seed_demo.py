import uuid
from datetime import date, datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.entities import (
    School, User, SchoolMembership, Student, GuardianStudentLink,
    StaffStudentAssignment, PresentLevelRecord, IEPPlan, IEPGoal,
    GoalObjective, ProgressEntry, TherapySession, Accommodation,
    ParentInteraction, AssessmentRecord, AttendanceRecord,
    IEPReview, IEPApproval
)


def seed_database():
    db: Session = SessionLocal()
    try:
        # Check if already seeded
        school = db.query(School).filter(School.code == "SJA-001").first()
        if school:
            faculty_ids = {
                "admin@siddhi.test": "FAC-ADMIN-001",
                "principal@siddhi.test": "FAC-HEAD-001",
                "educator1@siddhi.test": "FAC-EDU-001",
                "educator2@siddhi.test": "FAC-EDU-002",
                "therapist@siddhi.test": "FAC-THER-001",
                "psychologist@siddhi.test": "FAC-PSY-001",
                "psychiatrist@siddhi.test": "FAC-PSYCH-001",
            }
            updated = 0
            for email, faculty_id in faculty_ids.items():
                user = db.query(User).filter(User.email == email).first()
                if user and user.faculty_id != faculty_id:
                    user.faculty_id = faculty_id
                    updated += 1
            if updated:
                db.commit()
            psychiatrist = db.query(User).filter(User.email == "psychiatrist@siddhi.test").first()
            if not psychiatrist:
                psychiatrist = User(
                    id=uuid.uuid4(), faculty_id="FAC-PSYCH-001", email="psychiatrist@siddhi.test",
                    password_hash=get_password_hash("SiddhiPsychiatrist2026!"),
                    full_name="Dr. Kavita Rao (Psychiatrist)", phone="555-0109", is_active=True
                )
                db.add(psychiatrist)
                db.commit()
            membership = db.query(SchoolMembership).filter(
                SchoolMembership.school_id == school.id, SchoolMembership.user_id == psychiatrist.id,
                SchoolMembership.role == "psychiatrist"
            ).first()
            if not membership:
                db.add(SchoolMembership(school_id=school.id, user_id=psychiatrist.id, role="psychiatrist", is_active=True))
                db.commit()
            sample_student = db.query(Student).filter(Student.school_id == school.id, Student.admission_number == "ADM-2026-001").first()
            if sample_student:
                assignment = db.query(StaffStudentAssignment).filter(StaffStudentAssignment.staff_user_id == psychiatrist.id, StaffStudentAssignment.student_id == sample_student.id, StaffStudentAssignment.school_id == school.id).first()
                if not assignment:
                    db.add(StaffStudentAssignment(school_id=school.id, staff_user_id=psychiatrist.id, student_id=sample_student.id, assignment_type="psychiatrist", is_active=True))
                    db.commit()
            print(f"Database already contains demo school SJA-001. Seed skipped; faculty IDs updated: {updated}; psychiatrist account ensured.")
            return

        print("Seeding synthetic demo records into PostgreSQL...")

        # 1. School
        school = School(
            id=uuid.uuid4(),
            name="St. Jude Inclusive Academy",
            code="SJA-001",
            address="12 Garden Valley Road, Knowledge Hub",
            is_active=True
        )
        db.add(school)
        db.commit()

        # Helper to create user
        def make_user(email: str, name: str, password: str, phone: str = "555-0100", faculty_id: str | None = None):
            u = User(
                id=uuid.uuid4(),
                faculty_id=faculty_id,
                email=email.lower().strip(),
                password_hash=get_password_hash(password),
                full_name=name,
                phone=phone,
                is_active=True
            )
            db.add(u)
            db.commit()
            return u

        # Helper to add membership
        def add_membership(user_id: uuid.UUID, role: str):
            mem = SchoolMembership(
                id=uuid.uuid4(),
                school_id=school.id,
                user_id=user_id,
                role=role,
                is_active=True
            )
            db.add(mem)
            db.commit()
            return mem

        # 2. Staff & Guardian Users
        admin_user = make_user("admin@siddhi.test", "Sanjay Deshmukh (Admin)", "SiddhiAdmin2026!", "555-0101", "FAC-ADMIN-001")
        add_membership(admin_user.id, "school_admin")

        head_user = make_user("principal@siddhi.test", "Dr. Shalini Menon (School Head)", "SiddhiHead2026!", "555-0102", "FAC-HEAD-001")
        add_membership(head_user.id, "school_head")

        edu1_user = make_user("educator1@siddhi.test", "Ananya Sharma (Special Educator)", "SiddhiEducator2026!", "555-0103", "FAC-EDU-001")
        add_membership(edu1_user.id, "special_educator")

        edu2_user = make_user("educator2@siddhi.test", "Rajesh Kumar (Special Educator)", "SiddhiEducator2026!", "555-0104", "FAC-EDU-002")
        add_membership(edu2_user.id, "special_educator")

        therapist_user = make_user("therapist@siddhi.test", "Priya Nair (Lead Therapist)", "SiddhiTherapy2026!", "555-0105", "FAC-THER-001")
        add_membership(therapist_user.id, "therapist")

        psych_user = make_user("psychologist@siddhi.test", "Dr. Arjun Verma (Psychologist)", "SiddhiPsych2026!", "555-0106", "FAC-PSY-001")
        add_membership(psych_user.id, "psychologist")

        psychiatrist_user = make_user("psychiatrist@siddhi.test", "Dr. Kavita Rao (Psychiatrist)", "SiddhiPsychiatrist2026!", "555-0109", "FAC-PSYCH-001")
        add_membership(psychiatrist_user.id, "psychiatrist")

        # Guardian with exactly one child
        guardian1_user = make_user("guardian.single@siddhi.test", "Sunita Patel", "SiddhiGuardian2026!", "555-0107")
        add_membership(guardian1_user.id, "guardian")

        # Guardian with two children
        guardian2_user = make_user("guardian.multi@siddhi.test", "Meera Iyer", "SiddhiGuardian2026!", "555-0108")
        add_membership(guardian2_user.id, "guardian")

        # 3. Students
        # Child 1: Aarav Patel (linked to guardian1)
        student1 = Student(
            id=uuid.uuid4(),
            school_id=school.id,
            admission_number="ADM-2026-001",
            full_name="Aarav Patel",
            date_of_birth=date(2017, 4, 15),
            gender="Male",
            disability_category="Autism Spectrum Disorder",
            udid_number_encrypted="UDID-MH-12345-ENC",
            enrollment_date=date(2023, 6, 12),
            grade_class="Grade 3-B",
            diagnosis="Mild to moderate autism spectrum disorder with sensory sensitivity",
            strengths="Exceptional visual pattern recognition, highly focused on digital tools, gentle temperament",
            areas_of_need="Expressive verbal communication, social peer interaction, sensory processing in loud areas",
            learning_style="Visual and kinesthetic with structured visual timetable",
            languages_known="English, Hindi, Gujarati",
            assistive_devices="Noise-cancelling headphones, AAC communication tablet",
            is_active=True
        )

        # Child 2: Diya Iyer (linked to guardian2)
        student2 = Student(
            id=uuid.uuid4(),
            school_id=school.id,
            admission_number="ADM-2026-002",
            full_name="Diya Iyer",
            date_of_birth=date(2015, 8, 22),
            gender="Female",
            disability_category="Specific Learning Disability",
            udid_number_encrypted="UDID-MH-54321-ENC",
            enrollment_date=date(2022, 6, 10),
            grade_class="Grade 5-A",
            diagnosis="Dyslexia with phonological processing deficit",
            strengths="Creative storytelling, strong conceptual comprehension, enthusiastic in art and drama",
            areas_of_need="Reading fluency, decoding unfamiliar multi-syllabic words, spelling accuracy",
            learning_style="Multisensory Orton-Gillingham approach, audio-supported reading",
            languages_known="English, Tamil",
            assistive_devices="Speech-to-text software, coloured reading overlays",
            is_active=True
        )

        # Child 3: Vivaan Iyer (linked to guardian2)
        student3 = Student(
            id=uuid.uuid4(),
            school_id=school.id,
            admission_number="ADM-2026-003",
            full_name="Vivaan Iyer",
            date_of_birth=date(2018, 11, 5),
            gender="Male",
            disability_category="ADHD with Speech Delay",
            udid_number_encrypted="UDID-MH-67890-ENC",
            enrollment_date=date(2024, 6, 15),
            grade_class="Grade 2-C",
            diagnosis="ADHD combined presentation with articulation delay",
            strengths="High energy, curious, friendly, excels in physical activities and mathematics",
            areas_of_need="Sustained attention during seated desk work, articulation of consonant blends",
            learning_style="Frequent movement breaks, tactile learning aids, short task increments",
            languages_known="English, Tamil, Hindi",
            assistive_devices="Wobble stool, timer visual cue",
            is_active=True
        )

        # Child 4: Rohan Sen
        student4 = Student(
            id=uuid.uuid4(),
            school_id=school.id,
            admission_number="ADM-2026-004",
            full_name="Rohan Sen",
            date_of_birth=date(2016, 1, 19),
            gender="Male",
            disability_category="Locomotor Disability (Cerebral Palsy)",
            udid_number_encrypted="UDID-MH-11223-ENC",
            enrollment_date=date(2023, 6, 12),
            grade_class="Grade 4-A",
            diagnosis="Spastic diplegia cerebral palsy",
            strengths="Analytical reasoning, strong auditory memory, active participant in class discussions",
            areas_of_need="Fine motor grip for sustained writing, physical mobility between floors",
            learning_style="Auditory and oral responses, computer-assisted typing",
            languages_known="English, Bengali",
            assistive_devices="Walker, adapted pencil grip, accessible keyboard",
            is_active=True
        )

        # Child 5: Maya Rao
        student5 = Student(
            id=uuid.uuid4(),
            school_id=school.id,
            admission_number="ADM-2026-005",
            full_name="Maya Rao",
            date_of_birth=date(2014, 5, 30),
            gender="Female",
            disability_category="Intellectual Disability (Mild)",
            udid_number_encrypted="UDID-MH-99887-ENC",
            enrollment_date=date(2021, 6, 14),
            grade_class="Grade 6-B",
            diagnosis="Mild intellectual disability with adaptive functioning needs",
            strengths="Eager to help, cooperative, diligent, enjoys functional life skills activities",
            areas_of_need="Abstract mathematical concepts, independent self-management of complex routines",
            learning_style="Step-by-step task analysis, visual checklists, repeated practical practice",
            languages_known="English, Kannada",
            assistive_devices="Visual schedule watch, calculator",
            is_active=True
        )

        db.add_all([student1, student2, student3, student4, student5])
        db.commit()

        # 4. Guardian Links
        link1 = GuardianStudentLink(
            school_id=school.id,
            guardian_user_id=guardian1_user.id,
            student_id=student1.id,
            relationship_label="Mother",
            is_primary=True,
            is_active=True
        )
        link2 = GuardianStudentLink(
            school_id=school.id,
            guardian_user_id=guardian2_user.id,
            student_id=student2.id,
            relationship_label="Mother",
            is_primary=True,
            is_active=True
        )
        link3 = GuardianStudentLink(
            school_id=school.id,
            guardian_user_id=guardian2_user.id,
            student_id=student3.id,
            relationship_label="Mother",
            is_primary=True,
            is_active=True
        )
        db.add_all([link1, link2, link3])
        db.commit()

        # 5. Staff Student Assignments
        db.add_all([
            StaffStudentAssignment(school_id=school.id, staff_user_id=edu1_user.id, student_id=student1.id, assignment_type="special_educator", is_active=True),
            StaffStudentAssignment(school_id=school.id, staff_user_id=therapist_user.id, student_id=student1.id, assignment_type="speech_therapist", is_active=True),
            StaffStudentAssignment(school_id=school.id, staff_user_id=psych_user.id, student_id=student1.id, assignment_type="psychologist", is_active=True),
            StaffStudentAssignment(school_id=school.id, staff_user_id=psychiatrist_user.id, student_id=student1.id, assignment_type="psychiatrist", is_active=True),
            StaffStudentAssignment(school_id=school.id, staff_user_id=edu1_user.id, student_id=student2.id, assignment_type="special_educator", is_active=True),
            StaffStudentAssignment(school_id=school.id, staff_user_id=edu2_user.id, student_id=student3.id, assignment_type="special_educator", is_active=True),
            StaffStudentAssignment(school_id=school.id, staff_user_id=therapist_user.id, student_id=student3.id, assignment_type="speech_therapist", is_active=True),
            StaffStudentAssignment(school_id=school.id, staff_user_id=edu2_user.id, student_id=student4.id, assignment_type="special_educator", is_active=True),
            StaffStudentAssignment(school_id=school.id, staff_user_id=edu2_user.id, student_id=student5.id, assignment_type="special_educator", is_active=True),
        ])
        db.commit()

        # 6. PLOP Records for Student 1 across all 9 domains
        domains = [
            ("academic", "Performs single-digit addition with visual tokens; identifies letters but struggles with reading sentences independently.", "Teacher assessment and reading inventory", "Grade 1 level"),
            ("communication", "Uses 2-word verbal phrases and pointing; communicates effectively using AAC symbol app for requests.", "Language sample & SLP checklist", "Emerging 2-word requests"),
            ("social_skills", "Engages in parallel play; requires adult prompting to share toys or initiate greetings with peers.", "Social observation rubrics", "Parallel play with peer prompt"),
            ("behaviour", "Exhibits occasional hand-flapping when excited; self-regulates with sensory break corner without disruption.", "Functional Behaviour Assessment", "2 sensory breaks/day needed"),
            ("motor_skills", "Good gross motor coordination in walking and running; fine motor pincer grasp is developing for scissors.", "OT motor assessment", "Emerging tripod grasp"),
            ("cognitive_skills", "High ability in geometric matching and computer pattern games; requires scaffolding for sequencing tasks.", "Cognitive profile subtests", "Superior visual pattern score"),
            ("adl", "Independent with handwashing and snack eating; needs supervision for shoe laces and school bag packing.", "Vineland Adaptive Behavior Scale", "Partially independent (70%)"),
            ("emotional_development", "Expresses calm demeanor in structured settings; shows anxiety during sudden fire drill alarms.", "Emotional regulation inventory", "Alert to unannounced noises"),
            ("vocational_skills", "Follows 3-step classroom clean-up routines eagerly; organizes library book bins accurately.", "Pre-vocational chore check", "Completes sorting tasks 90%")
        ]
        for dom, perf, meth, base in domains:
            plop = PresentLevelRecord(
                school_id=school.id,
                student_id=student1.id,
                domain=dom,
                current_performance=perf,
                assessment_method=meth,
                baseline_value=base,
                remarks="Baseline established at start of academic year 2026-2027.",
                assessed_by_user_id=edu1_user.id,
                assessed_at=date(2026, 6, 20),
                guardian_visible=True
            )
            db.add(plop)
        db.commit()

        # 7. IEP Plans & Goals for Student 1
        plan1 = IEPPlan(
            school_id=school.id,
            student_id=student1.id,
            academic_year="2026-2027",
            start_date=date(2026, 6, 1),
            end_date=date(2027, 4, 30),
            status="active",
            version=1,
            created_by_user_id=edu1_user.id,
            approved_at=datetime(2026, 6, 25, 10, 0, tzinfo=timezone.utc)
        )
        db.add(plan1)
        db.commit()

        # Goal 1: Academic
        goal1 = IEPGoal(
            school_id=school.id,
            iep_plan_id=plan1.id,
            student_id=student1.id,
            domain="academic",
            annual_goal="Aarav will read 40 sight words and decode 3-letter CVC words with 80% accuracy.",
            teaching_strategies="Phonetic flashcards, tactile sand writing, daily 15-minute 1-on-1 reading drill",
            responsible_staff_user_id=edu1_user.id,
            timeline="10 months (June 2026 - April 2027)",
            evaluation_method="Bi-weekly sight word inventory and running reading records",
            status="in_progress",
            created_by_user_id=edu1_user.id
        )
        db.add(goal1)
        db.commit()

        obj1_1 = GoalObjective(school_id=school.id, goal_id=goal1.id, objective_text="Identify 15 initial sight words independently", sequence_number=1, target_date=date(2026, 9, 30))
        obj1_2 = GoalObjective(school_id=school.id, goal_id=goal1.id, objective_text="Decode 20 CVC short-vowel words", sequence_number=2, target_date=date(2026, 12, 15))
        obj1_3 = GoalObjective(school_id=school.id, goal_id=goal1.id, objective_text="Read simple 3-word sentences fluently", sequence_number=3, target_date=date(2027, 3, 31))
        db.add_all([obj1_1, obj1_2, obj1_3])
        db.commit()

        # Goal 2: Communication
        goal2 = IEPGoal(
            school_id=school.id,
            iep_plan_id=plan1.id,
            student_id=student1.id,
            domain="communication",
            annual_goal="Aarav will initiate a 3-word communicative request using AAC or verbal speech in 4 out of 5 opportunities.",
            teaching_strategies="Prompt fading, natural environment teaching during free play, PECS/AAC modeling",
            responsible_staff_user_id=therapist_user.id,
            timeline="10 months",
            evaluation_method="Weekly SLP opportunity log and AAC app analytics",
            status="in_progress",
            created_by_user_id=edu1_user.id
        )
        db.add(goal2)
        db.commit()

        # Goal 3: Social Skills
        goal3 = IEPGoal(
            school_id=school.id,
            iep_plan_id=plan1.id,
            student_id=student1.id,
            domain="social_skills",
            annual_goal="Aarav will participate in a structured peer turn-taking game for 10 minutes with minimal verbal prompts.",
            teaching_strategies="Social stories, peer buddy system, visual turn-taking card",
            responsible_staff_user_id=edu1_user.id,
            timeline="10 months",
            evaluation_method="Direct teacher observation rubric during circle time",
            status="achieved",
            created_by_user_id=edu1_user.id
        )
        db.add(goal3)
        db.commit()

        # 8. Progress Entries
        prog_entries = [
            ProgressEntry(school_id=school.id, student_id=student1.id, goal_id=goal1.id, term="baseline", rating=1, observation="Baseline assessed: Aarav recognized 5 sight words with full teacher prompting.", assessed_by_user_id=edu1_user.id, observed_at=date(2026, 6, 25)),
            ProgressEntry(school_id=school.id, student_id=student1.id, goal_id=goal1.id, term="term_1", rating=2, observation="Term 1: Reads 18 sight words with moderate prompting; begins sounding out 'cat' and 'mat'.", assessed_by_user_id=edu1_user.id, observed_at=date(2026, 9, 28)),
            ProgressEntry(school_id=school.id, student_id=student1.id, goal_id=goal1.id, term="term_2", rating=3, observation="Term 2: Reads 30 sight words with minimal prompting; decodes CVC words reliably.", assessed_by_user_id=edu1_user.id, observed_at=date(2026, 12, 18)),

            ProgressEntry(school_id=school.id, student_id=student1.id, goal_id=goal2.id, term="baseline", rating=1, observation="Baseline: Requests limited to 1 word ('water') with physical guiding.", assessed_by_user_id=therapist_user.id, observed_at=date(2026, 6, 26)),
            ProgressEntry(school_id=school.id, student_id=student1.id, goal_id=goal2.id, term="term_1", rating=2, observation="Term 1: Constructs 2-word AAC phrases ('want ball') in 3 out of 5 trials.", assessed_by_user_id=therapist_user.id, observed_at=date(2026, 9, 29)),

            ProgressEntry(school_id=school.id, student_id=student1.id, goal_id=goal3.id, term="baseline", rating=0, observation="Baseline: Avoids peer group activities; retreated to corner.", assessed_by_user_id=edu1_user.id, observed_at=date(2026, 6, 27)),
            ProgressEntry(school_id=school.id, student_id=student1.id, goal_id=goal3.id, term="term_1", rating=2, observation="Term 1: Sits in circle time with peer buddy for 5 minutes.", assessed_by_user_id=edu1_user.id, observed_at=date(2026, 9, 25)),
            ProgressEntry(school_id=school.id, student_id=student1.id, goal_id=goal3.id, term="term_2", rating=3, observation="Term 2: Participates in board game with 2 peers with occasional prompt.", assessed_by_user_id=edu1_user.id, observed_at=date(2026, 12, 15)),
            ProgressEntry(school_id=school.id, student_id=student1.id, goal_id=goal3.id, term="term_3", rating=4, observation="Term 3: Successfully completes 10-minute turn taking game independently.", assessed_by_user_id=edu1_user.id, observed_at=date(2027, 3, 20)),
        ]
        db.add_all(prog_entries)
        db.commit()

        # 9. Therapy Sessions
        therapy_sess = [
            TherapySession(school_id=school.id, student_id=student1.id, goal_id=goal2.id, therapy_type="speech_therapy", therapist_user_id=therapist_user.id, session_date=date(2026, 10, 5), duration_minutes=45, progress_notes="Practiced AAC multi-word phrase building for snacks. Aarav was engaged and completed 8 trials.", outcome="High motivation with visual food tokens", next_steps="Generalize to asking for art supplies", guardian_visible=True),
            TherapySession(school_id=school.id, student_id=student1.id, goal_id=goal2.id, therapy_type="speech_therapy", therapist_user_id=therapist_user.id, session_date=date(2026, 10, 12), duration_minutes=45, progress_notes="Incorporated peer vocal imitation games. Vocalized vowel sounds clearly.", outcome="Vowel sounds clear on /a/ and /o/", next_steps="Work on bilabial consonant /m/ and /b/", guardian_visible=True),
            TherapySession(school_id=school.id, student_id=student1.id, therapy_type="occupational_therapy", therapist_user_id=therapist_user.id, session_date=date(2026, 10, 19), duration_minutes=40, progress_notes="Sensory diet and obstacle course balance beam. Calmed down significantly after deep pressure beanbag compression.", outcome="Decreased hand-flapping post-session", next_steps="Teach classroom teacher 5-minute pre-math sensory routine", guardian_visible=True),
        ]
        db.add_all(therapy_sess)
        db.commit()

        # 10. Accommodations
        accommodations = [
            Accommodation(school_id=school.id, student_id=student1.id, area="classroom", accommodation="Preferential seating near teacher desk away from hallway door noise", modification="Reduced number of workbook problems per page (4 instead of 10)", assistive_technology="Noise-cancelling headphones during independent study", responsible_staff_user_id=edu1_user.id, effective_from=date(2026, 6, 1), is_active=True),
            Accommodation(school_id=school.id, student_id=student1.id, area="examination", accommodation="25% extra time and quiet separate testing room", modification="Oral / AAC demonstration allowed in lieu of written answers", assistive_technology="Tablet with customized high-contrast font", responsible_staff_user_id=edu1_user.id, effective_from=date(2026, 6, 1), is_active=True),
            Accommodation(school_id=school.id, student_id=student1.id, area="communication", accommodation="Visual schedule strip attached to student desk", modification="None", assistive_technology="Dedicated iPad with AAC communication software", responsible_staff_user_id=therapist_user.id, effective_from=date(2026, 6, 1), is_active=True),
        ]
        db.add_all(accommodations)
        db.commit()

        # 11. Parent Interactions
        interactions = [
            ParentInteraction(school_id=school.id, student_id=student1.id, guardian_user_id=guardian1_user.id, recorded_by_user_id=edu1_user.id, interaction_date=date(2026, 7, 10), mode="meeting", discussion_points="IEP Goal review meeting with Mrs. Sunita Patel. Discussed Aarav's sensory adaptations and reading targets.", action_taken="Agreed to send daily visual routine chart home; speech therapist provided home AAC tips.", acknowledgement_status="acknowledged", acknowledged_at=datetime(2026, 7, 10, 16, 30, tzinfo=timezone.utc)),
            ParentInteraction(school_id=school.id, student_id=student1.id, guardian_user_id=guardian1_user.id, recorded_by_user_id=edu1_user.id, interaction_date=date(2026, 10, 15), mode="call", discussion_points="Term 1 progress check-in call. Discussed significant improvement in sight word recognition and calmer transition periods.", action_taken="Parent noted Aarav is using the phrase 'want water' at home independently.", acknowledgement_status="acknowledged", acknowledged_at=datetime(2026, 10, 15, 17, 0, tzinfo=timezone.utc)),
        ]
        db.add_all(interactions)
        db.commit()

        # 12. Assessment Records
        assessments = [
            AssessmentRecord(school_id=school.id, student_id=student1.id, assessment_type="educational", domain="academic", assessment_date=date(2026, 6, 15), assessor_user_id=edu1_user.id, summary="Comprehensive psycho-educational assessment. Student exhibits strong visual-spatial abilities and needs structured multi-sensory support for phonetic decoding.", recommendations="Implement 1-on-1 reading intervention with tactile letters and visual schedules.", guardian_visible=True, next_review_date=date(2027, 4, 15)),
            AssessmentRecord(school_id=school.id, student_id=student1.id, assessment_type="psychological", domain="cognitive_skills", assessment_date=date(2026, 6, 18), assessor_user_id=psych_user.id, summary="Standardized developmental evaluation. Mild-to-moderate ASD symptoms confirmed; high emotional responsiveness to positive reinforcement.", recommendations="Provide scheduled quiet sensory breaks and social story preparatory work before transitions.", guardian_visible=False, next_review_date=date(2027, 6, 18)),
        ]
        db.add_all(assessments)
        db.commit()

        # 13. Attendance Records
        for i in range(15):
            att_date = date(2026, 10, 1) + timedelta(days=i)
            if att_date.weekday() < 5:  # Monday to Friday
                status_val = "present" if i != 8 else "absent"
                reason_val = None if i != 8 else "Mild fever reported by guardian"
                db.add(AttendanceRecord(
                    school_id=school.id,
                    student_id=student1.id,
                    attendance_date=att_date,
                    status=status_val,
                    reason=reason_val,
                    recorded_by_user_id=edu1_user.id
                ))
        db.commit()

        # 14. IEP Review & Approvals
        review1 = IEPReview(
            school_id=school.id,
            student_id=student1.id,
            iep_plan_id=plan1.id,
            review_type="quarterly",
            scheduled_date=date(2026, 10, 15),
            conducted_at=datetime(2026, 10, 15, 11, 0, tzinfo=timezone.utc),
            review_notes="Quarter 1 review held. Student met social turn-taking milestone early; reading goal progressing on schedule.",
            status="approved",
            created_by_user_id=edu1_user.id
        )
        db.add(review1)
        db.commit()

        approvals = [
            IEPApproval(school_id=school.id, iep_review_id=review1.id, approver_user_id=edu1_user.id, required_role="special_educator", status="approved", comment="Goals on track, recommending continuation of current strategies.", decision_at=datetime(2026, 10, 15, 12, 0, tzinfo=timezone.utc)),
            IEPApproval(school_id=school.id, iep_review_id=review1.id, approver_user_id=head_user.id, required_role="school_head", status="approved", comment="Reviewed and approved by administration.", decision_at=datetime(2026, 10, 16, 9, 30, tzinfo=timezone.utc)),
            IEPApproval(school_id=school.id, iep_review_id=review1.id, approver_user_id=guardian1_user.id, required_role="guardian", status="approved", comment="Very pleased with Aarav's progress in communication.", decision_at=datetime(2026, 10, 16, 14, 0, tzinfo=timezone.utc)),
        ]
        db.add_all(approvals)
        db.commit()

        print("Successfully seeded all synthetic demo data into PostgreSQL!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding demo database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
