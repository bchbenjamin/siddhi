# Siddhi — Comprehensive Project Context

> **Prepared:** 17 November 2026  
> **Repository:** `https://github.com/bchbenjamin/siddhi`  
> **Production URL:** `https://siddhi.bchbenjamin.in`  
> **Latest verified main commit:** `bac9d73` — `perf: use client-side history navigation and prefetch workspace tabs`

## How to use this document

This is the consolidated working context for Siddhi. It combines the available conversation history, current repository documentation, the current implementation, and the most recent browser/deployment verification. It is intended to let a future developer or coding agent continue the project without rediscovering the product, architecture, decisions, constraints, or known issues.

This is a **project-context reconstruction, not a word-for-word transcript**. Some older conversation messages were collapsed in the context available for this export. Their durable decisions and facts are included where recoverable; an unavailable exact quote or implementation detail is not invented. Sections distinguish current implementation from original plan/historical decisions and observed-but-not-yet-reverified issues.

The current repository is the source of truth for implemented behaviour. `README.md`, `docs/DATABASE_SCHEMA.md`, and `docs/DESIGN.md` are the primary project documents. `docs/SIDDHI_IMPLEMENTATION_PLAN.md` contains the original product brief and extensive acceptance requirements, but parts of its proposed stack and design tokens predate the migration to Next.js and the current Frontify-inspired theme. Do not follow superseded stack instructions in that plan as if they describe the live application.

---

# 1. Product overview

## 1.1 What Siddhi is

Siddhi is an Individualized Education Program (IEP) tracking platform for schools. It supports the work of school administrators, school heads, special educators, therapists, psychologists, psychiatrists, and guardians.

Its purpose is to bring a student's educational support information into a single, role-aware system, including:

- Student profiles and school/guardian/staff relationships.
- Present Level of Performance (PLOP) assessments across nine developmental/learning domains.
- IEP plans, annual goals, objectives, responsible staff, timelines, and evaluation methods.
- Term-wise progress monitoring and dated observations.
- Therapy sessions and progress notes.
- Classroom/examination/learning/communication/mobility accommodations and modifications.
- Parent/guardian communication records and acknowledgement status.
- Psychological, educational, medical, and other assessment records.
- Student and school attendance.
- IEP review schedules, approvals, and decisions.
- Reports and an eight-worksheet Excel export.

This is an operational educational-record system, not merely a visual prototype. Views must read and write PostgreSQL-backed records through authenticated APIs. Do not replace real data with hard-coded demo values or UI-only mock state when implementing a feature.

## 1.2 Product scope and screen families

The original implementation plan groups the required capabilities into 15 screen families. The currently implemented route families are listed in Section 5.

| Screen family | Main purpose |
|---|---|
| Authentication | Staff/guardian sign-in, password reset, logout, session handling |
| Guardian children dashboard | Show the guardian's linked children and give access to their profiles |
| Guardian profile | Minimal guardian identity/contact panel plus vertically stacked child rows |
| Staff dashboard | Role-specific school/student workload and summary |
| Student overview | Student identity, school details, guardian links, assigned staff, IEP summary |
| PLOP | Current performance and assessment evidence in nine domains |
| IEP plans/goals | Annual IEP plans, goals, objectives, strategies, evaluation methods, status |
| Progress monitoring | Baseline, Term 1, Term 2, Term 3, final ratings and observations |
| Therapy tracker | Dated therapy sessions, type, duration, linked goals, notes, outcomes, next steps |
| Accommodations | Supports, modifications, assistive technology, effective dates |
| Parent communication | Meetings/calls/emails, discussion points, actions, acknowledgement |
| Assessments | Psychological, educational, medical and other assessment records |
| Attendance | Daily present/absent/leave/other records and summaries |
| IEP reviews/approvals | Quarterly/half-yearly/annual reviews and role-based decisions |
| Reports/export | Role-filtered summary metrics and Excel workbook generation |

## 1.3 Guardian experience requirements

The original brief gives specific guardian layout requirements that should continue to guide future changes:

- **One linked child:** use one broad child-focused card/entry point with avatar or initials, concise identity/IEP information, and navigation to the child's profile. Avoid turning the dashboard into a dense administrative data table.
- **Two linked children:** show two balanced cards side-by-side on desktop.
- **More than two linked children:** continue the grid vertically. Do not make the main child list a horizontal carousel. Use two columns where the viewport can support them and one column on narrow mobile screens.
- **No linked children:** show a clear empty state advising the guardian to contact the school. Guardians must not be able to search for or link arbitrary students themselves.
- **Guardian profile:** keep guardian details minimal. Place a guardian identity/contact panel above a “Linked children” section. Each child is a full-width, keyboard-accessible row with an avatar, name, limited permitted metadata, and a clear action to open the child profile.
- Guardians can see only explicitly linked children and only records/fields approved for guardian visibility.

---

# 2. Current technology and runtime architecture

## 2.1 Current production architecture

The deployed application is a **single Next.js App Router application**. Next.js serves both the browser application and the same-origin API. The browser does not connect directly to PostgreSQL and there is no separate FastAPI service in the deployed request path.

| Layer | Current implementation |
|---|---|
| Application framework | Next.js App Router (repository build observed on Next.js 16.4.6) |
| UI | React 19 + TypeScript |
| Styling | Tailwind CSS v4 + global CSS variables/theme tokens |
| Client-side server state | TanStack React Query v5 |
| Forms/validation | React Hook Form + Zod |
| Charts | Recharts |
| Icons | `lucide-react` |
| Database | PostgreSQL |
| Database driver | `pg` (`Pool`) |
| Server API | Next.js route handlers under `/api/v1` |
| Authentication | `jose` signed JWTs, Argon2 password verification, HttpOnly cookies, rotating refresh sessions |
| Excel generation | ExcelJS in the Next.js server |
| Password reset email | Nodemailer, configured through SMTP environment variables |
| Deployment | Vercel |
| Schema migrations/seed tooling | Python + SQLAlchemy/Alembic retained under `backend/` |

### Important architecture history

The original `docs/SIDDHI_IMPLEMENTATION_PLAN.md` proposed a Vite + React Router frontend and Python/FastAPI backend. That describes the initial planned architecture, not the current deployed architecture. The project was migrated to Next.js and the request path now runs through Next.js route handlers and direct PostgreSQL queries. The former FastAPI files remain as migration/reference material and are not the live API server.

Python is still used for Alembic migrations, SQLAlchemy model/reference code, and the synthetic demo seed. Do not start a separate FastAPI process when running the current application locally; run the Next.js app.

## 2.2 Repository layout

```text
siddhi/
├── backend/
│   ├── app/                 # Legacy/reference Python API, SQLAlchemy models, seed, exports
│   └── migrations/          # Alembic migration history
├── frontend/
│   ├── app/                 # Next.js App Router, API routes, layout, catch-all page
│   ├── lib/server/          # PostgreSQL auth and data services
│   └── src/
│       ├── app/             # AuthContext and route guard
│       ├── components/      # Shared UI and layout
│       ├── features/        # Auth, guardian, student, IEP, therapy, etc. screens
│       ├── lib/             # API client, navigation, query cache, utilities
│       ├── styles/          # Global CSS and design tokens
│       └── types/           # Shared TypeScript data contracts
├── scripts/                 # Local setup helpers
├── docs/
│   ├── DATABASE_SCHEMA.md
│   ├── DESIGN.md
│   ├── LOCAL_DEVELOPMENT.md
│   └── SIDDHI_IMPLEMENTATION_PLAN.md
├── BUILD_STATUS.md
├── README.md
├── vercel.json
└── .env.example
```

