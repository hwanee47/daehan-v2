"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Autocomplete } from "@base-ui/react/autocomplete";
import { Dialog } from "@base-ui/react/dialog";
import { Select } from "@base-ui/react/select";
import { useSyncExternalStore } from "react";

function subscribeToFullscreen(onStoreChange: () => void) {
  document.addEventListener("fullscreenchange", onStoreChange);
  return () => document.removeEventListener("fullscreenchange", onStoreChange);
}

function useFullscreenPortalContainer() {
  return useSyncExternalStore(
    subscribeToFullscreen,
    () => document.fullscreenElement as HTMLElement | null,
    () => null,
  );
}

export function WorkspaceDialogPortal({ children }: { children: React.ReactNode }) {
  const container = useFullscreenPortalContainer();
  return container ? (
    <Dialog.Portal container={container}>{children}</Dialog.Portal>
  ) : (
    <Dialog.Portal>{children}</Dialog.Portal>
  );
}

export function WorkspaceAlertDialogPortal({ children }: { children: React.ReactNode }) {
  const container = useFullscreenPortalContainer();
  return container ? (
    <AlertDialog.Portal container={container}>{children}</AlertDialog.Portal>
  ) : (
    <AlertDialog.Portal>{children}</AlertDialog.Portal>
  );
}

export function WorkspaceAutocompletePortal({ children }: { children: React.ReactNode }) {
  const container = useFullscreenPortalContainer();
  return container ? (
    <Autocomplete.Portal container={container}>{children}</Autocomplete.Portal>
  ) : (
    <Autocomplete.Portal>{children}</Autocomplete.Portal>
  );
}

export function WorkspaceSelectPortal({ children }: { children: React.ReactNode }) {
  const container = useFullscreenPortalContainer();
  return container ? (
    <Select.Portal container={container}>{children}</Select.Portal>
  ) : (
    <Select.Portal>{children}</Select.Portal>
  );
}
