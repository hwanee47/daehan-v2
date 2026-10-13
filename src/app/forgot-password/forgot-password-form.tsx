"use client";

import { useActionState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestPasswordReset, type ForgotPasswordState } from "./actions";

const initialState: ForgotPasswordState = { status: "idle" };

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initialState);
  return (
    <>
      {state.status === "success" ? (
        <p className="break-keep rounded-2xl bg-primary/5 p-4 text-sm leading-relaxed" role="status">{state.message}</p>
      ) : (
        <form action={action} className="space-y-5" noValidate>
          <div className="space-y-2">
            <label className="block font-semibold" htmlFor="email">이메일</label>
            <input
              aria-describedby={state.emailError ? "email-error" : undefined}
              aria-invalid={Boolean(state.emailError)}
              autoCapitalize="none" autoComplete="email" autoFocus
              className="h-13 w-full rounded-sm border border-input bg-background px-4 text-base outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 aria-invalid:border-destructive"
              defaultValue={state.email} id="email" inputMode="email" maxLength={254}
              name="email" placeholder="name@example.com" required spellCheck={false} type="email"
            />
            {state.emailError && <p className="text-sm text-destructive" id="email-error" role="alert">{state.emailError}</p>}
          </div>
          {state.message && <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{state.message}</p>}
          <Button className="w-full" disabled={pending} size="lg" type="submit">
            {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
            {pending ? "메일을 요청하고 있어요" : "재설정 메일 보내기"}
          </Button>
        </form>
      )}
      <Link className="mt-5 flex min-h-11 items-center justify-center rounded-xl text-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href="/login">로그인으로 돌아가기</Link>
    </>
  );
}