### Key current files

| File | Responsibility |
|---|---|
| `frontend/app/[[...slug]]/page.tsx` | Mounts the client application for the catch-all route family |
| `frontend/app/layout.tsx` | Root HTML/body, global CSS/fonts, metadata, viewport, PWA registration |
| `frontend/src/App.tsx` | Client application, path-based route selection, persistent app frame, lazy feature imports |
| `frontend/src/app/AuthContext.tsx` | Current user, active role, authentication state, login/logout/session refresh |
| `frontend/src/app/ProtectedRoute.tsx` | Client-side role/view guard (not the security boundary) |
| `frontend/src/components/layout/PageShell.tsx` | Persistent sidebar/header shell, responsive navigation, role selector, profile/sign-out controls |
| `frontend/src/components/layout/Sidebar.tsx` | Role-specific navigation list and icons |
| `frontend/src/components/ui/index.tsx` | Shared Button, Card, Modal, Field, Input, badges, tables, etc. |
| `frontend/src/lib/navigation.tsx` | Internal client-side navigation, view transitions, hover/touch/focus prefetch |
| `frontend/src/lib/query-client.ts` | Long-lived TanStack Query cache and default query/mutation policy |
| `frontend/src/lib/api.ts` | Same-origin API client, credentials, refresh handling, error normalisation, blob downloads |
| `frontend/lib/server/auth.ts` | PostgreSQL pool, login/session/token/password-reset/role selection logic |
| `frontend/lib/server/data.ts` | Server-side API data reads/writes, role checks, student scope, validation, workbook export |
| `frontend/app/api/[...path]/route.ts` | `/api/v1` GET/POST/PATCH handler dispatch |
| `frontend/app/api/health/route.ts` | Database-aware health check |
| `frontend/src/styles/variables.css` | Current CSS color and font variables |
| `frontend/src/styles/theme.css` | Tailwind theme aliases and type/spacing/radius tokens |
| `docs/DATABASE_SCHEMA.md` | Current relational schema documentation |
| `docs/DESIGN.md` | Protected design reference; see Section 9 |

## 2.3 API request flow

- Browser API base: `/api/v1`.
- The `api` helper sends same-origin requests with `credentials: 'include'`.
- The catch-all Next.js route checks the `v1` prefix and dispatches authentication endpoints to `frontend/lib/server/auth.ts`, normal data reads/writes to `frontend/lib/server/data.ts`, and workbook export to the server-side ExcelJS generator.
- Health endpoint: `GET /api/health`.
- No CORS configuration or separate API origin is required for the current same-origin deployment.
- Normal JSON APIs use `GET`, `POST`, and `PATCH`; exports return an `.xlsx` binary response.
- Server errors are logged server-side; the API returns a normalised message instead of a stack trace.

## 2.4 Query cache and current navigation performance strategy

The current `frontend/src/lib/query-client.ts` creates a single query client for the lifetime of the application, with these defaults:

- `staleTime`: 60 seconds.
- `gcTime`: 10 minutes.
- Query retry: 1.
- `refetchOnWindowFocus`: false.
- `refetchOnReconnect`: true.
- Mutation retry: 0.

The application dynamically imports feature screens to avoid putting every screen into the initial bundle. Navigation warms feature chunks when a user hovers, focuses, or touches a destination. The sidebar also uses idle time to warm the current role's common destinations. Where appropriate, navigation prefetches the destination's React Query data.

The cache is cleared during workspace-role switching because permissions and visible records can change with the active role. Summary/list query keys include active-role scoping where needed; preserve appropriate role/school scope when adding new queries.

---

# 3. Authentication, users, roles and permissions

## 3.1 Roles implemented

The current TypeScript role union and database membership roles include:

- `guardian`
- `special_educator`
- `therapist`
- `psychologist`
- `psychiatrist`
- `school_head`
- `school_admin`

There is **no student login role**. Students are student records; authentication is for staff and guardians.

Accounts can have more than one active school/role membership. The header can show a workspace-role selector where more than one role is assigned. Role switching is performed by a server request to `/auth/select-role`; the response updates AuthContext, clears the React Query cache, and navigates to the selected role's landing route. It must not reload the browser document.

## 3.2 Login experience

- `/login` has two visual modes: **School Staff** and **Guardian**.
- Staff sign in with faculty ID; guardians sign in with email.
- The mode changes the login identifier/explanatory copy, but is not a permission grant.
- The server determines the real user and active membership after credential verification.
- Staff normally land on `/staff`; guardians land on `/guardian`.
- Password reset uses `/forgot-password` and `/reset-password`.
- Do not reveal whether a user/email exists through login or password-reset responses.
- There is no public self-registration flow.

## 3.3 Authentication implementation details

Current implementation facts from `frontend/lib/server/auth.ts`:

- Password verification uses Argon2.
- Access JWTs are signed with `jose`.
- Default access-token lifetime: 20 minutes (`ACCESS_TOKEN_MINUTES` can override it).
- Default refresh/session lifetime: 7 days (`SESSION_REFRESH_DAYS` can override it).
- Refresh tokens are stored hashed in `user_sessions`; raw refresh tokens are not persisted in the database.
- Token cookies are `HttpOnly`, `SameSite=Lax`, path `/`, and `Secure` in production.
- The PostgreSQL `Pool` is initialised lazily and currently uses `max: 5`.
- Password reset tokens are hashed, expire, and are single-use.
- SMTP variables are required for deployed password reset email delivery.
- Sign-out revokes/clears the session and returns the user to the login route.

## 3.4 Intended role access model

The original plan's role matrix is a product-policy reference. The actual server allowlists in `frontend/lib/server/data.ts` are authoritative for implemented endpoint behaviour; verify them before changing permissions. General intent:

| Role | Primary access |
|---|---|
| Guardian | Own linked children; only guardian-visible data; own permitted acknowledgements; no direct student-record editing |
| Special educator | Assigned/authorised students; educational profile, PLOP, IEP, goal/progress, accommodations, communications and attendance as allowed |
| Therapist | Assigned students; therapy records and relevant student/goal information; limited assessment/PLOP contributions where authorised |
| Psychologist | Assigned students; psychological assessment/PLOP work and relevant records |
| Psychiatrist | Assigned students; medical/psychiatric assessment scope, distinct from psychologist scope |
| School head | School-level oversight, reviews/approvals, reports and specifically permitted reads/decisions |
| School admin | School-wide administration, users/links/assignments and authorised exports; no cross-school access |

### Important server enforcement rules

1. A client-side route guard or hidden sidebar item is not an authorisation boundary.
2. Every server endpoint must authenticate and independently enforce role permissions.
3. Every student-specific read/write must enforce the active school and relationship/assignment scope.
4. Guardians must be linked to the student through `guardian_student_links`; a UUID in the URL is never proof of access.
5. Therapist, psychologist and psychiatrist access is assignment-scoped through `staff_student_assignments`.
6. Student records and all child records must be constrained to the same active `school_id`.
7. Guardian-visible fields/records must be filtered on the server, not just hidden in React.
8. Diagnosis and UDID are sensitive. Normal student reads mask UDID; full access must be explicitly authorised and audited as appropriate.
9. Do not leak cross-school existence through error messages. Use `404` or permission-appropriate responses consistent with the current API policy.
10. Synthetic seed data and demo accounts are for test environments. Never run the demo seed against a real production database by default.

---

# 4. Database model and data rules

## 4.1 Database conventions

