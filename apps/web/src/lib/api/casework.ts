import { apiFetch } from "./client";

export type Note = { id: string; studentId: string; authorUserId: string; authorName: string; type: "observation" | "meeting" | "contact" | "other"; body: string; createdAt: string; updatedAt: string };
export type ProgressEntry = { id: string; goalId: string; authorName: string; body: string; progressStatus: "on_track" | "needs_attention" | "achieved" | null; observedAt: string; createdAt: string };
export type Goal = { id: string; supportCaseId: string; title: string; description: string | null; targetDate: string | null; status: "planned" | "in_progress" | "achieved" | "cancelled"; progress: ProgressEntry[]; createdAt: string; updatedAt: string };
export type SupportCase = { id: string; studentId: string; title: string; reason: string | null; status: "active" | "monitoring" | "completed"; priority: "low" | "normal" | "high"; responsibleUserId: string | null; responsibleName: string | null; openedAt: string; closedAt: string | null; goals: Goal[]; createdAt: string; updatedAt: string };
export type Meeting = { id: string; studentId: string; studentName: string; scheduledAt: string; status: "planned" | "completed" | "cancelled"; subject: string; questions: string | null; notes: string | null; decision: string | null; recommendations: string | null; participantIds: string[]; participantNames: string[]; createdAt: string; updatedAt: string };
export type StudentTask = { id: string; studentId: string | null; studentName: string | null; meetingId: string | null; title: string; description: string | null; assigneeUserId: string; assigneeName: string; dueAt: string | null; status: "todo" | "done"; createdAt: string; updatedAt: string };
export type TimelineEntry = { id: string; action: string; actorName: string; resourceType: string; resourceId: string | null; title: string | null; createdAt: string };
export type DashboardItem = { id: string; kind: "task" | "meeting"; title: string; studentId: string | null; studentName: string | null; occurredAt: string };
export type Dashboard = { studentCount: number; upcomingMeetings: number; tasksToday: number; overdueTasks: number; attention: DashboardItem[] | null; upcoming: DashboardItem[] | null; recentStudents: { id: string; fullName: string; className: string | null; updatedAt: string }[] | null };

const list = <T>(path: string) => apiFetch<{ items: T[] }>(path).then((result) => result.items);
const body = (value: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(value) });

export const caseworkAPI = {
  dashboard: () => apiFetch<Dashboard>("/api/v1/dashboard"),
  notes: (studentId: string) => list<Note>(`/api/v1/students/${studentId}/notes`),
  createNote: (studentId: string, input: { type: Note["type"]; body: string }) => apiFetch<Note>(`/api/v1/students/${studentId}/notes`, body(input)),
  cases: (studentId: string) => list<SupportCase>(`/api/v1/students/${studentId}/support-cases`),
  createCase: (studentId: string, input: { title: string; reason?: string; priority: SupportCase["priority"]; responsibleUserId?: string | null }) => apiFetch<SupportCase>(`/api/v1/students/${studentId}/support-cases`, body(input)),
  setCaseStatus: (caseId: string, status: SupportCase["status"]) => apiFetch<SupportCase>(`/api/v1/support-cases/${caseId}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  createGoal: (caseId: string, input: { title: string; description?: string; targetDate?: string }) => apiFetch<Goal>(`/api/v1/support-cases/${caseId}/goals`, body(input)),
  setGoalStatus: (goalId: string, status: Goal["status"]) => apiFetch<Goal>(`/api/v1/support-goals/${goalId}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  addProgress: (goalId: string, input: { body: string; progressStatus?: ProgressEntry["progressStatus"]; observedAt?: string }) => apiFetch<ProgressEntry>(`/api/v1/support-goals/${goalId}/progress`, body(input)),
  meetings: () => list<Meeting>("/api/v1/meetings"),
  studentMeetings: (studentId: string) => list<Meeting>(`/api/v1/students/${studentId}/meetings`),
  meeting: (id: string) => apiFetch<Meeting>(`/api/v1/meetings/${id}`),
  createMeeting: (studentId: string, input: { scheduledAt: string; subject: string; questions?: string; notes?: string; participantIds?: string[] }) => apiFetch<Meeting>(`/api/v1/students/${studentId}/meetings`, body(input)),
  updateMeeting: (id: string, input: Omit<Meeting, "id" | "studentId" | "studentName" | "participantNames" | "createdAt" | "updatedAt">) => apiFetch<Meeting>(`/api/v1/meetings/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  tasks: () => list<StudentTask>("/api/v1/tasks"),
  studentTasks: (studentId: string) => list<StudentTask>(`/api/v1/students/${studentId}/tasks`),
  createTask: (studentId: string, input: { title: string; description?: string; assigneeUserId: string; dueAt?: string; meetingId?: string | null }) => apiFetch<StudentTask>(`/api/v1/students/${studentId}/tasks`, body(input)),
  setTaskStatus: (id: string, status: StudentTask["status"]) => apiFetch<StudentTask>(`/api/v1/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  timeline: (studentId: string) => list<TimelineEntry>(`/api/v1/students/${studentId}/timeline`),
};
