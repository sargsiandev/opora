"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CalendarCheck2, CheckCircle2, Clock3, UsersRound } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StudentAvatar } from "@/components/ui/avatar";
import { useCurrentUser } from "@/features/auth/auth-boundary";
import { caseworkAPI, type DashboardItem } from "@/lib/api/casework";

const date = (value: string) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

export default function OverviewPage() {
  const user = useCurrentUser();
  const dashboard = useQuery({ queryKey: ["dashboard"], queryFn: caseworkAPI.dashboard });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер";
  const firstName = user.firstName || user.displayName.split(" ")[0];
  return <section className="release-page">
    <PageHeader eyebrow="Рабочее пространство" title={`${greeting}, ${firstName}`} description="Вот что требует внимания сегодня." />
    {dashboard.isPending && <OverviewSkeleton />}
    {dashboard.isError && <div className="release-panel release-error">Не удалось собрать сводку. <button onClick={() => void dashboard.refetch()}>Повторить</button></div>}
    {dashboard.data && <>
      <div className="stats-grid">
        <StatCard label="Мои дети" value={dashboard.data.studentCount} icon={UsersRound} />
        <StatCard label="Ближайшие ППк" value={dashboard.data.upcomingMeetings} icon={CalendarCheck2} tone="blue" />
        <StatCard label="Задачи на сегодня" value={dashboard.data.tasksToday} icon={CheckCircle2} tone="amber" />
        <StatCard label="Просрочено" value={dashboard.data.overdueTasks} icon={AlertCircle} tone="rose" />
      </div>
      <div className="overview-grid">
        <section className="release-panel attention-panel"><header><div><span className="panel-kicker">Фокус дня</span><h2>Требует внимания</h2></div><Link href="/tasks">Все задачи</Link></header>{(dashboard.data.attention ?? []).length ? <div className="overview-list">{dashboard.data.attention?.map((item) => <DashboardRow key={item.id} item={item} warning />)}</div> : <div className="overview-calm"><CheckCircle2 size={24} /><div><strong>Всё под контролем</strong><p>Просроченных задач сейчас нет.</p></div></div>}</section>
        <section className="release-panel"><header><div><span className="panel-kicker">Календарь</span><h2>Ближайшие события</h2></div><Link href="/meetings">Все ППк</Link></header>{(dashboard.data.upcoming ?? []).length ? <div className="overview-list">{dashboard.data.upcoming?.map((item) => <DashboardRow key={item.id} item={item} />)}</div> : <div className="overview-calm"><CalendarCheck2 size={24} /><div><strong>Событий пока нет</strong><p>Запланированные заседания появятся здесь.</p></div></div>}</section>
      </div>
      <section className="release-panel recent-panel"><header><div><span className="panel-kicker">Быстрый доступ</span><h2>Недавно обновляли</h2></div><Link href="/students">Все дети</Link></header><div className="recent-students">{(dashboard.data.recentStudents ?? []).map((student) => <Link href={`/students/${student.id}`} key={student.id}><StudentAvatar name={student.fullName} /><span><strong>{student.fullName}</strong><small>{student.className ? `${student.className} класс` : "Класс не указан"}</small></span><time>{date(student.updatedAt)}</time></Link>)}</div></section>
    </>}
  </section>;
}

function DashboardRow({ item, warning = false }: { item: DashboardItem; warning?: boolean }) {
  return <Link href={item.studentId ? `/students/${item.studentId}` : item.kind === "task" ? "/tasks" : "/meetings"}><span className={`overview-item-icon ${warning ? "is-warning" : ""}`}>{item.kind === "task" ? <CheckCircle2 size={18} /> : <CalendarCheck2 size={18} />}</span><span><strong>{item.title}</strong><small>{item.studentName ?? "Без привязки к ребёнку"}</small></span><time><Clock3 size={13} />{date(item.occurredAt)}</time></Link>;
}
function OverviewSkeleton() { return <div className="stats-grid">{Array.from({ length: 4 }, (_, index) => <div className="stat-card skeleton-card" key={index} />)}</div>; }