- Database engine: PostgreSQL.
- Primary keys: UUID.
- Timestamps: timezone-aware (`TIMESTAMPTZ`); store in UTC.
- Most major entities have `created_at` and `updated_at` fields where appropriate.
- Every student-linked record carries `school_id` as well as its student/parent FK, enabling school-scoped queries.
- Use relational tables and foreign keys for core IEP data. Do not collapse student profiles, IEP goals, or therapy histories into JSON documents.
- JSONB is acceptable for safe audit snapshots or flexible settings, not as a replacement for core relational structure.

## 4.2 Tables

The documented schema includes these tables:

| Table | Purpose |
|---|---|
| `schools` | Tenant/school identity and school code |
| `users` | Staff/guardian accounts, faculty ID, email, password hash, phone, active state |
| `school_memberships` | User-to-school role memberships and active state |
| `user_sessions` | Hashed refresh-token sessions, expiry, revocation, use timestamps |
| `password_reset_tokens` | Hashed one-time password-reset tokens and expiry/use state |
| `students` | Student identity, school, DOB, class, disability category, UDID encrypted field, diagnosis, strengths, needs, learning style, language/device fields |
| `guardian_student_links` | Guardian-to-child relationship, primary status, active link |
| `staff_student_assignments` | Staff-to-student assignment type and active status |
| `present_level_records` | PLOP domain, current performance, method, baseline, remarks, assessor/date, guardian visibility |
| `iep_plans` | Academic year, start/end, status, version, creator, approval/archive timestamps |
| `iep_goals` | Plan/student/domain, annual goal, strategies, responsible staff, timeline, evaluation method, status |
| `goal_objectives` | Goal-linked objective text, sequence, target date and success criteria |
| `progress_entries` | Goal/objective, term, 0–4 rating, observation, assessor and date |
| `therapy_sessions` | Therapy type, goal, therapist, date, duration, notes, outcome, next steps, guardian visibility |
| `accommodations` | Area, accommodation, modification, assistive technology, responsible staff, effective dates and active state |
| `parent_interactions` | Guardian, date/mode, discussion, action, acknowledgement status/time and recording staff |
| `assessment_records` | Type/domain/date, assessor/external assessor, summary, recommendations, guardian visibility, attachment and next review date |
| `attendance_records` | Student/date/status/reason/recording staff |
| `iep_reviews` | Plan/student, quarterly/half-yearly/annual type, schedule/conducted time, notes and status |
| `iep_approvals` | Review, approver, required role, pending/approved/rejected status, comment and decision timestamp |
| `attachments` | Original/stored filename, MIME type, size, storage path, checksum, uploader/student/school |
| `audit_logs` | Actor/school/action/entity, safe before/after snapshots and event timestamp |

## 4.3 Relationships

```text
schools
  ├── users through school_memberships
  ├── students
  ├── guardian_student_links
  ├── staff_student_assignments
  └── all student records through school_id

students
  ├── present_level_records
  ├── iep_plans ── iep_goals ── goal_objectives
  │                    └────── progress_entries
  ├── therapy_sessions
  ├── accommodations
  ├── parent_interactions
  ├── assessment_records
  ├── attendance_records
  └── iep_reviews ── iep_approvals
```

## 4.4 Important constraints and validation rules

- `school_memberships`: unique `(school_id, user_id, role)`.
- `students`: unique `(school_id, admission_number)`.
- `guardian_student_links`: unique `(guardian_user_id, student_id)`.
- `attendance_records`: unique `(student_id, attendance_date)`.
- Progress `rating`: integer constrained to `0..4` at database and server/form levels.
- Therapy `duration_minutes`: **1 through 480 inclusive** (maximum 8 hours). This is validated in the Therapy Zod schema, the Next.js server helper, and the database check constraint introduced by migration `20261115_therapy_duration_bounds`.
- Therapy migration normalises obviously invalid historic values before adding the constraint: values over 480 are set to 60 minutes; values below 1 are set to 1 minute. Do not silently discard therapy entries.
- Session dates and other event dates should be validated; future-date handling should be field-specific (e.g. next review dates may be in the future; completed session/assessment dates ordinarily should not).
- Accommodation effective ranges must be valid and end date must not precede start date.
- Assessment next-review date must not precede assessment date.
- Report calculations must guard against division by zero and must not invent missing baseline/term values.
- A progress rating of 4 must not automatically set a goal status to “Achieved”; the responsible educator must explicitly make that decision after reviewing evidence.
- Use transactions for multi-table operations such as IEP plan + goals or reviews + approvals.
- Prefer restrictive/soft-archive deletion semantics for educational history. Preserve historical references; avoid accidental cascades of critical records.

## 4.5 Sensitive data and integrity

- Passwords, refresh tokens and reset tokens are hashes, not plaintext database fields.
- `students.udid_number_encrypted` is sensitive; normal read models should mask it. Never log full UDID.
- Diagnosis and medical/psychological information are restricted by role and visibility.
- Guardian-visible flags exist on relevant records such as PLOP, therapy, and assessments; ensure the server filters them.
- Audit snapshots must never contain passwords, raw tokens, full UDID values, file contents, or unnecessary sensitive payloads.
- Use authenticated/authorised attachment downloads. Do not expose storage paths as public URLs.
- Use HTTPS, managed secrets, database backup/restore, encrypted storage, and a school-approved retention/deletion policy before loading real student records.
- A software implementation does not itself certify compliance with DPDP, RPwD, NEP, or other laws/standards. The school must conduct the appropriate institutional/legal review.

## 4.6 Migration history

The repository contains at least these Alembic migration files:

- `8fee2c7bca17_initial_schema.py` — initial relational schema.
- `1b6c4a1f2d3e_add_faculty_id.py` — faculty ID support for staff login.
- `20261115_therapy_duration_bounds.py` — historical therapy duration clean-up and DB constraint.

Apply the schema with:

```bash
cd backend
../.venv/bin/alembic upgrade head
```

Do not run destructive migration/seed commands against production without confirming the target database and intended consequences.

---

# 5. Routes and feature behaviour

## 5.1 Browser routes

The current client-side route resolver in `frontend/src/App.tsx` handles the following paths:

| Route | View | Main access |
|---|---|---|
| `/login` | Login | Public |
| `/forgot-password` | Request password reset | Public |
| `/reset-password` | Reset password | Public |
| `/guardian` | Guardian children dashboard | Guardian |
| `/guardian/profile` | Guardian profile | Guardian |
| `/staff` | Role-specific staff dashboard | Staff roles |
| `/profile` | Active user's profile; guardian profile is selected when the active role is guardian | Authenticated |
| `/students` | Student list/search | Special educator, therapist, psychologist, psychiatrist, school head, admin |
| `/students/:studentId` | Student overview/profile | Authenticated subject to server access checks |
| `/students/:studentId/edit` | Edit student | Special educator, school head, admin (server permissions still apply) |
| `/students/:studentId/plop` | PLOP | Authenticated view; role-specific write access |
| `/students/:studentId/iep` | IEP plan/goals | Authenticated view; role-specific write access |
| `/students/:studentId/progress` | Progress monitoring | Authenticated view; role-specific write access |
| `/students/:studentId/therapy` | Therapy tracker | Authenticated view; therapist write access |
| `/students/:studentId/accommodations` | Accommodations | Authenticated view; special educator write access |
| `/students/:studentId/communications` | Parent interactions | Authenticated view; role/guardian-specific write/acknowledgement access |
| `/students/:studentId/assessments` | Assessment records | Authenticated view; allowlist includes special educator, psychologist, psychiatrist, therapist and school head for create |
| `/students/:studentId/attendance` | Student attendance | Authenticated view; educator/head/admin write scope |
| `/students/:studentId/reviews` | Student reviews/approvals | Authenticated view; decision permissions are role/approver-specific |
| `/attendance` | School-wide attendance view | Special educator, school head, admin |
| `/reviews` | School-wide review/approval view | Special educator, school head, admin |
| `/reports` | Reports & export centre | Authenticated, results and export scope server-filtered |

