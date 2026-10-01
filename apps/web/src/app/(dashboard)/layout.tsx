import { MobileHeader, Sidebar } from "@/components/layout/sidebar";
import { GlobalSearch } from "@/components/layout/global-search";
import { AuthBoundary } from "@/features/auth/auth-boundary";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthBoundary>
      <div className="app-shell">
        <Sidebar />
        <div className="dashboard-main"><MobileHeader /><header className="desktop-topbar"><GlobalSearch /></header><main className="content-shell">{children}</main></div>
      </div>
    </AuthBoundary>
  );
}
