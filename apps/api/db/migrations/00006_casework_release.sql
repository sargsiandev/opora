-- +goose Up
INSERT INTO role_permissions (role_id, permission_code)
SELECT id, 'students.update' FROM roles WHERE role_key = 'specialist' AND is_system
ON CONFLICT DO NOTHING;

CREATE TABLE student_notes (
    id uuid PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    student_id uuid NOT NULL,
    author_user_id uuid NOT NULL,
    note_type text NOT NULL DEFAULT 'observation' CHECK (note_type IN ('observation', 'meeting', 'contact', 'other')),
    body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (organization_id, student_id) REFERENCES students(organization_id, id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id, author_user_id) REFERENCES memberships(organization_id, user_id) ON DELETE RESTRICT,
    UNIQUE (organization_id, id)
);

CREATE INDEX student_notes_student_created_idx
    ON student_notes (organization_id, student_id, created_at DESC);

CREATE TABLE support_cases (
    id uuid PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    student_id uuid NOT NULL,
    title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 255),
    reason text CHECK (reason IS NULL OR char_length(reason) <= 3000),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'monitoring', 'completed')),
    priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    responsible_user_id uuid,
    opened_at date NOT NULL DEFAULT current_date,
    closed_at date,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (organization_id, student_id) REFERENCES students(organization_id, id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id, responsible_user_id) REFERENCES memberships(organization_id, user_id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id, created_by) REFERENCES memberships(organization_id, user_id) ON DELETE RESTRICT,
    UNIQUE (organization_id, id),
    CHECK ((status = 'completed') = (closed_at IS NOT NULL))
);

CREATE INDEX support_cases_student_status_idx
    ON support_cases (organization_id, student_id, status, updated_at DESC);

CREATE TABLE support_goals (
    id uuid PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    student_id uuid NOT NULL,
    support_case_id uuid NOT NULL,
    title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 255),
    description text CHECK (description IS NULL OR char_length(description) <= 3000),
    target_date date,
    status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'achieved', 'cancelled')),
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (organization_id, student_id) REFERENCES students(organization_id, id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id, support_case_id) REFERENCES support_cases(organization_id, id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id, created_by) REFERENCES memberships(organization_id, user_id) ON DELETE RESTRICT,
    UNIQUE (organization_id, id)
);

CREATE INDEX support_goals_case_status_idx
    ON support_goals (organization_id, support_case_id, status, target_date);

CREATE TABLE goal_progress_entries (
    id uuid PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    student_id uuid NOT NULL,
    goal_id uuid NOT NULL,
    body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 3000),
    progress_status text CHECK (progress_status IS NULL OR progress_status IN ('on_track', 'needs_attention', 'achieved')),
    observed_at date NOT NULL DEFAULT current_date,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (organization_id, student_id) REFERENCES students(organization_id, id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id, goal_id) REFERENCES support_goals(organization_id, id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id, created_by) REFERENCES memberships(organization_id, user_id) ON DELETE RESTRICT,
    UNIQUE (organization_id, id)
);

CREATE INDEX goal_progress_goal_date_idx
    ON goal_progress_entries (organization_id, goal_id, observed_at DESC, created_at DESC);

CREATE TABLE council_meetings (
    id uuid PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    student_id uuid NOT NULL,
    scheduled_at timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'cancelled')),
    subject text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 500),
    questions text CHECK (questions IS NULL OR char_length(questions) <= 5000),
    notes text CHECK (notes IS NULL OR char_length(notes) <= 5000),
    decision text CHECK (decision IS NULL OR char_length(decision) <= 5000),
    recommendations text CHECK (recommendations IS NULL OR char_length(recommendations) <= 5000),
    created_by uuid NOT NULL,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (organization_id, student_id) REFERENCES students(organization_id, id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id, created_by) REFERENCES memberships(organization_id, user_id) ON DELETE RESTRICT,
    UNIQUE (organization_id, id),
    CHECK (status <> 'completed' OR completed_at IS NOT NULL)
);

CREATE INDEX council_meetings_student_schedule_idx
    ON council_meetings (organization_id, student_id, scheduled_at DESC);
CREATE INDEX council_meetings_org_schedule_idx
    ON council_meetings (organization_id, status, scheduled_at);

CREATE TABLE council_meeting_participants (
    organization_id uuid NOT NULL,
    meeting_id uuid NOT NULL,
    user_id uuid NOT NULL,
    PRIMARY KEY (organization_id, meeting_id, user_id),
    FOREIGN KEY (organization_id, meeting_id) REFERENCES council_meetings(organization_id, id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id, user_id) REFERENCES memberships(organization_id, user_id) ON DELETE RESTRICT
);

CREATE TABLE tasks (
    id uuid PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    student_id uuid,
    meeting_id uuid,
    title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 255),
    description text CHECK (description IS NULL OR char_length(description) <= 3000),
    assignee_user_id uuid NOT NULL,
    due_at timestamptz,
    status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'done')),
    created_by uuid NOT NULL,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (organization_id, student_id) REFERENCES students(organization_id, id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id, meeting_id) REFERENCES council_meetings(organization_id, id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id, assignee_user_id) REFERENCES memberships(organization_id, user_id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id, created_by) REFERENCES memberships(organization_id, user_id) ON DELETE RESTRICT,
    CHECK ((status = 'done') = (completed_at IS NOT NULL))
);

CREATE INDEX tasks_assignee_status_due_idx
    ON tasks (organization_id, assignee_user_id, status, due_at);
CREATE INDEX tasks_student_status_idx
    ON tasks (organization_id, student_id, status, due_at) WHERE student_id IS NOT NULL;

-- +goose Down
DROP TABLE tasks;
DROP TABLE council_meeting_participants;
DROP TABLE council_meetings;
DROP TABLE goal_progress_entries;
DROP TABLE support_goals;
DROP TABLE support_cases;
DROP TABLE student_notes;
DELETE FROM role_permissions rp
USING roles r
WHERE rp.role_id = r.id AND r.role_key = 'specialist' AND r.is_system
  AND rp.permission_code = 'students.update';