The route resolver lives inside a catch-all Next.js page; these are client-side workspace routes, not separate page bundles at the filesystem route level. Feature components are dynamically imported by `App.tsx`.

## 5.2 Current sidebar destinations

The current `Sidebar.tsx` intentionally offers a smaller role-specific menu than the broader original implementation plan:

- Guardian: Dashboard (`/guardian`), Reports (`/reports`), My profile (`/profile`).
- Special educator: Dashboard, Students, Attendance, Reviews, Reports, My profile.
- Therapist: Dashboard, Students, Reports, My profile.
- Psychologist: Dashboard, Students, Reports, My profile.
- Psychiatrist: Dashboard, Students, Reports, My profile.
- School head: Dashboard, Students, IEP reviews, Reports, My profile.
- School admin: Dashboard, Students, Reports, My profile.

Student sub-sections are reached through the student profile/detail navigation. Do not add menu items merely because they appeared in the initial product plan; respect the current role-navigation model unless a deliberate product change is requested.

## 5.3 Data endpoints currently implemented

The Next.js route handler exposes `/api/v1` and the server data service handles, among others:

- Auth: `/auth/login`, `/auth/logout`, `/auth/refresh`, `/auth/me`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/select-role`.
- Profile: `/profile` for authorised profile updates.
- Guardian: `/guardians/me/children`, `/guardians/me/profile`.
- Student: list, detail, guardian links, UDID view, PLOP, IEP plans/goals, progress, therapy sessions, accommodations, parent interactions, assessments, attendance and reviews.
- School-wide: `/attendance`, `/reviews`.
- Reports: `/reports/summary`.
- Export: `POST /exports/iep-workbook`.

The exact dispatch and permission checks are implemented in `frontend/lib/server/data.ts`; read that file before extending a route. `GET /api/health` checks a real PostgreSQL `SELECT 1` and returns database connection state.

## 5.4 Important feature data semantics

### Student profile

Student data includes admission number, name, DOB, gender, disability category, enrolment date, grade/class, strengths, areas of need, learning style, languages known, assistive devices, profile image path, guardian relationship(s), assigned staff and selected restricted information. UDID must remain masked in ordinary views.

### PLOP

Nine domains named in the original product brief:

1. Academic
2. Communication
3. Social skills
4. Behaviour
5. Motor skills
6. Cognitive skills
7. Activities of daily living (ADL)
8. Emotional development
9. Vocational skills

PLOP records should retain assessment date, current performance, method, baseline/evidence, remarks, assessor and guardian visibility. Preserve historical assessments instead of overwriting the record of an earlier evaluation.

### IEP and goals

- A plan is linked to a school/student and academic year, date range, status, version, creator and approval/archive timestamps.
- A goal belongs to a plan and student and captures domain, annual goal, teaching strategies, responsible staff, timeline, evaluation method and status.
- Objectives have sequence, text, optional target date and success criteria.
- Plan states documented in the schema: `draft`, `active`, `in_review`, `approved`, `archived`.
- Goal status defaults to `not_started`; preserve explicit status decisions.

### Progress

- Terms: `baseline`, `term_1`, `term_2`, `term_3`, `final`.
- Rating scale:

| Rating | Meaning |
|---:|---|
| 4 | Achieved Independently |
| 3 | Achieved with Minimal Support |
| 2 | Achieved with Moderate Support |
| 1 | Achieved with Full Support |
| 0 | Not Achieved |

- Each progress entry has a dated observation, assessor, goal, optional objective, term and rating.
- Progress history is evidence. Do not fabricate missing term values or infer “Achieved” purely from a rating.

### Therapy

Therapy types validated in the current Next.js service include `speech_therapy`, `occupational_therapy`, `physiotherapy`, `behaviour_therapy`, `counselling`, and `other`. A record includes session date, type, optional linked goal, therapist, integer duration in minutes (1–480), progress notes, optional outcome, optional next steps, and guardian visibility. The server allows only the therapist role to create therapy sessions for assigned students.

### Accommodations

Areas currently validated: `classroom`, `examination`, `learning_materials`, `communication`, `mobility`. Each record has the accommodation, optional modification, assistive technology, responsible staff and effective dates. Current write permission is special educator.

### Parent interactions

Interaction modes: `meeting`, `call`, `email`, `other`. Records include date, guardian (where linked), discussion points, action taken, acknowledgement state and recording staff. Guardian acknowledgement must be limited to the guardian's own linked context.

### Assessments

Types in the current form include `psychological`, `educational`, `medical`, `observation`, `functional`, `other`. Fields include optional domain, assessment date, external assessor, summary, recommendations, guardian visibility and next review date. Current client/server create allowlist includes special educator, psychologist, psychiatrist, therapist and school head; the server independently enforces this. Assessment visibility defaults to staff-only (`guardian_visible: false`).

### Attendance

Statuses: `present`, `absent`, `leave`, `other`. Attendance is unique per student/date. School-wide and student-level views support summaries and date filtering. Current school-wide write allowlist includes special educator, school head and school admin.

### Reviews and approvals

Review types: `quarterly`, `half_yearly`, `annual`. Review state includes `scheduled`, `in_progress`, `approved`, `revision_required`. Approval state includes `pending`, `approved`, `rejected`; each approval is tied to an approver and required role. Only the appropriate assigned approver may make a decision.

---

# 6. Reports and Excel export

## 6.1 Reports page

`/reports` presents the Reports & Export Centre and summary metrics such as:

- Total students.
- Active IEPs.
- Total goals.
- Goals achieved.
- Student summary rows with grade, disability/category, IEP year, goals, achieved goals and attainment percentage.

The data is fetched from `/api/v1/reports/summary`; it must be scoped to the active role and school. The staff dashboard also consumes this summary route for its metrics.

## 6.2 Workbook user flow

The current UI uses an **Export Excel** action that opens an **Export IEP Workbook** dialog. The dialog includes a date range (`From Date`, `To Date`), a summary of the eight included worksheets, and role-conditional options such as including diagnosis and guardian contact details. The download should include only what the current user is permitted to access.

The browser sends a validated `POST /api/v1/exports/iep-workbook` request. The Next.js server generates the workbook with ExcelJS and returns a downloadable `.xlsx` blob. The client creates a temporary object URL and triggers the file download.

## 6.3 Exact workbook worksheets

The original specification's eight worksheet names are:

1. `Student Database`
2. `IEP Goals`
3. `Progress Monitoring Dashboard`
4. `Therapy Tracker`
5. `Attendance Record`
6. `Parent Communication Log`
7. `Assessment Reports`
8. `Automated Report Cards`

Include all eight worksheet tabs even when a permitted scope has no rows for one sheet; provide headers and a clear no-permitted-records message. Do not leak restricted diagnosis, UDID, assessment or guardian-contact fields.

## 6.4 Workbook data calculations and safety

- Goal attainment percentage = explicitly Achieved goals / total goals × 100; show blank or N/A when there are no goals.
- Mean rating uses the latest valid rating per goal in the selected period and must be labelled as a rating average, not a clinical mastery percentage.
- Missing term/baseline values stay blank; never invent data.
- A rating of 4 does not automatically mark a goal Achieved.
- Workbook content from users must be treated as text, not formulas. Protect against Excel formula injection for values starting with `=`, `+`, `-`, or `@`.
- Workbook should be valid `.xlsx`; use safe filenames; do not write generated workbooks into a public static directory or leave unbounded temporary files.
- Export actions should be auditable without logging sensitive values or workbook contents.
- Guardians must never be able to choose arbitrary student UUIDs. Resolve permitted children server-side from guardian links.

### Implementation-note conflict

The original plan specifies Python/openpyxl for export because it predates the Next.js migration. The current `README.md` says the live Next.js server generates workbooks with **ExcelJS**. The current runtime implementation is authoritative; do not reintroduce a separate Python export microservice solely because of the old plan.

---

# 7. Design system and visual decisions

## 7.1 Current implemented visual direction

The current UI follows the warm editorial/atelier direction in the repository's `docs/DESIGN.md` and its CSS variables: a warm parchment canvas, white cards, ink text and outlines, warm muted secondary text, a restrained orange accent, serif display headings and sans-serif interface text. It is intentionally flat and low-shadow, with hairline borders and restrained motion.

Observed current CSS/theme values:

| Token | Current value | Purpose |
|---|---|---|
| Warm Parchment | `#f0f0eb` | Main page canvas |
| Gallery White | `#ffffff` | Cards and panels |
| Soft Linen | `#e1e1db` | Secondary surfaces |
| Mist Gray | `#d7d7cf` | Quiet fills/dividers |
| Pale Stone | `#cbcbc5` | Soft borders |
| Ash Gray | `#bfbfb8` | Decorative/icon-muted use, not important text |
| Graphite Warm | `#575753` | Secondary text |
| Charcoal Warm | `#464643` | Strong secondary text |
| Ink | `#111110` | Main text, structural border, primary button fill |
| Signal Orange | `#ff3b00` | Small functional accent/highlights |
| Deep Teal | `#042a2b` | Dark accent token |

