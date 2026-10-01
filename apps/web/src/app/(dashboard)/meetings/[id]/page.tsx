"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, CheckCircle2, UsersRound } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { caseworkAPI, type Meeting } from "@/lib/api/casework";

export default function MeetingPage() {
  const { id } = useParams<{ id: string }>();
  const meeting = useQuery({ queryKey: ["meeting", id], queryFn: () => caseworkAPI.meeting(id) });
  if (meeting.isPending) return <div className="release-panel page-loading"><span className="loading-spinner" />Загружаем ППк…</div>;
  if (meeting.isError) return <div className="release-panel release-error">Заседание недоступно. <Link href="/meetings">Вернуться</Link></div>;
  return <MeetingEditor meeting={meeting.data} />;
}

function MeetingEditor({ meeting }: { meeting: Meeting }) {
  const [form, setForm] = useState({ subject: meeting.subject, scheduledAt: localDateTime(meeting.scheduledAt), questions: meeting.questions ?? "", notes: meeting.notes ?? "", decision: meeting.decision ?? "", recommendations: meeting.recommendations ?? "" });
  const [toast, setToast] = useState("");
  const client = useQueryClient();
  const save = useMutation({ mutationFn: (status: Meeting["status"]) => caseworkAPI.updateMeeting(meeting.id, { ...form, scheduledAt: new Date(form.scheduledAt).toISOString(), status, participantIds: meeting.participantIds }), onSuccess: (updated) => { client.setQueryData(["meeting", meeting.id], updated); setForm({ subject: updated.subject, scheduledAt: localDateTime(updated.scheduledAt), questions: updated.questions ?? "", notes: updated.notes ?? "", decision: updated.decision ?? "", recommendations: updated.recommendations ?? "" }); void client.invalidateQueries({ queryKey: ["meetings"] }); void client.invalidateQueries({ queryKey: ["dashboard"] }); setToast(updated.status === "completed" ? "Заседание завершено" : "Изменения сохранены"); window.setTimeout(() => setToast(""), 3000); } });
  return <section className="meeting-editor-page"><Link className="back-link" href="/meetings"><ArrowLeft size={16} />Все заседания</Link><header><div><span className="eyebrow">ППк · {meeting.studentName}</span><h1>{meeting.subject}</h1><p><CalendarDays size={15} />{new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeStyle: "short" }).format(new Date(meeting.scheduledAt))}</p></div><StatusBadge tone={meeting.status === "completed" ? "success" : "info"}>{meeting.status === "completed" ? "Завершено" : "Запланировано"}</StatusBadge></header>
    <div className="meeting-editor-grid"><section className="release-panel meeting-form"><label>Тема / вопрос<input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} /></label><label>Дата и время<input type="datetime-local" value={form.scheduledAt} onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })} /></label><label>Причина и вопросы<textarea rows={4} value={form.questions} onChange={(event) => setForm({ ...form, questions: event.target.value })} /></label><label>Рабочие заметки<textarea rows={4} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label><label>Решение<textarea rows={5} value={form.decision} onChange={(event) => setForm({ ...form, decision: event.target.value })} /></label><label>Рекомендации<textarea rows={5} value={form.recommendations} onChange={(event) => setForm({ ...form, recommendations: event.target.value })} /></label><footer><Button variant="outline" disabled={save.isPending || !form.subject || !form.scheduledAt} onClick={() => save.mutate(meeting.status)}>Сохранить</Button>{meeting.status !== "completed" && <Button disabled={save.isPending || !form.decision.trim()} onClick={() => save.mutate("completed")}><CheckCircle2 size={17} />Завершить заседание</Button>}</footer></section>
      <aside className="release-panel meeting-side"><h2><UsersRound size={18} />Участники</h2>{meeting.participantNames.length ? meeting.participantNames.map((name) => <span key={name}>{name}</span>) : <p>Участники пока не указаны.</p>}<Link href={`/students/${meeting.studentId}`}>Открыть карточку ребёнка</Link></aside></div>{toast && <div className="toast">{toast}</div>}
  </section>;
}
function localDateTime(value: string) { const date = new Date(value); const offset = date.getTimezoneOffset(); return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16); }
