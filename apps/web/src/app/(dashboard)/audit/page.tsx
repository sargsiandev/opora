"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, ClipboardList, Download, FilePenLine, FileText, KeyRound, LockKeyhole, ShieldCheck, UserCog, UserPlus, UserRound, UsersRound } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { auditAPI, type AuditEvent } from "@/lib/api/audit";
import { cn } from "@/lib/cn";

const actionLabels: Record<string, string> = {
  login: "Выполнен вход в систему",
  logout: "Выполнен выход из системы",
  failed_login: "Неудачная попытка входа",
  "student.view": "Открыта карточка ребёнка",
  "student.create": "Добавлен ребёнок",
  "student.update": "Изменены данные ребёнка",
  "document.view": "Открыт документ",
  "document.download": "Скачан документ",
  "document.upload": "Загружен документ",
  "document.edit": "Отредактирован документ",
  "document.delete": "Удалён документ",
  "permission.grant": "Выдан доступ",
  "permission.revoke": "Доступ отозван",
  "access.grant": "Выдан доступ",
  "access.revoke": "Доступ отозван",
  "user.invite": "Создан специалист",
  "user.invitation_created": "Приглашение специалиста создано",
  "user.invitation_accepted": "Приглашение специалиста принято",
  "user.invitation_resent": "Приглашение отправлено повторно",
  "user.role_change": "Изменена роль специалиста",
  "user.update": "Изменены данные специалиста",
  "user.profile_update": "Изменён профиль",
  "user.password_change": "Изменён пароль",
  "organization.update": "Изменены настройки организации",
};

const resourceLabels: Record<string, string> = {
  document: "Документ",
  student: "Ребёнок",
  user: "Пользователь",
  organization: "Организация",
  session: "Сессия",
};

type AuditCategory = "all" | "users" | "students" | "documents" | "access";

const filters: Array<{ value: AuditCategory; label: string }> = [
  { value: "all", label: "Все действия" },
  { value: "users", label: "Пользователи" },
  { value: "students", label: "Дети" },
  { value: "documents", label: "Документы" },
  { value: "access", label: "Доступ" },
];

function categoryOf(event: AuditEvent): AuditCategory {
  if (event.action.startsWith("permission.") || event.action.startsWith("access.")) return "access";
  if (event.resourceType === "document" || event.action.startsWith("document.")) return "documents";
  if (event.resourceType === "student" || event.action.startsWith("student.")) return "students";
  if (event.resourceType === "user" || event.action.startsWith("user.")) return "users";
  return "all";
}

function EventIcon({ event }: { event: AuditEvent }) {
  const props = { size: 18, "aria-hidden": true } as const;
  switch (event.action) {
    case "document.download": return <Download {...props} />;
    case "document.edit": return <FilePenLine {...props} />;
    case "document.upload": case "document.view": return <FileText {...props} />;
    case "student.create": return <UserPlus {...props} />;
    case "student.update": case "student.view": return <UserRound {...props} />;
    case "user.invitation_created": case "user.invitation_resent": case "user.invitation_accepted": return <UserPlus {...props} />;
    case "user.profile_update": case "user.role_change": case "user.update": return <UserCog {...props} />;
    case "user.password_change": return <LockKeyhole {...props} />;
    case "permission.grant": case "permission.revoke": case "access.grant": case "access.revoke": return <KeyRound {...props} />;
    case "organization.update": return <UsersRound {...props} />;
    default: return <Activity {...props} />;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatFullDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeStyle: "short" }).format(new Date(value));
}

export default function AuditPage() {
  const audit = useQuery({ queryKey: ["audit"], queryFn: auditAPI.list });
  const [filter, setFilter] = useState<AuditCategory>("all");
  const events = audit.data?.filter((event) => filter === "all" || categoryOf(event) === filter) ?? [];
  return (
    <section>
      <header className="page-header"><div><span className="eyebrow">Контроль</span><h1>Журнал действий</h1><p>История значимых действий сотрудников в системе.</p></div><div className="audit-note"><ShieldCheck size={17} /><span>Записи доступны только для просмотра</span></div></header>
      {audit.isPending && <div className="data-panel page-loading"><span className="loading-spinner" />Загружаем журнал…</div>}
      {audit.isError && <div className="data-panel empty-state"><strong>Журнал временно недоступен</strong><Button variant="outline" onClick={() => void audit.refetch()}>Повторить</Button></div>}
      {audit.data && audit.data.length > 0 && <>
        <div className="audit-filters" role="group" aria-label="Фильтр журнала">{filters.map((item) => <button key={item.value} type="button" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label}</button>)}</div>
        {events.length > 0 ? <div className="data-panel audit-list">{events.map((entry) => <article className="audit-row" key={entry.id}>
          <span className={cn("audit-event-icon", `audit-event-${categoryOf(entry)}`)}><EventIcon event={entry} /></span>
          <div className="audit-event-copy"><strong>{actionLabels[entry.action] ?? "Системное действие"}</strong><span>{entry.actorName}<i aria-hidden="true">·</i>{resourceLabels[entry.resourceType] ?? "Система"}</span></div>
          <time dateTime={entry.createdAt} title={formatFullDate(entry.createdAt)}>{formatDate(entry.createdAt)}</time>
        </article>)}</div> : <div className="data-panel empty-state audit-empty"><ClipboardList size={28} /><strong>Нет событий этого типа</strong><span>Попробуйте выбрать другой фильтр.</span></div>}
      </>}
      {audit.data?.length === 0 && <div className="data-panel empty-state"><ClipboardList size={30} /><strong>В журнале пока нет событий</strong><span>Значимые действия появятся здесь автоматически.</span></div>}
    </section>
  );
}
