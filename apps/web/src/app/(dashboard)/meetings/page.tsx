"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarCheck2, ChevronRight, Clock3 } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { caseworkAPI } from "@/lib/api/casework";

export default function MeetingsPage() {
  const meetings = useQuery({ queryKey: ["meetings"], queryFn: caseworkAPI.meetings });
  return <section className="release-page"><PageHeader eyebrow="Коллегиальная работа" title="ППк" description="Планирование заседаний, решения и рекомендации по детям." />
    <section className="release-panel meeting-list">{meetings.isPending && <div className="page-loading"><span className="loading-spinner" />Загружаем заседания…</div>}{meetings.isError && <div className="release-error">Не удалось загрузить заседания.</div>}{meetings.data?.length === 0 && <EmptyState icon={CalendarCheck2} title="Заседаний пока нет" description="Создать ППк можно из карточки ребёнка через быстрое действие «Добавить»." />}{meetings.data?.map((meeting) => <Link href={`/meetings/${meeting.id}`} key={meeting.id}><span className="meeting-date"><strong>{new Intl.DateTimeFormat("ru-RU", { day: "2-digit" }).format(new Date(meeting.scheduledAt))}</strong><small>{new Intl.DateTimeFormat("ru-RU", { month: "short" }).format(new Date(meeting.scheduledAt))}</small></span><div><strong>{meeting.subject}</strong><span>{meeting.studentName}<i>·</i><Clock3 size={13} />{new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(meeting.scheduledAt))}</span></div><StatusBadge tone={meeting.status === "completed" ? "success" : meeting.status === "cancelled" ? "danger" : "info"}>{meeting.status === "completed" ? "Завершено" : meeting.status === "cancelled" ? "Отменено" : "Запланировано"}</StatusBadge><ChevronRight size={17} /></Link>)}</section>
  </section>;
}
