"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Files, LockKeyhole } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { useCurrentUser } from "@/features/auth/auth-boundary";
import { documentsAPI, formatBytes } from "@/lib/api/documents";
import { studentsAPI } from "@/lib/api/students";

export default function DocumentsPage() {
  const user = useCurrentUser();
  const query = useQuery({ queryKey: ["visible-documents"], queryFn: async () => { const students = await studentsAPI.list(); const groups = await Promise.all(students.map(async (student) => ({ student, documents: await documentsAPI.list(student.id) }))); return groups.flatMap(({ student, documents }) => documents.map((document) => ({ student, document }))); } });
  const canEdit = user.permissions.includes("documents.edit"); const canDownload = user.permissions.includes("documents.download");
  return <section className="release-page"><PageHeader eyebrow="Материалы" title="Документы" description="Все доступные вам документы по детям в одном месте." />
    <section className="release-panel global-documents">{query.isPending && <div className="page-loading"><span className="loading-spinner" />Загружаем документы…</div>}{query.isError && <div className="release-error">Не удалось загрузить документы.</div>}{query.data?.length === 0 && <EmptyState icon={Files} title="Документов пока нет" description="Документы добавляются из карточки конкретного ребёнка." />}{query.data?.map(({ student, document }) => <article key={document.id}><span className={`file-icon file-${document.kind}`}><FileText size={19} /></span><div><Link href={document.kind === "docx" && canEdit ? `/documents/${document.id}/edit` : document.kind === "pdf" ? documentsAPI.previewURL(document.id) : `/students/${student.id}`}>{document.title}</Link><span><Link href={`/students/${student.id}`}>{student.fullName}</Link><i>·</i>{formatBytes(document.currentVersion.size)}<i>·</i>Версия {document.currentVersion.versionNumber}</span></div>{document.confidentialityLevel === "restricted" && <LockKeyhole size={15} />} {canDownload && <a className="icon-button" href={documentsAPI.downloadURL(document.id)} aria-label="Скачать"><Download size={17} /></a>}</article>)}</section>
  </section>;
}
