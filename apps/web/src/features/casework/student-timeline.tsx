"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck2, CheckCircle2, FileText, History, MessageSquarePlus, ShieldCheck, Target, UserPlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { NoteDialog } from "@/features/casework/casework-dialogs";
import { caseworkAPI } from "@/lib/api/casework";
import { formatDateTime } from "@/lib/format";

const labels: Record<string, string> = {
  "student.create": "Создана карточка ребёнка", "student.update": "Обновлены данные ребёнка",
  "student.note_created": "Добавлена рабочая заметка", "support.case_created": "Открыто сопровождение",
  "support.goal_created": "Добавлена цель сопровождения", "support.progress_added": "Добавлено наблюдение по цели",
  "meeting.created": "Запланировано заседание ППк", "meeting.updated": "Обновлено заседание ППк", "meeting.completed": "Завершено заседание ППк",
  "task.created": "Создана задача", "task.completed": "Задача выполнена", "task.updated": "Обновлена задача",
  "document.upload": "Загружен документ", "document.edit": "Создана новая версия документа",
  "permission.grant": "Специалисту выдан доступ", "permission.revoke": "Доступ специалиста отозван",
};
const iconFor = (action: string) => action.startsWith("document") ? FileText : action.startsWith("meeting") ? CalendarCheck2 : action.startsWith("task") ? CheckCircle2 : action.startsWith("support") ? Target : action.startsWith("permission") ? ShieldCheck : action.includes("note") ? MessageSquarePlus : UserPlus;

export function StudentTimeline({ studentId, canWrite }: { studentId: string; canWrite: boolean }) {
  const timeline = useQuery({ queryKey: ["student-timeline", studentId], queryFn: () => caseworkAPI.timeline(studentId) });
  const notes = useQuery({ queryKey: ["student-notes", studentId], queryFn: () => caseworkAPI.notes(studentId) });
  const client = useQueryClient(); const [open, setOpen] = useState(false);
  const entries = [...(timeline.data ?? []).filter((item) => item.action !== "student.note_created").map((item) => ({ ...item, body: null as string | null })), ...(notes.data ?? []).map((note) => ({ id: note.id, action: "student.note_created", actorName: note.authorName, resourceType: "student_note", resourceId: note.id, title: null, createdAt: note.createdAt, body: note.body }))].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  const saved = () => { setOpen(false); void client.invalidateQueries({ queryKey: ["student-notes", studentId] }); void client.invalidateQueries({ queryKey: ["student-timeline", studentId] }); };
  return <section className="workspace-panel"><header className="panel-header"><div><h2>История сопровождения</h2><p>Единая лента заметок, документов, задач, ППк и изменений доступа.</p></div>{canWrite && <Button onClick={() => setOpen(true)}><MessageSquarePlus size={17} />Добавить заметку</Button>}</header>
    <div className="student-timeline">{timeline.isPending && <div className="page-loading"><span className="loading-spinner" />Собираем историю…</div>}{entries.length === 0 && !timeline.isPending && <EmptyState icon={History} title="История пока пуста" description="Первое действие по ребёнку появится здесь." />}{entries.map((entry) => { const Icon = iconFor(entry.action); return <article key={`${entry.resourceType}-${entry.id}-${entry.body ? "note" : "event"}`}><span className="timeline-icon"><Icon size={16} /></span><div><strong>{labels[entry.action] ?? "Событие сопровождения"}</strong>{entry.body && <p>{entry.body}</p>}<span>{entry.actorName} · {formatDateTime(entry.createdAt)}</span></div></article>; })}</div>{open && <NoteDialog studentId={studentId} onClose={() => setOpen(false)} onSaved={saved} />}
  </section>;
}
