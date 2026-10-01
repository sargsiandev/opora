package casework

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"

	"opora.local/api/internal/access"
)

type StudentChecker interface {
	Exists(context.Context, uuid.UUID, uuid.UUID) (bool, error)
}

type Service struct {
	repo          *Repository
	students      StudentChecker
	authorization access.AuthorizationService
}

func NewService(repo *Repository, students StudentChecker) *Service {
	return &Service{repo: repo, students: students}
}

func (s *Service) Dashboard(ctx context.Context, actor access.Actor) (Dashboard, error) {
	if err := s.authorization.Can(ctx, actor, access.StudentsList, access.Resource{OrganizationID: actor.OrganizationID}); err != nil {
		return Dashboard{}, err
	}
	return s.repo.Dashboard(ctx, actor)
}
func (s *Service) ListNotes(ctx context.Context, actor access.Actor, studentID uuid.UUID) ([]Note, error) {
	if err := s.can(ctx, actor, studentID, false); err != nil {
		return nil, err
	}
	return s.repo.ListNotes(ctx, actor.OrganizationID, studentID)
}
func (s *Service) CreateNote(ctx context.Context, actor access.Actor, studentID uuid.UUID, input CreateNoteInput) (Note, error) {
	input.Type = strings.TrimSpace(input.Type)
	input.Body = strings.TrimSpace(input.Body)
	if !oneOf(input.Type, "observation", "meeting", "contact", "other") || runes(input.Body, 1, 5000) != nil {
		return Note{}, ErrInvalidInput
	}
	if err := s.can(ctx, actor, studentID, true); err != nil {
		return Note{}, err
	}
	return s.repo.CreateNote(ctx, actor, studentID, input)
}
func (s *Service) ListCases(ctx context.Context, actor access.Actor, studentID uuid.UUID) ([]SupportCase, error) {
	if err := s.can(ctx, actor, studentID, false); err != nil {
		return nil, err
	}
	return s.repo.ListCases(ctx, actor.OrganizationID, studentID)
}
func (s *Service) CreateCase(ctx context.Context, actor access.Actor, studentID uuid.UUID, input CreateCaseInput) (SupportCase, error) {
	input.Title = strings.TrimSpace(input.Title)
	input.Reason = strings.TrimSpace(input.Reason)
	input.Priority = strings.TrimSpace(input.Priority)
	if input.Priority == "" {
		input.Priority = "normal"
	}
	if runes(input.Title, 1, 255) != nil || runesOptional(input.Reason, 3000) != nil || !oneOf(input.Priority, "low", "normal", "high") {
		return SupportCase{}, ErrInvalidInput
	}
	if err := s.can(ctx, actor, studentID, true); err != nil {
		return SupportCase{}, err
	}
	return s.repo.CreateCase(ctx, actor, studentID, input)
}
func (s *Service) CreateGoal(ctx context.Context, actor access.Actor, caseID uuid.UUID, input CreateGoalInput) (Goal, error) {
	input.Title = strings.TrimSpace(input.Title)
	input.Description = strings.TrimSpace(input.Description)
	if runes(input.Title, 1, 255) != nil || runesOptional(input.Description, 3000) != nil {
		return Goal{}, ErrInvalidInput
	}
	studentID, err := s.repo.caseStudent(ctx, actor.OrganizationID, caseID)
	if err != nil {
		return Goal{}, err
	}
	if err = s.can(ctx, actor, studentID, true); err != nil {
		return Goal{}, err
	}
	return s.repo.CreateGoal(ctx, actor, studentID, caseID, input)
}
func (s *Service) SetCaseStatus(ctx context.Context, actor access.Actor, caseID uuid.UUID, status string) (SupportCase, error) {
	if !oneOf(status, "active", "monitoring", "completed") {
		return SupportCase{}, ErrInvalidInput
	}
	studentID, err := s.repo.caseStudent(ctx, actor.OrganizationID, caseID)
	if err != nil {
		return SupportCase{}, err
	}
	if err = s.can(ctx, actor, studentID, true); err != nil {
		return SupportCase{}, err
	}
	return s.repo.SetCaseStatus(ctx, actor, studentID, caseID, status)
}
func (s *Service) SetGoalStatus(ctx context.Context, actor access.Actor, goalID uuid.UUID, status string) (Goal, error) {
	if !oneOf(status, "planned", "in_progress", "achieved", "cancelled") {
		return Goal{}, ErrInvalidInput
	}
	studentID, caseID, err := s.repo.goalContext(ctx, actor.OrganizationID, goalID)
	if err != nil {
		return Goal{}, err
	}
	if err = s.can(ctx, actor, studentID, true); err != nil {
		return Goal{}, err
	}
	return s.repo.SetGoalStatus(ctx, actor, studentID, caseID, goalID, status)
}
func (s *Service) CreateProgress(ctx context.Context, actor access.Actor, goalID uuid.UUID, input CreateProgressInput) (ProgressEntry, error) {
	input.Body = strings.TrimSpace(input.Body)
	input.ProgressStatus = strings.TrimSpace(input.ProgressStatus)
	if runes(input.Body, 1, 3000) != nil || (input.ProgressStatus != "" && !oneOf(input.ProgressStatus, "on_track", "needs_attention", "achieved")) {
		return ProgressEntry{}, ErrInvalidInput
	}
	studentID, _, err := s.repo.goalContext(ctx, actor.OrganizationID, goalID)
	if err != nil {
		return ProgressEntry{}, err
	}
	if err = s.can(ctx, actor, studentID, true); err != nil {
		return ProgressEntry{}, err
	}
	return s.repo.CreateProgress(ctx, actor, studentID, goalID, input)
}

