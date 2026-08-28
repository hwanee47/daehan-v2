"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/ui-store";

import { logout, type LogoutState } from "./actions";

const initialState: LogoutState = {
  status: "idle",
};

export function LogoutForm() {
  const [state, formAction, isPending] = useActionState(logout, initialState);
  const router = useRouter();
  const closeAllTabs = useUiStore((uiState) => uiState.closeAllTabs);

  useEffect(() => {
    if (state.status !== "success") return;

    useUiStore.persist.clearStorage();
    closeAllTabs();
    router.replace("/login");
  }, [closeAllTabs, router, state.status]);

  return (
    <form action={formAction} className="mt-8">
      <Button className="w-full sm:w-auto" disabled={isPending} type="submit" variant="outline">
        <LogOut aria-hidden="true" />
        {isPending ? "로그아웃 중..." : "로그아웃"}
      </Button>

      {state.status === "error" ? (
        <p aria-live="polite" className="mt-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
