package casework

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"opora.local/api/internal/access"
	"opora.local/api/internal/auth"
	"opora.local/api/internal/platform/apierror"
)

type Handler struct{ service *Service }

func NewHandler(service *Service) *Handler { return &Handler{service: service} }

func (h *Handler) Dashboard(w http.ResponseWriter, r *http.Request) {
	p, _ := auth.PrincipalFromContext(r.Context())
	result, err := h.service.Dashboard(r.Context(), p.Actor)
	respond(w, r, http.StatusOK, result, err)
}
func (h *Handler) Notes(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "studentId")
	if !ok {
		return
	}
	p, _ := auth.PrincipalFromContext(r.Context())
	result, err := h.service.ListNotes(r.Context(), p.Actor, id)
	respond(w, r, http.StatusOK, map[string]any{"items": result}, err)
}
func (h *Handler) CreateNote(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "studentId")
	if !ok {
		return
	}
	var body struct {
		Type string `json:"type"`
		Body string `json:"body"`
	}
	if !decode(w, r, &body) {
		return
	}
	p, _ := auth.PrincipalFromContext(r.Context())
	result, err := h.service.CreateNote(r.Context(), p.Actor, id, CreateNoteInput{Type: body.Type, Body: body.Body})
	respond(w, r, http.StatusCreated, result, err)
}
func (h *Handler) Cases(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "studentId")
	if !ok {
		return
	}
	p, _ := auth.PrincipalFromContext(r.Context())
	result, err := h.service.ListCases(r.Context(), p.Actor, id)
	respond(w, r, http.StatusOK, map[string]any{"items": result}, err)
}
func (h *Handler) CreateCase(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "studentId")
	if !ok {
		return
	}
	var body struct {
		Title, Reason, Priority string
		ResponsibleUserID       *uuid.UUID `json:"responsibleUserId"`
	}
	if !decode(w, r, &body) {
		return
	}
	p, _ := auth.PrincipalFromContext(r.Context())
	result, err := h.service.CreateCase(r.Context(), p.Actor, id, CreateCaseInput{Title: body.Title, Reason: body.Reason, Priority: body.Priority, ResponsibleUserID: body.ResponsibleUserID})
	respond(w, r, http.StatusCreated, result, err)
}
func (h *Handler) UpdateCase(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "caseId")
	if !ok {
		return
	}
	var body struct {
		Status string `json:"status"`
	}
	if !decode(w, r, &body) {
		return
	}
	p, _ := auth.PrincipalFromContext(r.Context())
	result, err := h.service.SetCaseStatus(r.Context(), p.Actor, id, body.Status)
	respond(w, r, http.StatusOK, result, err)
}
func (h *Handler) CreateGoal(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "caseId")
	if !ok {
		return
	}
	var body struct{ Title, Description, TargetDate string }
	if !decode(w, r, &body) {
		return
	}
	target, err := parseDate(body.TargetDate)
	if err != nil {
		writeCaseError(w, r, err)
		return
	}
	p, _ := auth.PrincipalFromContext(r.Context())
	result, err := h.service.CreateGoal(r.Context(), p.Actor, id, CreateGoalInput{Title: body.Title, Description: body.Description, TargetDate: target})
	respond(w, r, http.StatusCreated, result, err)
}
func (h *Handler) UpdateGoal(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "goalId")
	if !ok {
		return
	}
	var body struct {
		Status string `json:"status"`
	}
	if !decode(w, r, &body) {
		return
	}
	p, _ := auth.PrincipalFromContext(r.Context())
	result, err := h.service.SetGoalStatus(r.Context(), p.Actor, id, body.Status)
	respond(w, r, http.StatusOK, result, err)
}
func (h *Handler) CreateProgress(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "goalId")
	if !ok {
		return
	}
	var body struct{ Body, ProgressStatus, ObservedAt string }
	if !decode(w, r, &body) {
		return
	}
	observed, err := parseDate(body.ObservedAt)
	if err != nil {
		writeCaseError(w, r, err)
		return
	}
	p, _ := auth.PrincipalFromContext(r.Context())
	result, err := h.service.CreateProgress(r.Context(), p.Actor, id, CreateProgressInput{Body: body.Body, ProgressStatus: body.ProgressStatus, ObservedAt: observed})
	respond(w, r, http.StatusCreated, result, err)
}

func (h *Handler) Meetings(w http.ResponseWriter, r *http.Request) {
	p, _ := auth.PrincipalFromContext(r.Context())
	result, err := h.service.ListMeetings(r.Context(), p.Actor)
	respond(w, r, http.StatusOK, map[string]any{"items": result}, err)
}
func (h *Handler) StudentMeetings(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "studentId")
	if !ok {
		return
	}
	p, _ := auth.PrincipalFromContext(r.Context())
	result, err := h.service.ListStudentMeetings(r.Context(), p.Actor, id)
	respond(w, r, http.StatusOK, map[string]any{"items": result}, err)
}
func (h *Handler) Meeting(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "meetingId")
	if !ok {
		return
	}
	p, _ := auth.PrincipalFromContext(r.Context())
	result, err := h.service.GetMeeting(r.Context(), p.Actor, id)
	respond(w, r, http.StatusOK, result, err)
}

type meetingBody struct {
	ScheduledAt, Status, Subject, Questions, Notes, Decision, Recommendations string
	ParticipantIDs                                                            []uuid.UUID `json:"participantIds"`
}

