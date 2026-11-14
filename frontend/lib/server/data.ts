import { randomUUID } from 'node:crypto';
import { database } from './auth';
import { currentUser } from './auth';
import type { QueryResultRow } from 'pg';

type Actor = NonNullable<Awaited<ReturnType<typeof currentUser>>>;
type Row = QueryResultRow & Record<string, any>;

function fail(status: number, detail: string): never {
  const error = new Error(detail) as Error & { status: number };
  error.status = status;
  throw error;
}

export async function requireActor(roles?: string[]) {
  const actor = await currentUser();
  if (!actor) fail(401, 'Authentication required');
  if (roles && !roles.includes(actor.active_role)) fail(403, 'This role is not permitted to perform this action');
  return actor;
}

async function studentAccess(actor: Actor, studentId: string, write = false) {
  const db = database();
  const found = await db.query<Row>(
    'SELECT id, school_id FROM students WHERE id = $1 AND school_id = $2 AND is_active = TRUE',
    [studentId, actor.active_school_id],
  );
  if (!found.rows[0]) fail(404, 'Student not found or access denied');
  if (actor.active_role === 'guardian') {
    if (write) fail(403, 'Guardians cannot modify student records directly');
    const link = await db.query('SELECT 1 FROM guardian_student_links WHERE guardian_user_id=$1 AND student_id=$2 AND school_id=$3 AND is_active=TRUE', [actor.id, studentId, actor.active_school_id]);
    if (!link.rowCount) fail(403, 'Access denied: student is not linked to your guardian account');
  } else if (['therapist', 'psychologist', 'psychiatrist'].includes(actor.active_role)) {
    const assigned = await db.query('SELECT 1 FROM staff_student_assignments WHERE staff_user_id=$1 AND student_id=$2 AND school_id=$3 AND is_active=TRUE', [actor.id, studentId, actor.active_school_id]);
    if (!assigned.rowCount) fail(403, 'You are not assigned to this student');
  }
  return found.rows[0];
}

const rows = async (sql: string, params: unknown[] = []) => (await database().query<Row>(sql, params)).rows;
const one = async (sql: string, params: unknown[] = []) => (await rows(sql, params))[0] ?? null;

