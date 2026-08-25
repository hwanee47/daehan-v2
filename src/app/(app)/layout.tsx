import { AppHeader } from "@/components/layout/app-header";
import { AppTabs } from "@/components/layout/app-tabs";
import type { AppTabHref } from "@/lib/app-tabs";
import { createClient } from "@/lib/supabase/server";

import type { CodeDetail, CodeGroup } from "./master/codes/types";
import type { Item, ItemDetail } from "./master/items/types";
import type {
  ItemToleranceRange,
  ToleranceItem,
} from "./master/tolerance-ranges/types";
import {
  CodesWorkspacePanel,
  InspectionReportsWorkspacePanel,
  ItemsWorkspacePanel,
  ToleranceRangesWorkspacePanel,
} from "./workspace-panels";
import { WorkspaceShell } from "./workspace-shell";

async function getWorkspace() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { allowedTabHrefs: [] as AppTabHref[], panels: {} };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const allowedTabHrefs: AppTabHref[] = ["/inspection-reports"];
  const panels: Partial<Record<AppTabHref, React.ReactNode>> = {
    "/inspection-reports": <InspectionReportsWorkspacePanel />,
  };

  if (profile?.role !== "admin") {
    return { allowedTabHrefs, panels };
  }

  allowedTabHrefs.push("/master/items", "/master/tolerance-ranges", "/master/codes");

  const [itemsResult, itemDetailsResult, rangesResult, groupsResult, codeDetailsResult] =
    await Promise.all([
      supabase
        .from("items")
        .select("seq, item_code, item_name, model_name, note")
        .order("seq"),
      supabase
        .from("item_details")
        .select("seq, item_seq, item_detail_code, item_detail_name, material, note")
        .order("seq"),
      supabase
        .from("item_tolerance_ranges")
        .select("seq, item_seq, nominal_min, nominal_max, upper_deviation, lower_deviation, note")
        .order("item_seq")
        .order("nominal_min"),
      supabase
        .from("code_groups")
        .select("seq, group_code, group_name, description, sort_order, is_active")
        .order("sort_order")
        .order("seq"),
      supabase
        .from("code_details")
        .select("seq, code_group_seq, code, code_name, description, sort_order, is_active")
        .order("sort_order")
        .order("seq"),
    ]);

  const itemHasError = Boolean(itemsResult.error || itemDetailsResult.error);
  const toleranceHasError = Boolean(itemsResult.error || rangesResult.error);
  const codeHasError = Boolean(groupsResult.error || codeDetailsResult.error);

  if (itemHasError || toleranceHasError || codeHasError) {
    console.error("Failed to load workspace data", {
      code:
        itemsResult.error?.code ||
        itemDetailsResult.error?.code ||
        rangesResult.error?.code ||
        groupsResult.error?.code ||
        codeDetailsResult.error?.code,
    });
  }

  panels["/master/items"] = (
    <ItemsWorkspacePanel
      details={(itemDetailsResult.data ?? []) as ItemDetail[]}
      hasError={itemHasError}
      items={(itemsResult.data ?? []) as Item[]}
    />
  );
  panels["/master/tolerance-ranges"] = (
    <ToleranceRangesWorkspacePanel
      hasError={toleranceHasError}
      items={(itemsResult.data ?? []) as ToleranceItem[]}
      ranges={(rangesResult.data ?? []) as ItemToleranceRange[]}
    />
  );
  panels["/master/codes"] = (
    <CodesWorkspacePanel
      details={(codeDetailsResult.data ?? []) as CodeDetail[]}
      groups={(groupsResult.data ?? []) as CodeGroup[]}
      hasError={codeHasError}
    />
  );

  return { allowedTabHrefs, panels };
}

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const workspace = await getWorkspace();

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <AppHeader />
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background"
        data-workspace-root
      >
        <AppTabs />
        <WorkspaceShell
          allowedTabHrefs={workspace.allowedTabHrefs}
          panels={workspace.panels}
        >
          {children}
        </WorkspaceShell>
      </div>
    </div>
  );
}