Current font aliases:

- `--font-abc-diatype`: bundled Inter Variable / Inter fallback for interface text.
- `--font-cranny`: bundled Fraunces Variable / Fraunces / DM Serif Display / Georgia fallback for display headings.
- Satoshi and Cabinet Grotesk aliases currently resolve to Inter Variable/Inter fallback.
- The root layout imports `@fontsource-variable/inter` and `@fontsource-variable/fraunces`.

Current screen typography uses Fraunces-style serif for display/page headings and Inter for body/UI copy. Do not assume the original named brand fonts are installed; use the bundled font packages and current CSS fallback stack unless the font is explicitly supplied.

## 7.2 Spacing, shape and layout

- Main content maximum width: approximately 1200px.
- Base card radius: 8px.
- Common card surfaces are white over the parchment canvas.
- Thin borders carry structure; avoid heavy shadows and elevation stacks.
- The design document describes an 8px base unit and comfortable spacing; current app components also use responsive 4px/8px multiples.
- Display headings are editorial; form labels/body copy stay practical and readable.
- Avoid low-contrast pale text on light backgrounds. Ash Gray/Pale Stone/Mist Gray are primarily for surfaces/borders/decorative details, not essential text.
- Status must be represented with explicit words, not colour alone.
- Respect `prefers-reduced-motion`.

## 7.3 Primary/secondary buttons and icon sizing

The user specifically reported that a filled black primary button looked too tight/stingy, especially when an icon was placed next to its label. A related issue was pointed out on the guardian profile child-row action.

Rules for future button work:

- Measure the button as **icon width + gap + text width + horizontal padding + border**, not as the text width alone.
- Icons inside buttons must be fixed-size and `shrink-0` so flex layout does not squeeze them.
- Keep an explicit gap between icon and label.
- Provide adequate horizontal padding and a sensible minimum width for short pill actions; don't make the black action look compressed around the text.
- The shared `Button` component currently uses `inline-flex`, `gap-2`, fixed child SVG dimensions and `shrink-0` rules; preserve that intent when changing it.
- The guardian profile desktop child action currently reserves a minimum width (`min-w-[10.5rem]`), a visible gap, and a non-shrinking arrow icon. On mobile, it changes to a compact round chevron action.
- Check the *actual rendered width* with the icon present, at desktop and mobile widths. Do not judge it from a text-only estimate.

The relevant fixes appear in commits such as `09eacfa`, `55547d`, and `d18ddee`; see Section 10.

## 7.4 Guardian profile action

The current guardian profile renders child rows with:

- Avatar at the left.
- Child name and limited details in the flexible middle region.
- Desktop: filled “View profile” action with arrow, sized so the label and icon do not collide or squeeze.
- Mobile: a circular chevron action instead of the full text pill.

Keep the row responsive and keyboard accessible. Avoid overlapping content or letting the CTA shrink to an unreadable width.

## 7.5 Mobile navigation and native back behaviour

The user explicitly rejected a custom back button on phones: Android/browser users already have native Back navigation/gesture. The mobile header should provide the menu/hamburger, not an additional custom back button competing for space. The desktop-only back control is hidden below the medium breakpoint in the current shell.

Requirements:

- Do not position the back control and menu control so they overlap the title or each other on a phone.
- Use the browser/Android history stack for native back navigation.
- Implement predictive-back-style page transitions when the browser/platform supports the required transition APIs; do not fake native platform UI.
- Preserve sensible fallback animation/behaviour for browsers without the View Transition API.
- Respect reduced-motion settings.
- Test the real mobile viewport, not only a desktop browser resized approximately.

## 7.6 `docs/DESIGN.md` is protected

The user gave a narrow, explicit instruction regarding `docs/DESIGN.md`: only the specifically authorised font-related correction was allowed, and immediately afterwards the file was to be made read-only. The current repository file mode is `0444` (`-r--r--r--`).

**Do not reformat, rewrite, retheme, “clean up”, or otherwise modify `docs/DESIGN.md` without new explicit authorisation.** It is a protected reference. Do not change the file permissions back to writable without explicit approval. The current file title is “Frontify — Style Reference”.

The design document contains the detailed palette, font roles, spacing, radii, components, imagery and do/don't guidance. Consult it as a reference; this context file is not permission to edit it.

---

# 8. Navigation, responsiveness and perceived performance

## 8.1 Persistent workspace shell is a hard requirement

The user repeatedly and emphatically requested that switching between Dashboard, Reports, Profile, Students and other left-sidebar tabs must **not refresh the entire page**. The sidebar and top bar do not need to reload just because the view content changes.

The intended behaviour is:

- Keep the authenticated `PageShell` mounted.
- Keep the sidebar and top header stable.
- Update the browser URL/history entry.
- Render only the destination's workspace content.
- Keep React Query data and app-level auth state alive.
- Use a small page transition for route content where supported, not a full-document transition that makes the whole shell flash/reappear.

## 8.2 Navigation implementation at commit `bac9d73`

The latest implementation changed internal navigation from `router.push()`/`router.replace()` to the native History API, which Next.js patches to synchronise `usePathname` and `useSearchParams`.

- `navigateTo()` uses `history.pushState` or `history.replaceState` for same-origin paths.
- Next.js observes those history changes, so the client route resolver rerenders from `usePathname` without a new document request or an RSC page navigation.
- The authenticated `AppFrame`/`PageShell` stays mounted.
- Custom links are native anchors with same-origin interception; modified clicks, external targets and downloads retain ordinary browser behaviour.
- Browser Back/Forward uses the native history stack; popstate and existing View Transition handling animate page content where supported.
- This route model is appropriate because the app currently renders its views inside one Next catch-all route.

If a future developer changes this design, test that the shell does not remount and that no full document navigation occurs. Do not regress to routing every tab through a fresh document or a route architecture that remounts the entire shell.

## 8.3 Prefetching and code splitting