export async function getData(path: string[], request: Request): Promise<any> {
  const actor = await requireActor();
  const role = actor.active_role;
  const school = actor.active_school_id;
  const id = path[1];
  const query = new URL(request.url).searchParams;

  if (path[0] === 'students' && path.length === 1) {
    if (role === 'guardian') fail(403, 'Guardians cannot list all students');
    const page = Math.max(1, Number(query.get('page') || 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.get('page_size') || 20)));
    const search = query.get('search');
    const grade = query.get('grade_class');
    const params: unknown[] = [school];
    let where = 's.school_id=$1 AND s.is_active=TRUE';
    if (['therapist', 'psychologist'].includes(role)) {
      where += ' AND EXISTS (SELECT 1 FROM staff_student_assignments a WHERE a.student_id=s.id AND a.staff_user_id=$2 AND a.school_id=$1 AND a.is_active=TRUE)';
      params.push(actor.id);
    }
    if (search) { params.push(`%${search}%`); where += ` AND s.full_name ILIKE $${params.length}`; }
    if (grade) { params.push(grade); where += ` AND s.grade_class=$${params.length}`; }
    const count = await one(`SELECT COUNT(*)::int AS total FROM students s WHERE ${where}`, params);
    params.push(pageSize, (page - 1) * pageSize);
    const items = await rows(`SELECT s.id,s.school_id,s.admission_number,s.full_name,s.date_of_birth,s.gender,s.disability_category,s.enrollment_date,s.grade_class,s.strengths,s.areas_of_need,s.learning_style,s.languages_known,s.assistive_devices,s.profile_image_path,s.is_active,s.created_at, CASE WHEN $${params.length+1} THEN s.diagnosis ELSE NULL END AS diagnosis, CASE WHEN s.udid_number_encrypted IS NULL THEN NULL WHEN length(s.udid_number_encrypted)<=4 THEN '****' ELSE '****-'||right(s.udid_number_encrypted,4) END AS udid_number_masked FROM students s WHERE ${where} ORDER BY s.full_name LIMIT $${params.length-1} OFFSET $${params.length}`, [...params, ['school_head','school_admin','special_educator','psychologist','psychiatrist'].includes(role)]);
    return { items, total: count?.total ?? 0, page, page_size: pageSize };
  }

  if (path[0] === 'students' && id && path.length === 2) {
    await studentAccess(actor, id);
    const student = await one(`SELECT id,school_id,admission_number,full_name,date_of_birth,gender,disability_category,enrollment_date,grade_class,strengths,areas_of_need,learning_style,languages_known,assistive_devices,profile_image_path,is_active,created_at,updated_at,CASE WHEN $3 THEN diagnosis ELSE NULL END AS diagnosis,CASE WHEN udid_number_encrypted IS NULL THEN NULL ELSE '****-'||right(udid_number_encrypted,4) END AS udid_number_masked FROM students WHERE id=$1 AND school_id=$2`, [id, school, ['school_head','school_admin','special_educator','psychologist','psychiatrist'].includes(role)]);
    const guardians = await rows(`SELECT u.id AS user_id,u.full_name,u.email,u.phone,l.relationship_label,l.is_primary FROM guardian_student_links l JOIN users u ON u.id=l.guardian_user_id WHERE l.student_id=$1 AND l.school_id=$2 AND l.is_active=TRUE`,[id,school]);
    const assigned = await rows(`SELECT u.id AS user_id,u.full_name,u.email,COALESCE(m.role,a.assignment_type) AS role,a.assignment_type,a.is_active FROM staff_student_assignments a JOIN users u ON u.id=a.staff_user_id LEFT JOIN school_memberships m ON m.user_id=u.id AND m.school_id=a.school_id AND m.is_active=TRUE WHERE a.student_id=$1 AND a.school_id=$2 AND a.is_active=TRUE ORDER BY u.full_name`,[id,school]);
    return { ...student, guardians, assigned_staff: assigned };
  }

  if (path[0] === 'guardians' && path[1] === 'me' && path[2] === 'children') {
    if (role !== 'guardian') fail(403, 'Guardian role required');
    return rows(`SELECT s.id AS student_id,s.full_name,s.date_of_birth,s.grade_class,s.disability_category,s.profile_image_path,l.relationship_label,l.is_primary,p.id AS active_iep_plan_id,p.status AS active_iep_status,p.academic_year FROM guardian_student_links l JOIN students s ON s.id=l.student_id LEFT JOIN LATERAL (SELECT id,status,academic_year FROM iep_plans WHERE student_id=s.id AND status IN ('active','approved','in_review') ORDER BY created_at DESC LIMIT 1) p ON TRUE WHERE l.guardian_user_id=$1 AND l.school_id=$2 AND l.is_active=TRUE AND s.is_active=TRUE ORDER BY s.full_name`, [actor.id, school]);
  }
  if (path[0] === 'guardians' && path[1] === 'me' && path[2] === 'profile') {
    if (role !== 'guardian') fail(403, 'Guardian role required');
    const children: any[] = await getData(['guardians','me','children'], request);
    return { id: actor.id, full_name: actor.full_name, email: actor.email, phone: actor.phone, children };
  }
  if (path[0] === 'reports' && path[1] === 'summary') {
    const studentFilter = role === 'guardian'
      ? ' AND EXISTS (SELECT 1 FROM guardian_student_links l WHERE l.student_id=s.id AND l.guardian_user_id=$2 AND l.is_active=TRUE)'
      : ['therapist','psychologist','psychiatrist'].includes(role)
        ? ' AND EXISTS (SELECT 1 FROM staff_student_assignments a WHERE a.student_id=s.id AND a.staff_user_id=$2 AND a.is_active=TRUE)'
        : '';
    const params = ['guardian','therapist','psychologist','psychiatrist'].includes(role) ? [school, actor.id] : [school];
    const students = await rows(`SELECT s.id AS student_id,s.full_name,s.grade_class,s.disability_category,EXISTS(SELECT 1 FROM iep_plans p WHERE p.student_id=s.id AND p.status IN ('active','approved')) AS active_iep,(SELECT academic_year FROM iep_plans p WHERE p.student_id=s.id AND p.status IN ('active','approved') ORDER BY created_at DESC LIMIT 1) AS academic_year,(SELECT COUNT(*)::int FROM iep_goals g WHERE g.student_id=s.id) AS total_goals,(SELECT COUNT(*)::int FROM iep_goals g WHERE g.student_id=s.id AND g.status='achieved') AS achieved_goals FROM students s WHERE s.school_id=$1 AND s.is_active=TRUE${studentFilter} ORDER BY s.full_name`, params);
    const totalGoals = students.reduce((n, s) => n + Number(s.total_goals), 0);
    const achieved = students.reduce((n, s) => n + Number(s.achieved_goals), 0);
    const plans = await one(`SELECT COUNT(*)::int AS n FROM iep_plans p WHERE p.school_id=$1 AND p.status IN ('active','approved') AND p.student_id=ANY($2::uuid[])`, [school, students.map(s => s.student_id)]);
    return { total_students: students.length, active_plans: plans?.n ?? 0, total_goals: totalGoals, achieved_goals: achieved, students: students.map(s => ({...s, goal_attainment_pct: Number(s.total_goals) ? Math.round(Number(s.achieved_goals)/Number(s.total_goals)*1000)/10 : null})) };
  }

  if (path[0] === 'students' && id && path[2]) {
    await studentAccess(actor, id);
    const section = path[2];
    const guardianOnly = role === 'guardian';
    if (section === 'plop') return rows(`SELECT p.*,u.full_name AS assessed_by_name FROM present_level_records p LEFT JOIN users u ON u.id=p.assessed_by_user_id WHERE p.student_id=$1 AND p.school_id=$2 AND ($3=FALSE OR p.guardian_visible=TRUE) ORDER BY p.assessed_at DESC`, [id,school,guardianOnly]);
    if (section === 'iep-plans') return rows(`SELECT p.*,u.full_name AS created_by_name FROM iep_plans p LEFT JOIN users u ON u.id=p.created_by_user_id WHERE p.student_id=$1 AND p.school_id=$2 ORDER BY p.created_at DESC`, [id,school]);
    if (section === 'progress') return rows(`SELECT g.id AS goal_id,g.domain,g.annual_goal,g.status AS goal_status,MAX(p.observed_at) AS latest_observed_at,MAX(p.rating) FILTER (WHERE p.term='baseline') AS baseline,MAX(p.rating) FILTER (WHERE p.term='term_1') AS term_1,MAX(p.rating) FILTER (WHERE p.term='term_2') AS term_2,MAX(p.rating) FILTER (WHERE p.term='term_3') AS term_3,MAX(p.rating) FILTER (WHERE p.term='final') AS final,MAX(p.rating) AS latest_rating,COALESCE(json_agg(json_build_object('id',p.id,'student_id',p.student_id,'goal_id',p.goal_id,'objective_id',p.objective_id,'term',p.term,'rating',p.rating,'observation',p.observation,'assessed_by_user_id',p.assessed_by_user_id,'assessed_by_name',u.full_name,'observed_at',p.observed_at,'created_at',p.created_at)) FILTER (WHERE p.id IS NOT NULL), '[]') AS entries FROM iep_goals g LEFT JOIN progress_entries p ON p.goal_id=g.id LEFT JOIN users u ON u.id=p.assessed_by_user_id WHERE g.student_id=$1 AND g.school_id=$2 GROUP BY g.id ORDER BY g.created_at`, [id,school]);
    if (section === 'therapy-sessions') return rows(`SELECT t.*,u.full_name AS therapist_name FROM therapy_sessions t JOIN users u ON u.id=t.therapist_user_id WHERE t.student_id=$1 AND t.school_id=$2 AND ($3=FALSE OR t.guardian_visible=TRUE) AND ($4::text IS NULL OR t.therapy_type=$4) ORDER BY t.session_date DESC`, [id,school,guardianOnly,query.get('therapy_type')]);
    if (section === 'accommodations') return rows(`SELECT a.*,u.full_name AS responsible_staff_name FROM accommodations a LEFT JOIN users u ON u.id=a.responsible_staff_user_id WHERE a.student_id=$1 AND a.school_id=$2 ORDER BY a.effective_from DESC`, [id,school]);
    if (section === 'parent-interactions') return rows(`SELECT i.*,g.full_name AS guardian_name,u.full_name AS recorded_by_name FROM parent_interactions i LEFT JOIN users g ON g.id=i.guardian_user_id LEFT JOIN users u ON u.id=i.recorded_by_user_id WHERE i.student_id=$1 AND i.school_id=$2 AND ($3=FALSE OR i.guardian_user_id=$4) ORDER BY i.interaction_date DESC`, [id,school,guardianOnly,actor.id]);
    if (section === 'assessments') return rows(`SELECT a.*,u.full_name AS assessor_name FROM assessment_records a LEFT JOIN users u ON u.id=a.assessor_user_id WHERE a.student_id=$1 AND a.school_id=$2 AND ($3=FALSE OR a.guardian_visible=TRUE) ORDER BY a.assessment_date DESC`, [id,school,guardianOnly]);
    if (section === 'attendance') {
      if (path[3] === 'summary') return one(`SELECT $1::uuid AS student_id,COUNT(*)::int AS total_days,COUNT(*) FILTER (WHERE status='present')::int AS present,COUNT(*) FILTER (WHERE status='absent')::int AS absent,COUNT(*) FILTER (WHERE status='leave')::int AS leave,COUNT(*) FILTER (WHERE status='other')::int AS other,CASE WHEN COUNT(*)=0 THEN 0 ELSE ROUND(COUNT(*) FILTER (WHERE status='present')::numeric/COUNT(*)*100,1) END AS attendance_pct FROM attendance_records WHERE student_id=$1 AND school_id=$2`, [id,school]);
      return rows(`SELECT a.*,u.full_name AS recorded_by_name FROM attendance_records a LEFT JOIN users u ON u.id=a.recorded_by_user_id WHERE a.student_id=$1 AND a.school_id=$2 ORDER BY a.attendance_date DESC`, [id,school]);
    }
    if (section === 'iep-reviews') return rows(`SELECT r.*,COALESCE((SELECT json_agg(json_build_object('id',a.id,'iep_review_id',a.iep_review_id,'approver_user_id',a.approver_user_id,'approver_name',u.full_name,'required_role',a.required_role,'status',a.status,'comment',a.comment,'decision_at',a.decision_at,'created_at',a.created_at)) FROM iep_approvals a LEFT JOIN users u ON u.id=a.approver_user_id WHERE a.iep_review_id=r.id),'[]') AS approvals FROM iep_reviews r WHERE r.student_id=$1 AND r.school_id=$2 ORDER BY r.scheduled_date DESC`, [id,school]);
  }
  if (path[0] === 'iep-plans' && id && path[2] === 'goals') {
    const plan = await one('SELECT student_id FROM iep_plans WHERE id=$1 AND school_id=$2', [id,school]);
    if (!plan) fail(404,'IEP plan not found');
    await studentAccess(actor, plan.student_id);
    return rows(`SELECT g.*,u.full_name AS responsible_staff_name,COALESCE((SELECT json_agg(o ORDER BY o.sequence_number) FROM goal_objectives o WHERE o.goal_id=g.id),'[]') AS objectives FROM iep_goals g LEFT JOIN users u ON u.id=g.responsible_staff_user_id WHERE g.iep_plan_id=$1 AND g.school_id=$2 ORDER BY g.created_at`, [id,school]);
  }
  if (path[0] === 'goals' && id && path[2] === 'progress-entries') {
    const goal = await one('SELECT student_id FROM iep_goals WHERE id=$1 AND school_id=$2',[id,school]);
    if (!goal) fail(404,'Goal not found');
    await studentAccess(actor,goal.student_id);
    return rows(`SELECT p.*,u.full_name AS assessed_by_name FROM progress_entries p LEFT JOIN users u ON u.id=p.assessed_by_user_id WHERE p.goal_id=$1 AND p.school_id=$2 ORDER BY p.observed_at DESC`,[id,school]);
  }
  if (path[0] === 'iep-plans' && id && path.length === 2) {
    const plan = await one('SELECT * FROM iep_plans WHERE id=$1 AND school_id=$2',[id,school]);
    if (!plan) fail(404,'IEP plan not found');
    await studentAccess(actor,plan.student_id);
    return plan;
  }
  if (path[0] === 'students' && id && path[2] === 'guardians') {
    await studentAccess(actor,id);
    return rows(`SELECT u.id,u.full_name,u.email,u.phone,l.relationship_label,l.is_primary FROM guardian_student_links l JOIN users u ON u.id=l.guardian_user_id WHERE l.student_id=$1 AND l.school_id=$2 AND l.is_active=TRUE`, [id,school]);
  }
  fail(404, 'API endpoint not found');
}

