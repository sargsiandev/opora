"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, PencilLine } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { StudentAvatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useCurrentUser } from "@/features/auth/auth-boundary";
import { EditStudentDialog } from "@/features/students/edit-student-dialog";
import { StudentWorkspace } from "@/features/students/student-workspace";
import { studentsAPI } from "@/lib/api/students";
import { caseworkAPI } from "@/lib/api/casework";
import { ageFromBirthDate } from "@/lib/format";

export default function StudentPage() {
  const { id } = useParams<{ id: string }>();
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState("");
  const student = useQuery({ queryKey: ["student", id], queryFn: () => studentsAPI.get(id), enabled: Boolean(id) });
  const cases = useQuery({ queryKey: ["student-cases", id], queryFn: () => caseworkAPI.cases(id), enabled: Boolean(id) });
  if (student.isPending) return <div className="data-panel page-loading"><span className="loading-spinner" /> Загружаем карточку…</div>;
  if (student.isError) return <div className="data-panel empty-state"><strong>Карточка недоступна</strong><Link href="/students">Вернуться к списку</Link></div>;

  return (
    <section>
      <Link className="back-link" href="/students"><ArrowLeft size={16} /> Все дети</Link>
      <header className="student-profile-header"><StudentAvatar name={student.data.fullName} className="student-avatar-large" /><div className="student-profile-copy"><span className="eyebrow">Карточка ребёнка</span><h1>{student.data.fullName}</h1><p>{student.data.className} класс{ageFromBirthDate(student.data.birthDateValue) !== null ? ` · ${ageFromBirthDate(student.data.birthDateValue)} лет` : ""}</p><div className="student-statuses">{cases.data?.some((item) => item.status !== "completed") && <StatusBadge tone="success">На сопровождении</StatusBadge>}</div></div>{user.permissions.includes("students.update") && <Button className="student-edit" variant="outline" onClick={() => setEditing(true)}><PencilLine size={16} />Редактировать</Button>}</header>
      <StudentWorkspace student={student.data} />
      {editing && <EditStudentDialog student={student.data} onClose={() => setEditing(false)} onUpdated={() => { setEditing(false); setToast("Карточка ребёнка обновлена"); void queryClient.invalidateQueries({ queryKey: ["student", id] }); void queryClient.invalidateQueries({ queryKey: ["students"] }); window.setTimeout(() => setToast(""), 3000); }} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </section>
  );
}
