import type { LucideIcon } from "lucide-react";

export function StatCard({ label, value, icon: Icon, tone = "green" }: { label: string; value: number; icon: LucideIcon; tone?: "green" | "blue" | "amber" | "rose" }) {
  return <article className={`stat-card stat-${tone}`}><span className="stat-icon"><Icon size={19} /></span><div><strong>{value}</strong><span>{label}</span></div></article>;
}
