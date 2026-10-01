package casework

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"opora.local/api/internal/access"
)

type Repository struct{ pool *pgxpool.Pool }

func NewRepository(pool *pgxpool.Pool) *Repository { return &Repository{pool: pool} }

func (r *Repository) ListNotes(ctx context.Context, organizationID, studentID uuid.UUID) ([]Note, error) {
	rows, err := r.pool.Query(ctx, `SELECT n.id,n.student_id,n.author_user_id,u.display_name,n.note_type,n.body,n.created_at,n.updated_at
		FROM student_notes n JOIN users u ON u.id=n.author_user_id
		WHERE n.organization_id=$1 AND n.student_id=$2 ORDER BY n.created_at DESC,n.id DESC`, organizationID, studentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]Note, 0)
	for rows.Next() {
		var item Note
		if err := rows.Scan(&item.ID, &item.StudentID, &item.AuthorID, &item.AuthorName, &item.Type, &item.Body, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		result = append(result, item)
	}
	return result, rows.Err()
}

func (r *Repository) CreateNote(ctx context.Context, actor access.Actor, studentID uuid.UUID, input CreateNoteInput) (Note, error) {
	id, err := uuid.NewV7()
	if err != nil {
		return Note{}, err
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return Note{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err = tx.Exec(ctx, `INSERT INTO student_notes(id,organization_id,student_id,author_user_id,note_type,body)
		VALUES($1,$2,$3,$4,$5,$6)`, id, actor.OrganizationID, studentID, actor.UserID, input.Type, input.Body); err != nil {
		return Note{}, err
	}
	if err = appendAudit(ctx, tx, actor, "student.note_created", "student_note", id, studentID, nil); err != nil {
		return Note{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return Note{}, err
	}
	var result Note
	err = r.pool.QueryRow(ctx, `SELECT n.id,n.student_id,n.author_user_id,u.display_name,n.note_type,n.body,n.created_at,n.updated_at
		FROM student_notes n JOIN users u ON u.id=n.author_user_id WHERE n.organization_id=$1 AND n.id=$2`, actor.OrganizationID, id).
		Scan(&result.ID, &result.StudentID, &result.AuthorID, &result.AuthorName, &result.Type, &result.Body, &result.CreatedAt, &result.UpdatedAt)
	return result, err
}

func (r *Repository) ListCases(ctx context.Context, organizationID, studentID uuid.UUID) ([]SupportCase, error) {
	rows, err := r.pool.Query(ctx, `SELECT c.id,c.student_id,c.title,c.reason,c.status,c.priority,c.responsible_user_id,u.display_name,
		c.opened_at,c.closed_at,c.created_at,c.updated_at
		FROM support_cases c LEFT JOIN users u ON u.id=c.responsible_user_id
		WHERE c.organization_id=$1 AND c.student_id=$2 ORDER BY c.status='completed',c.updated_at DESC`, organizationID, studentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]SupportCase, 0)
	for rows.Next() {
		var item SupportCase
		if err := rows.Scan(&item.ID, &item.StudentID, &item.Title, &item.Reason, &item.Status, &item.Priority, &item.ResponsibleID, &item.ResponsibleName, &item.OpenedAt, &item.ClosedAt, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		item.Goals, err = r.listGoals(ctx, organizationID, item.ID)
		if err != nil {
			return nil, err
		}
		result = append(result, item)
	}
	return result, rows.Err()
}

func (r *Repository) listGoals(ctx context.Context, organizationID, caseID uuid.UUID) ([]Goal, error) {
	rows, err := r.pool.Query(ctx, `SELECT id,support_case_id,title,description,target_date,status,created_at,updated_at
		FROM support_goals WHERE organization_id=$1 AND support_case_id=$2 ORDER BY status='achieved',target_date NULLS LAST,created_at`, organizationID, caseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]Goal, 0)
	for rows.Next() {
		var item Goal
		if err := rows.Scan(&item.ID, &item.CaseID, &item.Title, &item.Description, &item.TargetDate, &item.Status, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		item.Progress, err = r.listProgress(ctx, organizationID, item.ID)
		if err != nil {
			return nil, err
		}
		result = append(result, item)
	}
	return result, rows.Err()
}

func (r *Repository) listProgress(ctx context.Context, organizationID, goalID uuid.UUID) ([]ProgressEntry, error) {
	rows, err := r.pool.Query(ctx, `SELECT p.id,p.goal_id,u.display_name,p.body,p.progress_status,p.observed_at,p.created_at
		FROM goal_progress_entries p JOIN users u ON u.id=p.created_by
		WHERE p.organization_id=$1 AND p.goal_id=$2 ORDER BY p.observed_at DESC,p.created_at DESC`, organizationID, goalID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]ProgressEntry, 0)
	for rows.Next() {
		var item ProgressEntry
		if err := rows.Scan(&item.ID, &item.GoalID, &item.AuthorName, &item.Body, &item.ProgressStatus, &item.ObservedAt, &item.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, item)
	}
	return result, rows.Err()
}

func (r *Repository) CreateCase(ctx context.Context, actor access.Actor, studentID uuid.UUID, input CreateCaseInput) (SupportCase, error) {
	id, err := uuid.NewV7()
	if err != nil {
		return SupportCase{}, err
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return SupportCase{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err = tx.Exec(ctx, `INSERT INTO support_cases(id,organization_id,student_id,title,reason,priority,responsible_user_id,created_by)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, id, actor.OrganizationID, studentID, input.Title, nullText(input.Reason), input.Priority, input.ResponsibleUserID, actor.UserID); err != nil {
		return SupportCase{}, err
	}
	if err = appendAudit(ctx, tx, actor, "support.case_created", "support_case", id, studentID, map[string]any{"priority": input.Priority}); err != nil {
		return SupportCase{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return SupportCase{}, err
	}
	items, err := r.ListCases(ctx, actor.OrganizationID, studentID)
	if err != nil {
		return SupportCase{}, err
	}
	for _, item := range items {
		if item.ID == id {
			return item, nil
		}
	}
	return SupportCase{}, ErrNotFound
}

func (r *Repository) caseStudent(ctx context.Context, organizationID, caseID uuid.UUID) (uuid.UUID, error) {
	var id uuid.UUID
	err := r.pool.QueryRow(ctx, `SELECT student_id FROM support_cases WHERE organization_id=$1 AND id=$2`, organizationID, caseID).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, ErrNotFound
	}
	return id, err
}
func (r *Repository) goalContext(ctx context.Context, organizationID, goalID uuid.UUID) (uuid.UUID, uuid.UUID, error) {
	var studentID, caseID uuid.UUID
	err := r.pool.QueryRow(ctx, `SELECT student_id,support_case_id FROM support_goals WHERE organization_id=$1 AND id=$2`, organizationID, goalID).Scan(&studentID, &caseID)
	if errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, uuid.Nil, ErrNotFound
	}
	return studentID, caseID, err
}

func (r *Repository) SetCaseStatus(ctx context.Context, actor access.Actor, studentID, caseID uuid.UUID, status string) (SupportCase, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return SupportCase{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	tag, err := tx.Exec(ctx, `UPDATE support_cases SET status=$1,closed_at=CASE WHEN $1='completed' THEN CURRENT_DATE ELSE NULL END,updated_at=now()
		WHERE organization_id=$2 AND student_id=$3 AND id=$4`, status, actor.OrganizationID, studentID, caseID)
	if err != nil {
		return SupportCase{}, err
	}
	if tag.RowsAffected() != 1 {
		return SupportCase{}, ErrNotFound
	}
	if err = appendAudit(ctx, tx, actor, "support.case_updated", "support_case", caseID, studentID, map[string]any{"status": status}); err != nil {
		return SupportCase{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return SupportCase{}, err
	}
	items, err := r.ListCases(ctx, actor.OrganizationID, studentID)
	if err != nil {
		return SupportCase{}, err
	}
	for _, item := range items {
		if item.ID == caseID {
			return item, nil
		}
	}
	return SupportCase{}, ErrNotFound
}

func (r *Repository) SetGoalStatus(ctx context.Context, actor access.Actor, studentID, caseID, goalID uuid.UUID, status string) (Goal, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return Goal{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	tag, err := tx.Exec(ctx, `UPDATE support_goals SET status=$1,updated_at=now()
		WHERE organization_id=$2 AND student_id=$3 AND support_case_id=$4 AND id=$5`, status, actor.OrganizationID, studentID, caseID, goalID)
	if err != nil {
		return Goal{}, err
	}
	if tag.RowsAffected() != 1 {
		return Goal{}, ErrNotFound
	}
	if err = appendAudit(ctx, tx, actor, "support.goal_updated", "support_goal", goalID, studentID, map[string]any{"status": status}); err != nil {
		return Goal{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return Goal{}, err
	}
	items, err := r.listGoals(ctx, actor.OrganizationID, caseID)
	if err != nil {
		return Goal{}, err
	}
	for _, item := range items {
		if item.ID == goalID {
			return item, nil
		}
	}
	return Goal{}, ErrNotFound
}

func (r *Repository) CreateGoal(ctx context.Context, actor access.Actor, studentID, caseID uuid.UUID, input CreateGoalInput) (Goal, error) {
	id, err := uuid.NewV7()
	if err != nil {
		return Goal{}, err
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return Goal{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err = tx.Exec(ctx, `INSERT INTO support_goals(id,organization_id,student_id,support_case_id,title,description,target_date,created_by)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, id, actor.OrganizationID, studentID, caseID, input.Title, nullText(input.Description), input.TargetDate, actor.UserID); err != nil {
		return Goal{}, err
	}
	if err = appendAudit(ctx, tx, actor, "support.goal_created", "support_goal", id, studentID, nil); err != nil {
		return Goal{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return Goal{}, err
	}
	goals, err := r.listGoals(ctx, actor.OrganizationID, caseID)
	if err != nil {
		return Goal{}, err
	}
	for _, g := range goals {
		if g.ID == id {
			return g, nil
		}
	}
	return Goal{}, ErrNotFound
}

func (r *Repository) CreateProgress(ctx context.Context, actor access.Actor, studentID, goalID uuid.UUID, input CreateProgressInput) (ProgressEntry, error) {
	id, err := uuid.NewV7()
	if err != nil {
		return ProgressEntry{}, err
	}
	observed := time.Now()
	if input.ObservedAt != nil {
		observed = *input.ObservedAt
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return ProgressEntry{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err = tx.Exec(ctx, `INSERT INTO goal_progress_entries(id,organization_id,student_id,goal_id,body,progress_status,observed_at,created_by)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, id, actor.OrganizationID, studentID, goalID, input.Body, nullText(input.ProgressStatus), observed, actor.UserID); err != nil {
		return ProgressEntry{}, err
	}
	if err = appendAudit(ctx, tx, actor, "support.progress_added", "goal_progress", id, studentID, nil); err != nil {
		return ProgressEntry{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return ProgressEntry{}, err
	}
	items, err := r.listProgress(ctx, actor.OrganizationID, goalID)
	if err != nil {
		return ProgressEntry{}, err
	}
	for _, item := range items {
		if item.ID == id {
			return item, nil
		}
	}
	return ProgressEntry{}, ErrNotFound
}

func (r *Repository) ListStudentMeetings(ctx context.Context, organizationID, studentID uuid.UUID) ([]Meeting, error) {
	return r.listMeetings(ctx, organizationID, `m.student_id=$2`, studentID)
}

func (r *Repository) ListVisibleMeetings(ctx context.Context, actor access.Actor) ([]Meeting, error) {
	return r.listMeetings(ctx, actor.OrganizationID, `($2 OR EXISTS (SELECT 1 FROM student_access_grants g WHERE g.organization_id=m.organization_id AND g.student_id=m.student_id AND g.user_id=$3 AND g.grant_code='view'))`, actor.AllStudents, actor.UserID)
}

func (r *Repository) listMeetings(ctx context.Context, organizationID uuid.UUID, predicate string, args ...any) ([]Meeting, error) {
	query := `SELECT m.id,m.student_id,concat_ws(' ',s.last_name,s.first_name,s.middle_name),m.scheduled_at,m.status,m.subject,m.questions,m.notes,m.decision,m.recommendations,
		COALESCE(array_agg(p.user_id) FILTER (WHERE p.user_id IS NOT NULL),'{}'),COALESCE(array_agg(u.display_name ORDER BY u.display_name) FILTER (WHERE u.id IS NOT NULL),'{}'),m.created_at,m.updated_at
		FROM council_meetings m JOIN students s ON s.organization_id=m.organization_id AND s.id=m.student_id
		LEFT JOIN council_meeting_participants p ON p.organization_id=m.organization_id AND p.meeting_id=m.id LEFT JOIN users u ON u.id=p.user_id
		WHERE m.organization_id=$1 AND ` + predicate + ` GROUP BY m.id,s.id ORDER BY m.scheduled_at DESC,m.id DESC`
	params := append([]any{organizationID}, args...)
	rows, err := r.pool.Query(ctx, query, params...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]Meeting, 0)
	for rows.Next() {
		var item Meeting
		if err := rows.Scan(&item.ID, &item.StudentID, &item.StudentName, &item.ScheduledAt, &item.Status, &item.Subject, &item.Questions, &item.Notes, &item.Decision, &item.Recommendations, &item.ParticipantIDs, &item.ParticipantNames, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		result = append(result, item)
	}
	return result, rows.Err()
}

func (r *Repository) GetMeeting(ctx context.Context, organizationID, id uuid.UUID) (Meeting, error) {
	items, err := r.listMeetings(ctx, organizationID, `m.id=$2`, id)
	if err != nil {
		return Meeting{}, err
	}
	if len(items) == 0 {
		return Meeting{}, ErrNotFound
	}
	return items[0], nil
}

func (r *Repository) CreateMeeting(ctx context.Context, actor access.Actor, studentID uuid.UUID, input CreateMeetingInput) (Meeting, error) {
	id, err := uuid.NewV7()
	if err != nil {
		return Meeting{}, err
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return Meeting{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err = tx.Exec(ctx, `INSERT INTO council_meetings(id,organization_id,student_id,scheduled_at,subject,questions,notes,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, id, actor.OrganizationID, studentID, input.ScheduledAt, input.Subject, nullText(input.Questions), nullText(input.Notes), actor.UserID); err != nil {
		return Meeting{}, err
	}
	if err = replaceParticipants(ctx, tx, actor.OrganizationID, id, input.ParticipantIDs); err != nil {
		return Meeting{}, err
	}
	if err = appendAudit(ctx, tx, actor, "meeting.created", "council_meeting", id, studentID, nil); err != nil {
		return Meeting{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return Meeting{}, err
	}
	return r.GetMeeting(ctx, actor.OrganizationID, id)
}

func (r *Repository) UpdateMeeting(ctx context.Context, actor access.Actor, id, studentID uuid.UUID, input UpdateMeetingInput) (Meeting, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return Meeting{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var completed any
	if input.Status == "completed" {
		completed = time.Now()
	}
	result, err := tx.Exec(ctx, `UPDATE council_meetings SET scheduled_at=$1,status=$2,subject=$3,questions=$4,notes=$5,decision=$6,recommendations=$7,completed_at=$8,updated_at=now() WHERE organization_id=$9 AND id=$10`, input.ScheduledAt, input.Status, input.Subject, nullText(input.Questions), nullText(input.Notes), nullText(input.Decision), nullText(input.Recommendations), completed, actor.OrganizationID, id)
	if err != nil {
		return Meeting{}, err
	}
	if result.RowsAffected() != 1 {
		return Meeting{}, ErrNotFound
	}
	if err = replaceParticipants(ctx, tx, actor.OrganizationID, id, input.ParticipantIDs); err != nil {
		return Meeting{}, err
	}
	action := "meeting.updated"
	if input.Status == "completed" {
		action = "meeting.completed"
	}
	if err = appendAudit(ctx, tx, actor, action, "council_meeting", id, studentID, map[string]any{"status": input.Status}); err != nil {
		return Meeting{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return Meeting{}, err
	}
	return r.GetMeeting(ctx, actor.OrganizationID, id)
}

func replaceParticipants(ctx context.Context, tx pgx.Tx, organizationID, meetingID uuid.UUID, ids []uuid.UUID) error {
	if _, err := tx.Exec(ctx, `DELETE FROM council_meeting_participants WHERE organization_id=$1 AND meeting_id=$2`, organizationID, meetingID); err != nil {
		return err
	}
	for _, id := range ids {
		if _, err := tx.Exec(ctx, `INSERT INTO council_meeting_participants(organization_id,meeting_id,user_id) SELECT $1,$2,$3 WHERE EXISTS(SELECT 1 FROM memberships WHERE organization_id=$1 AND user_id=$3 AND is_active)`, organizationID, meetingID, id); err != nil {
			return err
		}
	}
	return nil
}

func (r *Repository) ListMyTasks(ctx context.Context, actor access.Actor) ([]Task, error) {
	return r.listTasks(ctx, actor.OrganizationID, `t.assignee_user_id=$2`, actor.UserID)
}
func (r *Repository) ListStudentTasks(ctx context.Context, organizationID, studentID uuid.UUID) ([]Task, error) {
	return r.listTasks(ctx, organizationID, `t.student_id=$2`, studentID)
}
func (r *Repository) listTasks(ctx context.Context, organizationID uuid.UUID, predicate string, args ...any) ([]Task, error) {
	query := `SELECT t.id,t.student_id,CASE WHEN s.id IS NULL THEN NULL ELSE concat_ws(' ',s.last_name,s.first_name,s.middle_name) END,t.meeting_id,t.title,t.description,t.assignee_user_id,u.display_name,t.due_at,t.status,t.created_at,t.updated_at FROM tasks t JOIN users u ON u.id=t.assignee_user_id LEFT JOIN students s ON s.organization_id=t.organization_id AND s.id=t.student_id WHERE t.organization_id=$1 AND ` + predicate + ` ORDER BY t.status='done',t.due_at NULLS LAST,t.created_at DESC`
	params := append([]any{organizationID}, args...)
	rows, err := r.pool.Query(ctx, query, params...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]Task, 0)
	for rows.Next() {
		var item Task
		if err := rows.Scan(&item.ID, &item.StudentID, &item.StudentName, &item.MeetingID, &item.Title, &item.Description, &item.AssigneeID, &item.AssigneeName, &item.DueAt, &item.Status, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		result = append(result, item)
	}
	return result, rows.Err()
}
func (r *Repository) GetTask(ctx context.Context, organizationID, id uuid.UUID) (Task, error) {
	items, err := r.listTasks(ctx, organizationID, `t.id=$2`, id)
	if err != nil {
		return Task{}, err
	}
	if len(items) == 0 {
		return Task{}, ErrNotFound
	}
	return items[0], nil
}
func (r *Repository) CreateTask(ctx context.Context, actor access.Actor, studentID uuid.UUID, input CreateTaskInput) (Task, error) {
	id, err := uuid.NewV7()
	if err != nil {
		return Task{}, err
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return Task{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err = tx.Exec(ctx, `INSERT INTO tasks(id,organization_id,student_id,meeting_id,title,description,assignee_user_id,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, id, actor.OrganizationID, studentID, input.MeetingID, input.Title, nullText(input.Description), input.AssigneeUserID, actor.UserID); err != nil {
		return Task{}, err
	}
	if input.DueAt != nil {
		if _, err = tx.Exec(ctx, `UPDATE tasks SET due_at=$1 WHERE organization_id=$2 AND id=$3`, input.DueAt, actor.OrganizationID, id); err != nil {
			return Task{}, err
		}
	}
	if err = appendAudit(ctx, tx, actor, "task.created", "task", id, studentID, nil); err != nil {
		return Task{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return Task{}, err
	}
	return r.GetTask(ctx, actor.OrganizationID, id)
}
func (r *Repository) SetTaskStatus(ctx context.Context, actor access.Actor, task Task, status string) (Task, error) {
	var completed any
	if status == "done" {
		completed = time.Now()
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return Task{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	result, err := tx.Exec(ctx, `UPDATE tasks SET status=$1,completed_at=$2,updated_at=now() WHERE organization_id=$3 AND id=$4`, status, completed, actor.OrganizationID, task.ID)
	if err != nil {
		return Task{}, err
	}
	if result.RowsAffected() != 1 {
		return Task{}, ErrNotFound
	}
	studentID := uuid.Nil
	if task.StudentID != nil {
		studentID = *task.StudentID
	}
	action := "task.updated"
	if status == "done" {
		action = "task.completed"
	}
	if err = appendAudit(ctx, tx, actor, action, "task", task.ID, studentID, map[string]any{"status": status}); err != nil {
		return Task{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return Task{}, err
	}
	return r.GetTask(ctx, actor.OrganizationID, task.ID)
}

func (r *Repository) Timeline(ctx context.Context, organizationID, studentID uuid.UUID) ([]TimelineEntry, error) {
	rows, err := r.pool.Query(ctx, `SELECT e.id,e.action,COALESCE(u.display_name,'Система'),e.resource_type,e.resource_id,e.metadata->>'title',e.created_at FROM audit_events e LEFT JOIN users u ON u.id=e.actor_user_id WHERE e.organization_id=$1 AND (e.resource_id=$2 OR e.metadata->>'studentId'=$2::text OR (e.resource_type='document' AND EXISTS(SELECT 1 FROM documents d WHERE d.organization_id=$1 AND d.student_id=$2 AND d.id=e.resource_id))) ORDER BY e.created_at DESC,e.id DESC LIMIT 100`, organizationID, studentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]TimelineEntry, 0)
	for rows.Next() {
		var item TimelineEntry
		if err := rows.Scan(&item.ID, &item.Action, &item.ActorName, &item.ResourceType, &item.ResourceID, &item.Title, &item.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, item)
	}
	return result, rows.Err()
}

func (r *Repository) Dashboard(ctx context.Context, actor access.Actor) (Dashboard, error) {
	var d Dashboard
	visible := `s.organization_id=$1 AND ($2 OR EXISTS(SELECT 1 FROM student_access_grants g WHERE g.organization_id=s.organization_id AND g.student_id=s.id AND g.user_id=$3 AND g.grant_code='view'))`
	if err := r.pool.QueryRow(ctx, `SELECT count(*) FROM students s WHERE `+visible, actor.OrganizationID, actor.AllStudents, actor.UserID).Scan(&d.StudentCount); err != nil {
		return d, err
	}
	if err := r.pool.QueryRow(ctx, `SELECT count(*) FILTER(WHERE due_at>=date_trunc('day',now()) AND due_at<date_trunc('day',now())+interval '1 day' AND status='todo'),count(*) FILTER(WHERE due_at<now() AND status='todo') FROM tasks WHERE organization_id=$1 AND assignee_user_id=$2`, actor.OrganizationID, actor.UserID).Scan(&d.TasksToday, &d.OverdueTasks); err != nil {
		return d, err
	}
	if err := r.pool.QueryRow(ctx, `SELECT count(*) FROM council_meetings m JOIN students s ON s.organization_id=m.organization_id AND s.id=m.student_id WHERE `+visible+` AND m.status='planned' AND m.scheduled_at BETWEEN now() AND now()+interval '30 days'`, actor.OrganizationID, actor.AllStudents, actor.UserID).Scan(&d.UpcomingMeetings); err != nil {
		return d, err
	}
	rows, err := r.pool.Query(ctx, `SELECT t.id,'task',t.title,t.student_id,CASE WHEN s.id IS NULL THEN NULL ELSE concat_ws(' ',s.last_name,s.first_name,s.middle_name) END,t.due_at FROM tasks t LEFT JOIN students s ON s.organization_id=t.organization_id AND s.id=t.student_id WHERE t.organization_id=$1 AND t.assignee_user_id=$2 AND t.status='todo' AND t.due_at<now() ORDER BY t.due_at LIMIT 6`, actor.OrganizationID, actor.UserID)
	if err != nil {
		return d, err
	}
	for rows.Next() {
		var item DashboardItem
		if err := rows.Scan(&item.ID, &item.Kind, &item.Title, &item.StudentID, &item.StudentName, &item.OccurredAt); err != nil {
			rows.Close()
			return d, err
		}
		d.Attention = append(d.Attention, item)
	}
	rows.Close()
	meetings, err := r.ListVisibleMeetings(ctx, actor)
	if err != nil {
		return d, err
	}
	for _, meeting := range meetings {
		if meeting.Status == "planned" && meeting.ScheduledAt.After(time.Now()) && len(d.Upcoming) < 6 {
			studentID := meeting.StudentID
			name := meeting.StudentName
			d.Upcoming = append(d.Upcoming, DashboardItem{ID: meeting.ID, Kind: "meeting", Title: meeting.Subject, StudentID: &studentID, StudentName: &name, OccurredAt: meeting.ScheduledAt})
		}
	}
	recent, err := r.pool.Query(ctx, `SELECT s.id,concat_ws(' ',s.last_name,s.first_name,s.middle_name),s.class_name,s.updated_at FROM students s WHERE `+visible+` ORDER BY s.updated_at DESC LIMIT 6`, actor.OrganizationID, actor.AllStudents, actor.UserID)
	if err != nil {
		return d, err
	}
	defer recent.Close()
	for recent.Next() {
		var item RecentStudent
		if err := recent.Scan(&item.ID, &item.FullName, &item.ClassName, &item.UpdatedAt); err != nil {
			return d, err
		}
		d.RecentStudents = append(d.RecentStudents, item)
	}
	return d, recent.Err()
}

func appendAudit(ctx context.Context, tx pgx.Tx, actor access.Actor, action, resourceType string, resourceID, studentID uuid.UUID, extra map[string]any) error {
	id, err := uuid.NewV7()
	if err != nil {
		return err
	}
	metadata := map[string]any{}
	if studentID != uuid.Nil {
		metadata["studentId"] = studentID
	}
	for key, value := range extra {
		metadata[key] = value
	}
	raw, err := json.Marshal(metadata)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `INSERT INTO audit_events(id,organization_id,actor_user_id,action,resource_type,resource_id,metadata) VALUES($1,$2,$3,$4,$5,$6,$7)`, id, actor.OrganizationID, actor.UserID, action, resourceType, resourceID, raw)
	return err
}
func nullText(value string) any {
	if value == "" {
		return nil
	}
	return value
}
