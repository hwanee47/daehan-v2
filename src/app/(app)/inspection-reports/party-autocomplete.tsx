"use client";

import { Autocomplete } from "@base-ui/react/autocomplete";
import { X } from "lucide-react";
import { useMemo, useState } from "react";

import type { InspectionCodeOption } from "./types";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("ko-KR");
}

function matches(option: InspectionCodeOption, query: string) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return false;
  if (option.seq === -1) return true;

  return [option.code, option.code_name].some((value) =>
    normalize(value).includes(normalizedQuery),
  );
}

export function PartyAutocomplete({
  ariaLabel,
  defaultValue,
  name,
  options,
}: {
  ariaLabel: string;
  defaultValue: string;
  name: "customerName" | "supplierName";
  options: InspectionCodeOption[];
}) {
  const [inputValue, setInputValue] = useState(defaultValue);
  const [highlightedOption, setHighlightedOption] = useState<InspectionCodeOption>();
  const [open, setOpen] = useState(false);
  const availableOptions = useMemo(() => {
    const trimmedInputValue = inputValue.trim();
    if (!trimmedInputValue) return options;

    const directInputOption: InspectionCodeOption = {
      seq: -1,
      code: "",
      code_name: trimmedInputValue,
      group_code: "U0001",
    };
    return [...options, directInputOption];
  }, [inputValue, options]);

  return (
    <Autocomplete.Root
      autoHighlight
      filter={matches}
      itemToStringValue={(option) => option.code_name}
      items={availableOptions}
      limit={100}
      mode="list"
      name={name}
      onItemHighlighted={setHighlightedOption}
      onOpenChange={setOpen}
      onValueChange={(nextValue, details) => {
        if (
          details.reason === "input-change" ||
          details.reason === "item-press" ||
          details.reason === "clear-press" ||
          details.reason === "input-clear"
        ) {
          setInputValue(nextValue);
        }
      }}
      open={open}
      openOnInputClick={false}
      value={inputValue}
    >
      <Autocomplete.InputGroup className="relative flex h-11 w-full items-center rounded-sm border border-input bg-background focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
        <Autocomplete.Input
          aria-label={ariaLabel}
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent px-3 pr-10 text-sm font-normal outline-none placeholder:text-muted-foreground"
          maxLength={100}
          onKeyDown={(event) => {
            if (event.key === "Enter" && open && highlightedOption) {
              event.preventDefault();
              setInputValue(highlightedOption.code_name);
              setOpen(false);
            }
          }}
          placeholder={`${ariaLabel} 코드 또는 코드명을 검색해 주세요`}
        />
        <Autocomplete.Clear
          aria-label={`${ariaLabel} 지우기`}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-disabled:hidden"
        >
          <X aria-hidden="true" className="size-4" />
        </Autocomplete.Clear>
      </Autocomplete.InputGroup>

      <Autocomplete.Portal>
        <Autocomplete.Positioner className="z-[100] outline-none" sideOffset={4}>
          <Autocomplete.Popup className="w-max min-w-[var(--anchor-width)] max-w-[var(--available-width)] origin-[var(--transform-origin)] border border-border bg-popover text-popover-foreground shadow-lg outline-none transition-[scale,opacity] duration-100 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <Autocomplete.Empty>
              <div className="px-4 py-5 text-sm text-muted-foreground">
                {`${ariaLabel}을 검색해 주세요.`}
              </div>
            </Autocomplete.Empty>
            <Autocomplete.List className="max-h-[min(280px,var(--available-height))] overflow-auto overscroll-contain py-1 outline-none data-empty:p-0">
              {(option: InspectionCodeOption) => (
                <Autocomplete.Item
                  className="min-h-11 cursor-default whitespace-nowrap px-3 py-2.5 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  key={option.seq}
                  value={option}
                >
                  {option.seq === -1 ? (
                    <>
                      <strong className="font-semibold text-primary">직접 입력</strong>
                      <span className="ml-2 text-muted-foreground">· {option.code_name}</span>
                    </>
                  ) : (
                    <>
                      <strong className="font-semibold">{option.code}</strong>
                      <span className="ml-2 text-muted-foreground">· {option.code_name}</span>
                    </>
                  )}
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
}
