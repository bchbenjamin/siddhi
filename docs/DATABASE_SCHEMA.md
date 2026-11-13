# Siddhi database schema

This document describes the PostgreSQL schema implemented by the SQLAlchemy
models in [`backend/app/models/entities.py`](../backend/app/models/entities.py)
and the Alembic migration in
[`backend/migrations/versions/8fee2c7bca17_initial_schema.py`](../backend/migrations/versions/8fee2c7bca17_initial_schema.py).

## Conventions

- Database: PostgreSQL.
- Primary keys are UUIDs.
- `TIMESTAMPTZ` means `DateTime(timezone=True)`.
- `created_at` and `updated_at` are UTC timestamps where the model uses
  `TimestampMixin`.
- `PK` is primary key, `FK` is foreign key, and `NN` means not nullable.
- Foreign-key actions are listed as `ON DELETE`.
- This is the current schema, not a future design. Update this document with
  every migration that changes a table.

## Entity relationship summary

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

## Tables

### `schools`

| Column | PostgreSQL type | Null | Constraints / meaning |
|---|---|---:|---|
| `id` | `UUID` | no | PK |
| `name` | `VARCHAR(255)` | no | School name |
| `code` | `VARCHAR(50)` | no | Unique indexed school code |
| `address` | `TEXT` | yes | Address |
| `is_active` | `BOOLEAN` | no | Defaults `true` |
| `created_at` | `TIMESTAMPTZ` | no | Creation time |

### `users`

| Column | PostgreSQL type | Null | Constraints / meaning |
|---|---|---:|---|
| `id` | `UUID` | no | PK |
| `faculty_id` | `VARCHAR(50)` | yes | Unique indexed staff login ID; guardians leave this empty |
| `email` | `VARCHAR(255)` | no | Unique indexed login email |
| `password_hash` | `VARCHAR(255)` | no | Argon2 password hash |
| `full_name` | `VARCHAR(255)` | no | Display name |
| `phone` | `VARCHAR(50)` | yes | Contact phone |
| `is_active` | `BOOLEAN` | no | Defaults `true` |
| `last_login_at` | `TIMESTAMPTZ` | yes | Last successful login |
| `created_at` | `TIMESTAMPTZ` | no | Creation time |
| `updated_at` | `TIMESTAMPTZ` | no | Last update time |

### `school_memberships`

| Column | PostgreSQL type | Null | Constraints / meaning |
|---|---|---:|---|
| `id` | `UUID` | no | PK |
| `school_id` | `UUID` | no | FK `schools.id`, `RESTRICT` |
| `user_id` | `UUID` | no | FK `users.id`, `CASCADE` |
| `role` | `VARCHAR(50)` | no | guardian, special_educator, therapist, psychologist, school_head, school_admin |
| `is_active` | `BOOLEAN` | no | Defaults `true` |
| `created_at` | `TIMESTAMPTZ` | no | Creation time |

Unique: `(school_id, user_id, role)`.

### `user_sessions`

| Column | PostgreSQL type | Null | Constraints / meaning |
|---|---|---:|---|
| `id` | `UUID` | no | PK |
| `user_id` | `UUID` | no | FK `users.id`, `CASCADE` |
| `refresh_token_hash` | `VARCHAR(255)` | no | Indexed hash; raw token is not stored |
| `expires_at` | `TIMESTAMPTZ` | no | Refresh expiry |
| `revoked_at` | `TIMESTAMPTZ` | yes | Revocation time |
| `created_at` | `TIMESTAMPTZ` | no | Creation time |
| `last_used_at` | `TIMESTAMPTZ` | yes | Last refresh use |

### `password_reset_tokens`

| Column | PostgreSQL type | Null | Constraints / meaning |
|---|---|---:|---|
| `id` | `UUID` | no | PK |
| `user_id` | `UUID` | no | FK `users.id`, `CASCADE` |
| `token_hash` | `VARCHAR(255)` | no | Indexed one-time token hash |
| `expires_at` | `TIMESTAMPTZ` | no | Token expiry |
| `used_at` | `TIMESTAMPTZ` | yes | Consumption time |
| `created_at` | `TIMESTAMPTZ` | no | Creation time |

### `students`

