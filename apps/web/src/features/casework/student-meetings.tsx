"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck2, CalendarPlus, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { MeetingDialog } from "@/features/casework/casework-dialogs";
import { caseworkAPI } from "@/lib/api/casework";
import { formatDateTime } from "@/lib/format";

export function StudentMeetings({ studentId, canWrite }: { studentId: string; canWrite: boolean }) {
  const query = useQuery({ queryKey: ["student-meetings", studentId], queryFn: () => caseworkAPI.studentMeetings(studentId) });
  const client = useQueryClient(); const [open, setOpen] = useState(false);
  const saved = () => { setOpen(false); void client.invalidateQueries({ queryKey: ["student-meetings", studentId] }); void client.invalidateQueries({ queryKey: ["meetings"] }); void client.invalidateQueries({ queryKey: ["dashboard"] }); };
  return <section className="workspace-panel"><header className="panel-header"><div><h2>Заседания ППк</h2><p>Вопросы, решения, рекомендации и задачи по итогам.</p></div>{canWrite && <Button onClick={() => setOpen(true)}><CalendarPlus size={17} />Запланировать ППк</Button>}</header>
    <div className="student-meeting-list">{query.isPending && <div className="page-loading"><span className="loading-spinner" />Загружаем заседания…</div>}{query.data?.length === 0 && <EmptyState icon={CalendarCheck2} title="Заседаний пока нет" description="Запланируйте первое заседание по ребёнку." action={canWrite && <Button onClick={() => setOpen(true)}><CalendarPlus size={17} />Запланировать</Button>} />}{query.data?.map((meeting) => <Link href={`/meetings/${meeting.id}`} key={meeting.id}><span className="meeting-date wide"><strong>{new Intl.DateTimeFormat("ru-RU", { day: "2-digit" }).format(new Date(meeting.scheduledAt))}</strong><small>{new Intl.DateTimeFormat("ru-RU", { month: "short" }).format(new Date(meeting.scheduledAt))}</small></span><div><strong>{meeting.subject}</strong><span>{formatDateTime(meeting.scheduledAt)} · {meeting.participantNames.length ? `${meeting.participantNames.length} участника` : "Участники не указаны"}</span></div><StatusBadge tone={meeting.status === "completed" ? "success" : meeting.status === "cancelled" ? "danger" : "info"}>{meeting.status === "completed" ? "Завершено" : meeting.status === "cancelled" ? "Отменено" : "Запланировано"}</StatusBadge><ChevronRight size={17} /></Link>)}</div>{open && <MeetingDialog studentId={studentId} onClose={() => setOpen(false)} onSaved={saved} />}
  </section>;
}