- `App.tsx` uses Next dynamic imports for feature modules.
- Sidebar destinations are warmed during idle time.
- Navigation links prefetch chunks on hover/focus/touch.
- Student profile and student sub-section data is prefetched for recognised routes where query keys are known.
- Common staff/guardian pages warm their query data as well.
- Query caches persist across route switches for up to 10 minutes, with a 60-second freshness window.

Do not prefetch sensitive records without the correct authenticated/role scope; keep query keys stable and scope them by role/school/student as relevant.

## 8.4 Responsive layout requirements

- Desktop sidebar: narrow icon rail at medium width; expands to a labelled 280px sidebar at extra-large width.
- Desktop header: persistent 72px top bar, page title on the left, profile/role/sign-out controls on the right.
- Mobile header: hamburger to open a slide-over navigation drawer; mobile drawer width is capped at `min(290px, 86vw)`.
- The main content must use `min-w-0`, flexible widths, wrapping/scroll handling and responsive grids so it does not overflow.
- Tables may use their own horizontal overflow wrapper when necessary; do not compress every column into illegible text.
- Forms and modals must fit a phone viewport and allow vertical scrolling without trapping important controls behind browser navigation bars.
- Buttons must not overflow, wrap their icons incorrectly, or squeeze labels into unreadable widths.
- Use accessible hit targets and visible focus indicators.

## 8.5 Motion behaviour

The current CSS and navigation code use the View Transition API where available, directional page animations, and fallback animations for browser-history navigation. CSS transition styles target the `.workspace-page`; `.workspace-header` and `.workspace-sidebar` are assigned their own transition names and their root/header/sidebar snapshots are kept stationary. Reduced-motion users receive minimal/no nonessential motion.

The user asked for predictive-back-style animations comparable to those seen on some Google websites. Treat native gesture prediction as browser/platform-dependent: implement and test the web-side transition path and graceful fallback, but do not claim control of Android system UI itself.

---

# 9. Historical problems, user feedback and how they were addressed

This section records the important issues raised during the project and the current known state. It is deliberately explicit so that future work does not repeat previous mistakes.

## 9.1 Production API/data loading

A prior production issue involved the site serving an older deployment while fixes had only been deployed to Preview and were not pushed to `main`. Production logs showed `501` responses for report summary and guardian child queries. The fix was to implement the missing Next.js PostgreSQL-backed API handlers, commit/push the actual changes, deploy production, and verify the database health route.

Important lesson: a successful Preview deployment is not proof that production is fixed. For future code tasks, verify the Git commit, production Vercel deployment and production URL.

## 9.2 Sidebar/top-bar full refresh

The user repeatedly said that switching from Dashboard to Reports to Profile should not refresh the entire page. Keeping `PageShell` mounted was not enough while navigation still went through the Next router in the catch-all implementation. The latest change switched custom internal navigation to `pushState`/`replaceState` so the app shell remains in place.

The final browser test on production covered Dashboard → Reports → Profile → Dashboard. The sidebar, header, account controls and page title remained in place while only the workspace content changed. Runtime logs around this test showed the login/session calls but no new page-document requests for `/staff`, `/reports`, or `/profile` during the tab changes.

## 9.3 Primary black button/icon width

The user described the black CTA as “too stingy” and pointed out that the guardian profile still had the issue. The user specifically suspected the icon's width was not included in the available label width. Follow-up fixes adjusted icon shrink behaviour, gaps, padding/min-width and the guardian profile action. Preserve the icon width in all future CTA sizing.

## 9.4 Mobile back button positioning

A phone screenshot showed a back arrow and hamburger/menu buttons placed awkwardly together near the title. The user said phones already have native back methods and do not need an additional app back button. The current header hides the custom back button below the medium breakpoint and keeps the hamburger for the mobile drawer. Native history is used for back/forward; the remaining requirement is smooth predictive-back-like page transitions.

## 9.5 Therapy duration anomaly

The user supplied a Therapy screen screenshot where a session showed an absurd duration (`1,000,000` minutes) and the Add Therapy Session form accepted an extremely large number. A migration and validation fix were added:

- `assertDuration()` enforces whole minutes from 1 to 480.
- The therapy Zod schema enforces the same bounds.
- The input has `min=1`, `max=480`, integer step.
- Migration `20261115_therapy_duration_bounds.py` normalises obviously invalid existing rows (above 480 → 60, below 1 → 1) before adding a DB check constraint.

Do not weaken this validation. If the UI shows a huge duration after deployment, inspect whether the active database actually has the migration applied and whether the row is read from a different DB/environment.

A historical screenshot also showed a therapy record dated 26 Nov 2026. As of the date this context was prepared (17 Nov 2026), that date is in the future. Verify whether such dates are intentionally scheduled entries or synthetic test-data anomalies before changing date validation.

## 9.6 Assessment create permission observation

A screenshot showed the Add Assessment Record modal under the therapist account and the inline message “Not authorized to create assessments”. The current frontend and server allowlist in the repository includes `therapist` for assessment creation, alongside special educator, psychologist, psychiatrist and school head. The screenshot may reflect an older deployment/session or an environment/assignment difference. If it is reported again, reproduce against the current production code and inspect the exact API response, active role, school membership and student assignment before changing permissions.

## 9.7 Visual testing and follow-through

The user has repeatedly called out work that was described as complete without an actual browser check or without pushing the code. Future tasks must not be considered finished merely because code compiles or a preview deploys. See the mandatory workflow in Section 13.

---

# 10. Git, deployment and current production state

## 10.1 GitHub

- Repository: `bchbenjamin/siddhi`.
- Remote: `https://github.com/bchbenjamin/siddhi`.
- Main branch: `main`.
- Last verified state: clean working tree, `main` aligned with `origin/main`.
- Latest verified commit: `bac9d73`.

## 10.2 Recent relevant commit history

The following are the most relevant recent commits visible in the repository at export time. This is not the complete Git history.

| Commit | Description |
|---|---|
| `bac9d73` | Client-side history navigation, prefetch and workspace performance improvements |
| `1a79dcc` | Browser back navigation snapshots |
| `47d80a4` | Fallback history navigation animation |
| `c2a795a` | View Transition API handling for browser history traversal |
| `ca3d361` | Respect browser history back transitions |
| `3d2ff64` | Directional workspace view transitions |
| `d18ddee` | Guardian profile action icon clarity |
| `cc08aee` | Add icon button room and reset route scroll |
| `55547d` | Guardian profile action button icon spacing |
| `6550f3e` | Guardian profile navigation active state |
| `09eacfa` | Prevent button icons squeezing labels |
| `b535dcc` | Keep authenticated shell mounted across routes |
| `c7f5bd3` | Preserve app shell navigation and size icon buttons |
| `816dcd3` | Date/duration bounds and accessibility improvements |
| `09549d1` | School-wide attendance and reviews/log improvements |
| `531341f` | Frontify-style UI redesign |
| `e138213` | PostgreSQL-backed Siddhi views in Next.js |
| `e5a3ae4` | Refresh expired authentication sessions |

## 10.3 Vercel

- Vercel project name: `siddhi`.
- Repository root is the Vercel root directory.
- `vercel.json` uses Next.js, installs with `cd frontend && npm ci`, builds with `cd frontend && npm run build`, and outputs `frontend/.next`.
- Production custom domain: `https://siddhi.bchbenjamin.in`.
- Production deployment verified on 16 Nov 2026:
  - Deployment URL: `https://siddhi-4hw0bfo5m-bchbenjamin.vercel.app`
  - Deployment ID: `dpl_6csoiGMFbqkBddkxBC7zoU5p4y99`
  - Target: production
  - State: READY
  - Alias: `https://siddhi.bchbenjamin.in`
  - Commit: `bac9d73`
