"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarPlus, FilePlus2, ListPlus, MessageSquarePlus, Target, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/auth-boundary";
import { caseworkAPI, type Note, type ProgressEntry, type SupportCase } from "@/lib/api/casework";
import { usersAPI } from "@/lib/api/users";

function Shell({ title, eyebrow, icon: Icon, pending, onClose, children, submitLabel, valid = true, onSubmit }: { title: string; eyebrow: string; icon: typeof MessageSquarePlus; pending: boolean; onClose: () => void; children: React.ReactNode; submitLabel: string; valid?: boolean; onSubmit: () => void }) {
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose(); }}><section className="dialog-card form-dialog casework-dialog" role="dialog" aria-modal="true"><header><span className="dialog-icon"><Icon size={20} /></span><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div><button type="button" className="icon-button" onClick={onClose} disabled={pending}><X size={19} /></button></header><form onSubmit={(event) => { event.preventDefault(); onSubmit(); }}><div className="casework-fields">{children}</div><footer><Button type="button" variant="ghost" onClick={onClose} disabled={pending}>Отмена</Button><Button type="submit" disabled={pending || !valid}>{pending ? "Сохраняем…" : submitLabel}</Button></footer></form></section></div>;
}

export function NoteDialog({ studentId, onClose, onSaved }: DialogProps) {
  const [type, setType] = useState<Note["type"]>("observation"); const [body, setBody] = useState("");
  const mutation = useMutation({ mutationFn: () => caseworkAPI.createNote(studentId, { type, body }), onSuccess: onSaved });
  return <Shell title="Новая заметка" eyebrow="История сопровождения" icon={MessageSquarePlus} pending={mutation.isPending} onClose={onClose} submitLabel="Добавить заметку" valid={body.trim().length > 0} onSubmit={() => mutation.mutate()}><label>Тип<select value={type} onChange={(event) => setType(event.target.value as Note["type"])}><option value="observation">Наблюдение</option><option value="meeting">Встреча</option><option value="contact">Звонок / контакт</option><option value="other">Другое</option></select></label><label>Короткое наблюдение<textarea autoFocus rows={6} maxLength={5000} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Что важно зафиксировать по ребёнку?" /></label>{mutation.isError && <div className="form-error">Не удалось сохранить заметку</div>}</Shell>;
}

export function SupportCaseDialog({ studentId, onClose, onSaved }: DialogProps) {
  const [title, setTitle] = useState(""); const [reason, setReason] = useState(""); const [priority, setPriority] = useState<SupportCase["priority"]>("normal");
  const mutation = useMutation({ mutationFn: () => caseworkAPI.createCase(studentId, { title, reason, priority }), onSuccess: onSaved });
  return <Shell title="Открыть сопровождение" eyebrow="Направление работы" icon={FilePlus2} pending={mutation.isPending} onClose={onClose} submitLabel="Открыть сопровождение" valid={title.trim().length > 0} onSubmit={() => mutation.mutate()}><label>Название<input autoFocus value={title} maxLength={255} onChange={(event) => setTitle(event.target.value)} placeholder="Например, адаптация в новом классе" /></label><label>Основание<textarea rows={4} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Коротко опишите причину сопровождения" /></label><label>Приоритет<select value={priority} onChange={(event) => setPriority(event.target.value as SupportCase["priority"])}><option value="low">Низкий</option><option value="normal">Обычный</option><option value="high">Высокий</option></select></label>{mutation.isError && <div className="form-error">Не удалось открыть сопровождение</div>}</Shell>;
}

export function GoalDialog({ studentId: caseId, onClose, onSaved }: DialogProps) {
  const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [targetDate, setTargetDate] = useState("");
  const mutation = useMutation({ mutationFn: () => caseworkAPI.createGoal(caseId, { title, description, targetDate }), onSuccess: onSaved });
  return <Shell title="Добавить цель" eyebrow="План сопровождения" icon={Target} pending={mutation.isPending} onClose={onClose} submitLabel="Добавить цель" valid={title.trim().length > 0} onSubmit={() => mutation.mutate()}><label>Цель<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Какого результата хотим достичь?" /></label><label>Описание<textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label><label>Контрольная дата<input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></label>{mutation.isError && <div className="form-error">Не удалось добавить цель</div>}</Shell>;
}

