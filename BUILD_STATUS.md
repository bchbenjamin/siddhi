# Siddhi — Build Status & Verification Log

**Project:** Siddhi IEP Tracking Platform  
**Current architecture:** Next.js App Router + PostgreSQL
**Deployment target:** Vercel Preview
**Production:** Unchanged; no production deployment performed
**Status:** Migration implemented; preview verified; data workflows need account-based end-to-end acceptance testing

---

## Completed in this migration pass

### 1. Next.js application runtime
- Replaced React Router navigation with Next.js App Router pathname/navigation hooks.
- Removed `react-router-dom` from the frontend dependencies.
- The Next.js application now owns the view routing, same-origin `/api/v1` API handlers, authentication, database queries and Excel export.
- Kept Python FastAPI source files as legacy migration references only; they are not deployed or used by the Next.js request path.
- Kept Python/Alembic and the existing synthetic data seed as one-off schema/provisioning tools. They are not a second application runtime.

### 2. PostgreSQL data integration
- Replaced the prior unimplemented API fallback with Next.js PostgreSQL handlers for the existing views: student list/detail, guardian children/profile, PLOP, IEP plans/goals, progress, therapy sessions, accommodations, parent interactions, assessments, attendance, IEP reviews/approvals and report summaries.
- Added create operations for the current view forms and PATCH operations for editable student and record fields.
- Added the eight-sheet `.xlsx` export in the Next.js server using ExcelJS, with school/guardian/assignment scoping, optional date filters and role-based redaction of diagnosis and guardian contacts.
- Added `/api/health` to verify the PostgreSQL connection.
- Added authorization checks for school scope, guardian-to-student links and assigned staff-to-student relationships. The new tests cover unauthenticated access and role rejection.

### 3. Authentication and account handling
- Preserved the login-specific invalid-credentials message rather than mislabelling it as an expired session.
- Added password-reset token creation, single-use/expiry validation, password hashing and session revocation.
- Added SMTP delivery when SMTP environment variables are configured; development reset URLs are logged only in development.
- Added active-role/workspace selection and retained the selected role across refresh-token rotation.
- Logout now revokes the current refresh session.

### 4. Role model
- Kept `therapist` and `psychologist` as separate roles.
- Added a distinct `psychiatrist` role for assigned-student medical/psychiatric assessments; it is not conflated with psychologist or therapist permissions.
- Updated role types, server authorization, staff navigation, documentation and the synthetic seed. The seed creates `FAC-PSYCH-001` and ensures its sample student assignment when run against a local development database.
- Students remain student records, not authenticated users; the supplied implementation plan has no student login role.

### 5. Huddle visual system
- Applied the supplied `docs/DESIGN.md` visual system to the application shell and shared components: white canvas, 1200px centered content, Inter as the Nng substitute, restrained pastel palette, 8px card corners, hairline borders, no shadows, 100px secondary pills and 1000px black primary buttons.
- Replaced the sidebar navigation shell with the reference's single-wordmark header and no visible navigation links. Existing page-level navigation remains available within the views.

### 6. Dependency and tooling cleanup
- Added ESLint flat configuration and ignored generated TypeScript build info.
- Updated Zod/resolver types for Zod 4 compatibility.
- Upgraded Vitest and applied dependency overrides for patched `uuid` and `minimatch` versions.
- `npm audit` reports zero vulnerabilities.

---

## Verification

Executed in `/home/user/Projects/siddhi/frontend`:

| Check | Result |
|---|---|
| `npm run lint` | Pass; 6 non-blocking explicit-`any` warnings remain in the SQL/data adapter |
| `npx tsc --noEmit` | Pass |
| `npm test -- --run` | Pass — 3 tests across 2 files |
| `npm run build` | Pass — Next.js production build |
| `npm audit --audit-level=high` | Pass — 0 vulnerabilities |
| `npm audit --omit=dev --audit-level=high` | Pass — 0 vulnerabilities |
| `python3 -m compileall -q backend/app` | Pass — legacy seed/schema tooling compiles |
| `git diff --check` | Pass |

### Vercel preview
- Latest verified preview: `https://siddhi-lk049nt40-bchbenjamin.vercel.app`
- Preview build state: `READY`; database health, unauthenticated API guard and invalid-login response verified.
- `GET /api/health` returned `{"status":"healthy","app":"Siddhi","database":"connected"}`.
- Unauthenticated `GET /api/v1/students` returned HTTP 401 `Authentication required`, not 501.
- Synthetic invalid login returned HTTP 401 `Invalid email or password`.
- No valid seeded account was used against the hosted database because the demo accounts are documented as local-only.

---

## Remaining acceptance work / limitations

1. The latest auth-cookie persistence, SMTP, export and single-column shell changes have been deployed to the preview and smoke-tested.
2. A successful login and role-by-role data walkthrough still require a non-production test database populated with the synthetic seed. The preview database health check confirms connectivity, not the presence of those local-only demo accounts.
3. The psychiatrist account is created by the local seed. It has not been inserted into the hosted database, and no synthetic records have been written to the hosted database.
4. The Python Alembic migration and demo seed remain provisioning tools. The deployed application runtime and API are Next.js; those provisioning scripts have not been rewritten in TypeScript.
5. The existing UI does not expose every legacy FastAPI administrative or attachment endpoint. The migration covers the currently present frontend views and their current data workflows; it should not be represented as a port of every unused legacy endpoint.
6. No commit, push or production deployment has been made. All changes remain in the working tree for review.