- Preview deployment from the same work: `https://siddhi-6rhlfp2qj-bchbenjamin.vercel.app`.

Do not confuse the preview deployment with the custom production domain. Vercel preview deployments may have Authentication/Deployment Protection enabled.

## 10.4 Production health verification

The production endpoint was checked and returned:

```json
{"status":"healthy","app":"Siddhi","database":"connected"}
```

This is produced by `GET /api/health`, which performs `SELECT 1` against PostgreSQL. A healthy result proves the application can establish a DB connection; it does not prove every role/data route or every production record is correct.

## 10.5 Browser verification at last deployment

A browser session logged in to the production custom domain using the synthetic administrator test account documented in the README. Observed:

- Admin dashboard loaded and showed 15 students, 11 active IEPs, 13 goals and 1 achieved goal.
- Reports page loaded the same summary and student summary table.
- My Profile page loaded the administrator account/workspace information.
- Sidebar switching Dashboard → Reports → Profile → Dashboard updated content/URL without the header/sidebar disappearing or a full document navigation.
- Browser Back was also exercised between reports/profile.
- Production runtime logs in the test window showed `/login` and `/api/v1/auth/me`, but no new `/staff`, `/reports`, or `/profile` page-document requests during sidebar tab switching.

The login used a seeded-looking synthetic administrator identity (`FAC-ADMIN-001`, Sanjay Deshmukh / `admin@siddhi.test`). This test does not establish the provenance of all production rows. The README warns that demo accounts are synthetic/local-development accounts and that the demo seed must not be run against production by default. Before real student data is loaded, review and rotate/remove known demo credentials.

---

# 11. Local development, commands and environment

## 11.1 Requirements

The current README documents:

- Node.js 20+ for local Next.js operation.
- npm.
- PostgreSQL 14+.
- Python 3.11+ only for Alembic migrations and the synthetic demo seed.

The original implementation plan mentions Node.js 26 LTS (with Node 24 LTS fallback), but the current README's runtime requirement is Node 20+. Check the currently installed Vercel/local Node runtime and package compatibility before changing it.

## 11.2 Local setup flow

1. Configure root `.env` from `.env.example` with a valid `DATABASE_URL` and long random `SECRET_KEY`; add SMTP configuration only if password reset email is needed.
2. Create Python virtual environment and install backend requirements for migrations/seed.
3. Apply Alembic migrations.
4. Optionally run the synthetic demo seed against a local/test DB only.
5. Install frontend dependencies and start Next.js.

Representative commands from `README.md`:

```bash
python -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
cd backend
../.venv/bin/alembic upgrade head
../.venv/bin/python -m app.seed_demo
cd ../frontend
npm ci
npm run dev
```

Open `http://localhost:3000/login`.

## 11.3 Environment variable names

Do not copy real secrets into code, docs, issues, logs or this context file. Required/known names include:

