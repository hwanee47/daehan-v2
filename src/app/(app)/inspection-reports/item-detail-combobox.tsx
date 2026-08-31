"use client";

import { Combobox } from "@base-ui/react/combobox";
import { Check, X } from "lucide-react";
import { useState } from "react";

import type { InspectionItemOption } from "./types";

function optionLabel(item: InspectionItemOption) {
  return `${item.item_detail_code} · ${item.item_detail_name}`;
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("ko-KR");
}

function matches(item: InspectionItemOption, query: string) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return false;

  return [
    item.item_detail_code,
    item.item_detail_name,
    item.item_name,
    item.model_name,
    item.material,
  ].some((value) => value && normalize(value).includes(normalizedQuery));
}

function optionDescription(item: InspectionItemOption) {
  return item.model_name?.trim() ?? "";
}

export function ItemDetailCombobox({
  id,
  onValueChange,
  options,
  value,
}: {
  id: string;
  onValueChange: (value: string) => void;
  options: InspectionItemOption[];
  value: string;
}) {
  const selectedItem = options.find((item) => String(item.seq) === value) ?? null;
  const [inputValue, setInputValue] = useState(selectedItem ? optionLabel(selectedItem) : "");

  return (
    <Combobox.Root
      autoHighlight
      filter={matches}
      isItemEqualToValue={(item, selected) => item.seq === selected.seq}
      itemToStringLabel={optionLabel}
      itemToStringValue={(item) => String(item.seq)}
      items={options}
      limit={100}
      name="itemDetailSeq"
      onInputValueChange={(inputValue, details) => {
        setInputValue(inputValue);
        if (
          details.reason === "input-change" &&
          selectedItem &&
          inputValue !== optionLabel(selectedItem)
        ) {
          onValueChange("");
        }
      }}
      onValueChange={(item) => onValueChange(item ? String(item.seq) : "")}
      openOnInputClick={false}
      required
      value={selectedItem}
    >
      <Combobox.InputGroup className="relative flex h-11 w-full items-center rounded-sm border border-input bg-background focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
        <Combobox.Input
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent px-3 pr-10 text-sm font-normal outline-none placeholder:text-muted-foreground"
          id={id}
          placeholder="품목상세코드, 상세명, 품목명 등을 검색해 주세요"
        />
        <div className="absolute inset-y-0 right-0 flex items-center text-muted-foreground">
          <Combobox.Clear
            aria-label="품목상세 선택 지우기"
            className="flex size-10 items-center justify-center outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-disabled:hidden"
          >
            <X aria-hidden="true" className="size-4" />
          </Combobox.Clear>
        </div>
      </Combobox.InputGroup>

      <Combobox.Portal>
        <Combobox.Positioner className="z-[100] outline-none" sideOffset={4}>
          <Combobox.Popup className="w-max min-w-[var(--anchor-width)] max-w-[var(--available-width)] origin-[var(--transform-origin)] border border-border bg-popover text-popover-foreground shadow-lg outline-none transition-[scale,opacity] duration-100 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <Combobox.Empty>
              <div className="px-4 py-5 text-sm text-muted-foreground">
                {normalize(inputValue)
                  ? "일치하는 품목상세가 없어요."
                  : "품목상세코드, 상세명, 품목명 등을 검색해 주세요."}
              </div>
            </Combobox.Empty>
            <Combobox.List className="max-h-[min(320px,var(--available-height))] overflow-auto overscroll-contain py-1 outline-none data-empty:p-0">
              {(item: InspectionItemOption) => (
                <Combobox.Item
                  className="grid min-h-14 cursor-default grid-cols-[1rem_minmax(0,1fr)] items-start gap-2 px-3 py-2.5 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  key={item.seq}
                  value={item}
                >
                  <Combobox.ItemIndicator className="mt-0.5 inline-flex size-4 items-center justify-center text-primary">
                    <Check aria-hidden="true" className="size-4" />
                  </Combobox.ItemIndicator>
                  <span className="min-w-0 whitespace-nowrap">
                    <strong className="font-semibold">{optionLabel(item)}</strong>
                    {optionDescription(item) ? <span className="ml-2 text-xs text-muted-foreground">· {optionDescription(item)}</span> : null}
                  </span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
