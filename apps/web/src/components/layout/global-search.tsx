"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useRef, useState } from "react";

import { useCurrentUser } from "@/features/auth/auth-boundary";
import { studentsAPI } from "@/lib/api/students";

export function GlobalSearch() {
  const user = useCurrentUser();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const deferred = useDeferredValue(query.trim().toLocaleLowerCase("ru"));
  const canSearch = user.permissions.some((permission) => permission === "students.list" || permission === "students.view");
  const students = useQuery({ queryKey: ["students"], queryFn: studentsAPI.list, enabled: canSearch, staleTime: 30_000 });
  const results = (students.data ?? []).filter((student) => `${student.fullName} ${student.className}`.toLocaleLowerCase("ru").includes(deferred)).slice(0, 7);

  useEffect(() => {
    const focus = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", focus);
    return () => document.removeEventListener("keydown", focus);
  }, []);
  if (!canSearch) return null;

  return <div className="global-search" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <label><Search size={17} /><span className="sr-only">Найти ребёнка</span><input ref={input} value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Найти ребёнка…" /><kbd>⌘ K</kbd></label>
    {open && deferred && <div className="global-search-results" role="listbox">
      {results.map((student) => <button key={student.id} type="button" onClick={() => { setOpen(false); setQuery(""); router.push(`/students/${student.id}`); }}><span><UserRound size={16} /></span><strong>{student.fullName}<small>{student.className} класс</small></strong></button>)}
      {!students.isPending && results.length === 0 && <p>Ребёнок не найден</p>}
    </div>}
  </div>;
}
