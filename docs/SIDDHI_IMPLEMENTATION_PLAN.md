# SIDDHI — End-to-End Implementation Plan

**Project:** Siddhi — Individualized Education Program (IEP) Tracking Platform  
**Platform:** Responsive web application  
**Primary users:** Guardians, special educators, therapists, psychologists, school heads and school administrators  
**Development environment:** Fedora Linux  
**Implementation target:** Functional end-to-end application, not a static prototype  
**Document purpose:** This is the controlling build specification. Follow it in order. Do not invent a different stack, omit modules, replace real functionality with mock data, or stop after making the screens look complete.

---

## 0. Instructions for the coding agent — read this first

You are implementing **Siddhi**, a working IEP tracking system. The supplied design files and IEP brief are the source of truth. This specification resolves the implementation decisions so that you do not need to make broad architectural guesses.

### 0.1 Required working method

1. **Inspect before changing anything.** Start by listing the existing repository files, reading the current package files, and checking the current branch. Preserve useful existing work. Do not overwrite an existing application blindly.
2. If the repository is empty, create the structure in Section 4. If it already has a structure, adapt the structure while preserving the architecture and boundaries in this plan.
3. Build in the phases in Section 12. Finish and verify each phase before moving to the next. Do not generate the entire application in one untested pass.
4. Implement database models, migrations, API endpoints, permission checks, frontend views and tests. A screen is not complete just because it renders.
5. Connect every form and button to a real API operation. Do not leave buttons that do nothing, fake charts, hard-coded progress, fake authentication, placeholder navigation or non-functional export controls.
6. Use synthetic development data only. Never copy real student, guardian, disability, diagnosis, UDID, therapy or assessment data into seed files, screenshots, test fixtures or logs.
7. Do not silently invent student information. Show an empty state when data is unavailable.
8. Do not add unrelated features, AI predictions, chatbots, payment systems, public registration, social features or decorative animation. They are outside this scope.
9. Do not run arbitrary scripts in the user's browser. Excel generation must run in the Python backend through a controlled export service.
10. After every phase, run its stated tests. Fix failures before continuing. At the end, run the full test suite and production build.
11. Keep a `BUILD_STATUS.md` file with completed phases, commands run, test results, and unresolved blockers. Do not mark a phase complete unless its acceptance criteria pass.
12. If a dependency, API or implementation detail is uncertain, consult that package's official documentation. Do not guess APIs or install unrelated packages as experiments.

### 0.2 Definition of “done”

The project is done only when:

- The app starts locally on Fedora using the commands in this plan.
- PostgreSQL is the actual persistence layer; data remains after a restart.
- Sign-in works and users are sent to the correct role-specific experience.
- Every one of the 15 view families below is reachable and uses real database-backed data.
- Guardian access is restricted to children linked to that guardian.
- Staff access is restricted by school and assigned-student permissions.
- IEP records, PLOP, goals, progress ratings, therapy sessions, accommodations, communication logs, assessments, attendance, reviews and approvals can be created/read/updated through the appropriate roles.
- The Excel export button downloads a valid `.xlsx` workbook with the required eight worksheets and only data the requesting user is permitted to see.
- Automated tests cover the important business rules, role boundaries, exports and main user journeys.
- Responsive layouts work at desktop, tablet and mobile widths.
- No critical console errors, broken routes, dead buttons, obvious overflow or unresolved test failures remain.

---

## 1. Source material and requirement interpretation

Use these supplied materials together:

1. **`IEP Module.docx`** — source of functional requirements, IEP terminology, student fields, assessment domains, rating scale, review roles and Excel worksheets.
2. **The three guardian wireframe images** — source of the guardian page layout and child-card behaviour.
3. **`DESIGN.md`, `theme.css`, `variables.css`, `tokens.json`** — source of the selected light visual language, colour palette, typography, spacing and component treatments.

### 1.1 Do not drop requirements because of the screen count

The IEP brief contains ten key feature areas:

1. Student Profile Management
2. IEP Development and Goal Setting
3. Present Level of Performance (PLOP)
4. Progress Monitoring Dashboard
5. Therapy and Support Services Tracker
6. Accommodations and Modifications
7. Parent Communication Portal
8. Assessment and Evaluation Records
9. Automated Reports and Analytics
10. IEP Review and Approval System

It also specifies eight digital workbook sheets: Student Database, IEP Goals, Progress Monitoring Dashboard, Therapy Tracker, Attendance Record, Parent Communication Log, Assessment Reports and Automated Report Cards.

The brief mentions multiple modules and worksheets, not a strict limit of seven routes. This plan groups the requirements into **15 screen families**. Some screen families contain tabs, drawers or forms. This keeps navigation manageable while retaining every required function.

### 1.2 Scope from the IEP brief

Implement the following source-defined information and functions:

- Student profile: student name, admission number, date of birth, gender, disability category, UDID number, enrollment date, grade/class, school, diagnosis, strengths, areas of need, learning style, languages known, assistive devices, guardian name and contact details.
- PLOP domains: academic, communication, social skills, behaviour, motor skills, cognitive skills, activities of daily living (ADL), emotional development and vocational skills.
- Goals: annual goals, short-term objectives, teaching strategies, responsible staff, timeline and evaluation method.
- Progress: baseline, Term 1, Term 2, Term 3, final status and a 0–4 performance rating.
- Therapy: speech therapy, occupational therapy, physiotherapy, behaviour therapy and counselling; record date, goal addressed, therapist, duration and progress notes.
- Parent interaction: date, meeting/call/email mode, discussion points, action taken and parent acknowledgement/signature record.
- Accommodations: classroom, examination, learning materials, communication and mobility; record accommodation, modification and assistive technology.
- Assessments: psychological, educational and medical records, with the relevant date, assessor, summary and supporting document where available.
- IEP review: quarterly, half-yearly and annual schedules, with special educator, school head, therapist, psychologist and guardian approval records as appropriate.
- Attendance records and automated term-wise reporting.

**Important:** The IEP brief does not define a detailed guardian profile beyond the guardian identity/contact relationship. Keep the guardian's own profile minimal, as shown in Wireframe 3. Do not create unnecessary personal-information fields.

---

## 2. Product and role model

### 2.1 User roles

Implement these roles as server-enforced permissions:

| Role | Main responsibilities | Default data boundary |
|---|---|---|
| `guardian` | View linked child profiles, permitted IEP information, progress, therapy summaries, reports and communication history | Only children explicitly linked to that guardian; only guardian-visible records |
| `special_educator` | Maintain student profiles, PLOP, IEP plans, goals, progress, accommodations, attendance and parent interaction records | Students assigned to that educator, within the educator's school |
| `therapist` | View assigned students' relevant goals and add therapy sessions/progress notes | Students assigned to the therapist; therapy-related information only where practical |
| `psychologist` | Add/view permitted psychological and relevant assessment records and PLOP contributions | Assigned students and assessment permissions |
| `school_head` | Review school-level IEP status, conduct/record approvals and monitor progress | All permitted students and records in that school |
| `school_admin` | Manage the school's users, student links, assignments, configuration and authorised exports | School-wide administrative scope; no cross-school access |

Do not create a separate public registration flow. School administrators create or invite staff and guardian accounts and connect guardians to students.

### 2.2 Authentication behaviour

- Build one `/login` route with two visual entry modes: **Guardian** and **School Staff**. The mode changes the explanatory text and may adjust the form label, but it must not grant permissions.
- The backend must identify the real account and its assigned role after successful authentication. Never trust a role sent by the browser.
- A guardian account must land on the Guardian Dashboard. A staff account must land on its role-specific Staff Dashboard.
- If an account has more than one permitted role, show a role/workspace chooser only after authentication and only for roles actually assigned to the account.
- Include forgot-password and reset-password states. In development, expose reset links only in the local backend console/log. In a deployed environment, send them through configured SMTP. Reset tokens must expire and be single-use.
- Use a generic invalid-login message. Do not reveal whether an email address exists.
- Add logout, session expiry and inactive-account handling.

### 2.3 Navigation shell

Use the supplied wireframes as the layout basis:

- Desktop: narrow left icon rail with clear active state, persistent top header, white main content area.
- Tablet: collapsible left navigation.
- Mobile: compact top bar and accessible menu/drawer; do not squeeze desktop tables into an unreadable layout.
- Icons must have accessible labels/tooltips; icons alone are not sufficient for screen-reader users.
- Keep the header and navigation consistent across role-specific pages. The available navigation items change according to role permissions.

---

## 3. The 15 view families to implement

Build these as actual routed views. A view family can contain a tab, modal, drawer or form state, but all listed actions must work.

