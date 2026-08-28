"use server";

import { createClient } from "@/lib/supabase/server";

export type LogoutState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export async function logout(_previousState: LogoutState): Promise<LogoutState> {
  void _previousState;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "success" };
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Supabase logout failed", {
      code: error.code,
      status: error.status,
    });

    return {
      status: "error",
      message: "로그아웃하지 못했어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  return { status: "success" };
}
