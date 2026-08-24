import { Check, Circle, LockKeyhole } from "lucide-react";

import { Container } from "@/components/layout/container";
import { buttonVariants } from "@/components/ui/button";
import { homeContent } from "@/content/home";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <main className="min-h-[calc(100svh-5rem)] bg-background lg:min-h-[calc(100svh-88px)]">
      <Container className="grid min-h-[calc(100vh-5rem)] items-center gap-16 py-16 lg:min-h-[calc(100vh-88px)] lg:max-w-[1312px] lg:-translate-y-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-24" size="xl">
        <section className="max-w-xl">
          <h1 className="whitespace-pre-line text-[42px] leading-[1.16] font-bold tracking-[-0.035em] text-foreground sm:text-[56px] lg:text-[64px]">
            {homeContent.headline}
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl lg:text-[22px] lg:leading-10">
            {homeContent.description}
          </p>
          <a className={cn(buttonVariants({ size: "lg" }), "mt-10 w-full rounded-full sm:w-[480px] lg:h-20 lg:text-lg")} href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">
            {homeContent.primaryAction}
          </a>
        </section>

        <section aria-labelledby="setup-title" className="w-full justify-self-end">
          <div className="rounded-[28px] bg-muted p-5 sm:p-10">
            <div className="mb-8 flex items-end justify-between gap-4">
              <h2 id="setup-title" className="text-2xl font-bold tracking-[-0.02em] sm:text-3xl">
                {homeContent.panelTitle}
              </h2>
              <span className="text-tabular text-sm font-semibold text-primary">1 / 3</span>
            </div>
            <div aria-label="설정 진행률 33%" aria-valuemax={3} aria-valuemin={0} aria-valuenow={1} className="mb-10 h-2 overflow-hidden rounded-full bg-border" role="progressbar">
              <div className="h-full w-1/3 rounded-full bg-primary" />
            </div>

            <div className="space-y-4">
              {homeContent.setupItems.map(({ icon: Icon, ready, status, title }) => (
                <div className="flex min-h-28 items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 sm:min-h-32 sm:gap-6 sm:px-7" key={title}>
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                    <Icon className="size-6" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold sm:text-xl">{title}</h3>
                    <span className={cn("mt-1.5 flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold sm:hidden", ready ? "bg-accent text-primary" : "bg-secondary text-muted-foreground")}>
                      {ready ? <Check className="size-3.5" /> : <Circle className="size-2.5" />}
                      {status}
                    </span>
                  </div>
                  <span className={cn("hidden shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold sm:flex", ready ? "bg-accent text-primary" : "bg-secondary text-muted-foreground")}>
                    {ready ? <Check className="size-4" /> : <Circle className="size-3" />}
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-7 flex items-center justify-center gap-2 text-sm text-muted-foreground sm:text-base">
            <LockKeyhole className="size-5 shrink-0" />
            {homeContent.securityNote}
          </p>
        </section>
      </Container>
    </main>
  );
}
