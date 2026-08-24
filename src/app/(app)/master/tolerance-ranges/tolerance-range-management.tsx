"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog } from "@base-ui/react/dialog";
import type { ColDef, RowClickedEvent } from "ag-grid-community";
import { AllCommunityModule, themeQuartz } from "ag-grid-community";
import { AgGridProvider, AgGridReact } from "ag-grid-react";
import { LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

import { deleteToleranceRange, saveToleranceRange } from "./actions";
import type { ItemToleranceRange, ToleranceActionState, ToleranceItem } from "./types";

const modules = [AllCommunityModule];
const initialActionState: ToleranceActionState = { status: "idle" };
const inputClassName =
  "h-12 w-full rounded-sm border border-input bg-background px-4 text-tabular outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 aria-invalid:border-destructive";
const textareaClassName =
  "min-h-24 w-full resize-y rounded-sm border border-input bg-background px-4 py-3 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 aria-invalid:border-destructive";

const gridTheme = themeQuartz.withParams({
  accentColor: "var(--primary)",
  backgroundColor: "var(--background)",
  borderColor: "var(--border)",
  foregroundColor: "var(--foreground)",
  fontFamily: "var(--font-pretendard), sans-serif",
  fontSize: 14,
  headerBackgroundColor: "var(--muted)",
  headerFontWeight: 600,
  rowHoverColor: "var(--accent)",
  spacing: 7,
  wrapperBorderRadius: 0,
});

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 4 }).format(value);
}

function formatDeviation(value: number) {
  return `${value > 0 ? "+" : ""}${formatNumber(value)}`;
}

const itemColumns: ColDef<ToleranceItem>[] = [
  { field: "item_code", headerName: "품목코드", minWidth: 150, flex: 1 },
  { field: "item_name", headerName: "품목명", minWidth: 170, flex: 1.2 },
  { field: "model_name", headerName: "모델명", minWidth: 150, flex: 1 },
];

const rangeColumns: ColDef<ItemToleranceRange>[] = [
  {
    field: "nominal_min",
    headerName: "하한 초과 (mm)",
    minWidth: 145,
    flex: 1,
    valueFormatter: ({ value }) => formatNumber(value),
  },
  {
    field: "nominal_max",
    headerName: "상한 이하 (mm)",
    minWidth: 145,
    flex: 1,
    valueFormatter: ({ value }) => formatNumber(value),
  },
  {
    field: "upper_deviation",
    headerName: "상한 편차 (mm)",
    minWidth: 145,
    flex: 1,
    valueFormatter: ({ value }) => formatDeviation(value),
  },
  {
    field: "lower_deviation",
    headerName: "하한 편차 (mm)",
    minWidth: 145,
    flex: 1,
    valueFormatter: ({ value }) => formatDeviation(value),
  },
  { field: "note", headerName: "비고", minWidth: 180, flex: 1.2 },
];

const defaultColDef = { resizable: true, sortable: true };