| # | View family / route | Purpose and required behaviour | Main roles |
|---:|---|---|---|
| 1 | **Authentication** — `/login`, `/forgot-password`, `/reset-password` | Guardian and staff login modes, validation, password reset, logout and post-login role routing. No public registration. | All |
| 2 | **Guardian Children Dashboard** — `/guardian` | Reproduce Wireframes 1 and 2. One child uses the single-child composition. Two or more children use a two-column desktop card grid, continuing in vertically scrollable rows. Each child card opens that child's profile. Zero children shows a helpful “No children linked yet” empty state. | Guardian |
| 3 | **Guardian Profile** — `/guardian/profile` | Reproduce Wireframe 3: a minimal guardian information panel at the top, followed by child rows/cards stacked vertically. Each child row has a circular avatar/fallback, child's name and a click target to the child profile. Do not invent additional guardian fields. | Guardian |
| 4 | **Role-specific Staff Dashboard** — `/staff` | A shared dashboard layout with role-specific content: educator sees assigned students, IEPs needing attention and recent progress; therapist sees assigned students and upcoming/recent sessions; psychologist sees assessment work; school head sees review/approval queue and school-level summaries; admin sees users, student links and setup tasks. | Staff roles |
| 5 | **Student Profile / Overview** — `/students/:studentId` | Student identity and documented profile fields, current IEP status, assigned staff, guardian relationship, high-level goal progress and navigation into the student's IEP sections. Mask sensitive identifiers such as UDID in normal views. | Assigned staff; guardian for linked child with restricted fields |
| 6 | **PLOP / Present Level of Performance** — `/students/:studentId/plop` | Capture current performance separately for all nine domains, assessment method, date, remarks, baseline evidence and assessor. Preserve history rather than silently overwriting previous assessments. | Educator; psychologist/therapist for permitted contributions; guardian read-only where approved |
| 7 | **IEP Plan and Goals** — `/students/:studentId/iep` | Create/manage annual goals and short-term objectives by domain. Capture teaching strategies, responsible staff, evaluation method and timeline. Add/edit/archive goals through real forms. Display plan status and academic year. | Educator; school head read/review; guardian read-only |
| 8 | **Progress Monitoring** — `/students/:studentId/progress` | Show goal-wise baseline, Term 1, Term 2, Term 3 and final status. Use the exact 0–4 scale. Show history and charts using stored progress entries, not hard-coded sample values. Allow authorised staff to add a dated progress observation. | Educator; assigned therapist for relevant goal contribution; guardian read-only |
| 9 | **Therapy Tracker** — `/students/:studentId/therapy` | List and filter therapy sessions. Add/edit a session with date, therapy type, linked goal (optional), therapist, duration and progress notes. Provide a detail view/drawer and history. | Therapist; educator read; guardian read-only for approved summaries |
| 10 | **Accommodations and Modifications** — `/students/:studentId/accommodations` | Record classroom, examination, learning-material, communication and mobility accommodations; modifications; assistive technologies; responsible staff; effective dates. | Educator; school head read; guardian read-only |
| 11 | **Parent Interaction Log** — `/students/:studentId/communications` | Record meetings, calls and emails, discussion points, actions taken, date, recording staff and parent acknowledgement/signature status. Provide chronological history and filters. | Educator; school head read; guardian can view permitted records and acknowledgement status |
| 12 | **Assessment Records** — `/students/:studentId/assessments` | List/create assessment records (psychological, educational, medical and other relevant types), date, domain, assessor, summary, next review date and protected attachment metadata. Distinguish guardian-visible from restricted professional records. | Psychologist/educator/authorised therapist; school head by permission; guardian only guardian-visible records |
| 13 | **Attendance** — `/students/:studentId/attendance` | Record date, present/absent/leave/other status and reason. Provide date-range filters and a simple attendance summary. Include attendance in the workbook even though it is listed under the digital Excel structure rather than the ten key-feature list. | Educator; school head/admin; guardian read-only if school enables it |
| 14 | **IEP Review and Approval** — `/students/:studentId/reviews` | Create quarterly, half-yearly and annual review schedules; capture review notes; collect approval status from the appropriate role: special educator, school head, therapist, psychologist and parent/guardian. Show pending/approved/rejected states and timestamps. | Educator, school head, therapist, psychologist, guardian (own approval only) |
| 15 | **Reports and Excel Export Centre** — `/reports` and student report actions | Generate the eight-sheet IEP workbook, select permitted student/date/term scope, show an export summary and download `.xlsx`. Role-based export scope is mandatory. Also provide a student-specific report action from the student's profile. | Staff by permission; guardian for own linked child only |

### 3.1 Guardian dashboard layout — follow the sketches closely

**When the guardian has exactly one child (Wireframe 1):**

- Keep the common left navigation rail and top header.
- Use one broad content card.
- Left side: circular child image or neutral initials/avatar fallback, then a short identity summary.
- Add the vertical dotted/divider treatment shown in the wireframe if it remains visually quiet and accessible.
- Right side: concise child/IEP summary and links to the relevant child sections.
- Do not fill the page with administrative details. The child card is the entry point, not the full IEP record.

**When the guardian has two children (Wireframe 2):**

- Show two similarly sized child cards side by side on desktop.
- Each card has a circular image/avatar, child's name and concise supporting details.
- Maintain equal card dimensions and alignment.

**When the guardian has more than two children:**

- Continue the same two-column grid on desktop; later cards appear in additional rows.
- The main content area scrolls vertically. Do not turn the entire page into a horizontal carousel.
- On tablet use two columns only when the usable width allows it; otherwise one column. On mobile always use one column.

**When the guardian has no linked children:**

- Show an empty state and a clear instruction to contact the school. Do not expose student search or allow guardians to link arbitrary students themselves.

### 3.2 Guardian profile layout — follow Wireframe 3

- Put a minimal guardian identity/contact panel at the top.
- Put the “Children” section below it.
- Render each child as a full-width horizontal row: circular avatar at the left, child's name and a small amount of permitted metadata alongside it.
- Stack rows vertically with comfortable spacing. Each row is clickable and keyboard accessible.
- Do not turn this screen into a detailed guardian CRM profile.

### 3.3 Role-specific navigation

Use a shared sidebar component, but show only relevant destinations:

- Guardian: Home, My Profile, Reports (if enabled), Help/Logout.
- Special educator: Dashboard, Students, IEP Goals, Progress, Therapy (read), Attendance, Communications, Reviews, Reports.
- Therapist: Dashboard, Assigned Students, Therapy Tracker, Relevant Goals/Progress, Reviews (contribution only).
- Psychologist: Dashboard, Assigned Students, Assessments, PLOP contributions, Reviews (contribution only).
- School head: Dashboard, Students, IEP Reviews, Approvals, Reports.
- School admin: Dashboard, Users, Students/Links, Assignments, Reports, Settings.

Navigation visibility improves usability but **is not a security boundary**. Every API route must independently enforce the same permission.

---

## 4. Fixed technical architecture

Use one frontend, one backend API and one relational database. Do not switch to MongoDB or store core IEP relationships in unstructured JSON.

### 4.1 Stack

| Layer | Selected technology | Reason |
|---|---|---|
| Frontend | React + TypeScript + Vite | Straightforward SPA and predictable build tooling |
| Styling | Tailwind CSS v4 using the official Vite plugin; supplied CSS variables/tokens | Allows the supplied design tokens to be applied consistently |
| Routing | React Router | Explicit route map and protected route wrappers |
| Server state | TanStack Query | API fetching, caching, invalidation and loading/error states |
| Forms | React Hook Form + Zod | Consistent validation on all data-entry forms |
| Charts | Recharts | Progress charts sourced from actual progress entries |
| Icons | lucide-react | Minimal consistent line icons for the left navigation |
| Backend | Python + FastAPI | Typed REST API with request validation and automatic OpenAPI documentation |
| ORM / database migrations | SQLAlchemy 2 + Alembic | Relational persistence and controlled schema changes |
| Database | PostgreSQL | Referential integrity, role/school scoping and reliable structured data |
| Password security | `pwdlib[argon2]` | Argon2 password hashing |
| Excel | openpyxl | Generate real `.xlsx` files on the backend |
| Backend tests | pytest, pytest-cov, httpx | Unit and API/integration testing |
| Frontend tests | Vitest, React Testing Library | Component and form tests |
| Browser tests | Playwright | Role-based end-to-end journeys and responsive checks |
| Linting | Ruff (Python), ESLint (TypeScript/React) | Catch common defects before completion |

Use the supported Node.js **26 LTS** line for this build. The Node.js release schedule lists 26.x as LTS from 28 October 2026; do not use an alpha release. If the available environment cannot install 26, Node 24 LTS is an acceptable fallback. See the official release schedule: https://nodejs.org/en/about/previous-releases

### 4.2 API architecture

Use a layered backend. Do not put all logic in route handlers.

- `api`: HTTP routes, authentication dependencies, request/response handling.
- `schemas`: Pydantic request and response contracts.
- `models`: SQLAlchemy database models.
- `repositories`: database query functions; all queries must include school/student access scope.
- `services`: business rules for IEP plans, goals, progress, therapy, reviews and exports.
- `core`: settings, database connection, authentication, permission policies and logging.
- `exports`: Excel workbook builder and export sanitisation.

The browser talks only to the FastAPI API. It must not connect directly to PostgreSQL.

### 4.3 API conventions

