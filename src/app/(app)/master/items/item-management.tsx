"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog } from "@base-ui/react/dialog";
import type { ColDef, RowClickedEvent } from "ag-grid-community";
import { AllCommunityModule, themeQuartz } from "ag-grid-community";
import { AgGridProvider, AgGridReact } from "ag-grid-react";
import { LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

import { deleteItem, deleteItemDetail, saveItem, saveItemDetail } from "./actions";
import type { Item, ItemActionState, ItemDetail } from "./types";

const modules = [AllCommunityModule];
const initialActionState: ItemActionState = { status: "idle" };
const inputClassName =
  "h-12 w-full rounded-sm border border-input bg-background px-4 outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 aria-invalid:border-destructive";
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

const itemColumns: ColDef<Item>[] = [
  { field: "item_code", headerName: "품목코드", minWidth: 150, flex: 1 },
  { field: "item_name", headerName: "품목명", minWidth: 170, flex: 1.2 },
  { field: "model_name", headerName: "모델명", minWidth: 150, flex: 1 },
];

const detailColumns: ColDef<ItemDetail>[] = [
  { field: "item_detail_code", headerName: "상세코드", minWidth: 150, flex: 1 },
  { field: "item_detail_name", headerName: "상세명", minWidth: 170, flex: 1.2 },
  { field: "material", headerName: "소재", minWidth: 130, flex: 0.8 },
  { field: "note", headerName: "비고", minWidth: 180, flex: 1.2 },
];

const defaultColDef = { resizable: true, sortable: true };
type ServerFormAction = (
  previousState: ItemActionState,
  formData: FormData,
) => Promise<ItemActionState>;

function ActionMessage({ state }: { state: ItemActionState }) {
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

function DialogFrame({
  children,
  description,
  onOpenChange,
  open,
  title,
}: {
  children: React.ReactNode;
  description: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-[2px]" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 sm:p-6">
          <Dialog.Popup className="w-full max-w-lg rounded-3xl border border-border bg-card p-5 shadow-xl outline-none sm:p-7">
            <Dialog.Title className="text-xl font-semibold">{title}</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-muted-foreground">{description}</Dialog.Description>
            {children}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ItemEditor({ item, onOpenChange, open }: { item: Item | null; onOpenChange: (open: boolean) => void; open: boolean }) {
  const [state, formAction, pending] = useActionState(saveItem, initialActionState);
  useEffect(() => {
    if (state.status === "success") onOpenChange(false);
  }, [onOpenChange, state.status]);

  return (
    <DialogFrame
      description="품목을 구분할 코드와 기본 정보를 입력해 주세요."
      onOpenChange={onOpenChange}
      open={open}
      title={item ? "품목 수정" : "품목 추가"}
    >
      <form action={formAction} className="mt-6 space-y-4">
        {item ? <input name="seq" type="hidden" value={item.seq} /> : null}
        <div className="space-y-2">
          <label className="font-semibold" htmlFor="item-code">품목코드</label>
          <input aria-describedby={state.errors?.itemCode ? "item-code-error" : undefined} aria-invalid={Boolean(state.errors?.itemCode)} className={inputClassName} defaultValue={item?.item_code} id="item-code" maxLength={80} name="itemCode" required />
          <FieldError id="item-code-error" message={state.errors?.itemCode} />
        </div>
        <div className="space-y-2">
          <label className="font-semibold" htmlFor="item-name">품목명</label>
          <input aria-describedby={state.errors?.itemName ? "item-name-error" : undefined} aria-invalid={Boolean(state.errors?.itemName)} className={inputClassName} defaultValue={item?.item_name} id="item-name" maxLength={100} name="itemName" required />
          <FieldError id="item-name-error" message={state.errors?.itemName} />
        </div>
        <div className="space-y-2">
          <label className="font-semibold" htmlFor="model-name">모델명</label>
          <input aria-describedby={state.errors?.modelName ? "model-name-error" : undefined} aria-invalid={Boolean(state.errors?.modelName)} className={inputClassName} defaultValue={item?.model_name ?? ""} id="model-name" maxLength={100} name="modelName" />
          <FieldError id="model-name-error" message={state.errors?.modelName} />
        </div>
        <div className="space-y-2">
          <label className="font-semibold" htmlFor="item-note">비고</label>
          <textarea aria-describedby={state.errors?.note ? "item-note-error" : undefined} aria-invalid={Boolean(state.errors?.note)} className={textareaClassName} defaultValue={item?.note ?? ""} id="item-note" maxLength={500} name="note" />
          <FieldError id="item-note-error" message={state.errors?.note} />
        </div>
        <ActionMessage state={state} />
        <div className="flex justify-end gap-3 pt-2">
          <Dialog.Close className="inline-flex h-12 items-center justify-center rounded-xl bg-secondary px-5 font-semibold" disabled={pending}>취소</Dialog.Close>
          <Button disabled={pending} type="submit">{pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}저장하기</Button>
        </div>
      </form>
    </DialogFrame>
  );
}

function DetailEditor({ detail, item, onOpenChange, open }: { detail: ItemDetail | null; item: Item; onOpenChange: (open: boolean) => void; open: boolean }) {
  const [state, formAction, pending] = useActionState(saveItemDetail, initialActionState);
  useEffect(() => {
    if (state.status === "success") onOpenChange(false);
  }, [onOpenChange, state.status]);

  return (
    <DialogFrame
      description={`${item.item_code}(${item.item_name}) 품목에 속할 상세 정보를 입력해 주세요.`}
      onOpenChange={onOpenChange}
      open={open}
      title={detail ? "품목상세 수정" : "품목상세 추가"}
    >
      <form action={formAction} className="mt-6 space-y-4">
        {detail ? <input name="seq" type="hidden" value={detail.seq} /> : null}
        <input name="itemSeq" type="hidden" value={item.seq} />
        <div className="space-y-2">
          <label className="font-semibold" htmlFor="detail-code">상세코드</label>
          <input aria-describedby={state.errors?.itemDetailCode ? "detail-code-error" : undefined} aria-invalid={Boolean(state.errors?.itemDetailCode)} className={inputClassName} defaultValue={detail?.item_detail_code} id="detail-code" maxLength={80} name="itemDetailCode" required />
          <FieldError id="detail-code-error" message={state.errors?.itemDetailCode} />
        </div>
        <div className="space-y-2">
          <label className="font-semibold" htmlFor="detail-name">상세명</label>
          <input aria-describedby={state.errors?.itemDetailName ? "detail-name-error" : undefined} aria-invalid={Boolean(state.errors?.itemDetailName)} className={inputClassName} defaultValue={detail?.item_detail_name} id="detail-name" maxLength={100} name="itemDetailName" required />
          <FieldError id="detail-name-error" message={state.errors?.itemDetailName} />
        </div>
        <div className="space-y-2">
          <label className="font-semibold" htmlFor="detail-material">소재</label>
          <input aria-describedby={state.errors?.material ? "detail-material-error" : undefined} aria-invalid={Boolean(state.errors?.material)} className={inputClassName} defaultValue={detail?.material ?? ""} id="detail-material" maxLength={100} name="material" />
          <FieldError id="detail-material-error" message={state.errors?.material} />
        </div>
        <div className="space-y-2">
          <label className="font-semibold" htmlFor="detail-note">비고</label>
          <textarea aria-describedby={state.errors?.note ? "detail-note-error" : undefined} aria-invalid={Boolean(state.errors?.note)} className={textareaClassName} defaultValue={detail?.note ?? ""} id="detail-note" maxLength={500} name="note" />
          <FieldError id="detail-note-error" message={state.errors?.note} />
        </div>
        <ActionMessage state={state} />
        <div className="flex justify-end gap-3 pt-2">
          <Dialog.Close className="inline-flex h-12 items-center justify-center rounded-xl bg-secondary px-5 font-semibold" disabled={pending}>취소</Dialog.Close>
          <Button disabled={pending} type="submit">{pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}저장하기</Button>
        </div>
      </form>
    </DialogFrame>
  );
}

function DeleteDialog({ action, itemName, onOpenChange, open, seq }: { action: ServerFormAction; itemName: string; onOpenChange: (open: boolean) => void; open: boolean; seq: number }) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  useEffect(() => {
    if (state.status === "success") onOpenChange(false);
  }, [onOpenChange, state.status]);

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-[2px]" />
        <AlertDialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <AlertDialog.Popup className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl outline-none">
            <AlertDialog.Title className="text-xl font-semibold">정말 삭제할까요?</AlertDialog.Title>
            <AlertDialog.Description className="mt-3 break-keep text-muted-foreground">{itemName}을(를) 삭제하면 되돌릴 수 없어요.</AlertDialog.Description>
            <form action={formAction} className="mt-6">
              <input name="seq" type="hidden" value={seq} />
              <ActionMessage state={state} />
              <div className="mt-5 flex justify-end gap-3">
                <AlertDialog.Close className="inline-flex h-12 items-center justify-center rounded-xl bg-secondary px-5 font-semibold" disabled={pending}>취소</AlertDialog.Close>
                <Button disabled={pending} type="submit" variant="destructive">{pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}삭제하기</Button>
              </div>
            </form>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export function ItemManagement({ details, hasFilters, items }: { details: ItemDetail[]; hasFilters: boolean; items: Item[] }) {
  const [selectedItemSeq, setSelectedItemSeq] = useState<number | null>(items[0]?.seq ?? null);
  const [selectedDetailSeq, setSelectedDetailSeq] = useState<number | null>(null);
  const [itemEditorOpen, setItemEditorOpen] = useState(false);
  const [detailEditorOpen, setDetailEditorOpen] = useState(false);
  const [itemDeleteOpen, setItemDeleteOpen] = useState(false);
  const [detailDeleteOpen, setDetailDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editingDetail, setEditingDetail] = useState<ItemDetail | null>(null);

  const effectiveItemSeq = items.some((item) => item.seq === selectedItemSeq) ? selectedItemSeq : (items[0]?.seq ?? null);
  const selectedItem = items.find((item) => item.seq === effectiveItemSeq) ?? null;
  const visibleDetails = useMemo(() => details.filter((detail) => detail.item_seq === effectiveItemSeq), [details, effectiveItemSeq]);
  const selectedDetail = visibleDetails.find((detail) => detail.seq === selectedDetailSeq) ?? null;

  function selectItem(event: RowClickedEvent<Item>) {
    if (!event.data) return;
    setSelectedItemSeq(event.data.seq);
    setSelectedDetailSeq(null);
  }

  return (
    <div className="mt-8 grid gap-6 @min-[1280px]/workspace:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]">
      <section aria-labelledby="items-heading" className="min-w-0 rounded-3xl border border-border bg-card p-4 @min-[640px]/workspace:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-xl font-semibold" id="items-heading">품목</h2><p className="mt-1 text-sm text-muted-foreground">품목을 선택하면 상세 정보를 확인할 수 있어요.</p></div>
          <Button onClick={() => { setEditingItem(null); setItemEditorOpen(true); }} size="sm" type="button"><Plus aria-hidden="true" />추가</Button>
        </div>
        <div className="mt-4 flex min-h-9 flex-wrap gap-2">
          <Button disabled={!selectedItem} onClick={() => { setEditingItem(selectedItem); setItemEditorOpen(true); }} size="sm" type="button" variant="secondary"><Pencil aria-hidden="true" />수정</Button>
          <Button disabled={!selectedItem} onClick={() => setItemDeleteOpen(true)} size="sm" type="button" variant="destructive"><Trash2 aria-hidden="true" />삭제</Button>
        </div>
        {items.length === 0 ? (
          <div className="mt-4 flex h-80 items-center justify-center rounded-2xl bg-muted px-6 text-center text-muted-foreground">{hasFilters ? "조회조건에 맞는 품목이 없어요." : "등록된 품목이 없어요. 품목을 먼저 추가해 주세요."}</div>
        ) : (
          <div aria-label="품목 목록" className="mt-4 overflow-x-auto"><div className="h-[420px] min-w-[560px]"><AgGridProvider modules={modules}><AgGridReact columnDefs={itemColumns} defaultColDef={defaultColDef} getRowClass={({ data }) => data?.seq === effectiveItemSeq ? "!bg-accent" : undefined} getRowId={({ data }) => String(data.seq)} onRowClicked={selectItem} rowData={items} theme={gridTheme} /></AgGridProvider></div></div>
        )}
      </section>

      <section aria-labelledby="item-details-heading" className="min-w-0 rounded-3xl border border-border bg-card p-4 @min-[640px]/workspace:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-xl font-semibold" id="item-details-heading">품목상세</h2><p className="mt-1 text-sm text-muted-foreground">{selectedItem ? `${selectedItem.item_code}(${selectedItem.item_name}) 품목의 상세 정보예요.` : "품목을 선택해 주세요."}</p></div>
          <Button disabled={!selectedItem} onClick={() => { setEditingDetail(null); setDetailEditorOpen(true); }} size="sm" type="button"><Plus aria-hidden="true" />추가</Button>
        </div>
        <div className="mt-4 flex min-h-9 flex-wrap gap-2">
          <Button disabled={!selectedDetail} onClick={() => { setEditingDetail(selectedDetail); setDetailEditorOpen(true); }} size="sm" type="button" variant="secondary"><Pencil aria-hidden="true" />수정</Button>
          <Button disabled={!selectedDetail} onClick={() => setDetailDeleteOpen(true)} size="sm" type="button" variant="destructive"><Trash2 aria-hidden="true" />삭제</Button>
        </div>
        {!selectedItem ? (
          <div className="mt-4 flex h-80 items-center justify-center rounded-2xl bg-muted px-6 text-center text-muted-foreground">왼쪽에서 품목을 선택해 주세요.</div>
        ) : visibleDetails.length === 0 ? (
          <div className="mt-4 flex h-80 items-center justify-center rounded-2xl bg-muted px-6 text-center text-muted-foreground">등록된 품목상세가 없어요.</div>
        ) : (
          <div aria-label="품목상세 목록" className="mt-4 overflow-x-auto"><div className="h-[420px] min-w-[720px]"><AgGridProvider modules={modules}><AgGridReact columnDefs={detailColumns} defaultColDef={defaultColDef} getRowClass={({ data }) => data?.seq === selectedDetailSeq ? "!bg-accent" : undefined} getRowId={({ data }) => String(data.seq)} onRowClicked={(event: RowClickedEvent<ItemDetail>) => event.data && setSelectedDetailSeq(event.data.seq)} rowData={visibleDetails} theme={gridTheme} /></AgGridProvider></div></div>
        )}
      </section>

      <ItemEditor item={editingItem} key={`item-editor-${editingItem?.seq ?? "new"}-${itemEditorOpen}`} onOpenChange={setItemEditorOpen} open={itemEditorOpen} />
      {selectedItem ? <DetailEditor detail={editingDetail} item={selectedItem} key={`detail-editor-${editingDetail?.seq ?? "new"}-${detailEditorOpen}`} onOpenChange={setDetailEditorOpen} open={detailEditorOpen} /> : null}
      {selectedItem ? <DeleteDialog action={deleteItem} itemName={`품목 “${selectedItem.item_name}”`} key={`item-delete-${selectedItem.seq}-${itemDeleteOpen}`} onOpenChange={setItemDeleteOpen} open={itemDeleteOpen} seq={selectedItem.seq} /> : null}
      {selectedDetail ? <DeleteDialog action={deleteItemDetail} itemName={`품목상세 “${selectedDetail.item_detail_name}”`} key={`detail-delete-${selectedDetail.seq}-${detailDeleteOpen}`} onOpenChange={setDetailDeleteOpen} open={detailDeleteOpen} seq={selectedDetail.seq} /> : null}
    </div>
  );
}
