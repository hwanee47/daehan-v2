"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

import { signup, type SignupState } from "./actions";

const initialSignupState: SignupState = { status: "idle" };

const inputClassName =
  "h-13 w-full rounded-sm border border-input bg-background px-4 text-base outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, initialSignupState);

  if (state.status === "success") {
    return (
      <div className="rounded-3xl border border-border bg-card p-6 text-center sm:p-8" role="status">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent text-primary">
          <CheckCircle2 className="size-7" aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-xl font-semibold">이메일을 확인해 주세요</h2>
        <p className="mt-2 break-keep text-muted-foreground">{state.message}</p>
        <Button className="mt-7 w-full" render={<Link href="/login" />}>
          로그인하기
        </Button>
        <Button className="mt-3 w-full" render={<Link href="/" />} variant="secondary">
          홈으로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div className="space-y-2">
        <label className="block font-semibold" htmlFor="name">
          이름
        </label>
        <input
          aria-describedby={state.errors?.name ? "name-error" : undefined}
          aria-invalid={Boolean(state.errors?.name)}
          autoComplete="name"
          className={inputClassName}
          defaultValue={state.fields?.name}
          id="name"
          maxLength={50}
          name="name"
          placeholder="이름을 입력해 주세요"
          required
          type="text"
        />
        {state.errors?.name && (
          <p className="text-sm text-destructive" id="name-error">
            {state.errors.name}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block font-semibold" htmlFor="email">
          이메일
        </label>
        <input
          aria-describedby={state.errors?.email ? "email-error" : undefined}
          aria-invalid={Boolean(state.errors?.email)}
          autoCapitalize="none"
          autoComplete="email"
          className={inputClassName}
          defaultValue={state.fields?.email}
          id="email"
          inputMode="email"
          maxLength={254}
          name="email"
          placeholder="name@example.com"
          required
          spellCheck={false}
          type="email"
        />
        {state.errors?.email && (
          <p className="text-sm text-destructive" id="email-error">
            {state.errors.email}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block font-semibold" htmlFor="password">
          비밀번호
        </label>
        <input
          aria-describedby={state.errors?.password ? "password-error" : "password-help"}
          aria-invalid={Boolean(state.errors?.password)}
          autoComplete="new-password"
          className={inputClassName}
          id="password"
          maxLength={72}
          minLength={8}
          name="password"
          placeholder="8자 이상 입력해 주세요"
          required
          type="password"
        />
        <p className="text-sm text-muted-foreground" id="password-help">
          8자 이상 72자 이하로 입력해 주세요.
        </p>
        {state.errors?.password && (
          <p className="text-sm text-destructive" id="password-error">
            {state.errors.password}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block font-semibold" htmlFor="passwordConfirm">
          비밀번호 확인
        </label>
        <input
          aria-describedby={state.errors?.passwordConfirm ? "password-confirm-error" : undefined}
          aria-invalid={Boolean(state.errors?.passwordConfirm)}
          autoComplete="new-password"
          className={inputClassName}
          id="passwordConfirm"
          maxLength={72}
          minLength={8}
          name="passwordConfirm"
          placeholder="비밀번호를 한 번 더 입력해 주세요"
          required
          type="password"
        />
        {state.errors?.passwordConfirm && (
          <p className="text-sm text-destructive" id="password-confirm-error">
            {state.errors.passwordConfirm}
          </p>
        )}
      </div>

      {state.message && (
        <p aria-live="polite" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {state.message}
        </p>
      )}

      <Button className="w-full" disabled={pending} size="lg" type="submit">
        {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
        {pending ? "가입하고 있어요" : "회원가입"}
      </Button>
    </form>
  );
}
