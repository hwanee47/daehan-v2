"use client";

import Link from "next/link";

import { useUiStore } from "@/stores/ui-store";

export function WorkspaceExitLink(props: React.ComponentProps<typeof Link>) {
  const hideWorkspace = useUiStore((state) => state.hideWorkspace);

  return <Link {...props} onClick={hideWorkspace} />;
}