| Column | PostgreSQL type | Null | Constraints / meaning |
|---|---|---:|---|
| `id` | `UUID` | no | PK |
| `school_id` | `UUID` | no | FK `schools.id`, `RESTRICT` |
| `admission_number` | `VARCHAR(100)` | no | School-local identifier |
| `full_name` | `VARCHAR(255)` | no | Indexed student name |
| `date_of_birth` | `DATE` | no | Date of birth |
| `gender` | `VARCHAR(20)` | yes | Documented gender |
| `disability_category` | `VARCHAR(150)` | no | Primary category |
| `udid_number_encrypted` | `VARCHAR(255)` | yes | Encrypted sensitive identifier |
| `enrollment_date` | `DATE` | no | Enrollment date |
| `grade_class` | `VARCHAR(50)` | no | Grade/class |
| `diagnosis` | `TEXT` | yes | Restricted diagnosis detail |
| `strengths` | `TEXT` | yes | Learning strengths |
| `areas_of_need` | `TEXT` | yes | Areas needing support |
| `learning_style` | `TEXT` | yes | Learning style |
| `languages_known` | `TEXT` | yes | Known languages |
| `assistive_devices` | `TEXT` | yes | Assistive devices |
| `profile_image_path` | `VARCHAR(500)` | yes | Stored image path |
| `is_active` | `BOOLEAN` | no | Defaults `true` |
| `created_at` | `TIMESTAMPTZ` | no | Creation time |
| `updated_at` | `TIMESTAMPTZ` | no | Last update time |

Unique: `(school_id, admission_number)`.

### `guardian_student_links`

| Column | PostgreSQL type | Null | Constraints / meaning |
|---|---|---:|---|
| `id` | `UUID` | no | PK |
| `school_id` | `UUID` | no | FK `schools.id`, `RESTRICT` |
| `guardian_user_id` | `UUID` | no | FK `users.id`, `CASCADE` |
| `student_id` | `UUID` | no | FK `students.id`, `CASCADE` |
| `relationship_label` | `VARCHAR(100)` | yes | Parent/guardian relationship |
| `is_primary` | `BOOLEAN` | no | Defaults `false` |
| `is_active` | `BOOLEAN` | no | Defaults `true` |
| `created_at` | `TIMESTAMPTZ` | no | Creation time |

Unique: `(guardian_user_id, student_id)`.

### `staff_student_assignments`

| Column | PostgreSQL type | Null | Constraints / meaning |
|---|---|---:|---|
| `id` | `UUID` | no | PK |
| `school_id` | `UUID` | no | FK `schools.id`, `RESTRICT` |
| `staff_user_id` | `UUID` | no | FK `users.id`, `CASCADE` |
| `student_id` | `UUID` | no | FK `students.id`, `CASCADE` |
| `assignment_type` | `VARCHAR(100)` | no | Assignment role/type |
| `is_active` | `BOOLEAN` | no | Defaults `true` |
| `created_at` | `TIMESTAMPTZ` | no | Creation time |

### `present_level_records`

| Column | PostgreSQL type | Null | Constraints / meaning |
|---|---|---:|---|
| `id` | `UUID` | no | PK |
| `school_id` | `UUID` | no | FK `schools.id`, `RESTRICT` |
| `student_id` | `UUID` | no | FK `students.id`, `CASCADE` |
| `domain` | `VARCHAR(100)` | no | One of the nine PLOP domains |
| `current_performance` | `TEXT` | no | Current performance |
| `assessment_method` | `VARCHAR(255)` | no | Assessment method |
| `baseline_value` | `TEXT` | yes | Baseline evidence/value |
| `remarks` | `TEXT` | yes | Additional remarks |
| `assessed_by_user_id` | `UUID` | no | FK `users.id`, `RESTRICT` |
| `assessed_at` | `DATE` | no | Assessment date |
| `guardian_visible` | `BOOLEAN` | no | Defaults `true` |
| `created_at` | `TIMESTAMPTZ` | no | Creation time |

### `iep_plans`

| Column | PostgreSQL type | Null | Constraints / meaning |
|---|---|---:|---|
| `id` | `UUID` | no | PK |
| `school_id` | `UUID` | no | FK `schools.id`, `RESTRICT` |
| `student_id` | `UUID` | no | FK `students.id`, `CASCADE` |
| `academic_year` | `VARCHAR(50)` | no | Academic year |
| `start_date` | `DATE` | no | Plan start |
| `end_date` | `DATE` | no | Plan end |
| `status` | `VARCHAR(50)` | no | draft, active, in_review, approved, archived |
| `version` | `INTEGER` | no | Defaults `1` |
| `created_by_user_id` | `UUID` | no | FK `users.id`, `RESTRICT` |
| `approved_at` | `TIMESTAMPTZ` | yes | Approval time |
| `archived_at` | `TIMESTAMPTZ` | yes | Archive time |
| `created_at` | `TIMESTAMPTZ` | no | Creation time |
| `updated_at` | `TIMESTAMPTZ` | no | Last update time |

