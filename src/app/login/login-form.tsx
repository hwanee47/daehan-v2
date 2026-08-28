"use client";

import { useActionState, useEffect } from "react";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/ui-store";

import { login, type LoginState } from "./actions";

const initialLoginState: LoginState = { status: "idle" };

const inputClassName =
  "h-13 w-full rounded-sm border border-input bg-background px-4 text-base outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialLoginState);
  const closeAllTabs = useUiStore((uiState) => uiState.closeAllTabs);

  useEffect(() => {
    useUiStore.persist.clearStorage();
    closeAllTabs();

    if (useUiStore.persist.hasHydrated()) return;
    return useUiStore.persist.onFinishHydration(() => {
      useUiStore.persist.clearStorage();
      closeAllTabs();
    });
  }, [closeAllTabs]);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div className="space-y-2">
        <label className="block font-semibold" htmlFor="email">
          이메일
        </label>
        <input
          aria-describedby={state.errors?.email ? "email-error" : undefined}
          aria-invalid={Boolean(state.errors?.email)}
          autoCapitalize="none"
          autoComplete="email"
          autoFocus
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
          aria-describedby={state.errors?.password ? "password-error" : undefined}
          aria-invalid={Boolean(state.errors?.password)}
          autoComplete="current-password"
          className={inputClassName}
          id="password"
          maxLength={72}
          name="password"
          placeholder="비밀번호를 입력해 주세요"
          required
          type="password"
        />
        {state.errors?.password && (
          <p className="text-sm text-destructive" id="password-error">
            {state.errors.password}
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
        {pending ? "로그인하고 있어요" : "로그인"}
      </Button>
    </form>
  );
}
