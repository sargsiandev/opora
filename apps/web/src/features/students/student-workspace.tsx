"use client";

import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { CalendarPlus, ChevronDown, Download, FileText, FolderOpen, History, ListPlus, LockKeyhole, MessageSquarePlus, Plus, Settings2, Target, Upload, UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AccessDialog } from "@/features/access/access-dialog";
import { MeetingDialog, NoteDialog, SupportCaseDialog, TaskDialog } from "@/features/casework/casework-dialogs";
import { StudentMeetings } from "@/features/casework/student-meetings";
import { StudentOverview } from "@/features/casework/student-overview";
import { StudentSupport } from "@/features/casework/student-support";
import { StudentTimeline } from "@/features/casework/student-timeline";
import { DocumentHistoryDialog } from "@/features/documents/document-history-dialog";
import { UploadDialog } from "@/features/documents/upload-dialog";
import { useCurrentUser } from "@/features/auth/auth-boundary";
import { accessAPI, type StudentAssignment } from "@/lib/api/access";
import { documentsAPI, formatBytes } from "@/lib/api/documents";
import type { Student, StudentDocument } from "@/lib/data/types";

type Tab = "overview" | "support" | "meetings" | "documents" | "access" | "history";
type QuickAction = "note" | "document" | "meeting" | "task" | "support";

export function StudentWorkspace({ student }: { student: Student }) {
  const [tab, setTab] = useState<Tab>("overview"); const [quickMenu, setQuickMenu] = useState(false); const [action, setAction] = useState<QuickAction | null>(null);
  const [historyDocument, setHistoryDocument] = useState<StudentDocument | null>(null); const [accessOpen, setAccessOpen] = useState(false); const [toast, setToast] = useState("");
  const queryClient = useQueryClient(); const user = useCurrentUser();
  const documents = useQuery({ queryKey: ["student-documents", student.id], queryFn: () => documentsAPI.list(student.id) });
  const canUpload = user.permissions.includes("documents.upload"); const canDownload = user.permissions.includes("documents.download"); const canEdit = user.permissions.includes("documents.edit"); const canWrite = user.permissions.includes("students.update");
  const canViewAccess = user.permissions.includes("access.view"); const canManageAccess = user.permissions.includes("access.manage");
  const access = useQuery({ queryKey: ["student-access", student.id], queryFn: () => accessAPI.list(student.id), enabled: canViewAccess });
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 3500); };
  const invalidateCasework = (message: string) => { setAction(null); notify(message); for (const key of ["student-notes","student-cases","student-meetings","student-tasks","student-timeline"]) void queryClient.invalidateQueries({ queryKey: [key, student.id] }); void queryClient.invalidateQueries({ queryKey: ["dashboard"] }); void queryClient.invalidateQueries({ queryKey: ["meetings"] }); void queryClient.invalidateQueries({ queryKey: ["tasks"] }); };
  const openAction = (next: QuickAction) => { setQuickMenu(false); setAction(next); if (next === "support") setTab("support"); if (next === "meeting") setTab("meetings"); if (next === "document") setTab("documents"); if (next === "note") setTab("history"); };

  const tabs: { key: Tab; label: string; count?: number; visible?: boolean }[] = [
    { key: "overview", label: "Обзор" }, { key: "support", label: "Сопровождение" }, { key: "meetings", label: "ППк" },
    { key: "documents", label: "Документы", count: documents.data?.length ?? student.documentCount }, { key: "access", label: "Доступ", count: access.data?.length ?? 0, visible: canViewAccess }, { key: "history", label: "История" },
  ];
  return <>
    <div className="student-workspace-nav"><div className="tabs" role="tablist" aria-label="Разделы карточки">{tabs.filter((item) => item.visible !== false).map((item) => <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} onClick={() => setTab(item.key)}>{item.label}{item.count !== undefined && <span>{item.count}</span>}</button>)}</div>{(canWrite || canUpload) && <div className="quick-add"><Button onClick={() => setQuickMenu((value) => !value)}><Plus size={17} />Добавить<ChevronDown size={15} /></Button>{quickMenu && <div className="quick-add-menu"><button onClick={() => openAction("note")} disabled={!canWrite}><MessageSquarePlus size={17} /><span><strong>Заметку</strong><small>Быстро зафиксировать наблюдение</small></span></button><button onClick={() => openAction("document")} disabled={!canUpload}><Upload size={17} /><span><strong>Документ</strong><small>DOCX или PDF</small></span></button><button onClick={() => openAction("meeting")} disabled={!canWrite}><CalendarPlus size={17} /><span><strong>Заседание ППк</strong><small>Запланировать встречу</small></span></button><button onClick={() => openAction("task")} disabled={!canWrite}><ListPlus size={17} /><span><strong>Задачу</strong><small>Назначить следующий шаг</small></span></button><button onClick={() => openAction("support")} disabled={!canWrite}><Target size={17} /><span><strong>Сопровождение</strong><small>Открыть направление работы</small></span></button></div>}</div>}</div>
    {tab === "overview" && <StudentOverview student={student} />}
    {tab === "support" && <StudentSupport studentId={student.id} canWrite={canWrite} />}
    {tab === "meetings" && <StudentMeetings studentId={student.id} canWrite={canWrite} />}
    {tab === "documents" && <DocumentsPanel documents={documents} student={student} canUpload={canUpload} canDownload={canDownload} canEdit={canEdit} onUpload={() => setAction("document")} onHistory={setHistoryDocument} />}
    {tab === "access" && <AccessPanel query={access} canManage={canManageAccess} onManage={() => setAccessOpen(true)} />}
    {tab === "history" && <StudentTimeline studentId={student.id} canWrite={canWrite} />}
    {action === "document" && <UploadDialog studentId={student.id} onClose={() => setAction(null)} onUploaded={() => { setAction(null); notify("Документ проверен и сохранён"); void queryClient.invalidateQueries({ queryKey: ["student-documents", student.id] }); void queryClient.invalidateQueries({ queryKey: ["student", student.id] }); void queryClient.invalidateQueries({ queryKey: ["students"] }); }} />}
    {action === "note" && <NoteDialog studentId={student.id} onClose={() => setAction(null)} onSaved={() => invalidateCasework("Заметка добавлена")} />}{action === "support" && <SupportCaseDialog studentId={student.id} onClose={() => setAction(null)} onSaved={() => invalidateCasework("Сопровождение открыто")} />}{action === "meeting" && <MeetingDialog studentId={student.id} onClose={() => setAction(null)} onSaved={() => invalidateCasework("Заседание запланировано")} />}{action === "task" && <TaskDialog studentId={student.id} onClose={() => setAction(null)} onSaved={() => invalidateCasework("Задача создана")} />}
    {accessOpen && <AccessDialog studentId={student.id} assignments={access.data ?? []} onClose={() => setAccessOpen(false)} onSaved={(message) => { setAccessOpen(false); notify(message); void queryClient.invalidateQueries({ queryKey: ["student-access", student.id] }); }} />}
    {historyDocument && <DocumentHistoryDialog document={historyDocument} onClose={() => setHistoryDocument(null)} />}{toast && <div className="toast" role="status">{toast}</div>}
  </>;
}

