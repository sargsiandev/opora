"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useState } from "react";

import { StudentAvatar } from "@/components/ui/avatar";
import type { StudentSummary } from "@/lib/data/types";
import { ageFromBirthDate, relativeDate } from "@/lib/format";

const attentionCutoff = Date.now() - 30 * 86_400_000;

export function StudentsTable({ students }: { students: StudentSummary[] }) {
  const [query, setQuery] = useState("");
  const [className, setClassName] = useState("all");
  const [attention, setAttention] = useState(false);
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase("ru"));
  const classes = Array.from(new Set(students.map((student) => student.className).filter((value) => value !== "—"))).sort();
  const filtered = students.filter((student) => {
    const stale = student.updatedAtValue ? new Date(student.updatedAtValue).getTime() < attentionCutoff : false;
    return `${student.fullName} ${student.className}`.toLocaleLowerCase("ru").includes(deferredQuery) && (className === "all" || student.className === className) && (!attention || stale);
  });

  return <>
    <div className="student-filterbar">
      <label className="release-search"><Search size={18} /><span className="sr-only">Поиск</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск ребёнка…" /></label>
      <label className="class-filter"><SlidersHorizontal size={16} /><select value={className} onChange={(event) => setClassName(event.target.value)}><option value="all">Все классы</option>{classes.map((value) => <option value={value} key={value}>{value} класс</option>)}</select></label>
      <button type="button" className="attention-filter" aria-pressed={attention} onClick={() => setAttention((value) => !value)}>Требует внимания</button>
      <span className="results-count">{filtered.length}</span>
    </div>
    <div className="release-panel student-list-table">
      <div className="student-list-head"><span>Ребёнок</span><span>Класс</span><span>Документы</span><span>Активность</span></div>
      {filtered.map((student) => { const age = ageFromBirthDate(student.birthDateValue); const stale = student.updatedAtValue ? new Date(student.updatedAtValue).getTime() < attentionCutoff : false; return <Link aria-label={student.fullName} className="student-list-row" href={`/students/${student.id}`} key={student.id}><div><StudentAvatar name={student.fullName} /><span><strong>{student.fullName}{student.activeSupport && <i className="support-dot" title="На сопровождении" />}</strong><small>{age === null ? "Возраст не указан" : `${age} лет`}{student.specialists?.length ? ` · ${student.specialists.slice(0,2).join(", ")}` : ""}</small></span></div><span><b>{student.className}</b></span><span>{student.documentCount}</span><span className={stale ? "needs-attention" : ""}>{student.updatedAtValue ? relativeDate(student.updatedAtValue) : student.updatedAt}{stale && <small>давно не обновлялась</small>}</span></Link>; })}
      {filtered.length === 0 && <div className="release-empty compact"><strong>Ничего не найдено</strong><p>Измените поиск или фильтры.</p></div>}
    </div>
  </>;
}