- `DATABASE_URL`
- `SECRET_KEY`
- `FRONTEND_ORIGIN`
- `ACCESS_TOKEN_MINUTES` (default 20)
- `SESSION_REFRESH_DAYS` (default 7)
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_FROM`

Use `.env.example` for the expected local shape. Never reveal, print or commit the actual `.env`/`.env.local` secret values.

## 11.4 Validation commands

From `frontend/`:

```bash
npm run lint
npx tsc --noEmit
npm test -- --run
npm run build
```

Latest observed validation for commit `bac9d73`:

- TypeScript: passed.
- ESLint: zero errors; six existing `no-explicit-any` warnings in `frontend/lib/server/data.ts` (reported around lines 7, 68, 109, 203, 339 and 398 in that snapshot).
- Vitest: 10 tests passed (9 server data tests and 1 API client test).
- Next.js production build: passed.
- Vercel production build: passed and deployment READY.
- `git diff --check`: passed before commit.
- Git working tree: clean after push.
- Vercel install audit in that build reported zero vulnerabilities at that time.

Do not state these as permanently true; rerun validation after changing files or dependencies.

---

# 12. Synthetic demo data and test accounts

The README describes a local/test seed that provisions one school, staff and guardian accounts, student profiles, guardian links, staff assignments and sample IEP/therapy/assessment/progress entries.

**Caution:** These identities/passwords are synthetic test credentials, not real users. The README explicitly says they are for local development only, and that the seed resets their passwords. Never run the seed against production by default. If these accounts exist in a deployed database, treat them as public/demo credentials and remove or rotate them before any real student records are loaded.

## 12.1 Demo school

- St. Jude Inclusive Academy (`SJA-001`)
- Address in seed documentation: 12 Garden Valley Road, Knowledge Hub

## 12.2 Staff accounts in README

| Demo name | Role | Faculty ID | Email | Password |
|---|---|---|---|---|
| Sanjay Deshmukh (Admin) | School admin | `FAC-ADMIN-001` | `admin@siddhi.test` | `SiddhiAdmin2026!` |
| Dr. Shalini Menon | School head | `FAC-HEAD-001` | `principal@siddhi.test` | `SiddhiHead2026!` |
| Ananya Sharma | Special educator | `FAC-EDU-001` | `educator1@siddhi.test` | `SiddhiEducator2026!` |
| Rajesh Kumar | Special educator | `FAC-EDU-002` | `educator2@siddhi.test` | `SiddhiEducator2026!` |
| Priya Nair | Therapist | `FAC-THER-001` | `therapist@siddhi.test` | `SiddhiTherapy2026!` |
| Dr. Arjun Verma | Psychologist | `FAC-PSY-001` | `psychologist@siddhi.test` | `SiddhiPsych2026!` |
| Dr. Kavita Rao | Psychiatrist | `FAC-PSYCH-001` | `psychiatrist@siddhi.test` | `SiddhiPsychiatrist2026!` |

## 12.3 Guardian accounts in README

| Demo name | Email/login | Linked children | Password |
|---|---|---|---|
| Sunita Patel | `guardian.single@siddhi.test` | Aarav Patel | `SiddhiGuardian2026!` |
| Meera Iyer | `guardian.multi@siddhi.test` | Diya Iyer and Vivaan Iyer | `SiddhiGuardian2026!` |

## 12.4 Seeded student profiles in README

| Student | Admission no. | DOB | Grade/class | Category | Linked guardian |
|---|---|---|---|---|---|
<!-- Example student entries removed; see `seed_credentials.json` for actual admission numbers and details. --> Sunita Patel |
<!-- Example student entry removed -->
| Vivaan Iyer | `ADM-2026-003` | 5 Nov 2018 | Grade 2-C | ADHD with Speech Delay | Meera Iyer |
| Rohan Sen | `ADM-2026-004` | 19 Jan 2016 | Grade 4-A | Locomotor Disability (Cerebral Palsy) | No guardian account linked |
| Maya Rao | `ADM-2026-005` | 30 May 2014 | Grade 6-B | Intellectual Disability (Mild) | No guardian account linked |

Students are records, not authenticated accounts. Do not assume the current production database has only these five students; the recent production dashboard showed 15 students.

---

# 13. User instructions for future Siddhi work

These are durable instructions inferred from the user's repeated explicit feedback in this project. Treat them as operating rules when continuing the website work.

## 13.1 Actually finish the requested task

- Work against the real repository and actual deployment, not a speculative design or a detached mockup.
- Do not claim that a fix is complete simply because the source was edited or a build passed.
- For UI work, inspect the actual rendered page in a browser and verify the specific problem at the affected screen size.
- For data work, verify the actual API/DB path and permissions instead of trusting a static component preview.
- When the user asks to test something, do the test; do not substitute a plan or instructions for the work.

## 13.2 Visual verification is required for visual claims

- Use the available remote development/browser environment (the Simular box has been used for this repository) to inspect real pages and screenshots.
- Check the exact route and role implicated by the bug.
- Check desktop and narrow/mobile viewports for responsive defects.
- Check hover/focus/touch states when relevant.
- Check icons, text and button geometry together. An icon takes space; do not calculate CTA widths from text alone.
- Do not describe a page as “visually fixed” unless a browser inspection verifies that claim.

## 13.3 Push and production verification

For code changes that are intended to ship:

1. Run relevant lint/type/test/build checks.
2. Inspect the diff and `git diff --check`.
3. Commit and push to the correct GitHub branch when the user has asked for the work to be delivered.
4. Deploy the intended Vercel target; do not stop at a Preview deployment if the request concerns production.
5. Verify Vercel state/alias and the real production URL.
6. Exercise the affected production workflow and inspect logs for runtime errors or unexpected reloads.
7. Confirm the repository working tree/branch state accurately.

Never say “pushed” when only local changes exist. Never say “production fixed” based solely on Preview.

## 13.4 Scope and product integrity

- Preserve existing product intent and current screen families. Avoid adding unrelated features or redesigning unrelated modules just because they could be added.
- Prefer correcting the underlying implementation over layering more workarounds on the UI.
- Use the PostgreSQL records and current data contracts as the source of truth. Do not silently replace database-backed behaviour with fake data.
- For permission bugs, inspect both frontend role gating and server enforcement. Do not “fix” a denied action by weakening security indiscriminately.
- Do not use production demo seeding as a debugging shortcut.

## 13.5 Design and responsive requirements

- Follow the current visual language and existing tokens unless the user asks for a deliberate design change.
- `docs/DESIGN.md` is read-only and protected; do not edit it without explicit authorisation.
- On phones, avoid a redundant app back button. Use native browser/Android Back navigation and provide web-side predictive-back-style transitions where supported.
- Keep the top bar and sidebar persistent during internal navigation.
- Give primary buttons enough width/padding to fit their labels and icons comfortably.
- Always give button icons a fixed non-shrinking width and include icon width + gap in layout sizing.
- Responsive design must work on actual mobile-sized layouts, not only desktop.

## 13.6 Performance requirements

The user wants Siddhi to feel like a modern, responsive application, not like a sequence of page reloads. Future changes should preserve/improve:

- Client-side tab changes without full document reload.
- Persistent sidebar and header.
- Lazy loading/splitting of large screens.
- Prefetching of common route chunks and safe destination data.
- Query caching and deliberate invalidation.
- No unnecessary global refetching on tab/window focus.
- Fast, non-blocking transitions and minimal loading flashes.
- Good responsiveness on phones and lower-powered devices.

Avoid claiming a measured speed improvement unless an appropriate measurement or direct browser observation supports it.

## 13.7 Communication and execution style

- Be direct, precise and accountable.
- Do not ask the user to repeat information already in this context or repository.
- When the task is clear and can be acted on, do the work rather than repeatedly seeking approval for routine implementation details.
- Be transparent about anything that was not tested, any production route that could not be authenticated, and any residual uncertainty.
- Do not claim background work or future delivery; complete work in the current execution window.

---

# 14. Recommended workflow for the next developer/agent

Before changing code:

1. Read this file, `README.md`, `docs/DATABASE_SCHEMA.md`, `docs/LOCAL_DEVELOPMENT.md`, and the relevant feature/API code.
2. Check `git status --short --branch`, recent commits, and actual deployment state.
3. Read `docs/DESIGN.md` if visual context is needed, but do not edit it; it is read-only.
4. Identify whether the issue is in UI, client routing/query caching, server permission/data mapping, database schema/data, or deployment configuration.
5. Reproduce the issue in the browser and/or API before editing.

When implementing:

1. Keep the change as small as reasonably possible while fixing the root cause.
2. Maintain role/school/student scope in every query and mutation.
3. Preserve the AppFrame/PageShell persistent layout.
4. Use React Query keys that distinguish relevant role/school/student/filter scope.
5. Keep validation aligned across the client schema, Next.js server validation and database constraints.
6. Add or adjust tests for the behaviour.
7. Inspect actual rendered output and screenshots at the affected viewport.

Before declaring completion:

1. `npx tsc --noEmit`
2. `npm run lint`
3. `npm test -- --run`
4. `npm run build`
5. `git diff --check`
6. Browser test the target role/route and the relevant user interaction.
7. If shipping, push to GitHub and deploy production; verify the alias and `/api/health`.
8. Inspect Vercel runtime logs for 5xx responses, auth errors, or unexpected document navigation.
9. State exactly what was tested and what was not.

Useful current paths/commands:

```bash
# frontend checks
cd frontend
npx tsc --noEmit
npm run lint
npm test -- --run
npm run build

# database migrations
cd ../backend
../.venv/bin/alembic upgrade head

# application local dev (from repository root)
cd frontend
npm run dev
```

Do not run `python -m app.seed_demo` against production by default.

---

# 15. Known caveats and items to verify when next relevant

1. **Production data provenance:** README demo data describes five student profiles, while the recent production dashboard showed 15. The recent browser smoke test establishes that the deployed app and PostgreSQL were connected, not the provenance of every production row. Confirm the environment and data source before bulk edits or seed operations.
2. **Demo credentials:** README demo credentials are synthetic and documented for local/test use. If they remain valid in production, rotate/remove them before storing real student information.
3. **Assessment permission message:** a historical screenshot showed “Not authorized to create assessments” in a therapist session; current source includes therapist in the assessment create allowlist. Reproduce on the current deployment if it occurs again and inspect the precise API response and active membership.
4. **Therapy historic data:** invalid durations over 480 are normalised to 60 by the migration; verify that the correct migration head was applied to the active database if huge values reappear.
5. **Future-dated therapy entry:** an older screenshot displayed a therapy session dated 26 Nov 2026. Confirm whether it is an intentional future appointment or synthetic data; current create validation generally rejects future session dates.
6. **Design/plan inconsistency:** the original plan's design palette/stack differs from the current `docs/DESIGN.md` and current CSS. Use current repository files and ask for a product decision rather than silently applying the old plan's tokens.
7. **Predictive back:** browser View Transition and native Android predictive-back integration depend on browser/platform support. Keep the web-side fallback and reduced-motion behaviour correct; do not promise OS-level animation control.
8. **Lint warnings:** six `any` warnings remain in the current server data service snapshot. They are non-failing but should be reduced carefully when touching those types; do not broaden a task into a type-cleanup refactor unnecessarily.
9. **Accessibility and privacy:** the original implementation plan specifies a broader security/accessibility acceptance suite than the current lightweight tests prove. Do not infer comprehensive WCAG/legal compliance from a passing frontend build.

---

# 16. Sources inside the repository

- `README.md` — current architecture, local setup, demo accounts/data, validation, deployment.
- `docs/DATABASE_SCHEMA.md` — documented PostgreSQL entities, foreign keys, constraints and security notes.
- `docs/DESIGN.md` — protected Frontify style reference (mode `0444`, do not modify without new permission).
- `docs/LOCAL_DEVELOPMENT.md` — local development instructions.
- `docs/SIDDHI_IMPLEMENTATION_PLAN.md` — original detailed product brief, screen requirements, permissions, security, workbook specification, test plan and acceptance criteria; parts of the technical stack/design are historical and superseded.
- `BUILD_STATUS.md` — older build-status record; verify it against current git/deployment state before relying on it.

---

**End of Siddhi project context.**
