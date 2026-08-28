"use client";

import { Select as BaseSelect } from "@base-ui/react/select";
import { Check, ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";

import { WorkspaceSelectPortal } from "./workspace-portal";

export type SelectOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

type SelectProps = {
  "aria-label"?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  onValueChange?: (value: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  value?: string;
};

export function Select({
  "aria-label": ariaLabel,
  className,
  disabled,
  id,
  name,
  onValueChange,
  options,
  placeholder = "선택해 주세요",
  value,
}: SelectProps) {
  return (
    <BaseSelect.Root
      disabled={disabled}
      id={id}
      items={options}
      name={name}
      onValueChange={(nextValue) => {
        if (nextValue !== null) onValueChange?.(nextValue);
      }}
      value={value ?? null}
    >
      <BaseSelect.Trigger
        aria-label={ariaLabel}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-3 rounded-sm border border-input bg-background px-3 text-sm font-normal text-foreground outline-none transition-colors",
          "hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring",
          "data-disabled:cursor-not-allowed data-disabled:opacity-30",
          className,
        )}
      >
        <BaseSelect.Value className="min-w-0 flex-1 truncate text-left data-placeholder:text-muted-foreground" placeholder={placeholder} />
        <BaseSelect.Icon className="shrink-0 text-muted-foreground">
          <ChevronsUpDown aria-hidden="true" className="size-4" />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>

      <WorkspaceSelectPortal>
        <BaseSelect.Positioner
          align="start"
          alignItemWithTrigger={false}
          className="z-[100] select-none outline-none"
          side="bottom"
          sideOffset={4}
        >
          <BaseSelect.Popup className="min-w-[var(--anchor-width)] max-w-[var(--available-width)] origin-[var(--transform-origin)] border border-border bg-popover text-popover-foreground shadow-lg outline-none transition-[scale,opacity] duration-100 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <BaseSelect.ScrollUpArrow className="flex h-7 items-center justify-center bg-popover text-muted-foreground">
              <ChevronUp aria-hidden="true" className="size-4" />
            </BaseSelect.ScrollUpArrow>
            <BaseSelect.List className="max-h-[min(320px,var(--available-height))] overflow-y-auto py-1 outline-none">
              {options.map((option) => (
                <BaseSelect.Item
                  className="grid min-h-10 cursor-default grid-cols-[1rem_minmax(0,1fr)] items-center gap-2 px-3 text-sm outline-none data-disabled:opacity-30 data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  disabled={option.disabled}
                  key={option.value}
                  value={option.value}
                >
                  <BaseSelect.ItemIndicator className="col-start-1 inline-flex size-4 items-center justify-center text-primary">
                    <Check aria-hidden="true" className="size-4" />
                  </BaseSelect.ItemIndicator>
                  <BaseSelect.ItemText className="col-start-2 truncate">{option.label}</BaseSelect.ItemText>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
            <BaseSelect.ScrollDownArrow className="flex h-7 items-center justify-center bg-popover text-muted-foreground">
              <ChevronDown aria-hidden="true" className="size-4" />
            </BaseSelect.ScrollDownArrow>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </WorkspaceSelectPortal>
    </BaseSelect.Root>
  );
}
