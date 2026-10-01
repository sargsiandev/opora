package casework

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"opora.local/api/internal/access"
	"opora.local/api/internal/platform/testdatabase"
	"opora.local/api/internal/student"
)

func TestStudentCaseworkFlowAndTenantIsolation(t *testing.T) {
	pool := testdatabase.Start(t)
	ctx := context.Background()
	organizationID, _ := uuid.NewV7()
	userID, _ := uuid.NewV7()
	roleID, _ := uuid.NewV7()
	membershipID, _ := uuid.NewV7()
	studentID, _ := uuid.NewV7()
	statements := []struct {
		query string
		args  []any
	}{
		{`INSERT INTO organizations(id,name) VALUES($1,'School')`, []any{organizationID}},
		{`INSERT INTO roles(id,organization_id,role_key,name) VALUES($1,$2,'case_worker','Специалист')`, []any{roleID, organizationID}},
		{`INSERT INTO users(id,email,display_name) VALUES($1,'case@test.local','Анна Петрова')`, []any{userID}},
		{`INSERT INTO memberships(id,organization_id,user_id,role_id) VALUES($1,$2,$3,$4)`, []any{membershipID, organizationID, userID, roleID}},
		{`INSERT INTO students(id,organization_id,last_name,first_name) VALUES($1,$2,'Иванов','Иван')`, []any{studentID, organizationID}},
	}
	for _, statement := range statements {
		if _, err := pool.Exec(ctx, statement.query, statement.args...); err != nil {
			t.Fatal(err)
		}
	}
	actor := access.Actor{UserID: userID, OrganizationID: organizationID, Active: true, Permissions: map[access.Permission]struct{}{access.StudentsList: {}, access.StudentsView: {}, access.StudentsUpdate: {}}, StudentGrants: map[uuid.UUID]map[access.StudentGrant]struct{}{studentID: {access.StudentView: {}, access.StudentEdit: {}}}}
	service := NewService(NewRepository(pool), student.NewRepository(pool))
	if _, err := service.CreateNote(ctx, actor, studentID, CreateNoteInput{Type: "observation", Body: "Ребёнок включился в работу"}); err != nil {
		t.Fatal(err)
	}
	support, err := service.CreateCase(ctx, actor, studentID, CreateCaseInput{Title: "Адаптация", Priority: "normal"})
	if err != nil {
		t.Fatal(err)
	}
	goal, err := service.CreateGoal(ctx, actor, support.ID, CreateGoalInput{Title: "Комфортно работать в группе"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = service.CreateProgress(ctx, actor, goal.ID, CreateProgressInput{Body: "Участвует в общей задаче", ProgressStatus: "on_track"}); err != nil {
		t.Fatal(err)
	}
	if goal, err = service.SetGoalStatus(ctx, actor, goal.ID, "in_progress"); err != nil || goal.Status != "in_progress" {
		t.Fatalf("set goal status: status=%q err=%v", goal.Status, err)
	}
	if support, err = service.SetCaseStatus(ctx, actor, support.ID, "monitoring"); err != nil || support.Status != "monitoring" {
		t.Fatalf("set case status: status=%q err=%v", support.Status, err)
	}
	meeting, err := service.CreateMeeting(ctx, actor, studentID, CreateMeetingInput{ScheduledAt: time.Now().Add(24 * time.Hour), Subject: "План сопровождения", ParticipantIDs: []uuid.UUID{userID}})
	if err != nil {
		t.Fatal(err)
	}
	task, err := service.CreateTask(ctx, actor, studentID, CreateTaskInput{Title: "Провести встречу", AssigneeUserID: userID, MeetingID: &meeting.ID})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = service.SetTaskStatus(ctx, actor, task.ID, "done"); err != nil {
		t.Fatal(err)
	}
	cases, err := service.ListCases(ctx, actor, studentID)
	if err != nil {
		t.Fatal(err)
	}
	if len(cases) != 1 || len(cases[0].Goals) != 1 || len(cases[0].Goals[0].Progress) != 1 {
		t.Fatalf("unexpected casework tree: %#v", cases)
	}
	other := actor
	other.OrganizationID = uuid.New()
	if _, err = service.ListNotes(ctx, other, studentID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("cross-tenant list error=%v, want not found", err)
	}
}