function ActionMessage({ state }: { state: ToleranceActionState }) {
  if (!state.message) return null;
  return (
    <p
      aria-live="polite"
      className={
        state.status === "error"
          ? "mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
          : "mt-3 rounded-xl bg-accent px-3 py-2 text-sm text-primary"
      }
      role={state.status === "error" ? "alert" : "status"}
    >
      {state.message}
    </p>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p className="text-sm text-destructive" id={id}>{message}</p> : null;
}

function NumberField({
  defaultValue,
  error,
  id,
  label,
  name,
}: {
  defaultValue?: number;
  error?: string;
  id: string;
  label: string;
  name: string;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="space-y-2">
      <label className="font-semibold" htmlFor={id}>{label}</label>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className={inputClassName}
        defaultValue={defaultValue}
        id={id}
        inputMode="decimal"
        name={name}
        required
        step="0.0001"
        type="number"
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}

function RangeEditor({
  item,
  onOpenChange,
  open,
  range,
}: {
  item: ToleranceItem;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  range: ItemToleranceRange | null;
}) {
  const [state, formAction, pending] = useActionState(saveToleranceRange, initialActionState);
  useEffect(() => {
    if (state.status === "success") onOpenChange(false);
  }, [onOpenChange, state.status]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-[2px]" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 sm:p-6">
          <Dialog.Popup className="w-full max-w-2xl rounded-3xl border border-border bg-card p-5 shadow-xl outline-none sm:p-7">
            <Dialog.Title className="text-xl font-semibold">
              {range ? "오차범위 수정" : "오차범위 추가"}
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-muted-foreground">
              {item.item_code}({item.item_name}) 품목의 치수 범위와 편차를 입력해 주세요.
            </Dialog.Description>

            <form action={formAction} className="mt-6 space-y-4">
              {range ? <input name="seq" type="hidden" value={range.seq} /> : null}
              <input name="itemSeq" type="hidden" value={item.seq} />
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField defaultValue={range?.nominal_min} error={state.errors?.nominalMin} id="nominal-min" label="기준 치수 하한 초과 (mm)" name="nominalMin" />
                <NumberField defaultValue={range?.nominal_max} error={state.errors?.nominalMax} id="nominal-max" label="기준 치수 상한 이하 (mm)" name="nominalMax" />
                <NumberField defaultValue={range?.upper_deviation} error={state.errors?.upperDeviation} id="upper-deviation" label="상한 편차 (mm)" name="upperDeviation" />
                <NumberField defaultValue={range?.lower_deviation} error={state.errors?.lowerDeviation} id="lower-deviation" label="하한 편차 (mm)" name="lowerDeviation" />
              </div>
              <p className="text-sm text-muted-foreground">
                양수는 0.1, 음수는 -0.05처럼 입력해 주세요. 목록에서는 양수에 + 부호를 표시해요.
              </p>
              <div className="space-y-2">
                <label className="font-semibold" htmlFor="tolerance-note">비고</label>
                <textarea
                  aria-describedby={state.errors?.note ? "tolerance-note-error" : undefined}
                  aria-invalid={Boolean(state.errors?.note)}
                  className={textareaClassName}
                  defaultValue={range?.note ?? ""}
                  id="tolerance-note"
                  maxLength={500}
                  name="note"
                />
                <FieldError id="tolerance-note-error" message={state.errors?.note} />
              </div>
              <ActionMessage state={state} />
              <div className="flex justify-end gap-3 pt-2">
                <Dialog.Close className="inline-flex h-12 items-center justify-center rounded-xl bg-secondary px-5 font-semibold" disabled={pending}>취소</Dialog.Close>
                <Button disabled={pending} type="submit">
                  {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
                  저장하기
                </Button>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DeleteRangeDialog({
  onOpenChange,
  open,
  range,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  range: ItemToleranceRange;
}) {
  const [state, formAction, pending] = useActionState(deleteToleranceRange, initialActionState);
  useEffect(() => {
    if (state.status === "success") onOpenChange(false);
  }, [onOpenChange, state.status]);

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-[2px]" />
        <AlertDialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <AlertDialog.Popup className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl outline-none">
            <AlertDialog.Title className="text-xl font-semibold">오차범위를 삭제할까요?</AlertDialog.Title>
            <AlertDialog.Description className="mt-3 break-keep text-muted-foreground">
              {formatNumber(range.nominal_min)}mm 초과～{formatNumber(range.nominal_max)}mm 이하 범위를 삭제하면 되돌릴 수 없어요.
            </AlertDialog.Description>
            <form action={formAction} className="mt-6">
              <input name="seq" type="hidden" value={range.seq} />
              <ActionMessage state={state} />
              <div className="mt-5 flex justify-end gap-3">
                <AlertDialog.Close className="inline-flex h-12 items-center justify-center rounded-xl bg-secondary px-5 font-semibold" disabled={pending}>취소</AlertDialog.Close>
                <Button disabled={pending} type="submit" variant="destructive">
                  {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
                  삭제하기
                </Button>
              </div>
            </form>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export function ToleranceRangeManagement({
  hasFilters,
  items,
  ranges,
}: {
  hasFilters: boolean;
  items: ToleranceItem[];
  ranges: ItemToleranceRange[];
}) {
  const [selectedItemSeq, setSelectedItemSeq] = useState<number | null>(items[0]?.seq ?? null);
  const [selectedRangeSeq, setSelectedRangeSeq] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingRange, setEditingRange] = useState<ItemToleranceRange | null>(null);

  const effectiveItemSeq = items.some((item) => item.seq === selectedItemSeq)
    ? selectedItemSeq
    : (items[0]?.seq ?? null);
  const selectedItem = items.find((item) => item.seq === effectiveItemSeq) ?? null;
  const visibleRanges = useMemo(
    () => ranges.filter((range) => range.item_seq === effectiveItemSeq),
    [effectiveItemSeq, ranges],
  );
  const selectedRange = visibleRanges.find((range) => range.seq === selectedRangeSeq) ?? null;

  function selectItem(event: RowClickedEvent<ToleranceItem>) {
    if (!event.data) return;
    setSelectedItemSeq(event.data.seq);
    setSelectedRangeSeq(null);
  }

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)]">
      <section aria-labelledby="tolerance-items-heading" className="min-w-0 rounded-3xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-xl font-semibold" id="tolerance-items-heading">품목</h2>
        <p className="mt-1 text-sm text-muted-foreground">오차범위를 관리할 품목을 선택해 주세요.</p>
        {items.length === 0 ? (
          <div className="mt-4 flex h-80 items-center justify-center rounded-2xl bg-muted px-6 text-center text-muted-foreground">
            {hasFilters
              ? "조회조건에 맞는 품목이 없어요."
              : "등록된 품목이 없어요. 품목관리에서 품목을 먼저 추가해 주세요."}
          </div>
        ) : (
          <div aria-label="품목 목록" className="mt-4 overflow-x-auto">
            <div className="h-[420px] min-w-[520px]">
              <AgGridProvider modules={modules}>
                <AgGridReact
                  columnDefs={itemColumns}
                  defaultColDef={defaultColDef}
                  getRowClass={({ data }) => data?.seq === effectiveItemSeq ? "!bg-accent" : undefined}
                  getRowId={({ data }) => String(data.seq)}
                  onRowClicked={selectItem}
                  rowData={items}
                  theme={gridTheme}
                />
              </AgGridProvider>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="tolerance-ranges-heading" className="min-w-0 rounded-3xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold" id="tolerance-ranges-heading">오차범위</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedItem
                ? `${selectedItem.item_code}(${selectedItem.item_name}) 품목의 오차범위예요.`
                : "품목을 선택해 주세요."}
            </p>
          </div>
          <Button
            disabled={!selectedItem}
            onClick={() => { setEditingRange(null); setEditorOpen(true); }}
            size="sm"
            type="button"
          >
            <Plus aria-hidden="true" />추가
          </Button>
        </div>
        <div className="mt-4 flex min-h-9 flex-wrap gap-2">
          <Button
            disabled={!selectedRange}
            onClick={() => { setEditingRange(selectedRange); setEditorOpen(true); }}
            size="sm"
            type="button"
            variant="secondary"
          >
            <Pencil aria-hidden="true" />수정
          </Button>
          <Button disabled={!selectedRange} onClick={() => setDeleteOpen(true)} size="sm" type="button" variant="destructive">
            <Trash2 aria-hidden="true" />삭제
          </Button>
        </div>

        {!selectedItem ? (
          <div className="mt-4 flex h-80 items-center justify-center rounded-2xl bg-muted px-6 text-center text-muted-foreground">왼쪽에서 품목을 선택해 주세요.</div>
        ) : visibleRanges.length === 0 ? (
          <div className="mt-4 flex h-80 items-center justify-center rounded-2xl bg-muted px-6 text-center text-muted-foreground">등록된 오차범위가 없어요.</div>
        ) : (
          <div aria-label="오차범위 목록" className="mt-4 overflow-x-auto">
            <div className="h-[420px] min-w-[820px]">
              <AgGridProvider modules={modules}>
                <AgGridReact
                  columnDefs={rangeColumns}
                  defaultColDef={defaultColDef}
                  getRowClass={({ data }) => data?.seq === selectedRangeSeq ? "!bg-accent" : undefined}
                  getRowId={({ data }) => String(data.seq)}
                  onRowClicked={(event: RowClickedEvent<ItemToleranceRange>) => event.data && setSelectedRangeSeq(event.data.seq)}
                  rowData={visibleRanges}
                  theme={gridTheme}
                />
              </AgGridProvider>
            </div>
          </div>
        )}
      </section>

      {selectedItem ? (
        <RangeEditor
          item={selectedItem}
          key={`range-editor-${editingRange?.seq ?? "new"}-${editorOpen}`}
          onOpenChange={setEditorOpen}
          open={editorOpen}
          range={editingRange}
        />
      ) : null}
      {selectedRange ? (
        <DeleteRangeDialog
          key={`range-delete-${selectedRange.seq}-${deleteOpen}`}
          onOpenChange={setDeleteOpen}
          open={deleteOpen}
          range={selectedRange}
        />
      ) : null}
    </div>
  );
}