export async function postData(path: string[], body: Record<string, any>) {
  const actor = await requireActor();
  const db = database();
  const school = actor.active_school_id;
  const id = path[1];
  const role = actor.active_role;
  const insert = async (table: string, columns: string[], values: unknown[]) => {
    const names = ['id', ...columns];
    const params = [randomUUID(), ...values];
    const placeholders = params.map((_, i) => `$${i+1}`).join(',');
    const result = await db.query(`INSERT INTO ${table} (${names.join(',')}) VALUES (${placeholders}) RETURNING *`, params);
    return result.rows[0];
  };
  if (path[0] === 'students' && id && path[2] === 'plop') {
    if (!['academic','communication','social_skills','behaviour','motor_skills','cognitive_skills','adl','emotional_development','vocational_skills'].includes(body.domain)) fail(400,'Invalid PLOP domain');
    if (!['special_educator','psychologist','therapist'].includes(role)) fail(403,'Not authorized to create PLOP records');
    await studentAccess(actor,id,true);
    return insert('present_level_records',['school_id','student_id','domain','current_performance','assessment_method','baseline_value','remarks','assessed_by_user_id','assessed_at','guardian_visible'],[school,id,body.domain,body.current_performance,body.assessment_method,body.baseline_value??null,body.remarks??null,actor.id,body.assessed_at,body.guardian_visible??true]);
  }
  if (path[0] === 'students' && id && path[2] === 'therapy-sessions') {
    if (!['speech_therapy','occupational_therapy','physiotherapy','behaviour_therapy','counselling','other'].includes(body.therapy_type)) fail(400,'Invalid therapy type');
    if (role !== 'therapist') fail(403,'Only therapists can record therapy sessions');
    await studentAccess(actor,id,true);
    return insert('therapy_sessions',['school_id','student_id','goal_id','therapy_type','therapist_user_id','session_date','duration_minutes','progress_notes','outcome','next_steps','guardian_visible'],[school,id,body.goal_id??null,body.therapy_type,actor.id,body.session_date,body.duration_minutes,body.progress_notes,body.outcome??null,body.next_steps??null,body.guardian_visible??true]);
  }
  if (path[0] === 'students' && id && path[2] === 'accommodations') {
    if (!['classroom','examination','learning_materials','communication','mobility'].includes(body.area)) fail(400,'Invalid accommodation area');
    if (role !== 'special_educator') fail(403,'Only special educators can create accommodations');
    await studentAccess(actor,id,true);
    return insert('accommodations',['school_id','student_id','area','accommodation','modification','assistive_technology','responsible_staff_user_id','effective_from','effective_to','is_active'],[school,id,body.area,body.accommodation,body.modification??null,body.assistive_technology??null,body.responsible_staff_user_id??actor.id,body.effective_from,body.effective_to??null,body.is_active??true]);
  }
  if (path[0] === 'students' && id && path[2] === 'assessments') {
    if (!['special_educator','psychologist','school_head'].includes(role)) fail(403,'Not authorized to create assessments');
    await studentAccess(actor,id,true);
    return insert('assessment_records',['school_id','student_id','assessment_type','domain','assessment_date','assessor_user_id','summary','recommendations','guardian_visible','next_review_date'],[school,id,body.assessment_type,body.domain??null,body.assessment_date,actor.id,body.summary,body.recommendations??null,body.guardian_visible??false,body.next_review_date??null]);
  }
  if (path[0] === 'students' && id && path[2] === 'attendance') {
    if (!['present','absent','leave','other'].includes(body.status)) fail(400,'Invalid attendance status');
    if (!['special_educator','school_head','school_admin'].includes(role)) fail(403,'Not authorized to record attendance');
    await studentAccess(actor,id,true);
    return insert('attendance_records',['school_id','student_id','attendance_date','status','reason','recorded_by_user_id'],[school,id,body.attendance_date,body.status,body.reason??null,actor.id]);
  }
  if (path[0] === 'students' && id && path[2] === 'iep-plans') {
    if (!['special_educator','school_head'].includes(role)) fail(403,'Not authorized to create IEP plans');
    await studentAccess(actor,id,true);
    return insert('iep_plans',['school_id','student_id','academic_year','start_date','end_date','status','version','created_by_user_id'],[school,id,body.academic_year,body.start_date,body.end_date,body.status??'draft',1,actor.id]);
  }
  if (path[0] === 'iep-plans' && id && path[2] === 'goals') {
    if (!['special_educator','school_head'].includes(role)) fail(403,'Not authorized to create IEP goals');
    const plan = await one('SELECT student_id FROM iep_plans WHERE id=$1 AND school_id=$2',[id,school]);
    if (!plan) fail(404,'IEP plan not found');
    await studentAccess(actor,plan.student_id,true);
    return insert('iep_goals',['school_id','iep_plan_id','student_id','domain','annual_goal','teaching_strategies','responsible_staff_user_id','timeline','evaluation_method','status','created_by_user_id'],[school,id,plan.student_id,body.domain,body.annual_goal,body.teaching_strategies,body.responsible_staff_user_id??null,body.timeline,body.evaluation_method,body.status??'not_started',actor.id]);
  }
  if (path[0] === 'goals' && id && path[2] === 'progress-entries') {
    if (!['baseline','term_1','term_2','term_3','final'].includes(body.term) || !Number.isInteger(body.rating) || body.rating < 0 || body.rating > 4) fail(400,'Invalid progress term or rating (rating must be 0–4)');
    if (!['special_educator','therapist','psychologist'].includes(role)) fail(403,'Not authorized to record progress');
    const goal = await one('SELECT student_id FROM iep_goals WHERE id=$1 AND school_id=$2',[id,school]);
    if (!goal) fail(404,'Goal not found');
    await studentAccess(actor,goal.student_id,true);
    return insert('progress_entries',['school_id','student_id','goal_id','objective_id','term','rating','observation','assessed_by_user_id','observed_at'],[school,goal.student_id,id,body.objective_id??null,body.term,body.rating,body.observation,actor.id,body.observed_at]);
  }
  if (path[0] === 'students' && id && path[2] === 'iep-reviews') {
    if (!['quarterly','half_yearly','annual'].includes(body.review_type)) fail(400,'Invalid review type');
    if (!['special_educator','school_head'].includes(role)) fail(403,'Not authorized to create IEP reviews');
    await studentAccess(actor,id,true);
    const plan = await one('SELECT id,status FROM iep_plans WHERE id=$1 AND student_id=$2 AND school_id=$3',[body.iep_plan_id,id,school]);
    if (!plan) fail(404,'IEP plan not found for this student');
    const review = await insert('iep_reviews',['school_id','student_id','iep_plan_id','review_type','scheduled_date','review_notes','status','created_by_user_id'],[school,id,body.iep_plan_id,body.review_type,body.scheduled_date,body.review_notes??null,'scheduled',actor.id]);
    const required = body.review_type === 'annual' ? ['special_educator','school_head','therapist','psychologist','guardian'] : ['special_educator','school_head','guardian'];
    for (const requiredRole of required) await insert('iep_approvals',['school_id','iep_review_id','approver_user_id','required_role','status'],[school,review.id,actor.id,requiredRole,'pending']);
    return { ...review, approvals: await rows(`SELECT a.*,u.full_name AS approver_name FROM iep_approvals a LEFT JOIN users u ON u.id=a.approver_user_id WHERE a.iep_review_id=$1`,[review.id]) };
  }
  if (path[0] === 'approvals' && id && path[2] === 'decision') {
    if (!['approved','rejected'].includes(body.status)) fail(400,'Decision must be approved or rejected');
    const approval = await one('SELECT a.*,r.student_id FROM iep_approvals a JOIN iep_reviews r ON r.id=a.iep_review_id WHERE a.id=$1 AND a.school_id=$2',[id,school]);
    if (!approval) fail(404,'Approval not found');
    if (approval.status !== 'pending') fail(409,'This approval has already been decided');
    await studentAccess(actor,approval.student_id,role !== 'guardian');
    if (approval.required_role !== role) fail(403,'Your role is not responsible for this approval');
    const updated = await one('UPDATE iep_approvals SET status=$1,comment=$2,approver_user_id=$3,decision_at=NOW() WHERE id=$4 RETURNING *',[body.status,body.comment??null,actor.id,id]);
    return updated;
  }
  if (path[0] === 'students' && id && path[2] === 'parent-interactions') {
    if (!['meeting','call','email','other'].includes(body.mode)) fail(400,'Invalid interaction mode');
    if (!['special_educator','school_head','school_admin'].includes(role)) fail(403,'Not authorized to create parent interactions');
    await studentAccess(actor,id,true);
    if (body.guardian_user_id) {
      const linked = await db.query('SELECT 1 FROM guardian_student_links WHERE guardian_user_id=$1 AND student_id=$2 AND school_id=$3 AND is_active=TRUE',[body.guardian_user_id,id,school]);
      if (!linked.rowCount) fail(400,'Selected guardian is not linked to this student');
    }
    return insert('parent_interactions',['school_id','student_id','guardian_user_id','recorded_by_user_id','interaction_date','mode','discussion_points','action_taken','acknowledgement_status'],[school,id,body.guardian_user_id??null,actor.id,body.interaction_date,body.mode,body.discussion_points,body.action_taken,body.acknowledgement_status??'pending']);
  }
  if (path[0] === 'parent-interactions' && id && path[2] === 'acknowledge') {
    if (role !== 'guardian') fail(403,'Guardian role required');
    const result = await db.query(`UPDATE parent_interactions SET acknowledgement_status='acknowledged',acknowledged_at=NOW() WHERE id=$1 AND school_id=$2 AND guardian_user_id=$3 RETURNING *`,[id,school,actor.id]);
    if (!result.rowCount) fail(404,'Interaction not found');
    return result.rows[0];
  }
  fail(404, 'API endpoint not found');
}