- Prefix all application endpoints with `/api/v1`.
- Use JSON for normal CRUD requests and responses.
- Use UUIDs for external record identifiers.
- Use ISO 8601 date/time values; store timestamps in UTC and display in the user's local timezone.
- Use pagination for list endpoints (`page`, `page_size`, `total`). Set a safe maximum page size (for example 100).
- Use consistent response/error shapes. Do not return raw Python tracebacks to the browser.
- Validate all user input on the backend, even when the frontend also validates it.
- Return `401` for unauthenticated requests, `403` for authenticated but forbidden actions and `404` where appropriate to avoid revealing another school's record existence.
- Generate OpenAPI docs at `/docs` in development. Disable or protect them in production if required by the deployment environment.

---

## 5. Database schema — implement as relational tables

Use UUID primary keys, `created_at` and `updated_at` timestamps where relevant, foreign keys, useful indexes and explicit constraints. Apply Alembic migrations; do not rely on automatic table creation at application startup.

### 5.1 Core identity and access tables

**`schools`**

- `id`, `name`, `code`, `address` (optional), `is_active`, `created_at`.

**`users`**

- `id`, `email` (unique, normalised lowercase), `password_hash`, `full_name`, `phone` (optional), `is_active`, `last_login_at`, `created_at`, `updated_at`.
- Do not store plaintext passwords.

**`school_memberships`**

- `id`, `school_id`, `user_id`, `role`, `is_active`, `created_at`.
- `role` is one of `guardian`, `special_educator`, `therapist`, `psychologist`, `school_head`, `school_admin`.
- Unique constraint on `(school_id, user_id, role)`.

**`guardian_student_links`**

- `id`, `school_id`, `guardian_user_id`, `student_id`, `relationship_label` (optional), `is_primary`, `created_at`, `is_active`.
- Unique active link per guardian/student.
- A guardian can have many linked children; a child can have more than one guardian.

**`staff_student_assignments`**

- `id`, `school_id`, `staff_user_id`, `student_id`, `assignment_type`, `created_at`, `is_active`.
- Used by educator, therapist and psychologist access checks.

**`user_sessions`**

- `id`, `user_id`, `refresh_token_hash`, `expires_at`, `revoked_at`, `created_at`, `last_used_at`.
- Store a hash of the refresh token, not the raw token. Support logout and administrator revocation.

**`password_reset_tokens`**

- `id`, `user_id`, `token_hash`, `expires_at`, `used_at`, `created_at`.
- Store a hash of the reset token, not the raw token.

### 5.2 Student and IEP tables

**`students`**

- `id`, `school_id`, `admission_number`, `full_name`, `date_of_birth`, `gender` (optional), `disability_category`, `udid_number_encrypted` (optional), `enrollment_date`, `grade_class`, `diagnosis` (restricted), `strengths`, `areas_of_need`, `learning_style`, `languages_known`, `assistive_devices`, `profile_image_path` (optional), `is_active`, `created_at`, `updated_at`.
- Unique `(school_id, admission_number)`.
- Do not put guardian contact details in this table; use `users` and `guardian_student_links`.
- Mask UDID in normal UI responses. Restrict decryption to explicit permission.

**`present_level_records`**

- `id`, `school_id`, `student_id`, `domain`, `current_performance`, `assessment_method`, `baseline_value` (optional), `remarks`, `assessed_by_user_id`, `assessed_at`, `guardian_visible`, `created_at`.
- Domain values: `academic`, `communication`, `social_skills`, `behaviour`, `motor_skills`, `cognitive_skills`, `adl`, `emotional_development`, `vocational_skills`.
- Preserve previous records; create a new assessment record when performance is re-evaluated.

**`iep_plans`**

- `id`, `school_id`, `student_id`, `academic_year`, `start_date`, `end_date`, `status`, `version`, `created_by_user_id`, `approved_at`, `archived_at`, `created_at`, `updated_at`.
- Status values: `draft`, `active`, `in_review`, `approved`, `archived`.
- Keep historical plans; do not overwrite a previous academic year's plan.

**`iep_goals`**

- `id`, `school_id`, `iep_plan_id`, `student_id`, `domain`, `annual_goal`, `teaching_strategies`, `responsible_staff_user_id` (optional), `timeline`, `evaluation_method`, `status`, `created_by_user_id`, `created_at`, `updated_at`.
- Status values: `not_started`, `in_progress`, `achieved`, `not_achieved`, `on_hold`.

**`goal_objectives`**

- `id`, `school_id`, `goal_id`, `objective_text`, `sequence_number`, `target_date` (optional), `success_criteria` (optional), `created_at`, `updated_at`.

**`progress_entries`**

- `id`, `school_id`, `student_id`, `goal_id`, `objective_id` (optional), `term`, `rating`, `observation`, `assessed_by_user_id`, `observed_at`, `evidence_attachment_id` (optional), `created_at`.
- `term` values: `baseline`, `term_1`, `term_2`, `term_3`, `final`.
- `rating` must be an integer from 0 through 4, enforced by both Pydantic validation and a database check constraint.
- Allow multiple dated observations over time. Do not overwrite progress history.

### 5.3 Therapy, accommodation and communication tables

**`therapy_sessions`**

- `id`, `school_id`, `student_id`, `goal_id` (optional), `therapy_type`, `therapist_user_id`, `session_date`, `duration_minutes`, `progress_notes`, `outcome` (optional), `next_steps` (optional), `guardian_visible`, `created_at`, `updated_at`.
- Therapy types: `speech_therapy`, `occupational_therapy`, `physiotherapy`, `behaviour_therapy`, `counselling`, `other`.

**`accommodations`**

- `id`, `school_id`, `student_id`, `area`, `accommodation`, `modification`, `assistive_technology`, `responsible_staff_user_id` (optional), `effective_from`, `effective_to` (optional), `is_active`, `created_at`, `updated_at`.
- Areas: `classroom`, `examination`, `learning_materials`, `communication`, `mobility`.

**`parent_interactions`**

- `id`, `school_id`, `student_id`, `guardian_user_id` (optional), `recorded_by_user_id`, `interaction_date`, `mode`, `discussion_points`, `action_taken`, `acknowledgement_status`, `acknowledged_at` (optional), `created_at`, `updated_at`.
- Modes: `meeting`, `call`, `email`, `other`.
- Record acknowledgement status and timestamp. Do not treat a typed name as a legally verified digital signature.

### 5.4 Assessments, attendance, reviews and audit tables

**`assessment_records`**

- `id`, `school_id`, `student_id`, `assessment_type`, `domain` (optional), `assessment_date`, `assessor_user_id` (optional), `external_assessor_name` (optional), `summary`, `recommendations` (optional), `guardian_visible`, `attachment_id` (optional), `next_review_date` (optional), `created_at`, `updated_at`.
- Assessment types include `psychological`, `educational`, `medical`, `observation`, `functional` and `other`.

**`attendance_records`**

- `id`, `school_id`, `student_id`, `attendance_date`, `status`, `reason` (optional), `recorded_by_user_id`, `created_at`, `updated_at`.
- Status values: `present`, `absent`, `leave`, `other`.
- Unique `(student_id, attendance_date)` unless the school explicitly requires multiple daily sessions; use one daily record in the initial build.

**`iep_reviews`**

- `id`, `school_id`, `student_id`, `iep_plan_id`, `review_type`, `scheduled_date`, `conducted_at` (optional), `review_notes` (optional), `status`, `created_by_user_id`, `created_at`, `updated_at`.
- Review type: `quarterly`, `half_yearly`, `annual`.

**`iep_approvals`**

- `id`, `school_id`, `iep_review_id`, `approver_user_id`, `required_role`, `status`, `comment` (optional), `decision_at` (optional), `created_at`, `updated_at`.
- Status: `pending`, `approved`, `rejected`.
- The guardian may only submit their own approval/acknowledgement, not another person's.

**`attachments`**

- `id`, `school_id`, `student_id`, `uploaded_by_user_id`, `original_filename`, `stored_filename`, `content_type`, `file_size_bytes`, `storage_path`, `checksum`, `created_at`.
- Store files outside the public frontend directory. Authorise every download. Validate extension, MIME type, size and file content. Never trust the uploaded filename as a path.

**`audit_logs`**

- `id`, `school_id`, `actor_user_id`, `action`, `entity_type`, `entity_id`, `before_snapshot` (JSONB, optional), `after_snapshot` (JSONB, optional), `created_at`.
- Log sign-in events, role/assignment changes, sensitive record access where appropriate, create/update/archive actions, approvals and exports.
- Never write passwords, raw tokens, full UDID values or uploaded file contents into logs.

### 5.5 Database rules

- Every student-linked record must be scoped to the same `school_id` as its student.
- Use transactions for multi-table operations (for example, creating an IEP plan and its goals).
- Use `ON DELETE RESTRICT` or soft archive for important educational records. Do not cascade-delete a student's history accidentally.
- Add indexes on `school_id`, `student_id`, `iep_plan_id`, `goal_id`, `session_date`, `assessment_date`, `attendance_date` and fields used for filtering.
- Use database constraints for required values, enum values where appropriate, unique keys and rating bounds.
- Do not put entire student profiles, IEP goals or therapy histories into one JSON column. JSONB is acceptable for audit snapshots and flexible settings only.