export function ProgressDialog({ studentId: goalId, onClose, onSaved }: DialogProps) {
  const [body, setBody] = useState(""); const [status, setStatus] = useState<NonNullable<ProgressEntry["progressStatus"]>>("on_track");
  const mutation = useMutation({ mutationFn: () => caseworkAPI.addProgress(goalId, { body, progressStatus: status }), onSuccess: onSaved });
  return <Shell title="Добавить наблюдение" eyebrow="Прогресс по цели" icon={MessageSquarePlus} pending={mutation.isPending} onClose={onClose} submitLabel="Сохранить наблюдение" valid={body.trim().length > 0} onSubmit={() => mutation.mutate()}><label>Наблюдение<textarea autoFocus rows={5} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Что изменилось с прошлого раза?" /></label><label>Оценка прогресса<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="on_track">По плану</option><option value="needs_attention">Требует внимания</option><option value="achieved">Цель достигнута</option></select></label>{mutation.isError && <div className="form-error">Не удалось сохранить наблюдение</div>}</Shell>;
}

export function MeetingDialog({ studentId, onClose, onSaved }: DialogProps) {
  const [subject, setSubject] = useState(""); const [scheduledAt, setScheduledAt] = useState(""); const [questions, setQuestions] = useState("");
  const mutation = useMutation({ mutationFn: () => caseworkAPI.createMeeting(studentId, { subject, scheduledAt: new Date(scheduledAt).toISOString(), questions, participantIds: [] }), onSuccess: onSaved });
  return <Shell title="Запланировать ППк" eyebrow="Новое заседание" icon={CalendarPlus} pending={mutation.isPending} onClose={onClose} submitLabel="Запланировать" valid={subject.trim().length > 0 && Boolean(scheduledAt)} onSubmit={() => mutation.mutate()}><label>Тема / вопрос<input autoFocus value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Что обсудим на заседании?" /></label><label>Дата и время<input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></label><label>Причина и вопросы<textarea rows={4} value={questions} onChange={(event) => setQuestions(event.target.value)} /></label>{mutation.isError && <div className="form-error">Не удалось запланировать заседание</div>}</Shell>;
}

export function TaskDialog({ studentId, onClose, onSaved }: DialogProps) {
  const current = useCurrentUser(); const canViewUsers = current.permissions.includes("users.view");
  const users = useQuery({ queryKey: ["users"], queryFn: usersAPI.list, enabled: canViewUsers });
  const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [assignee, setAssignee] = useState(current.id); const [dueAt, setDueAt] = useState("");
  const mutation = useMutation({ mutationFn: () => caseworkAPI.createTask(studentId, { title, description, assigneeUserId: assignee, dueAt: dueAt ? new Date(dueAt).toISOString() : undefined }), onSuccess: onSaved });
  return <Shell title="Новая задача" eyebrow="Следующий шаг" icon={ListPlus} pending={mutation.isPending} onClose={onClose} submitLabel="Создать задачу" valid={title.trim().length > 0 && Boolean(assignee)} onSubmit={() => mutation.mutate()}><label>Задача<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Что нужно сделать?" /></label><label>Описание<textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>{canViewUsers && <label>Исполнитель<select value={assignee} onChange={(event) => setAssignee(event.target.value)}><option value={current.id}>{current.displayName}</option>{users.data?.filter((user) => user.status === "active" && user.id !== current.id).map((user) => <option value={user.id} key={user.id}>{user.displayName}</option>)}</select></label>}<label>Срок<input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label>{mutation.isError && <div className="form-error">Не удалось создать задачу</div>}</Shell>;
}

type DialogProps = { studentId: string; onClose: () => void; onSaved: () => void };