export async function patchData(path: string[], body: Record<string, any>) {
  const actor = await requireActor();
  const school = actor.active_school_id;
  const role = actor.active_role;
  const id = path[1];
  const definitions: Record<string, { table: string; roles: string[]; fields: string[]; studentColumn?: string; ownerColumn?: string }> = {
    plop: { table: 'present_level_records', roles: ['special_educator','psychologist','therapist'], fields: ['domain','current_performance','assessment_method','baseline_value','remarks','assessed_at','guardian_visible'], studentColumn: 'student_id' },
    'iep-plans': { table: 'iep_plans', roles: ['special_educator','school_head'], fields: ['academic_year','start_date','end_date','status','version'], studentColumn: 'student_id' },
    goals: { table: 'iep_goals', roles: ['special_educator','school_head'], fields: ['domain','annual_goal','teaching_strategies','responsible_staff_user_id','timeline','evaluation_method','status'], studentColumn: 'student_id' },
    objectives: { table: 'goal_objectives', roles: ['special_educator','school_head'], fields: ['objective_text','sequence_number','target_date','success_criteria'] },
    'therapy-sessions': { table: 'therapy_sessions', roles: ['therapist'], fields: ['goal_id','therapy_type','session_date','duration_minutes','progress_notes','outcome','next_steps','guardian_visible'], studentColumn: 'student_id', ownerColumn: 'therapist_user_id' },
    accommodations: { table: 'accommodations', roles: ['special_educator'], fields: ['area','accommodation','modification','assistive_technology','responsible_staff_user_id','effective_from','effective_to','is_active'], studentColumn: 'student_id' },
    'parent-interactions': { table: 'parent_interactions', roles: ['special_educator','school_head','school_admin'], fields: ['guardian_user_id','interaction_date','mode','discussion_points','action_taken','acknowledgement_status'], studentColumn: 'student_id' },
    assessments: { table: 'assessment_records', roles: ['special_educator','psychologist','psychiatrist','school_head'], fields: ['assessment_type','domain','assessment_date','external_assessor_name','summary','recommendations','guardian_visible','next_review_date'], studentColumn: 'student_id' },
    attendance: { table: 'attendance_records', roles: ['special_educator','school_head','school_admin'], fields: ['attendance_date','status','reason'], studentColumn: 'student_id' },
    'iep-reviews': { table: 'iep_reviews', roles: ['special_educator','school_head'], fields: ['review_type','scheduled_date','conducted_at','review_notes','status'], studentColumn: 'student_id' },
    students: { table: 'students', roles: ['special_educator','school_head','school_admin'], fields: ['full_name','date_of_birth','gender','disability_category','enrollment_date','grade_class','diagnosis','strengths','areas_of_need','learning_style','languages_known','assistive_devices','is_active'] },
  };
  const kind = path[0];
  const spec = definitions[kind];
  if (!spec) fail(404,'API endpoint not found');
  if (!spec.roles.includes(role)) fail(403,'Not authorized to update this record');
  const current = await one(`SELECT * FROM ${spec.table} WHERE id=$1 AND school_id=$2`,[id,school]);
  if (!current) fail(404,'Record not found');
  if (kind === 'students') await studentAccess(actor,id,true);
  else if (spec.studentColumn) await studentAccess(actor,current[spec.studentColumn],true);
  if (spec.ownerColumn && current[spec.ownerColumn] !== actor.id) fail(403,'You can only update your own records');
  const keys = Object.keys(body).filter(key => spec.fields.includes(key));
  if (!keys.length) fail(400,'No supported fields were supplied');
  const values = keys.map(key => body[key]);
  const assignments = keys.map((key,index) => `${key}=$${index+1}`).join(',');
  values.push(id,school);
  const touchUpdated = !['present_level_records','attendance_records'].includes(spec.table);
  const updated = await one(`UPDATE ${spec.table} SET ${assignments}${touchUpdated ? ',updated_at=NOW()' : ''} WHERE id=$${values.length-1} AND school_id=$${values.length} RETURNING *`,values);
  return updated;
}

