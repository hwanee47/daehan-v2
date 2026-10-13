"use client";

import { useActionState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resetPassword, type ResetPasswordState } from "./actions";

const initialState: ResetPasswordState = { status: "idle" };
const inputClassName = "h-13 w-full rounded-sm border border-input bg-background px-4 text-base outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 aria-invalid:border-destructive";
const linkClassName = "mt-5 flex min-h-11 items-center justify-center rounded-xl text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ResetPasswordForm({ email, userId }: { email: string; userId: string }) {
  const [state, action, pending] = useActionState(resetPassword, initialState);
  if (state.expired) {
    return (
      <div>
        <p className="text-sm text-destructive" role="alert">{state.message}</p>
        <Link className={linkClassName} href="/forgot-password">복구 메일 다시 요청하기</Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="expectedUserId" value={userId} />
      <p className="break-all text-sm text-muted-foreground">{email}</p>
      <div className="space-y-2">
        <label className="block font-semibold" htmlFor="password">새 비밀번호</label>
        <input autoComplete="new-password" autoFocus className={inputClassName}
          id="password" name="password" type="password" required minLength={8} maxLength={72}
          aria-invalid={Boolean(state.errors?.password)} aria-describedby="password-help password-error" />
        <p className="text-sm text-muted-foreground" id="password-help">8자 이상 72자 이하로 입력해 주세요.</p>
        <p className="text-sm text-destructive" id="password-error" role="alert">{state.errors?.password}</p>
      </div>
      <div className="space-y-2">
        <label className="block font-semibold" htmlFor="password-confirm">새 비밀번호 확인</label>
        <input autoComplete="new-password" className={inputClassName}
          id="password-confirm" name="passwordConfirm" type="password" required minLength={8} maxLength={72}
          aria-invalid={Boolean(state.errors?.passwordConfirm)} aria-describedby="password-confirm-error" />
        <p className="text-sm text-destructive" id="password-confirm-error" role="alert">{state.errors?.passwordConfirm}</p>
      </div>
      {state.message && <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{state.message}</p>}
      <Button className="w-full" disabled={pending} size="lg" type="submit">
        {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
        {pending ? "비밀번호를 변경하고 있어요" : "비밀번호 변경하기"}
      </Button>
    </form>
  );
}