func (s *Service) ListMeetings(ctx context.Context, actor access.Actor) ([]Meeting, error) {
	if err := s.authorization.Can(ctx, actor, access.StudentsList, access.Resource{OrganizationID: actor.OrganizationID}); err != nil {
		return nil, err
	}
	return s.repo.ListVisibleMeetings(ctx, actor)
}
func (s *Service) ListStudentMeetings(ctx context.Context, actor access.Actor, studentID uuid.UUID) ([]Meeting, error) {
	if err := s.can(ctx, actor, studentID, false); err != nil {
		return nil, err
	}
	return s.repo.ListStudentMeetings(ctx, actor.OrganizationID, studentID)
}
func (s *Service) GetMeeting(ctx context.Context, actor access.Actor, id uuid.UUID) (Meeting, error) {
	item, err := s.repo.GetMeeting(ctx, actor.OrganizationID, id)
	if err != nil {
		return Meeting{}, err
	}
	if err = s.can(ctx, actor, item.StudentID, false); err != nil {
		return Meeting{}, err
	}
	return item, nil
}
func (s *Service) CreateMeeting(ctx context.Context, actor access.Actor, studentID uuid.UUID, input CreateMeetingInput) (Meeting, error) {
	normalizeMeeting(&input.Subject, &input.Questions, &input.Notes)
	if input.ScheduledAt.IsZero() || runes(input.Subject, 1, 500) != nil || runesOptional(input.Questions, 5000) != nil || runesOptional(input.Notes, 5000) != nil {
		return Meeting{}, ErrInvalidInput
	}
	if err := s.can(ctx, actor, studentID, true); err != nil {
		return Meeting{}, err
	}
	return s.repo.CreateMeeting(ctx, actor, studentID, input)
}
func (s *Service) UpdateMeeting(ctx context.Context, actor access.Actor, id uuid.UUID, input UpdateMeetingInput) (Meeting, error) {
	normalizeMeeting(&input.Subject, &input.Questions, &input.Notes)
	input.Decision = strings.TrimSpace(input.Decision)
	input.Recommendations = strings.TrimSpace(input.Recommendations)
	if input.ScheduledAt.IsZero() || !oneOf(input.Status, "planned", "completed", "cancelled") || runes(input.Subject, 1, 500) != nil || runesOptional(input.Questions, 5000) != nil || runesOptional(input.Notes, 5000) != nil || runesOptional(input.Decision, 5000) != nil || runesOptional(input.Recommendations, 5000) != nil {
		return Meeting{}, ErrInvalidInput
	}
	current, err := s.repo.GetMeeting(ctx, actor.OrganizationID, id)
	if err != nil {
		return Meeting{}, err
	}
	if err = s.can(ctx, actor, current.StudentID, true); err != nil {
		return Meeting{}, err
	}
	return s.repo.UpdateMeeting(ctx, actor, id, current.StudentID, input)
}

