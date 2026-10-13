import { NextResponse } from "next/server";

import { clearRecoveryCookies, createRecoveryClient } from "@/lib/supabase/recovery";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  let valid = false;

  await clearRecoveryCookies();
  if (type === "recovery" && tokenHash && tokenHash.length <= 1024) {
    try {
      const supabase = await createRecoveryClient();
      const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
      valid = !error && Boolean(data.user && data.session);
    } catch {
      console.error("Password recovery verification unavailable");
    }
  }
  if (!valid) await clearRecoveryCookies();

  // Relative Location preserves the public host behind a reverse proxy.
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: valid ? "/reset-password" : "/reset-password?error=invalid-link" },
  });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