func (h *Handler) CreateMeeting(w http.ResponseWriter, r *http.Request) {
	studentID, ok := pathID(w, r, "studentId")
	if !ok {
		return
	}
	var body meetingBody
	if !decode(w, r, &body) {
		return
	}
	scheduled, err := time.Parse(time.RFC3339, body.ScheduledAt)
	if err != nil {
		writeCaseError(w, r, ErrInvalidInput)
		return
	}
	p, _ := auth.PrincipalFromContext(r.Context())
	result, err := h.service.CreateMeeting(r.Context(), p.Actor, studentID, CreateMeetingInput{ScheduledAt: scheduled, Subject: body.Subject, Questions: body.Questions, Notes: body.Notes, ParticipantIDs: body.ParticipantIDs})
	respond(w, r, http.StatusCreated, result, err)
}
func (h *Handler) UpdateMeeting(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "meetingId")
	if !ok {
		return
	}
	var body meetingBody
	if !decode(w, r, &body) {
		return
	}
	scheduled, err := time.Parse(time.RFC3339, body.ScheduledAt)
	if err != nil {
		writeCaseError(w, r, ErrInvalidInput)
		return
	}
	p, _ := auth.PrincipalFromContext(r.Context())
	result, err := h.service.UpdateMeeting(r.Context(), p.Actor, id, UpdateMeetingInput{ScheduledAt: scheduled, Status: body.Status, Subject: body.Subject, Questions: body.Questions, Notes: body.Notes, Decision: body.Decision, Recommendations: body.Recommendations, ParticipantIDs: body.ParticipantIDs})
	respond(w, r, http.StatusOK, result, err)
}

func (h *Handler) Tasks(w http.ResponseWriter, r *http.Request) {
	p, _ := auth.PrincipalFromContext(r.Context())
	result, err := h.service.ListMyTasks(r.Context(), p.Actor)
	respond(w, r, http.StatusOK, map[string]any{"items": result}, err)
}
func (h *Handler) StudentTasks(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "studentId")
	if !ok {
		return
	}
	p, _ := auth.PrincipalFromContext(r.Context())
	result, err := h.service.ListStudentTasks(r.Context(), p.Actor, id)
	respond(w, r, http.StatusOK, map[string]any{"items": result}, err)
}
func (h *Handler) CreateTask(w http.ResponseWriter, r *http.Request) {
	studentID, ok := pathID(w, r, "studentId")
	if !ok {
		return
	}
	var body struct {
		Title, Description, DueAt string
		AssigneeUserID            uuid.UUID  `json:"assigneeUserId"`
		MeetingID                 *uuid.UUID `json:"meetingId"`
	}
	if !decode(w, r, &body) {
		return
	}
	var due *time.Time
	if body.DueAt != "" {
		parsed, err := time.Parse(time.RFC3339, body.DueAt)
		if err != nil {
			writeCaseError(w, r, ErrInvalidInput)
			return
		}
		due = &parsed
	}
	p, _ := auth.PrincipalFromContext(r.Context())
	result, err := h.service.CreateTask(r.Context(), p.Actor, studentID, CreateTaskInput{Title: body.Title, Description: body.Description, AssigneeUserID: body.AssigneeUserID, DueAt: due, MeetingID: body.MeetingID})
	respond(w, r, http.StatusCreated, result, err)
}
func (h *Handler) UpdateTask(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "taskId")
	if !ok {
		return
	}
	var body struct {
		Status string `json:"status"`
	}
	if !decode(w, r, &body) {
		return
	}
	p, _ := auth.PrincipalFromContext(r.Context())
	result, err := h.service.SetTaskStatus(r.Context(), p.Actor, id, body.Status)
	respond(w, r, http.StatusOK, result, err)
}
func (h *Handler) Timeline(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "studentId")
	if !ok {
		return
	}
	p, _ := auth.PrincipalFromContext(r.Context())
	result, err := h.service.Timeline(r.Context(), p.Actor, id)
	respond(w, r, http.StatusOK, map[string]any{"items": result}, err)
}

func pathID(w http.ResponseWriter, r *http.Request, name string) (uuid.UUID, bool) {
	id, err := uuid.Parse(chi.URLParam(r, name))
	if err != nil {
		apierror.Write(w, r, http.StatusBadRequest, "invalid_id", "Invalid identifier")
		return uuid.Nil, false
	}
	return id, true
}
func decode(w http.ResponseWriter, r *http.Request, target any) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
	decoder.DisallowUnknownFields()
	if decoder.Decode(target) != nil {
		apierror.Write(w, r, http.StatusBadRequest, "invalid_request", "Invalid request")
		return false
	}
	return true
}
func respond(w http.ResponseWriter, r *http.Request, status int, payload any, err error) {
	if err != nil {
		writeCaseError(w, r, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
func writeCaseError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, access.ErrPermissionDenied):
		apierror.Write(w, r, http.StatusForbidden, "permission_denied", "Permission denied")
	case errors.Is(err, ErrNotFound):
		apierror.Write(w, r, http.StatusNotFound, "not_found", "Resource not found")
	case errors.Is(err, ErrInvalidInput):
		apierror.Write(w, r, http.StatusBadRequest, "invalid_request", "Invalid request")
	default:
		apierror.Write(w, r, http.StatusInternalServerError, "internal_error", "Internal server error")
	}
}