export async function exportWorkbook(body: Record<string, any>) {
  const actor = await requireActor();
  const role = actor.active_role;
  const school = actor.active_school_id;
  let permitted: string[];
  if (role === 'guardian') {
    permitted = (await rows('SELECT student_id FROM guardian_student_links WHERE guardian_user_id=$1 AND school_id=$2 AND is_active=TRUE',[actor.id,school])).map(r => r.student_id);
  } else if (['therapist','psychologist','psychiatrist'].includes(role)) {
    permitted = (await rows('SELECT student_id FROM staff_student_assignments WHERE staff_user_id=$1 AND school_id=$2 AND is_active=TRUE',[actor.id,school])).map(r => r.student_id);
  } else {
    permitted = (await rows('SELECT id FROM students WHERE school_id=$1 AND is_active=TRUE',[school])).map(r => r.id);
  }
  const requested = Array.isArray(body.student_ids) && body.student_ids.length ? body.student_ids.map(String) : permitted;
  if (requested.some((id: string) => !permitted.includes(id))) fail(403,'Export access denied for one or more requested students');
  if (!requested.length) fail(404,'No permitted students found for export');
  const includeDiagnosis = role === 'school_head' || role === 'school_admin' || role === 'special_educator' ? Boolean(body.include_diagnosis) : false;
  const includeGuardian = role === 'school_head' || role === 'school_admin' ? Boolean(body.include_guardian_contact) : false;
  const datePredicate = (column: string, firstIndex = 3) => {
    const clauses: string[] = [];
    const values: unknown[] = [school, requested];
    if (body.from_date) { values.push(body.from_date); clauses.push(`${column} >= $${firstIndex + values.length - 3}`); }
    if (body.to_date) { values.push(body.to_date); clauses.push(`${column} <= $${firstIndex + values.length - 3}`); }
    return { sql: clauses.length ? ` AND ${clauses.join(' AND ')}` : '', values };
  }
  const params: unknown[] = [school, requested];
  const terms = Array.isArray(body.terms) && body.terms.length ? body.terms : ['baseline','term_1','term_2','term_3','final'];
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Siddhi';
  workbook.created = new Date();
  const addSheet = (name: string, headers: string[], data: Record<string, unknown>[]) => {
    const sheet = workbook.addWorksheet(name);
    sheet.addRow(headers);
    for (const row of data) sheet.addRow(headers.map(h => row[h] ?? ''));
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.getRow(1).font = { bold: true };
    sheet.columns.forEach(column => { column.width = Math.min(48, Math.max(14, String(column.header ?? '').length + 4)); });
    return sheet;
  };
  const students = await rows(`SELECT s.id,s.admission_number,s.full_name,s.date_of_birth,s.gender,s.disability_category,s.enrollment_date,s.grade_class,s.strengths,s.areas_of_need,s.learning_style,s.languages_known,s.assistive_devices,${includeDiagnosis ? 's.diagnosis' : 'NULL::text AS diagnosis'},${includeGuardian ? `(SELECT string_agg(u.full_name || ' (' || COALESCE(u.phone,u.email) || ')', '; ') FROM guardian_student_links gl JOIN users u ON u.id=gl.guardian_user_id WHERE gl.student_id=s.id AND gl.is_active=TRUE)` : 'NULL::text'} AS guardian_contact FROM students s WHERE s.school_id=$1 AND s.id=ANY($2::uuid[]) ORDER BY s.full_name`,params.slice(0,2));
  addSheet('Student Database',['admission_number','full_name','date_of_birth','gender','disability_category','enrollment_date','grade_class','diagnosis','strengths','areas_of_need','learning_style','languages_known','assistive_devices','guardian_contact'],students);
  const goals = await rows(`SELECT s.full_name AS student_name,p.academic_year,g.domain,g.annual_goal,g.teaching_strategies,g.timeline,g.evaluation_method,g.status,u.full_name AS responsible_staff FROM iep_goals g JOIN students s ON s.id=g.student_id JOIN iep_plans p ON p.id=g.iep_plan_id LEFT JOIN users u ON u.id=g.responsible_staff_user_id WHERE g.school_id=$1 AND g.student_id=ANY($2::uuid[]) ORDER BY s.full_name,g.created_at`,params.slice(0,2));
  addSheet('IEP Goals',['student_name','academic_year','domain','annual_goal','teaching_strategies','timeline','evaluation_method','status','responsible_staff'],goals);
  const progressFilter = datePredicate('p.observed_at',4);
  const progress = await rows(`SELECT s.full_name AS student_name,g.domain,g.annual_goal,p.term,p.rating,p.observation,p.observed_at,u.full_name AS assessed_by FROM progress_entries p JOIN students s ON s.id=p.student_id JOIN iep_goals g ON g.id=p.goal_id LEFT JOIN users u ON u.id=p.assessed_by_user_id WHERE p.school_id=$1 AND p.student_id=ANY($2::uuid[]) AND p.term=ANY($3::text[])${progressFilter.sql} ORDER BY s.full_name,p.observed_at`,[school,requested,terms,...progressFilter.values.slice(2)]);
  addSheet('Progress Monitoring Dashboard',['student_name','domain','annual_goal','term','rating','observation','observed_at','assessed_by'],progress);
  const therapyFilter = datePredicate('t.session_date',4);
  const therapy = await rows(`SELECT s.full_name AS student_name,t.therapy_type,t.session_date,t.duration_minutes,t.progress_notes,t.outcome,t.next_steps,u.full_name AS therapist FROM therapy_sessions t JOIN students s ON s.id=t.student_id JOIN users u ON u.id=t.therapist_user_id WHERE t.school_id=$1 AND t.student_id=ANY($2::uuid[]) AND ($3=FALSE OR t.guardian_visible=TRUE)${therapyFilter.sql} ORDER BY t.session_date`,[school,requested,role==='guardian',...therapyFilter.values.slice(2)]);
  addSheet('Therapy Tracker',['student_name','therapy_type','session_date','duration_minutes','progress_notes','outcome','next_steps','therapist'],therapy);
  const attendanceFilter = datePredicate('a.attendance_date');
  const attendance = await rows(`SELECT s.full_name AS student_name,a.attendance_date,a.status,a.reason,u.full_name AS recorded_by FROM attendance_records a JOIN students s ON s.id=a.student_id LEFT JOIN users u ON u.id=a.recorded_by_user_id WHERE a.school_id=$1 AND a.student_id=ANY($2::uuid[])${attendanceFilter.sql} ORDER BY a.attendance_date`,attendanceFilter.values);
  addSheet('Attendance Record',['student_name','attendance_date','status','reason','recorded_by'],attendance);
  const interactionFilter = datePredicate('i.interaction_date',5);
  const interactions = await rows(`SELECT s.full_name AS student_name,i.interaction_date,i.mode,i.discussion_points,i.action_taken,i.acknowledgement_status,g.full_name AS guardian FROM parent_interactions i JOIN students s ON s.id=i.student_id LEFT JOIN users g ON g.id=i.guardian_user_id WHERE i.school_id=$1 AND i.student_id=ANY($2::uuid[]) AND ($3=FALSE OR i.guardian_user_id=$4)${interactionFilter.sql} ORDER BY i.interaction_date`,[school,requested,role==='guardian',actor.id,...interactionFilter.values.slice(2)]);
  addSheet('Parent Communication Log',['student_name','interaction_date','mode','discussion_points','action_taken','acknowledgement_status','guardian'],interactions);
  const assessmentFilter = datePredicate('a.assessment_date',4);
  const assessments = await rows(`SELECT s.full_name AS student_name,a.assessment_type,a.domain,a.assessment_date,a.summary,a.recommendations,a.guardian_visible,u.full_name AS assessor FROM assessment_records a JOIN students s ON s.id=a.student_id LEFT JOIN users u ON u.id=a.assessor_user_id WHERE a.school_id=$1 AND a.student_id=ANY($2::uuid[]) AND ($3=FALSE OR a.guardian_visible=TRUE)${assessmentFilter.sql} ORDER BY a.assessment_date`,[school,requested,role==='guardian',...assessmentFilter.values.slice(2)]);
  addSheet('Assessment Reports',['student_name','assessment_type','domain','assessment_date','summary','recommendations','guardian_visible','assessor'],assessments);
  const reportCards = await rows(`SELECT s.full_name AS student_name,s.grade_class,s.disability_category,p.academic_year,COUNT(g.id)::int AS total_goals,COUNT(g.id) FILTER (WHERE g.status='achieved')::int AS achieved_goals,CASE WHEN COUNT(g.id)=0 THEN 0 ELSE ROUND(COUNT(g.id) FILTER (WHERE g.status='achieved')::numeric/COUNT(g.id)*100,1) END AS attainment_pct FROM students s LEFT JOIN iep_plans p ON p.student_id=s.id AND p.status IN ('active','approved') LEFT JOIN iep_goals g ON g.iep_plan_id=p.id WHERE s.school_id=$1 AND s.id=ANY($2::uuid[]) GROUP BY s.id,p.id ORDER BY s.full_name`,params.slice(0,2));
  addSheet('Automated Report Cards',['student_name','grade_class','disability_category','academic_year','total_goals','achieved_goals','attainment_pct'],reportCards);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
