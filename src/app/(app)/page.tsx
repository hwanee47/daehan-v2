import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Container } from "@/components/layout/container";

import { HomeDashboard } from "./home-dashboard";
import { getHomeDashboardData } from "./home-data";

export const metadata: Metadata = {
  title: "검사 업무 현황 | Daehan",
  description: "검사성적서와 측정 이력 현황을 확인해요.",
};

export default async function HomePage() {
  const data = await getHomeDashboardData();
  if (!data) redirect("/login");

  return (
    <main className="@container/workspace min-h-full bg-background">
      <Container className="py-5 @min-[640px]/workspace:py-6" size="full">
        <HomeDashboard data={data} />
      </Container>
    </main>
  );
}
