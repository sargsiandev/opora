import type { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: React.ReactNode }) {
  return <div className="release-empty"><span><Icon size={24} /></span><strong>{title}</strong><p>{description}</p>{action}</div>;
}
