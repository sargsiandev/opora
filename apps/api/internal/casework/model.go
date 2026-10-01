// Package casework owns the daily student support workflow: notes, support cases,
// council meetings, tasks, dashboards, and the student activity timeline.
package casework

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

var (
	ErrNotFound     = errors.New("casework resource not found")
	ErrInvalidInput = errors.New("invalid casework input")
)

type Note struct {
	ID         uuid.UUID `json:"id"`
	StudentID  uuid.UUID `json:"studentId"`
	AuthorID   uuid.UUID `json:"authorUserId"`
	AuthorName string    `json:"authorName"`
	Type       string    `json:"type"`
	Body       string    `json:"body"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

type ProgressEntry struct {
	ID             uuid.UUID `json:"id"`
	GoalID         uuid.UUID `json:"goalId"`
	AuthorName     string    `json:"authorName"`
	Body           string    `json:"body"`
	ProgressStatus *string   `json:"progressStatus"`
	ObservedAt     time.Time `json:"observedAt"`
	CreatedAt      time.Time `json:"createdAt"`
}

type Goal struct {
	ID          uuid.UUID       `json:"id"`
	CaseID      uuid.UUID       `json:"supportCaseId"`
	Title       string          `json:"title"`
	Description *string         `json:"description"`
	TargetDate  *time.Time      `json:"targetDate"`
	Status      string          `json:"status"`
	Progress    []ProgressEntry `json:"progress"`
	CreatedAt   time.Time       `json:"createdAt"`
	UpdatedAt   time.Time       `json:"updatedAt"`
}

type SupportCase struct {
	ID              uuid.UUID  `json:"id"`
	StudentID       uuid.UUID  `json:"studentId"`
	Title           string     `json:"title"`
	Reason          *string    `json:"reason"`
	Status          string     `json:"status"`
	Priority        string     `json:"priority"`
	ResponsibleID   *uuid.UUID `json:"responsibleUserId"`
	ResponsibleName *string    `json:"responsibleName"`
	OpenedAt        time.Time  `json:"openedAt"`
	ClosedAt        *time.Time `json:"closedAt"`
	Goals           []Goal     `json:"goals"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

type Meeting struct {
	ID               uuid.UUID   `json:"id"`
	StudentID        uuid.UUID   `json:"studentId"`
	StudentName      string      `json:"studentName"`
	ScheduledAt      time.Time   `json:"scheduledAt"`
	Status           string      `json:"status"`
	Subject          string      `json:"subject"`
	Questions        *string     `json:"questions"`
	Notes            *string     `json:"notes"`
	Decision         *string     `json:"decision"`
	Recommendations  *string     `json:"recommendations"`
	ParticipantIDs   []uuid.UUID `json:"participantIds"`
	ParticipantNames []string    `json:"participantNames"`
	CreatedAt        time.Time   `json:"createdAt"`
	UpdatedAt        time.Time   `json:"updatedAt"`
}

type Task struct {
	ID           uuid.UUID  `json:"id"`
	StudentID    *uuid.UUID `json:"studentId"`
	StudentName  *string    `json:"studentName"`
	MeetingID    *uuid.UUID `json:"meetingId"`
	Title        string     `json:"title"`
	Description  *string    `json:"description"`
	AssigneeID   uuid.UUID  `json:"assigneeUserId"`
	AssigneeName string     `json:"assigneeName"`
	DueAt        *time.Time `json:"dueAt"`
	Status       string     `json:"status"`
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`
}

type TimelineEntry struct {
	ID           uuid.UUID  `json:"id"`
	Action       string     `json:"action"`
	ActorName    string     `json:"actorName"`
	ResourceType string     `json:"resourceType"`
	ResourceID   *uuid.UUID `json:"resourceId"`
	Title        *string    `json:"title"`
	CreatedAt    time.Time  `json:"createdAt"`
}

type Dashboard struct {
	StudentCount     int64           `json:"studentCount"`
	UpcomingMeetings int64           `json:"upcomingMeetings"`
	TasksToday       int64           `json:"tasksToday"`
	OverdueTasks     int64           `json:"overdueTasks"`
	Attention        []DashboardItem `json:"attention"`
	Upcoming         []DashboardItem `json:"upcoming"`
	RecentStudents   []RecentStudent `json:"recentStudents"`
}

type DashboardItem struct {
	ID          uuid.UUID  `json:"id"`
	Kind        string     `json:"kind"`
	Title       string     `json:"title"`
	StudentID   *uuid.UUID `json:"studentId"`
	StudentName *string    `json:"studentName"`
	OccurredAt  time.Time  `json:"occurredAt"`
}

type RecentStudent struct {
	ID        uuid.UUID `json:"id"`
	FullName  string    `json:"fullName"`
	ClassName *string   `json:"className"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type CreateNoteInput struct{ Type, Body string }
type CreateCaseInput struct {
	Title, Reason, Priority string
	ResponsibleUserID       *uuid.UUID
}
type CreateGoalInput struct {
	Title, Description string
	TargetDate         *time.Time
}
type CreateProgressInput struct {
	Body, ProgressStatus string
	ObservedAt           *time.Time
}
type CreateMeetingInput struct {
	ScheduledAt               time.Time
	Subject, Questions, Notes string
	ParticipantIDs            []uuid.UUID
}
type UpdateMeetingInput struct {
	ScheduledAt                       time.Time
	Status, Subject, Questions, Notes string
	Decision, Recommendations         string
	ParticipantIDs                    []uuid.UUID
}
type CreateTaskInput struct {
	Title, Description string
	AssigneeUserID     uuid.UUID
	DueAt              *time.Time
	MeetingID          *uuid.UUID
}