func (s *Service) ListMyTasks(ctx context.Context, actor access.Actor) ([]Task, error) {
	if err := s.authorization.Can(ctx, actor, access.StudentsList, access.Resource{OrganizationID: actor.OrganizationID}); err != nil {
		return nil, err
	}
	return s.repo.ListMyTasks(ctx, actor)
}
func (s *Service) ListStudentTasks(ctx context.Context, actor access.Actor, studentID uuid.UUID) ([]Task, error) {
	if err := s.can(ctx, actor, studentID, false); err != nil {
		return nil, err
	}
	return s.repo.ListStudentTasks(ctx, actor.OrganizationID, studentID)
}
func (s *Service) CreateTask(ctx context.Context, actor access.Actor, studentID uuid.UUID, input CreateTaskInput) (Task, error) {
	input.Title = strings.TrimSpace(input.Title)
	input.Description = strings.TrimSpace(input.Description)
	if runes(input.Title, 1, 255) != nil || runesOptional(input.Description, 3000) != nil || input.AssigneeUserID == uuid.Nil {
		return Task{}, ErrInvalidInput
	}
	if err := s.can(ctx, actor, studentID, true); err != nil {
		return Task{}, err
	}
	return s.repo.CreateTask(ctx, actor, studentID, input)
}
func (s *Service) SetTaskStatus(ctx context.Context, actor access.Actor, id uuid.UUID, status string) (Task, error) {
	if !oneOf(status, "todo", "done") {
		return Task{}, ErrInvalidInput
	}
	task, err := s.repo.GetTask(ctx, actor.OrganizationID, id)
	if err != nil {
		return Task{}, err
	}
	if task.StudentID == nil {
		return Task{}, access.ErrPermissionDenied
	}
	if task.AssigneeID == actor.UserID {
		if err = s.can(ctx, actor, *task.StudentID, false); err != nil {
			return Task{}, err
		}
	} else if err = s.can(ctx, actor, *task.StudentID, true); err != nil {
		return Task{}, err
	}
	return s.repo.SetTaskStatus(ctx, actor, task, status)
}
func (s *Service) Timeline(ctx context.Context, actor access.Actor, studentID uuid.UUID) ([]TimelineEntry, error) {
	if err := s.can(ctx, actor, studentID, false); err != nil {
		return nil, err
	}
	return s.repo.Timeline(ctx, actor.OrganizationID, studentID)
}

func (s *Service) can(ctx context.Context, actor access.Actor, studentID uuid.UUID, write bool) error {
	exists, err := s.students.Exists(ctx, actor.OrganizationID, studentID)
	if err != nil {
		return err
	}
	if !exists {
		return ErrNotFound
	}
	permission := access.StudentsView
	if write {
		permission = access.StudentsUpdate
	}
	return s.authorization.Can(ctx, actor, permission, access.Resource{OrganizationID: actor.OrganizationID, StudentID: &studentID})
}
func normalizeMeeting(subject, questions, notes *string) {
	*subject = strings.TrimSpace(*subject)
	*questions = strings.TrimSpace(*questions)
	*notes = strings.TrimSpace(*notes)
}
func oneOf(value string, values ...string) bool {
	for _, candidate := range values {
		if value == candidate {
			return true
		}
	}
	return false
}
func runes(value string, min, max int) error {
	length := len([]rune(value))
	if length < min || length > max {
		return ErrInvalidInput
	}
	return nil
}
func runesOptional(value string, max int) error {
	if len([]rune(value)) > max {
		return ErrInvalidInput
	}
	return nil
}
func parseDate(value string) (*time.Time, error) {
	if strings.TrimSpace(value) == "" {
		return nil, nil
	}
	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		return nil, ErrInvalidInput
	}
	return &parsed, nil
}
