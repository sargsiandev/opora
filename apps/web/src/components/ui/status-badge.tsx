import { cn } from "@/lib/cn";

export function StatusBadge({ tone = "neutral", children }: { tone?: "neutral" | "success" | "warning" | "danger" | "info"; children: React.ReactNode }) {
  return <span className={cn("status-badge", `status-${tone}`)}>{children}</span>;
}
