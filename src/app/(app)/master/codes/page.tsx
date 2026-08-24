import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Container } from "@/components/layout/container";
import { createClient } from "@/lib/supabase/server";

import { CodeManagement } from "./code-management";
import type { CodeDetail, CodeGroup } from "./types";

export const metadata: Metadata = {
  title: "코드관리 | Daehan",
  description: "공통 코드그룹과 상세 코드를 관리해요.",
};

export default async function CodeManagementPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") redirect("/");

  const [groupsResult, detailsResult] = await Promise.all([
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

  const loadError = groupsResult.error || detailsResult.error;
  if (loadError) console.error("Failed to load code management", { code: loadError.code });

  return (
    <main className="min-h-svh bg-background py-10 sm:py-16">
      <Container size="full">
        <section aria-labelledby="code-management-title">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl" id="code-management-title">
            코드관리
          </h1>
          <p className="mt-3 text-muted-foreground">
            공통으로 사용하는 코드그룹과 상세 코드를 관리할 수 있어요.
          </p>

          {loadError ? (
            <div className="mt-8 rounded-3xl border border-border bg-card p-6" role="alert">
              <h2 className="text-lg font-semibold">코드를 불러오지 못했어요</h2>
              <p className="mt-2 text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
            </div>
          ) : (
            <CodeManagement
              details={(detailsResult.data ?? []) as CodeDetail[]}
              groups={(groupsResult.data ?? []) as CodeGroup[]}
            />
          )}
        </section>
      </Container>
    </main>
  );
}
