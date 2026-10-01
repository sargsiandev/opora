import { cn } from "@/lib/cn";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toLocaleUpperCase("ru");
}

export function UserAvatar({ name, className }: { name: string; className?: string }) {
  return <span className={cn("entity-avatar user-avatar", className)} aria-hidden="true">{initials(name)}</span>;
}

export function StudentAvatar({ name, className }: { name: string; className?: string }) {
  return <span className={cn("entity-avatar student-avatar", className)} aria-hidden="true">{initials(name)}</span>;
}
