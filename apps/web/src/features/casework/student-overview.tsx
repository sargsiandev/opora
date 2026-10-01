"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarCheck2, CheckCircle2, MessageSquareText, ShieldCheck, Target } from "lucide-react";
import Link from "next/link";

import { StudentAvatar, UserAvatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { accessAPI } from "@/lib/api/access";
import { caseworkAPI } from "@/lib/api/casework";
import type { Student } from "@/lib/data/types";
import { formatDate, formatDateTime, relativeDate } from "@/lib/format";

export function StudentOverview({ student }: { student: Student }) {
  const notes = useQuery({ queryKey: ["student-notes", student.id], queryFn: () => caseworkAPI.notes(student.id) });
  const cases = useQuery({ queryKey: ["student-cases", student.id], queryFn: () => caseworkAPI.cases(student.id) });
  const meetings = useQuery({ queryKey: ["student-meetings", student.id], queryFn: () => caseworkAPI.studentMeetings(student.id) });
  const tasks = useQuery({ queryKey: ["student-tasks", student.id], queryFn: () => caseworkAPI.studentTasks(student.id) });
  const access = useQuery({ queryKey: ["student-access", student.id], queryFn: () => accessAPI.list(student.id), retry: false });
  const activeCase = cases.data?.find((item) => item.status !== "completed");
  const nextMeeting = meetings.data?.filter((item) => item.status === "planned" && new Date(item.scheduledAt) > new Date()).sort((a,b) => a.scheduledAt.localeCompare(b.scheduledAt))[0];
  const nextTask = tasks.data?.filter((item) => item.status === "todo").sort((a,b) => (a.dueAt ?? "9").localeCompare(b.dueAt ?? "9"))[0];
  return <div className="student-overview-grid">
    <section className="release-panel summary-card"><header><h2>Основная информация</h2></header><div className="summary-facts"><div><span>Дата рождения</span><strong>{student.birthDate}</strong></div><div><span>Класс</span><strong>{student.className}</strong></div><div><span>Последнее изменение</span><strong>{student.updatedAtValue ? formatDate(student.updatedAtValue) : student.updatedAt}</strong></div></div><div className="assigned-specialists"><span><ShieldCheck size={16} />Специалисты с доступом</span><div>{access.data?.slice(0,4).map((person) => <UserAvatar key={person.userId} name={person.displayName} />)}{access.data?.length ? <small>{access.data.length}</small> : <small>не назначены</small>}</div></div></section>
    <section className="release-panel support-summary"><header><div><span className="panel-kicker">Сопровождение</span><h2>Текущее направление</h2></div></header>{activeCase ? <><div className="support-title"><span><Target size={18} /></span><div><strong>{activeCase.title}</strong><p>{activeCase.reason ?? "Основание не указано"}</p></div><StatusBadge tone={activeCase.priority === "high" ? "warning" : "success"}>{activeCase.status === "monitoring" ? "Мониторинг" : "Активно"}</StatusBadge></div><div className="goal-preview">{activeCase.goals.slice(0,2).map((goal) => <div key={goal.id}><CheckCircle2 size={15} /><span><strong>{goal.title}</strong><small>{goal.targetDate ? `До ${formatDate(goal.targetDate)}` : "Без контрольной даты"}</small></span></div>)}</div></> : <div className="overview-calm"><Target size={24} /><div><strong>Сопровождение не открыто</strong><p>Добавьте направление работы и цели.</p></div></div>}</section>
    <section className="release-panel next-card"><header><div><span className="panel-kicker">План</span><h2>Ближайшее</h2></div></header>{nextMeeting && <Link href={`/meetings/${nextMeeting.id}`}><CalendarCheck2 size={19} /><span><strong>{nextMeeting.subject}</strong><small>{formatDateTime(nextMeeting.scheduledAt)}</small></span></Link>}{nextTask && <div><CheckCircle2 size={19} /><span><strong>{nextTask.title}</strong><small>{nextTask.dueAt ? formatDateTime(nextTask.dueAt) : "Срок не указан"}</small></span></div>}{!nextMeeting && !nextTask && <div className="overview-calm"><CalendarCheck2 size={24} /><div><strong>Ничего не запланировано</strong><p>Добавьте задачу или заседание.</p></div></div>}</section>
    <section className="release-panel notes-preview"><header><div><span className="panel-kicker">Живая история</span><h2>Последние заметки</h2></div></header>{notes.data?.slice(0,4).map((note) => <article key={note.id}><StudentAvatar name={note.authorName} /><div><p>{note.body}</p><span>{note.authorName} · {relativeDate(note.createdAt)}</span></div></article>)}{notes.data?.length === 0 && <div className="overview-calm"><MessageSquareText size={24} /><div><strong>Заметок пока нет</strong><p>Короткие наблюдения помогают сохранить контекст работы.</p></div></div>}</section>
  </div>;
}
