import { AppHeader } from "@/components/layout/app-header";
import { AppTabs } from "@/components/layout/app-tabs";
import type { AppTabHref } from "@/lib/app-tabs";
import { createClient } from "@/lib/supabase/server";

import { WorkspaceShell } from "./workspace-shell";

async function getWorkspace() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [] as AppTabHref[];
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const allowedTabHrefs: AppTabHref[] = ["/inspection-reports", "/inspection-measurements", "/inspection-measurement-history"];

  if (profile?.role !== "admin") {
    return allowedTabHrefs;
  }

  allowedTabHrefs.push("/master/items", "/master/tolerance-ranges", "/master/codes");
  return allowedTabHrefs;
}

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const allowedTabHrefs = await getWorkspace();

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <AppHeader />
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background"
        data-workspace-root
      >
        <AppTabs />
        <WorkspaceShell
          allowedTabHrefs={allowedTabHrefs}
        >
          {children}
        </WorkspaceShell>
      </div>
    </div>
  );
}