---

## 6. Permission matrix and data protection

Access control is a core requirement because the application stores information about children and may store disability, diagnosis, therapy, psychological and medical data.

| Action / record | Guardian | Special educator | Therapist | Psychologist | School head | School admin |
|---|---|---|---|---|---|---|
| View linked student overview | Own linked children | Assigned students | Assigned students | Assigned students | School scope | School scope |
| Edit student identity/profile | No | Yes, assigned/authorised | No | No | By explicit permission | Yes |
| View diagnosis/UDID | Only fields explicitly approved for guardian | Yes if needed | Minimum relevant fields | Minimum relevant fields | By permission | Administrative need only |
| Edit PLOP | No | Yes | Permitted contribution | Permitted contribution | Review | No by default |
| Edit IEP goals | No | Yes | No (may contribute observations) | No (may contribute assessment) | Review/approve | No by default |
| Add progress observation | No | Yes | Only relevant assigned goal if granted | No by default | Read/review | No |
| Add therapy session | No | No | Yes, assigned students | No | Read | No |
| Edit accommodations | No | Yes | No | No | Review | No |
| Add parent interaction | Acknowledge/view permitted items | Yes | No by default | No by default | Read | No |
| Add assessment | No | Educational assessments if assigned | Therapy-related assessment if assigned | Psychological assessment | Read by permission | No |
| Edit attendance | No | Yes | No | No | Read | Yes if authorised |
| Approve IEP review | Own acknowledgement only | Educator approval | Own required approval | Own required approval | School-head approval | No by default |
| Export Excel | Linked child only, permitted fields | Assigned students | Therapy-only permitted scope | Assessment-only permitted scope | School scope | School scope |
| Manage accounts/links | No | No | No | No | Limited if authorised | Yes |

### Security implementation requirements

1. Enforce role checks in FastAPI dependencies/service policies, not only in React route guards.
2. Enforce student assignment and guardian-child link checks on every student-specific request. Test direct URL/API access attempts (IDOR tests).
3. Apply `school_id` scoping in repository queries. A user from one school must never retrieve another school's records by changing a UUID.
4. Hash passwords with Argon2. Never log or return password hashes.
5. Use a signed access token in a short-lived `HttpOnly` cookie (about 20 minutes) and a rotating opaque refresh token whose hash is stored in `user_sessions`. Store cookies as `HttpOnly`, `Secure` in production and `SameSite=Lax` or stricter where compatible. Add CSRF protection for cookie-authenticated state-changing requests. `POST /auth/refresh` rotates the refresh token; logout revokes the session record.
6. Do not store long-lived tokens in `localStorage`.
7. Rate-limit login and password-reset requests. Add temporary lockout/backoff after repeated failures.
8. Set strict CORS origins. Do not use wildcard CORS with credentials.
9. Validate uploads, set a maximum file size (start with 10 MB, configurable), store with random server-side filenames, and require authentication/authorisation for downloads.
10. Do not expose private attachment paths or diagnosis/UDID values in public URLs, browser logs or analytics.
11. Use HTTPS in deployment, database backups, encrypted storage/volume and environment-managed secrets. Do not commit `.env` files.
12. Use synthetic sample records only in development and automated testing.
13. Before using real student records, have the institution review access policy, consent, data retention, hosting, backup and applicable legal obligations. This technical build is not itself a legal-compliance certification.

---

## 7. API endpoint plan

Implement endpoints under `/api/v1`. Names may be adjusted slightly to match REST conventions, but every capability below must exist.

### 7.1 Authentication and account

- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh`
- `GET /auth/me`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /users/me`
- `PATCH /users/me` (only permitted basic fields)

### 7.2 Guardian and student

- `GET /guardians/me/children`
- `GET /guardians/me/profile`
- `GET /students` (staff filters; always permission-scoped)
- `POST /students` (authorised staff/admin)
- `GET /students/{student_id}`
- `PATCH /students/{student_id}`
- `GET /students/{student_id}/guardians`
- Admin-only guardian link/unlink endpoints.

### 7.3 IEP and PLOP

- `GET /students/{student_id}/plop`
- `POST /students/{student_id}/plop`
- `PATCH /plop/{record_id}` (only if editing a draft/current record is permitted; preserve previous assessment history)
- `GET /students/{student_id}/iep-plans`
- `POST /students/{student_id}/iep-plans`
- `GET /iep-plans/{iep_plan_id}`
- `PATCH /iep-plans/{iep_plan_id}`
- `POST /iep-plans/{iep_plan_id}/goals`
- `PATCH /goals/{goal_id}`
- `POST /goals/{goal_id}/objectives`
- `PATCH /objectives/{objective_id}`

### 7.4 Progress, therapy, accommodation, communication

