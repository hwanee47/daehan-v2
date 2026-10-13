import type { ReactNode } from "react";
import Link from "next/link";

import { Container } from "@/components/layout/container";

export function AuthShell({ title, description, children }: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-svh items-center py-10 sm:py-16">
      <Container className="flex justify-center">
        <section className="w-full max-w-md" aria-labelledby="auth-title">
          <Link className="inline-flex min-h-11 items-center font-semibold tracking-tight" href="/">DAEHAN</Link>
          <div className="mb-8 mt-8 sm:mb-10 sm:mt-12">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl" id="auth-title">{title}</h1>
            <p className="mt-3 break-keep text-base text-muted-foreground">{description}</p>
          </div>
          {children}
        </section>
      </Container>
    </main>
  );
}
