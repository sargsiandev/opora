import { ShieldCheck } from "lucide-react";

const labels: Record<string, string> = {
  "students.list": "Список детей", "students.view": "Просмотр детей", "students.create": "Добавление детей", "students.update": "Работа с сопровождением",
  "documents.list": "Список документов", "documents.view": "Просмотр документов", "documents.upload": "Загрузка документов", "documents.download": "Скачивание документов", "documents.edit": "Редактирование документов",
  "access.view": "Просмотр доступов", "access.manage": "Управление доступами", "users.view": "Просмотр специалистов", "users.create": "Добавление специалистов", "users.invite": "Приглашение специалистов", "users.manage": "Управление специалистами", "audit.view": "Журнал действий", "organization.update": "Настройки организации",
};

export function RolePermissions({ permissions }: { permissions: string[] }) {
  if (!permissions.length) return null;
  return <div className="role-permissions"><span><ShieldCheck size={15} />Возможности роли</span><div>{permissions.map((permission) => <span key={permission}>{labels[permission] ?? "Дополнительное разрешение"}</span>)}</div></div>;
}