- `GET /students/{student_id}/progress`
- `POST /goals/{goal_id}/progress-entries`
- `GET /goals/{goal_id}/progress-entries`
- `GET /students/{student_id}/therapy-sessions`
- `POST /students/{student_id}/therapy-sessions`
- `PATCH /therapy-sessions/{session_id}`
- `GET /students/{student_id}/accommodations`
- `POST /students/{student_id}/accommodations`
- `PATCH /accommodations/{accommodation_id}`
- `GET /students/{student_id}/parent-interactions`
- `POST /students/{student_id}/parent-interactions`
- `PATCH /parent-interactions/{interaction_id}`
- `POST /parent-interactions/{interaction_id}/acknowledge` (guardian's own acknowledgement only)

### 7.5 Assessments, attendance and reviews

- `GET /students/{student_id}/assessments`
- `POST /students/{student_id}/assessments`
- `PATCH /assessments/{assessment_id}`
- `POST /students/{student_id}/attachments`
- `GET /attachments/{attachment_id}/download`
- `GET /students/{student_id}/attendance`
- `POST /students/{student_id}/attendance`
- `PATCH /attendance/{attendance_id}`
- `GET /students/{student_id}/iep-reviews`
- `POST /students/{student_id}/iep-reviews`
- `PATCH /iep-reviews/{review_id}`
- `POST /iep-reviews/{review_id}/approvals`
- `POST /approvals/{approval_id}/decision`

### 7.6 Reports and export

- `GET /reports/summary` — only information allowed for the current role.
- `POST /exports/iep-workbook` — accepts a validated export selection and returns an `.xlsx` file.
- Optional `GET /exports/history` — list the requester's own export events, if useful for the UI.

Every endpoint must have tests for both allowed and forbidden access. A `student_id` in a URL is never sufficient proof of access.

---

## 8. Excel export — required end-to-end implementation

The Excel export is a required feature, not a future enhancement. Implement it as a server-side Python service using **openpyxl**.

### 8.1 Where to place the button

- Put a visible **Export Excel** action in the top-right toolbar of the Reports & Export Centre.
- Put contextual export actions on the Progress Monitoring, Therapy Tracker, Attendance, Assessment Records and student overview/report areas where exporting that section is useful.
- In the Guardian portal, expose only a child-specific export action if the school enables it. It must export only that guardian's linked child and only fields/records marked guardian-visible.
- Do not show a school-wide export button to a guardian or a restricted staff role.

The button opens an export dialog; it must not immediately download an ambiguous or over-broad report.

### 8.2 Export dialog fields

Provide only relevant options based on the requesting role:

- Export scope: current child / selected permitted children / all permitted school students.
- Reporting period: all records / academic year / custom date range.
- Term: all / baseline / Term 1 / Term 2 / Term 3 / final where applicable.
- Worksheets: show the eight required sheets; default to all sheets that the role is permitted to export.
- Include guardian contact details: off by default and only available to staff roles with explicit permission.
- Confirm scope and number of students before generating.

A guardian must never be able to type an arbitrary student ID and export that student's records.

### 8.3 Required workbook structure

Create an Excel workbook named similar to `Siddhi_IEP_<student-or-school>_<YYYYMMDD>.xlsx` with these exact worksheet names:

| Worksheet | Required columns / contents |
|---|---|
| `Student Database` | Admission Number, Student Name, Date of Birth, Gender, Disability Category, Enrollment Date, Grade/Class, School, Diagnosis (only when authorised), Strengths, Areas of Need, Learning Style, Languages Known, Assistive Devices, Guardian Name/Contact (only when authorised) |
| `IEP Goals` | Student, Academic Year, Domain, Annual Goal, Short-Term Objective, Teaching Strategies, Responsible Staff, Timeline, Evaluation Method, Goal Status |
| `Progress Monitoring Dashboard` | Student, Goal, Baseline Rating, Term 1 Rating, Term 2 Rating, Term 3 Rating, Final Rating, Final Status, Latest Observation Date; include the scale legend below the data or in a clearly labelled block |
| `Therapy Tracker` | Date, Student, Therapy Type, Goal Addressed, Therapist Name, Duration (minutes), Progress Notes, Guardian Visibility |
| `Attendance Record` | Date, Student, Status, Reason, Recorded By |
| `Parent Communication Log` | Date, Student, Guardian, Mode of Communication, Discussion Points, Action Taken, Acknowledgement Status, Recorded By |
| `Assessment Reports` | Date, Student, Assessment Type, Domain, Assessor, Summary, Recommendations, Next Review Date, Attachment Filename, Guardian Visibility |
| `Automated Report Cards` | Student, Academic Year, Total Goals, Achieved Goals, In-Progress Goals, Not-Achieved Goals, Goal Attainment Percentage, Mean Rating (0–4), Latest Review Date, Report Generated At |

The required performance scale must be present and match the IEP document:

| Rating | Description |
|---:|---|
| 4 | Achieved Independently |
| 3 | Achieved with Minimal Support |
| 2 | Achieved with Moderate Support |
| 1 | Achieved with Full Support |
| 0 | Not Achieved |

### 8.4 Report calculations and data rules

- `Total Goals` counts the selected student's goals in the selected plan/scope.
- `Goal Attainment Percentage` is `(number of goals explicitly marked Achieved / total goals) × 100`. If there are no goals, show blank or `N/A`, not division-by-zero.
- `Mean Rating (0–4)` is calculated from the latest valid recorded rating per goal in the selected period. Label it as a rating average, not a clinical or educational “mastery percentage”.
- Do not automatically set a goal to Achieved just because one progress entry has a rating of 4. The responsible educator must explicitly update the goal status after reviewing the evidence.
- Do not invent missing baseline or term values. Leave the relevant Excel cell blank.
- Do not expose restricted diagnosis, psychological/medical assessment summaries, UDID or guardian contact fields to a role that cannot view them in the application.
- The workbook must contain all eight worksheet tabs even when an authorised role has no rows for a particular sheet; use headers and a “No permitted records in this export” note.

### 8.5 Workbook formatting

- Use `openpyxl`; generate the workbook in memory with `BytesIO` for the initial implementation.
- Use a consistent Siddhi workbook style: clear dark text, white base, thin borders, muted header fills and restrained pastel accents from the design tokens.
- Freeze the header row (`A2`), enable autofilter, wrap long text, set readable column widths and format dates consistently.
- Add a generated-at timestamp and a small Siddhi title block where appropriate, but do not waste rows or obscure the data.
- Avoid complex macros, VBA, external links and hidden worksheets.
- Prefer calculated values written by Python rather than arbitrary spreadsheet formulas. This keeps output predictable and avoids formula-injection risks.
- Sanitize all user-controlled text that begins with `=`, `+`, `-` or `@` so it is written as text, not interpreted as a formula.

### 8.6 Backend export flow

1. Frontend opens the export dialog and obtains permitted scope options from the API.
2. User selects student(s), date range, terms and worksheets.
3. Frontend sends a validated `POST /api/v1/exports/iep-workbook` request.
4. Backend authenticates the user and independently re-checks school scope, guardian links, staff assignment and field permissions.
5. Backend fetches data using scoped database queries. Do not fetch all data and filter it in React.
6. `ExcelExportService` maps the data into the eight sheets and builds a workbook in memory.
7. Backend writes an audit event containing actor, timestamp, export type and non-sensitive filter metadata. Do not copy the workbook or sensitive data into application logs.
8. Backend returns `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` with a safe `Content-Disposition` filename.
9. Frontend downloads the file, displays success/error feedback and revokes any temporary browser object URL.

For an initial school-sized dataset, synchronous generation is sufficient. Do not introduce Celery, Redis or a job queue until measured workbook sizes make synchronous export too slow. If asynchronous exports are added later, store job status and use expiring protected downloads.

### 8.7 Export acceptance tests

- The download is a valid `.xlsx` file and opens through `openpyxl.load_workbook`.
- All eight worksheets exist with exact names and expected headers.
- A single-child export contains only that child.
- A two-child export contains only those two selected children.
- A guardian cannot export an unlinked child by changing a request body, URL, query or UUID.
- A therapist export does not contain unrelated academic, guardian-contact or restricted assessment data.
- A school-head/admin export is still restricted to their own school.
- Date and term filters remove out-of-range records.
- Missing term ratings remain blank.
- The performance scale legend is present and correct.
- Goal attainment percentage handles zero goals and is calculated correctly.
- Strings such as `=HYPERLINK(...)`, `+SUM(...)`, `-1+1` and `@SUM(...)` are exported as literal text, not formulas.
- Repeated exports do not leave files in a public/static folder or unbounded temporary storage.
- The export action is logged without logging sensitive field values.

---

## 9. Siddhi visual system — use the supplied design files

The design is **light, white-first, quiet and low-animation**. Treat `DESIGN.md` as the visual reference and the CSS/token files as the reusable source values. Adapt the editorial card language for an accessible education application; do not reproduce Huddle's brand name, copy, project categories or marketing layout.

### 9.1 Colour tokens

Use these values as the single source of truth:

| Token | Value | Use in Siddhi |
|---|---|---|
| Paper White | `#ffffff` | Main page background and base cards |
| Ink Black | `#151515` | Primary headings, body text, strong outlines and separators |
| Graphite | `#23241f` | Secondary text |
| Slate Gray | `#3a4444` | Form labels and muted supporting text |
| Stone Border | `#333333` | 1px structural borders where a stronger outline is needed |
| Mist Gray | `#808080` | Tertiary text and disabled labels; do not use for important low-contrast body text |
| Bone | `#e5e6e1` | Quiet secondary surface/background |
| Pale Sage | `#d3e5e9` | Soft sage card or section accent |
| Lavender Mist | `#bbb2ce` | Soft lavender card or section accent |
| Dusty Rose | `#cb9da2` | Restrained rose accent for selected status/validation surfaces |
| Deep Violet | `#453b60` | Secondary action outlines and subtle interactive emphasis |
| Burnt Amber | `#65451d` | Primary action accent and warm tag borders/text |
| Honey Gold | `#e4b976` | Small decorative highlight only; do not use as small text on white |
| Burgundy | `#5c2529` | Error text/borders with sufficient contrast |
| Blush Border | `#d79caa` | Secondary rose border accent |

**Resolve the supplied style-file conflict consistently:** some sections describe a black primary button, while the quick colour reference and colour-token note identify burnt amber as the primary-action colour and caution against using ink black as the CTA. For Siddhi, use **Burnt Amber `#65451d` as the filled primary CTA with white text**. Use Ink Black for headings and structural outlines. Use Deep Violet for secondary outlined actions. Do not let different pages choose different primary-button colours.

The pastel colours are visual accents, not an IEP rating scale. Never imply that a child's progress is good/bad merely because a decorative card is sage, lavender or rose. Progress meaning must be conveyed by explicit text labels and accessible status indicators.

### 9.2 Typography

- Primary family: `Nng, Inter, ui-sans-serif, system-ui, sans-serif`.
- Nng is named in the supplied reference but no font file is included. Do not assume the font exists. Use Inter as the dependable bundled fallback; do not fetch random font files from the internet.
- Use Roboto/system sans only for user-generated text if necessary. Use JetBrains Mono or system monospace only for IDs/timestamps.
- Suggested application sizes: 12–13px micro-labels, 14px captions, 16px default body, 18px comfortable body, 22px section headings, 29px page section headings, 40px page title maximum.
- Do not use 69px display typography inside routine application screens. The style reference is editorial; Siddhi needs readable, practical navigation and forms.
- Body text should be left-aligned. Do not use all-caps for long labels or body text.
- Use tabular numerals for dates, ratings and numeric summaries where supported.

### 9.3 Spacing and shape

- Use the supplied 4px-based spacing scale: 4, 8, 12, 16, 20, 24, 32, 40 and 48px. Use 96/144px only for large marketing-like whitespace, not routine application forms.
- Content max-width: approximately 1200px.
- Standard card padding: 24px desktop; reduce responsively on mobile.
- Default card radius: 8px.
- Large feature panel radius: 24–40px where appropriate.
- List-row radius: 24px if needed to match the reference.
- Tags and secondary pills: 100px.
- Primary CTA: fully rounded pill (1000px radius in the source tokens).
- Badges: 4px.
- Use thin borders and restrained contrast. Do not use heavy card shadows; the reference uses flat surfaces and hairline borders.

### 9.4 Components and animation

- Use one consistent button component with `primary`, `secondary`, `outline`, `ghost` and `danger` variants.
- Inputs must have visible labels, helper text and inline validation; placeholders are not labels.
- Use white cards with thin borders as the default. Reserve sage/lavender/rose fills for limited emphasis.
- Use small monochrome line icons in the left navigation; avoid icon decoration inside every data field.
- Animation is intentionally minimal: no parallax, animated gradients, bouncing cards, large entrance animations or auto-playing effects.
- Small focus/hover transitions may be used (roughly 120–150 ms), but must not delay navigation or input.
- Respect `prefers-reduced-motion: reduce`; disable non-essential transitions/animations in that mode.

### 9.5 Accessibility requirements

- Maintain at least WCAG AA contrast for normal text where feasible (4.5:1) and large text (3:1). Check all button, badge, error and pastel-card combinations.
- Do not use pale pastel backgrounds with white text. Use dark ink text on pastel surfaces.
- Statuses must have text labels and not rely on colour alone.
- All controls must be keyboard operable with visible focus rings.
- Dialogs/drawers must manage focus and return focus when closed.
- Charts need a text/table equivalent so progress is not available only visually.
- Forms must expose errors to assistive technology.
- Set a logical heading order and landmarks.

---

## 10. Frontend structure and behaviour

Suggested structure (adapt if the existing repository already has a sound equivalent):

```text
siddhi/
├── frontend/
│   ├── src/
│   │   ├── app/                 # router, providers, route guards
│   │   ├── components/          # shared buttons, cards, forms, tables, dialogs
│   │   ├── components/layout/   # sidebar, header, page shell
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── guardian/
│   │   │   ├── students/
│   │   │   ├── plop/
│   │   │   ├── iep/
│   │   │   ├── progress/
│   │   │   ├── therapy/
│   │   │   ├── accommodations/
│   │   │   ├── communications/
│   │   │   ├── assessments/
│   │   │   ├── attendance/
│   │   │   ├── reviews/
│   │   │   └── reports/
│   │   ├── lib/                 # API client, formatters, validators
│   │   ├── styles/              # tokens and global styles
│   │   └── test/                # test setup and fixtures
│   ├── e2e/                     # Playwright tests
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/
│   │   ├── core/                # config, database, security, permissions
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── repositories/
│   │   ├── services/
│   │   ├── exports/
│   │   ├── storage/
│   │   ├── seed_demo.py
│   │   └── main.py
│   ├── migrations/              # Alembic migrations
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   ├── security/
│   │   └── exports/
│   └── requirements.txt
├── scripts/
│   ├── dev-check.sh
│   └── backup-db.sh
├── docs/
├── .env.example
├── .gitignore
├── README.md
└── BUILD_STATUS.md
```

### 10.1 Frontend rules

- Use TypeScript strict mode. Avoid `any`; define API response types.
- Create one shared API client that sends credentials safely, handles session expiry and normalises errors.
- Use TanStack Query for server state. Invalidate the relevant queries after successful mutations.
- Use React Hook Form + Zod for forms. Avoid writing a different validation approach on every page.
- Create reusable components for `PageHeader`, `StudentCard`, `StudentListRow`, `StatusBadge`, `RatingScale`, `DataTable`, `EmptyState`, `LoadingState`, `ErrorState`, `ConfirmDialog` and `ExportDialog`.
- The `StudentCard` must support the two guardian-dashboard modes: one-child wide panel and multi-child grid card. It should receive data as props and not contain hard-coded students.
- Use stable keys and handle loading, empty, error and success states on every API-driven page.
- Use pagination/search/filter controls for long lists. Do not load every school record into the browser.
- Do not calculate authorisation from hidden navigation links. The backend remains authoritative.

### 10.2 Required UI states

For each data-driven view, implement:

- Initial loading state.
- Empty state when no records exist.
- Validation state for incomplete/invalid forms.
- Server error state with a retry action where safe.
- Success confirmation after save/update.
- Permission-denied state when a user navigates to a forbidden route.
- Unsaved-changes confirmation where a user could lose form data.

---

## 11. Fedora setup and installation commands

These commands assume a Fedora workstation and a Bash-compatible terminal. They avoid Conda. Use a Python virtual environment inside the repository.

### 11.1 Update Fedora and install system packages

```bash
sudo dnf upgrade --refresh -y
sudo dnf install -y \
  git curl wget unzip \
  gcc gcc-c++ make \
  python3 python3-pip python3-devel \
  postgresql-server postgresql-contrib postgresql-devel \
  openssl-devel libffi-devel
```

Check installed Python:

```bash
python3 --version
```

Use Python 3.13 or newer. The user's Fedora setup has used Python 3.14, which is suitable if the selected package versions install cleanly. Do not install Conda for this project.

### 11.2 Install Node.js 26 LTS with `fnm`

Use `fnm` so the project does not depend on Fedora's potentially older Node package:

```bash
curl -fsSL https://fnm.vercel.app/install | bash
```

Close and reopen the terminal, or load the shell configuration (`source ~/.bashrc` for Bash). Then run:

```bash
fnm install 26
fnm use 26
node --version
npm --version
```

The Node.js 26 line is the LTS line as of this plan's date. Do not install Node 27 alpha for this project.

### 11.3 Install and initialise PostgreSQL

```bash
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql
systemctl status postgresql --no-pager
```

Create a local application role and database:

```bash
sudo -u postgres psql
```

In the PostgreSQL prompt:

```sql
CREATE ROLE siddhi_user LOGIN;
\password siddhi_user
CREATE DATABASE siddhi OWNER siddhi_user;
\q
```

The `\password` command prompts for a local development password. Do not use the `postgres` superuser as the application's database account.

Test the connection (replace the password with the local one you set):

```bash
psql "postgresql://siddhi_user:YOUR_LOCAL_PASSWORD@127.0.0.1:5432/siddhi" -c "SELECT version();"
```

### 11.4 Create the repository and Python environment

```bash
mkdir -p ~/Projects/siddhi
cd ~/Projects/siddhi
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel
```

Create `backend/requirements.txt` containing:

```text
fastapi[standard]
sqlalchemy>=2.0
psycopg[binary]
alembic
pydantic-settings
pwdlib[argon2]
PyJWT[crypto]
python-multipart
email-validator
openpyxl
ruff
pytest
pytest-cov
httpx
```

Install:

```bash
mkdir -p backend
python -m pip install -r backend/requirements.txt
```

Do not add packages unless a real implementation need exists. After the environment is working, pin and lock the tested dependency versions. Commit the lock/requirements file, not the virtual environment.

### 11.5 Create the React + TypeScript frontend

From the repository root:

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install react-router-dom @tanstack/react-query react-hook-form zod @hookform/resolvers recharts lucide-react @fontsource-variable/inter
npm install tailwindcss @tailwindcss/vite
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom @playwright/test @axe-core/playwright
npx playwright install chromium
```

Configure Tailwind CSS v4 using `@tailwindcss/vite` in `vite.config.ts` and `@import "tailwindcss";` in the global stylesheet. Do not use the old Tailwind v3 `@tailwind base/components/utilities` setup.

On Fedora, if Playwright reports missing Chromium shared libraries, install the missing Fedora packages reported by the browser launch error and rerun `npx playwright install chromium`. Do not attempt to install Debian `apt` packages on Fedora. Keep Playwright browser binaries in the user's cache, not the repository.

### 11.6 Environment configuration

Create `.env` in the repository root or the backend's configured environment path and keep it out of Git. Create `.env.example` with placeholder values only.

Example settings:

```dotenv
APP_ENV=development
APP_NAME=Siddhi
API_PREFIX=/api/v1
DATABASE_URL=postgresql+psycopg://siddhi_user:YOUR_LOCAL_PASSWORD@127.0.0.1:5432/siddhi
SECRET_KEY=GENERATE_A_LONG_RANDOM_VALUE
ACCESS_TOKEN_MINUTES=20
SESSION_REFRESH_DAYS=7
FRONTEND_ORIGIN=http://127.0.0.1:5173
UPLOAD_DIR=./var/uploads
MAX_UPLOAD_SIZE_MB=10
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM=
```

Generate a secret with:

```bash
python -c 'import secrets; print(secrets.token_urlsafe(48))'
```

Put the output into `.env`; do not commit it. The backend must fail safely at startup if required production secrets are missing.

### 11.7 Git ignore

At minimum, add:

```gitignore
.env
.env.*
!.env.example
.venv/
__pycache__/
.pytest_cache/
.ruff_cache/
.coverage
htmlcov/
node_modules/
dist/
playwright-report/
test-results/
var/uploads/
*.sqlite3
```

Never commit uploads, local secrets, test databases or generated export files.

---

## 12. Build phases and phase gates

**Do not skip or combine phases just to generate more files.** Each phase ends with a verifiable deliverable and tests.

### Phase 0 — Repository inspection and build plan

Tasks:

- Inspect the current repository and identify whether any starter code exists.
- Record existing languages, packages, routes, design files and environment versions.
- Preserve existing valid work. Do not overwrite a working frontend or backend without a reason.
- Create/update `README.md`, `.gitignore` and `BUILD_STATUS.md`.

Gate:

- Repository inventory is recorded.
- Agreed stack is recorded.
- No existing work was deleted unintentionally.

### Phase 1 — Project scaffold and local environment

Tasks:

- Create frontend and backend directories.
- Install the required packages.
- Configure Vite, Tailwind v4, TypeScript strict mode, FastAPI, settings and database connectivity.
- Add `/health` endpoint and frontend placeholder shell.
- Add `.env.example` and startup instructions.

Gate:

- Frontend loads at `http://127.0.0.1:5173`.
- Backend loads at `http://127.0.0.1:8000`.
- `GET /health` returns a healthy response and database connectivity can be checked separately.
- `npm run build` succeeds.

### Phase 2 — Database models and migrations

Tasks:

- Implement the schema in Section 5.
- Configure SQLAlchemy session management and Alembic.
- Create the initial migration.
- Add constraints, indexes and foreign keys.
- Add a separate test database configuration.

Gate:

- `alembic upgrade head` succeeds on an empty database.
- A second migration check produces no unexpected schema drift.
- Foreign-key, uniqueness and 0–4 rating constraints are tested.

### Phase 3 — Authentication, accounts and permission policies

Tasks:

- Implement sign-in, sign-out, current-user endpoint and password reset flow.
- Implement school membership roles, guardian/student links and staff/student assignments.
- Implement reusable permission dependencies/services.
- Protect all student-specific API access with school and relationship/assignment checks.
- Add audit logging for sign-in, account/role/link changes and sensitive administrative actions.

Gate:

- All roles can authenticate using seeded synthetic users.
- Correct role landing is returned.
- Guardian, therapist, psychologist and staff assignment boundaries pass automated tests.
- No route trusts a client-supplied role.

### Phase 4 — Design system, shell and shared components

Tasks:

- Copy the supplied `variables.css` and `theme.css` into `frontend/src/styles/` and import them from the global stylesheet. `variables.css` supplies runtime `:root` custom properties; `theme.css` supplies Tailwind v4 `@theme` values. Keep `tokens.json` as the design-token reference/source file. Do not create a second competing copy of the same tokens.
- In the global stylesheet, load Tailwind v4 and then the supplied CSS files (for example: `@import "tailwindcss";`, `@import "./variables.css";`, `@import "./theme.css";`). Verify the generated utilities and custom properties in the browser.
- Import the installed Inter fallback font in the frontend entry point (for example `import "@fontsource-variable/inter";`).
- Implement the supplied colours, spacing, typography fallbacks and radii as CSS variables.
- Build the left navigation rail, header, page container, responsive menu and role-aware navigation.
- Build buttons, fields, cards, badges, tables, dialogs, empty/loading/error states and accessible focus styles.
- Implement reduced-motion rules.

Gate:

- The shell matches the supplied wireframe proportions and the Siddhi light design.
- No heavy shadows, vivid neon colours or unnecessary animations are introduced.
- Keyboard focus is visible and mobile navigation works.

### Phase 5 — Guardian experience

Tasks:

- Implement guardian dashboard for zero, one, two and more-than-two children.
- Implement one-child wide panel exactly as described in Wireframe 1.
- Implement two-column child grid with vertical scrolling for multiple children as in Wireframe 2.
- Implement guardian profile with minimal identity panel and vertically stacked child rows as in Wireframe 3.
- Connect all views to `/guardians/me/...` APIs.

Gate:

- Test guardians with 0, 1, 2 and 5 linked children.
- The correct layout adapts without hard-coded child data.
- A guardian cannot view a child not linked to them.
- Child card navigation opens the correct student record.

### Phase 6 — Student profile and PLOP

Tasks:

- Implement student profile CRUD with restricted-field handling.
- Implement all nine PLOP domains, assessment method, baseline, remarks, assessor and history.
- Connect guardian visibility flags.

Gate:

- All documented student fields can be recorded and retrieved.
- Previous PLOP records remain available after a new assessment is created.
- Restricted fields are not returned to unauthorised roles.

### Phase 7 — IEP plans, goals and objectives

Tasks:

- Implement academic-year plans and plan status.
- Implement annual goals and short-term objectives by all relevant domains.
- Capture teaching strategies, responsible staff, timeline and evaluation method.
- Add goal detail and create/edit forms in the Goals view.

Gate:

- An educator can create a plan, goal and multiple objectives.
- An educator cannot attach a goal to another student's plan.
- Goal status and plan history persist across restarts.

### Phase 8 — Progress monitoring

Tasks:

- Implement dated progress entries and exact 0–4 rating descriptions.
- Implement baseline/Term 1/Term 2/Term 3/final summaries.
- Build charts from actual API results and include accessible text/table equivalents.
- Implement manual goal-status changes by authorised educators.

Gate:

- Only ratings 0–4 are accepted.
- Multiple observations are preserved.
- Dashboard totals match database records.
- A rating of 4 does not automatically mark a goal achieved.

### Phase 9 — Therapy, accommodations, communication, assessments and attendance

Tasks:

- Implement therapy session CRUD and filters.
- Implement accommodation/modification records by the five documented areas.
- Implement parent interaction records and guardian acknowledgement.
- Implement assessment records, visibility permissions and protected file upload/download.
- Implement attendance records and date-range summary.

Gate:

- Each feature can create, list, edit where allowed and filter actual records.
- File upload validation and attachment authorisation pass tests.
- Guardian views reveal only guardian-visible information.
- Attendance records are included in the database and report/export data.

### Phase 10 — IEP review and approval

Tasks:

- Implement quarterly, half-yearly and annual review scheduling.
- Implement review notes and role-specific approval requests.
- Implement approval decisions, timestamps and comments.
- Prevent one user from approving on behalf of another required role.

Gate:

- Review appears in the right users' pending queues.
- Each approver can record only their own decision.
- Final review status accurately reflects all required approvals.
- Audit history exists for decisions.

### Phase 11 — Excel export and automated report cards

Tasks:

- Implement `ExcelExportService` and eight exact worksheets.
- Implement export dialog, permission-aware filters, safe filename, download response and audit log.
- Implement report calculations described in Section 8.
- Add tests that reopen the generated workbook and inspect values, sheets and formula safety.

Gate:

- A user can click Export Excel and receive a valid workbook.
- All eight sheets exist.
- Row counts and values match the selected database scope.
- Cross-guardian/cross-school export attempts are rejected.
- Formula injection test strings are plain text.

### Phase 12 — Full QA, accessibility, security and release readiness

Tasks:

- Run unit, integration, permission, export and end-to-end tests.
- Test 1440px desktop, 1024px tablet and 390px mobile layouts.
- Run keyboard-only navigation and automated accessibility checks.
- Check browser console, backend logs and network errors.
- Review performance on a seeded dataset with multiple students and hundreds of goals/progress records.
- Document backup/restore commands and production environment variables.

Gate:

- All required automated tests pass.
- Production frontend build succeeds.
- No critical/high-priority security or authorisation defects remain.
- `README.md` explains Fedora setup, migrations, seed data, run, test and export behaviour.
- `BUILD_STATUS.md` records the final test outputs and any known non-blocking limitations.

---

## 13. Test plan — rigorous acceptance coverage

Tests are mandatory, not optional cleanup. Build test fixtures with synthetic records and test both success and denial paths.

### 13.1 Backend unit tests

Test at minimum:

- Password hashing and verification; plaintext password is never stored.
- Role resolution and permission policy for all six roles.
- Guardian-child link checks.
- Staff/student assignment checks.
- School isolation checks.
- PLOP domain validation.
- IEP plan status transitions.
- Goal/objective creation and ownership.
- Progress rating range 0–4 and exact rating labels.
- Goal attainment percentage, including zero-goal case.
- Mean latest rating calculation; ignore superseded/older entries when deriving the latest value.
- Review type validation and approval state calculation.
- Attendance uniqueness and status validation.
- Upload size, filename normalisation and content-type checks.
- Excel string sanitisation and safe filename generation.

### 13.2 Backend integration/API tests

Use a real test PostgreSQL database or an isolated test schema. Do not run destructive tests against the normal development database.

Test:

1. Login success and invalid credentials.
2. Inactive account cannot sign in.
3. Logout invalidates session/refresh state.
4. Guardian receives only linked children.
5. Guardian cannot access an unrelated child by UUID.
6. Guardian cannot update a goal, therapy record or assessment.
7. Special educator can manage assigned-student IEP data.
8. Special educator cannot manage an unassigned student's records.
9. Therapist can add a therapy session for an assigned child and cannot edit the IEP goal itself.
10. Psychologist can add permitted assessment data and cannot access unrelated students.
11. School head can review/approve records within their school.
12. School admin can create users and links but cannot cross school boundaries.
13. Missing/invalid CSRF token is rejected for cookie-authenticated mutations.
14. Upload/download permissions are enforced.
15. Every important create/update/approval/export produces the correct audit event.

### 13.3 Frontend component tests

Test:

- Login form validation and error display.
- Role-aware post-login route selection.
- Guardian dashboard zero-child empty state.
- Guardian dashboard exactly-one-child layout.
- Guardian dashboard two-child two-column layout.
- Guardian dashboard five-child vertical grid and stable card identity.
- Guardian profile vertically stacked child rows.
- Sidebar items change by role.
- Form validation, pending state and successful save.
- Empty/loading/error states.
- Rating scale labels match the backend.
- Progress chart and accessible text table display the same values.
- Export dialog disables options the current role cannot access.

### 13.4 Playwright end-to-end journeys

Create seeded local-only test accounts for guardian-one-child, guardian-two-children, special educator, therapist, psychologist, school head and school admin.

Required E2E journeys:

**Journey A — One-child guardian**

1. Open login page.
2. Sign in as the one-child guardian.
3. Verify the one-child wide card layout.
4. Open the child profile.
5. Open permitted progress and report views.
6. Verify restricted edit controls are absent and direct API attempts are denied.
7. Log out.

**Journey B — Multiple-child guardian**

1. Sign in as a guardian linked to two children.
2. Verify two child cards render side by side at desktop width.
3. Add a five-child fixture and verify rows continue vertically.
4. Resize to mobile and verify cards stack in one column.
5. Open child 2 and verify the correct child's records load.
6. Verify no unrelated child appears.

**Journey C — Guardian profile**

1. Sign in as guardian.
2. Open profile.
3. Verify minimal guardian information panel.
4. Verify child rows are stacked vertically and clickable.
5. Verify no extra invented guardian fields appear.

**Journey D — Educator IEP workflow**

1. Sign in as educator.
2. Open assigned student.
3. Update PLOP for a domain.
4. Create annual goal and two short-term objectives.
5. Add baseline and Term 1 progress entries.
6. Confirm dashboard values update from API data.
7. Submit plan for review.

**Journey E — Therapy workflow**

1. Sign in as therapist.
2. Open assigned child.
3. Create a speech/occupational/physiotherapy session.
4. Link a goal when appropriate.
5. Verify session appears in history.
6. Verify therapist cannot edit unrelated IEP goals.

**Journey F — Review and approval**

1. Sign in as educator and create quarterly review.
2. Verify school head receives a pending item.
3. Sign in as school head and approve/reject with a comment.
4. Verify review history and audit record.
5. Sign in as guardian and submit only their own acknowledgement if requested.

**Journey G — Excel export**

1. Sign in as an authorised educator.
2. Open Reports & Exports.
3. Select one student and a term/date range.
4. Click Export Excel.
5. Verify a `.xlsx` download.
6. Open workbook in test code and verify all eight sheets, headers, expected student rows, correct ratings, scale legend and report calculations.
7. Repeat as guardian and verify only their linked child and guardian-visible columns appear.
8. Attempt a cross-school or unrelated-child export through the API and verify denial.

### 13.5 Accessibility and visual tests

- Run axe checks on login, guardian dashboard, student overview, forms, reviews and export dialog.
- Keyboard-only: navigate sidebar, open/close dialogs, complete a form, operate dropdowns and reach export action.
- Verify focus indicators and focus return after dialogs.
- Verify contrast for all text/button/status combinations, especially text over pastel cards.
- Verify status remains understandable in grayscale and without colour.
- Verify reduced-motion preference disables non-essential transitions.
- Check screenshots at 1440×900, 1024×768 and 390×844.
- Verify no horizontal page overflow at mobile widths. Tables may use a labelled horizontal scroll container where unavoidable.

### 13.6 Performance checks

Use synthetic data large enough to reveal inefficient queries:

- At least 100 students in a school.
- At least 10 goals per student.
- Multiple progress entries per goal and therapy/attendance/assessment records.
- Verify list endpoints paginate.
- Verify dashboard endpoints do not produce an N+1 query explosion.
- Generate an Excel workbook for the test school and verify it completes without excessive memory growth.

### 13.7 Final test commands

Backend:

```bash
cd ~/Projects/siddhi
source .venv/bin/activate
cd backend
ruff check .
pytest -q --cov=app --cov-report=term-missing
```

Frontend:

```bash
cd ~/Projects/siddhi/frontend
npm run lint
npm run test -- --run
npm run build
npx playwright test
```

Also run a manual smoke test using both a one-child guardian and a multi-child guardian. Automated tests do not replace checking the actual rendered layouts.

---

## 14. Development data and local run commands

### 14.1 Seed data

Create a `seed_demo.py` script that inserts only synthetic records and is safe to run repeatedly (idempotent). Include:

- One school.
- One school administrator.
- One school head.
- Two special educators.
- One therapist.
- One psychologist.
- One guardian linked to exactly one child.
- One guardian linked to exactly two children.
- At least five synthetic students overall, with different grade/class values.
- IEP plans, goals, objectives, progress entries covering ratings 0–4, therapy sessions, accommodations, parent interactions, assessments, attendance and a pending/approved review.

Use clearly fictional names and values. Do not use real child data. Keep demo credentials local-only and document how to change them. Never run the seed script automatically in production.

### 14.2 Run the backend

From the repository root:

```bash
source .venv/bin/activate
cd backend
alembic upgrade head
python -m app.seed_demo
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 14.3 Run the frontend

In a second terminal:

```bash
cd ~/Projects/siddhi/frontend
npm run dev -- --host 127.0.0.1
```

Configure the Vite development proxy so `/api` requests go to `http://127.0.0.1:8000`. This avoids unnecessary cross-origin complexity during local development.

### 14.4 Database migration workflow

Whenever models change:

```bash
source .venv/bin/activate
cd ~/Projects/siddhi/backend
alembic revision --autogenerate -m "describe the schema change"
alembic upgrade head
```

Review autogenerated migrations before applying them. Do not blindly accept a destructive migration. Never use `drop_all()` or recreate the entire database to hide migration problems.

---

## 15. Deployment and operational requirements

Deployment is not a reason to skip security or data protection.

- Build the frontend with `npm run build` and serve it behind HTTPS.
- Run FastAPI with a production ASGI server configuration; do not use `--reload` in production.
- Use a managed or properly secured PostgreSQL instance with backups.
- Store uploads outside the public web root and serve them only through authenticated download endpoints.
- Keep secrets in environment variables/secret management, not Git.
- Configure allowed frontend origin, SMTP and upload limits explicitly.
- Add database backup and restore instructions. Verify a restore, not just that a backup command ran.
- Configure log rotation and avoid sensitive personal/medical information in logs.
- Set a retention and deletion/archive policy with the school before real student data is loaded.
- Use staging with synthetic records before production.
- Do not claim compliance with RPwD, NEP, DPDP or any other framework solely because a feature exists. Obtain institutional/legal review for the actual deployment and operating procedure.

---

## 16. Explicit non-goals for the first build

Do not spend time on these unless separately requested after the core application is complete:

- AI-based disability diagnosis, progress prediction or therapy recommendations.
- Automated decisions that label a child as successful/unsuccessful without educator review.
- Public guardian self-registration or arbitrary student linking.
- Payment processing, public social feed, messaging/chat or video calling.
- Native Android/iOS apps.
- Complex animations or a dark theme.
- Arbitrary spreadsheet scripting or user-uploaded macros.
- Multi-language translation beyond laying out the application so labels can be localised later.
- Advanced analytics not supported by the source data.

---

## 17. Final acceptance checklist

The coding agent must check every box before declaring Siddhi complete.

- [ ] Existing repository inspected and existing work preserved.
- [ ] Project starts on Fedora without Conda.
- [ ] PostgreSQL persistence and Alembic migrations work.
- [ ] All six roles authenticate and receive the correct role-specific interface.
- [ ] Guardian one-child layout matches Wireframe 1.
- [ ] Guardian multiple-child layout matches Wireframe 2, with vertical scrolling and responsive stacking.
- [ ] Guardian profile matches Wireframe 3, with minimal guardian details and vertically stacked child rows.
- [ ] All 15 view families are implemented and connected to real APIs.
- [ ] All ten IEP feature areas are covered.
- [ ] All eight specified Excel worksheets are generated.
- [ ] The 0–4 performance scale matches the source document exactly.
- [ ] PLOP contains all nine documented domains.
- [ ] Quarterly, half-yearly and annual reviews are supported.
- [ ] Role, assignment, guardian-link and school boundaries are enforced server-side.
- [ ] Sensitive records and attachments are protected.
- [ ] Export button works and downloads a valid workbook.
- [ ] Export filters, audit logging and formula-injection protection work.
- [ ] Backend unit/integration/security tests pass.
- [ ] Frontend component tests pass.
- [ ] Playwright user journeys pass.
- [ ] Accessibility, responsive and reduced-motion checks pass.
- [ ] Production frontend build succeeds.
- [ ] README and BUILD_STATUS contain reproducible commands and actual test results.
- [ ] No unresolved critical defects remain.

**Final instruction:** Build Siddhi as a usable, secure IEP tracking application with the supplied light design and guardian layouts. Do not stop after a visual prototype. Complete the data model, permissions, CRUD workflows, Excel export, tests and local run instructions before declaring the project finished.

---

## 18. Official technical references

Use these official documents when implementing setup and package-specific details:

- Node.js supported release lines: https://nodejs.org/en/about/previous-releases
- Vite project creation: https://vite.dev/guide/
- Tailwind CSS v4 with Vite: https://tailwindcss.com/docs/installation/using-vite
- FastAPI installation: https://fastapi.tiangolo.com/
- FastAPI relational database guidance: https://fastapi.tiangolo.com/tutorial/sql-databases/
- PostgreSQL on Fedora: https://developer.fedoraproject.org/tech/database/postgresql/about.html
- Playwright installation: https://playwright.dev/docs/intro
- Playwright browser installation: https://playwright.dev/docs/browsers