### `iep_goals`

| Column | PostgreSQL type | Null | Constraints / meaning |
|---|---|---:|---|
| `id` | `UUID` | no | PK |
| `school_id` | `UUID` | no | FK `schools.id`, `RESTRICT` |
| `iep_plan_id` | `UUID` | no | FK `iep_plans.id`, `CASCADE` |
| `student_id` | `UUID` | no | FK `students.id`, `CASCADE` |
| `domain` | `VARCHAR(100)` | no | Goal domain |
| `annual_goal` | `TEXT` | no | Annual goal |
| `teaching_strategies` | `TEXT` | no | Strategies |
| `responsible_staff_user_id` | `UUID` | yes | FK `users.id`, `SET NULL` |
| `timeline` | `VARCHAR(100)` | no | Timeline |
| `evaluation_method` | `VARCHAR(255)` | no | Evaluation method |
| `status` | `VARCHAR(50)` | no | Goal status; defaults `not_started` |
| `created_by_user_id` | `UUID` | no | FK `users.id`, `RESTRICT` |
| `created_at` | `TIMESTAMPTZ` | no | Creation time |
| `updated_at` | `TIMESTAMPTZ` | no | Last update time |

### `goal_objectives`

| Column | PostgreSQL type | Null | Constraints / meaning |
|---|---|---:|---|
| `id` | `UUID` | no | PK |
| `school_id` | `UUID` | no | FK `schools.id`, `RESTRICT` |
| `goal_id` | `UUID` | no | FK `iep_goals.id`, `CASCADE` |
| `objective_text` | `TEXT` | no | Objective |
| `sequence_number` | `INTEGER` | no | Defaults `1` |
| `target_date` | `DATE` | yes | Target date |
| `success_criteria` | `TEXT` | yes | Criteria |
| `created_at` | `TIMESTAMPTZ` | no | Creation time |
| `updated_at` | `TIMESTAMPTZ` | no | Last update time |

### `progress_entries`

| Column | PostgreSQL type | Null | Constraints / meaning |
|---|---|---:|---|
| `id` | `UUID` | no | PK |
| `school_id` | `UUID` | no | FK `schools.id`, `RESTRICT` |
| `student_id` | `UUID` | no | FK `students.id`, `CASCADE` |
| `goal_id` | `UUID` | no | FK `iep_goals.id`, `CASCADE` |
| `objective_id` | `UUID` | yes | FK `goal_objectives.id`, `SET NULL` |
| `term` | `VARCHAR(50)` | no | baseline, term_1, term_2, term_3, final |
| `rating` | `INTEGER` | no | Check constraint: 0 through 4 |
| `observation` | `TEXT` | no | Observation |
| `assessed_by_user_id` | `UUID` | no | FK `users.id`, `RESTRICT` |
| `observed_at` | `DATE` | no | Observation date |
| `evidence_attachment_id` | `UUID` | yes | Optional attachment reference |
| `created_at` | `TIMESTAMPTZ` | no | Creation time |

Indexes include `(student_id, term)` and foreign-key indexes.

### `therapy_sessions`

| Column | PostgreSQL type | Null | Constraints / meaning |
|---|---|---:|---|
| `id` | `UUID` | no | PK |
| `school_id` | `UUID` | no | FK `schools.id`, `RESTRICT` |
| `student_id` | `UUID` | no | FK `students.id`, `CASCADE` |
| `goal_id` | `UUID` | yes | FK `iep_goals.id`, `SET NULL` |
| `therapy_type` | `VARCHAR(100)` | no | Therapy type |
| `therapist_user_id` | `UUID` | no | FK `users.id`, `RESTRICT` |
| `session_date` | `DATE` | no | Indexed session date |
| `duration_minutes` | `INTEGER` | no | Duration |
| `progress_notes` | `TEXT` | no | Notes |
| `outcome` | `TEXT` | yes | Outcome |
| `next_steps` | `TEXT` | yes | Next steps |
| `guardian_visible` | `BOOLEAN` | no | Defaults `true` |
| `created_at` | `TIMESTAMPTZ` | no | Creation time |
| `updated_at` | `TIMESTAMPTZ` | no | Last update time |

