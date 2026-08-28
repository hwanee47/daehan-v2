"use client";

import { Autocomplete } from "@base-ui/react/autocomplete";
import { useMemo, useState } from "react";

import type { InspectionToleranceRange } from "./types";

function firstNumber(value: string) {
  const match = value.match(/[-+]?(?:\d+(?:\.\d*)?|\.\d+)/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

type ToleranceOption = {
  codeName: string;
  range: InspectionToleranceRange | null;
};

function matches(option: ToleranceOption, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  if (!normalizedQuery) return true;
  return option.codeName.toLocaleLowerCase("ko-KR").includes(normalizedQuery);
}

export function ToleranceAutocomplete({
  codeNames,
  onOptionSelect,
  onValueChange,
  ranges,
  rowNumber,
  value,
}: {
  codeNames: string[];
  onOptionSelect: (codeName: string, range: InspectionToleranceRange) => void;
  onValueChange: (value: string) => void;
  ranges: InspectionToleranceRange[];
  rowNumber: number;
  value: string;
}) {
  const options = useMemo(() => codeNames.map((codeName): ToleranceOption => {
    const number = firstNumber(codeName);
    const range = number === null ? null : ranges.find((value) =>
      number > Number(value.nominal_min) && number <= Number(value.nominal_max),
    ) ?? null;
    return { codeName, range };
  }), [codeNames, ranges]);
  const [highlightedOption, setHighlightedOption] = useState<ToleranceOption>();
  const [open, setOpen] = useState(false);

  return (
    <Autocomplete.Root
      autoHighlight
      filter={matches}
      itemToStringValue={(option) => option.codeName}
      items={options}
      mode="list"
      onItemHighlighted={setHighlightedOption}
      onOpenChange={setOpen}
      onValueChange={(nextValue, details) => {
        if (details.reason === "item-press" && highlightedOption?.range) {
          onOptionSelect(highlightedOption.codeName, highlightedOption.range);
          setOpen(false);
          return;
        }
        if (
          details.reason === "input-change" ||
          details.reason === "clear-press" ||
          details.reason === "input-clear"
        ) {
          onValueChange(nextValue);
        }
      }}
      open={open}
      openOnInputClick
      value={value}
    >
      <Autocomplete.InputGroup className="relative flex h-10 w-full items-center rounded-sm border border-input bg-background focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
        <Autocomplete.Input
          aria-label={`${rowNumber}번 기준치수`}
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent px-2 text-right text-sm tabular-nums outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          inputMode="text"
        />
      </Autocomplete.InputGroup>

      <Autocomplete.Portal>
        <Autocomplete.Positioner className="z-[100] outline-none" sideOffset={4}>
          <Autocomplete.Popup className="w-max min-w-[var(--anchor-width)] max-w-[min(36rem,var(--available-width))] origin-[var(--transform-origin)] border border-border bg-popover text-popover-foreground shadow-lg outline-none transition-[scale,opacity] duration-100 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <Autocomplete.Empty>
              <div className="px-4 py-5 text-sm text-muted-foreground">
                일치하는 오차범위가 없어요.
              </div>
            </Autocomplete.Empty>
            <Autocomplete.List className="max-h-[min(280px,var(--available-height))] overflow-auto overscroll-contain py-1 outline-none data-empty:p-0">
              {(option: ToleranceOption) => (
                <Autocomplete.Item
                  className="flex min-h-11 cursor-default items-center gap-2 whitespace-nowrap px-3 py-2.5 text-sm outline-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  disabled={!option.range}
                  key={option.codeName}
                  value={option}
                >
                  <strong className="font-semibold">[{option.codeName}]</strong>
                  {option.range ? (
                    <>
                      <span className="text-muted-foreground">
                        {option.range.nominal_min} &lt; 치수 &lt;= {option.range.nominal_max}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {option.range.lower_deviation}/{option.range.upper_deviation}
                      </span>
                    </>
                  ) : <span className="text-xs text-muted-foreground">오차범위 없음</span>}
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
}
