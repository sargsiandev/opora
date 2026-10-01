"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Check, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { caseworkAPI, type StudentTask } from "@/lib/api/casework";

type Filter = "todo" | "today" | "overdue" | "done";
export default function TasksPage() {
  const [filter, setFilter] = useState<Filter>("todo");
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: caseworkAPI.tasks });
  const client = useQueryClient();
  const update = useMutation({ mutationFn: ({ id, status }: { id: string; status: StudentTask["status"] }) => caseworkAPI.setTaskStatus(id, status), onSuccess: () => { void client.invalidateQueries({ queryKey: ["tasks"] }); void client.invalidateQueries({ queryKey: ["dashboard"] }); } });
  const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const end = new Date(start); end.setDate(end.getDate() + 1);
  const filtered = (tasks.data ?? []).filter((task) => filter === "done" ? task.status === "done" : task.status === "todo" && (filter === "todo" || (filter === "overdue" && task.dueAt && new Date(task.dueAt) < now) || (filter === "today" && task.dueAt && new Date(task.dueAt) >= start && new Date(task.dueAt) < end)));
  return <section className="release-page"><PageHeader eyebrow="Рабочий день" title="Задачи" description="Короткий список договорённостей и следующих шагов." />
    <div className="segmented-filter">{([['todo','Мои задачи'],['today','Сегодня'],['overdue','Просроченные'],['done','Выполненные']] as [Filter,string][]).map(([key,label]) => <button key={key} aria-pressed={filter===key} onClick={() => setFilter(key)}>{label}</button>)}</div>
    <section className="release-panel task-list">{tasks.isPending && <div className="page-loading"><span className="loading-spinner" />Загружаем задачи…</div>}{tasks.isError && <div className="release-error">Не удалось загрузить задачи.</div>}{!tasks.isPending && filtered.length === 0 && <EmptyState icon={CheckCircle2} title="Здесь всё выполнено" description="Новые задачи по детям появятся в этом разделе." />}{filtered.map((task) => <article key={task.id} className={task.status === "done" ? "is-done" : ""}><button type="button" className="task-check" disabled={update.isPending} aria-label={task.status === "done" ? "Вернуть задачу" : "Выполнить задачу"} onClick={() => update.mutate({ id: task.id, status: task.status === "done" ? "todo" : "done" })}>{task.status === "done" ? <Check size={17} /> : <Circle size={17} />}</button><div><strong>{task.title}</strong>{task.description && <p>{task.description}</p>}<span>{task.studentId ? <Link href={`/students/${task.studentId}`}>{task.studentName}</Link> : "Общая задача"}{task.dueAt && <><i>·</i><CalendarClock size={13} />{formatDue(task.dueAt)}</>}</span></div></article>)}</section>
  </section>;
}
function formatDue(value: string) { const date = new Date(value); return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date); }