### `accommodations`

| Column | PostgreSQL type | Null | Constraints / meaning |
|---|---|---:|---|
| `id` | `UUID` | no | PK |
| `school_id` | `UUID` | no | FK `schools.id`, `RESTRICT` |
| `student_id` | `UUID` | no | FK `students.id`, `CASCADE` |
| `area` | `VARCHAR(100)` | no | Accommodation area |
| `accommodation` | `TEXT` | no | Accommodation |
| `modification` | `TEXT` | yes | Modification |
| `assistive_technology` | `TEXT` | yes | Technology |
| `responsible_staff_user_id` | `UUID` | yes | FK `users.id`, `SET NULL` |
| `effective_from` | `DATE` | no | Effective start |
| `effective_to` | `DATE` | yes | Effective end |
| `is_active` | `BOOLEAN` | no | Defaults `true` |
| `created_at` | `TIMESTAMPTZ` | no | Creation time |
| `updated_at` | `TIMESTAMPTZ` | no | Last update time |

### `parent_interactions`

| Column | PostgreSQL type | Null | Constraints / meaning |
|---|---|---:|---|
| `id` | `UUID` | no | PK |
| `school_id` | `UUID` | no | FK `schools.id`, `RESTRICT` |
| `student_id` | `UUID` | no | FK `students.id`, `CASCADE` |
| `guardian_user_id` | `UUID` | yes | FK `users.id`, `SET NULL` |
| `recorded_by_user_id` | `UUID` | no | FK `users.id`, `RESTRICT` |
| `interaction_date` | `DATE` | no | Indexed date |
| `mode` | `VARCHAR(50)` | no | meeting, call, email, other |
| `discussion_points` | `TEXT` | no | Discussion |
| `action_taken` | `TEXT` | no | Action |
| `acknowledgement_status` | `VARCHAR(50)` | no | pending, acknowledged, declined |
| `acknowledged_at` | `TIMESTAMPTZ` | yes | Acknowledgement time |
| `created_at` | `TIMESTAMPTZ` | no | Creation time |
| `updated_at` | `TIMESTAMPTZ` | no | Last update time |

### `assessment_records`

| Column | PostgreSQL type | Null | Constraints / meaning |
|---|---|---:|---|
| `id` | `UUID` | no | PK |
| `school_id` | `UUID` | no | FK `schools.id`, `RESTRICT` |
| `student_id` | `UUID` | no | FK `students.id`, `CASCADE` |
| `assessment_type` | `VARCHAR(100)` | no | Assessment category |
| `domain` | `VARCHAR(100)` | yes | Domain |
| `assessment_date` | `DATE` | no | Indexed date |
| `assessor_user_id` | `UUID` | yes | FK `users.id`, `SET NULL` |
| `external_assessor_name` | `VARCHAR(255)` | yes | External assessor |
| `summary` | `TEXT` | no | Summary |
| `recommendations` | `TEXT` | yes | Recommendations |
| `guardian_visible` | `BOOLEAN` | no | Defaults `false` |
| `attachment_id` | `UUID` | yes | Optional attachment reference |
| `next_review_date` | `DATE` | yes | Next review |
| `created_at` | `TIMESTAMPTZ` | no | Creation time |
| `updated_at` | `TIMESTAMPTZ` | no | Last update time |

### `attendance_records`

| Column | PostgreSQL type | Null | Constraints / meaning |
|---|---|---:|---|
| `id` | `UUID` | no | PK |
| `school_id` | `UUID` | no | FK `schools.id`, `RESTRICT` |
| `student_id` | `UUID` | no | FK `students.id`, `CASCADE` |
| `attendance_date` | `DATE` | no | Indexed date |
| `status` | `VARCHAR(50)` | no | present, absent, leave, other |
| `reason` | `VARCHAR(255)` | yes | Reason |
| `recorded_by_user_id` | `UUID` | no | FK `users.id`, `RESTRICT` |
| `created_at` | `TIMESTAMPTZ` | no | Creation time |
| `updated_at` | `TIMESTAMPTZ` | no | Last update time |

Unique: `(student_id, attendance_date)`.