function DocumentsPanel({ documents, canUpload, canDownload, canEdit, onUpload, onHistory }: { documents: UseQueryResult<StudentDocument[], Error>; student: Student; canUpload: boolean; canDownload: boolean; canEdit: boolean; onUpload: () => void; onHistory: (document: StudentDocument) => void }) {
  return <section className="workspace-panel" role="tabpanel"><header className="panel-header"><div><h2>Документы</h2><p>Материалы по ребёнку. Каждое изменение сохраняется отдельной версией.</p></div>{canUpload && <Button type="button" onClick={onUpload}><Upload size={17} />Загрузить документ</Button>}</header><div className="document-list">{documents.isPending && <div className="page-loading"><span className="loading-spinner" />Загружаем документы…</div>}{documents.isError && <div className="release-error">Документы недоступны. <button onClick={() => void documents.refetch()}>Повторить</button></div>}{documents.data?.length === 0 && <EmptyState icon={FolderOpen} title="У ребёнка пока нет документов" description="Загрузите первый DOCX или PDF в защищённое пространство." action={canUpload && <Button onClick={onUpload}><Upload size={17} />Загрузить документ</Button>} />}{documents.data?.map((document) => <article className="document-row" key={document.id}><span className={`file-icon file-${document.kind}`}><FileText size={21} /></span><div className="document-title">{document.kind === "docx" && canEdit ? <Link className="document-open-link" href={`/documents/${document.id}/edit`} title={document.title}>{document.title}</Link> : document.kind === "pdf" ? <a className="document-open-link" href={documentsAPI.previewURL(document.id)} target="_blank" rel="noreferrer" title={document.title}>{document.title}</a> : <strong title={document.title}>{document.title}</strong>}<span><span className={`file-type-badge file-type-${document.kind}`}>{document.kind.toUpperCase()}</span><span>Версия {document.currentVersion.versionNumber}</span><span>{formatBytes(document.currentVersion.size)}</span>{document.confidentialityLevel === "restricted" && <span className="restricted-label"><LockKeyhole size={13} />Ограниченный доступ</span>}</span></div><div className="document-meta"><strong>{document.currentVersion.changedBy}</strong><span>{document.updatedAt}</span></div><div className="document-actions">{canDownload && <Button asChild variant="ghost" size="sm"><a href={documentsAPI.downloadURL(document.id)}><Download size={16} />Скачать</a></Button>}<Button type="button" variant="ghost" size="sm" onClick={() => onHistory(document)}><History size={16} />История</Button></div></article>)}</div></section>;
}

function AccessPanel({ query, canManage, onManage }: { query: UseQueryResult<StudentAssignment[], Error>; canManage: boolean; onManage: () => void }) {
  return <section className="workspace-panel" role="tabpanel"><header className="panel-header"><div><h2>Доступ к ребёнку</h2><p>Специалисты и их персональные разрешения.</p></div>{canManage && <Button type="button" onClick={onManage}><Settings2 size={17} />Настроить доступ</Button>}</header><div className="access-list">{query.isPending && <div className="page-loading"><span className="loading-spinner" />Загружаем доступы…</div>}{query.isError && <div className="release-error">Не удалось загрузить доступы.</div>}{query.data?.length === 0 && <EmptyState icon={UserRoundPlus} title="Доступ пока не настроен" description="Назначьте специалиста и выберите разрешения." action={canManage && <Button onClick={onManage}><Settings2 size={17} />Настроить доступ</Button>} />}{query.data?.map((entry) => <article className="access-row" key={entry.userId}><span className="person-avatar">{entry.displayName.split(" ").map((part) => part[0]).slice(0,2).join("")}</span><div><strong>{entry.displayName}</strong><span>{entry.roleName} · {entry.email}</span></div><div className="grant-list">{entry.grants.map((grant) => <span className="badge" key={grant}>{grantLabels[grant]}</span>)}</div></article>)}</div></section>;
}
const grantLabels = { view: "Просмотр", upload: "Загрузка", download: "Скачивание", edit: "Редактирование" } as const;
