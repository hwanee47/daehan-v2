"use client";

import { useCallback } from "react";
import type { KeyboardEvent } from "react";

const saveSubmitSelector = '[data-save-submit="true"]';

export function useSaveFormShortcut() {
  const onKeyDown = useCallback((event: KeyboardEvent<HTMLFormElement>) => {
    if (event.nativeEvent.isComposing) return;

    const target = event.target as HTMLElement;
    const isSaveShortcut = (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "s";

    if (isSaveShortcut) {
      event.preventDefault();
      if (event.repeat) return;

      const submitter = event.currentTarget.querySelector<HTMLButtonElement | HTMLInputElement>(saveSubmitSelector);
      if (!submitter || submitter.disabled) return;
      event.currentTarget.requestSubmit(submitter);
      return;
    }

    if (event.key !== "Enter" || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.defaultPrevented) return;
    if (target.closest("button, textarea, [contenteditable='true']")) return;

    const combobox = target.closest<HTMLElement>("[role='combobox'], [aria-autocomplete]");
    if (combobox?.getAttribute("aria-expanded") === "true") return;

    event.preventDefault();
  }, []);

  return onKeyDown;
}