### `iep_reviews`

| Column | PostgreSQL type | Null | Constraints / meaning |
|---|---|---:|---|
| `id` | `UUID` | no | PK |
| `school_id` | `UUID` | no | FK `schools.id`, `RESTRICT` |
| `student_id` | `UUID` | no | FK `students.id`, `CASCADE` |
| `iep_plan_id` | `UUID` | no | FK `iep_plans.id`, `CASCADE` |
| `review_type` | `VARCHAR(50)` | no | quarterly, half_yearly, annual |
| `scheduled_date` | `DATE` | no | Scheduled date |
| `conducted_at` | `TIMESTAMPTZ` | yes | Conducted time |
| `review_notes` | `TEXT` | yes | Notes |
| `status` | `VARCHAR(50)` | no | scheduled, in_progress, approved, revision_required |
| `created_by_user_id` | `UUID` | no | FK `users.id`, `RESTRICT` |
| `created_at` | `TIMESTAMPTZ` | no | Creation time |
| `updated_at` | `TIMESTAMPTZ` | no | Last update time |

### `iep_approvals`

| Column | PostgreSQL type | Null | Constraints / meaning |
|---|---|---:|---|
| `id` | `UUID` | no | PK |
| `school_id` | `UUID` | no | FK `schools.id`, `RESTRICT` |
| `iep_review_id` | `UUID` | no | FK `iep_reviews.id`, `CASCADE` |
| `approver_user_id` | `UUID` | no | FK `users.id`, `RESTRICT` |
| `required_role` | `VARCHAR(50)` | no | Required approval role |
| `status` | `VARCHAR(50)` | no | pending, approved, rejected |
| `comment` | `TEXT` | yes | Decision comment |
| `decision_at` | `TIMESTAMPTZ` | yes | Decision time |
| `created_at` | `TIMESTAMPTZ` | no | Creation time |
| `updated_at` | `TIMESTAMPTZ` | no | Last update time |

### `attachments`

| Column | PostgreSQL type | Null | Constraints / meaning |
|---|---|---:|---|
| `id` | `UUID` | no | PK |
| `school_id` | `UUID` | no | FK `schools.id`, `RESTRICT` |
| `student_id` | `UUID` | no | FK `students.id`, `CASCADE` |
| `uploaded_by_user_id` | `UUID` | no | FK `users.id`, `RESTRICT` |
| `original_filename` | `VARCHAR(255)` | no | Client filename |
| `stored_filename` | `VARCHAR(255)` | no | Stored filename |
| `content_type` | `VARCHAR(100)` | no | MIME type |
| `file_size_bytes` | `BIGINT` | no | File size |
| `storage_path` | `VARCHAR(500)` | no | Storage path |
| `checksum` | `VARCHAR(100)` | no | Integrity checksum |
| `created_at` | `TIMESTAMPTZ` | no | Creation time |

### `audit_logs`

| Column | PostgreSQL type | Null | Constraints / meaning |
|---|---|---:|---|
| `id` | `UUID` | no | PK |
| `school_id` | `UUID` | yes | FK `schools.id`, `SET NULL` |
| `actor_user_id` | `UUID` | yes | FK `users.id`, `SET NULL` |
| `action` | `VARCHAR(100)` | no | Indexed action name |
| `entity_type` | `VARCHAR(100)` | no | Entity category |
| `entity_id` | `VARCHAR(100)` | yes | Entity identifier |
| `before_snapshot` | `JSONB` | yes | Previous safe snapshot |
| `after_snapshot` | `JSONB` | yes | New safe snapshot |
| `created_at` | `TIMESTAMPTZ` | no | Indexed event time |

## Security and integrity rules

- Passwords, refresh tokens, and reset tokens are stored as hashes.
- Student access is scoped by school and role; guardians are restricted to
  linked students.
- Sensitive identifiers are encrypted or masked before normal display.
- Audit snapshots must not contain passwords or raw tokens.
- Progress ratings are constrained to the inclusive range `0..4`.
- Student admission numbers are unique within a school.
- A student can have at most one attendance record per date.
- Deletion behavior is intentionally restrictive for schools and audit actors,
  cascading for dependent student records, and `SET NULL` for optional
  historical references.

## Applying the schema

```bash
cd backend
../.venv/bin/alembic upgrade head
```

The canonical migration history is under
[`backend/migrations/versions/`](../backend/migrations/versions/).
