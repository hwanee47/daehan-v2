"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog } from "@base-ui/react/dialog";
import type { CellKeyDownEvent, ColDef, RowClickedEvent, RowDoubleClickedEvent } from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";
import { AgGridProvider, AgGridReact } from "ag-grid-react";
import { ImageIcon, LoaderCircle, Maximize2, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { appGridSingleRowSelection, appGridTheme, syncSelectedGridRow } from "@/lib/ag-grid";
import {
  itemImageAccept,
  itemImageMaxBytes,
  type ItemImageEntity,
} from "@/lib/item-images";

import { deleteItem, deleteItemDetail, saveItem, saveItemDetail } from "./actions";
import type { Item, ItemActionState, ItemDetail } from "./types";

const modules = [AllCommunityModule];
const initialActionState: ItemActionState = { status: "idle" };
const inputClassName =
  "h-12 w-full rounded-sm border border-input bg-background px-4 outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 aria-invalid:border-destructive";
const textareaClassName =
  "min-h-24 w-full resize-y rounded-sm border border-input bg-background px-4 py-3 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 aria-invalid:border-destructive";

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

type ImageTarget = {
  entity: ItemImageEntity;
  imagePath: string | null;
  imageUrl: string | null;
  label: string;
  seq: number;
};

type ImageResponse = {
  imagePath?: string | null;
  imageUrl?: string | null;
  message?: string;
};

type DetailViewTarget = {
  description: string;
  fields: Array<{ label: string; value: string | null }>;
  imageUrl: string | null;
  label: string;
  title: string;
};

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

function FullscreenImageDialog({
  imageUrl,
  label,
  onClose,
  open,
}: {
  imageUrl: string;
  label: string;
  onClose: () => void;
  open: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[60] bg-foreground/90 backdrop-blur-sm" />
        <Dialog.Viewport className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6">
          <Dialog.Popup className="relative size-full outline-none">
            <Dialog.Title className="sr-only">{label} 이미지 전체 화면 보기</Dialog.Title>
            <Dialog.Description className="sr-only">이미지를 원본 비율로 화면에 맞춰 표시하고 있어요.</Dialog.Description>
            <div
              aria-label={`${label} 이미지`}
              className="size-full bg-contain bg-center bg-no-repeat"
              role="img"
              style={{ backgroundImage: `url(${JSON.stringify(imageUrl)})` }}
            />
            <Dialog.Close
              aria-label="전체 화면 이미지 닫기"
              className="absolute right-0 top-0 inline-flex size-11 items-center justify-center rounded-full bg-background/90 text-foreground shadow-lg outline-none transition-colors hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <X aria-hidden="true" className="size-5" />
            </Dialog.Close>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function RecordDetailDialog({
  onClose,
  target,
}: {
  onClose: () => void;
  target: DetailViewTarget;
}) {
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const imageButtonRef = useRef<HTMLButtonElement>(null);

  function closeFullscreen() {
    setFullscreenOpen(false);
    requestAnimationFrame(() => imageButtonRef.current?.focus());
  }

  return (
    <>
      <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-[2px]" />
          <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 sm:p-6">
            <Dialog.Popup className="w-full max-w-3xl rounded-3xl border border-border bg-card p-5 shadow-xl outline-none sm:p-7">
              <Dialog.Title className="text-xl font-semibold">{target.title}</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-muted-foreground">{target.description}</Dialog.Description>

              <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                {target.imageUrl ? (
                  <button
                    aria-label={`${target.label} 이미지 전체 화면으로 보기`}
                    className="group relative block aspect-video w-full overflow-hidden rounded-2xl border border-border bg-muted bg-contain bg-center bg-no-repeat outline-none focus-visible:ring-3 focus-visible:ring-ring/40 md:aspect-square"
                    onClick={() => setFullscreenOpen(true)}
                    ref={imageButtonRef}
                    style={{ backgroundImage: `url(${JSON.stringify(target.imageUrl)})` }}
                    type="button"
                  >
                    <span className="absolute bottom-3 right-3 inline-flex size-10 items-center justify-center rounded-full bg-foreground/75 text-background shadow-sm transition-colors group-hover:bg-foreground group-focus-visible:bg-foreground">
                      <Maximize2 aria-hidden="true" className="size-4" />
                    </span>
                  </button>
                ) : (
                  <div
                    aria-label={`${target.label} 등록 이미지 없음`}
                    className="flex aspect-video w-full items-center justify-center rounded-2xl border border-border bg-muted text-sm text-muted-foreground md:aspect-square"
                    role="img"
                  >
                    <ImageIcon aria-hidden="true" className="mr-2 size-5" />등록된 이미지가 없어요.
                  </div>
                )}

                <dl className="divide-y divide-border">
                  {target.fields.map((field) => (
                    <div className="grid gap-1 py-3 first:pt-0 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-3" key={field.label}>
                      <dt className="text-sm font-semibold text-muted-foreground">{field.label}</dt>
                      <dd className="min-w-0 whitespace-pre-wrap break-words text-[15px]">{field.value || "-"}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="mt-6 flex justify-end">
                <Dialog.Close className="inline-flex h-12 items-center justify-center rounded-xl bg-secondary px-5 font-semibold">닫기</Dialog.Close>
              </div>
            </Dialog.Popup>
          </Dialog.Viewport>
        </Dialog.Portal>
      </Dialog.Root>
      {target.imageUrl ? (
        <FullscreenImageDialog
          imageUrl={target.imageUrl}
          label={target.label}
          onClose={closeFullscreen}
          open={fullscreenOpen}
        />
      ) : null}
    </>
  );
}

function ImageManagerDialog({
  onClose,
  onImageChange,
  target,
}: {
  onClose: () => void;
  onImageChange: (
    entity: ItemImageEntity,
    seq: number,
    imagePath: string | null,
    imageUrl: string | null,
  ) => void;
  target: ImageTarget;
}) {
  const [currentImagePath, setCurrentImagePath] = useState(target.imagePath);
  const [currentImageUrl, setCurrentImageUrl] = useState(target.imageUrl);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const previewButtonRef = useRef<HTMLButtonElement>(null);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function uploadImage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("업로드할 이미지를 선택해 주세요.");
      return;
    }
    if (!itemImageAccept.split(",").includes(file.type)) {
      setError("JPEG, PNG, WebP 이미지만 업로드할 수 있어요.");
      return;
    }
    if (file.size > itemImageMaxBytes) {
      setError("이미지는 5MB 이하만 업로드할 수 있어요.");
      return;
    }

    setPending(true);
    setError(null);
    setMessage(null);
    const formData = new FormData();
    formData.set("entity", target.entity);
    formData.set("seq", String(target.seq));
    formData.set("file", file);

    try {
      const response = await fetch("/api/item-images", { body: formData, method: "POST" });
      const result = await response.json() as ImageResponse;
      if (!response.ok) throw new Error(result.message ?? "이미지를 업로드하지 못했어요.");

      const nextPath = result.imagePath ?? null;
      const nextUrl = result.imageUrl ?? null;
      setCurrentImagePath(nextPath);
      setCurrentImageUrl(nextUrl);
      setFile(null);
      setMessage(result.message ?? "이미지를 저장했어요.");
      onImageChange(target.entity, target.seq, nextPath, nextUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "이미지를 업로드하지 못했어요.");
    } finally {
      setPending(false);
    }
  }

  async function deleteImage() {
    setPending(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/item-images", {
        body: JSON.stringify({ entity: target.entity, seq: target.seq }),
        headers: { "Content-Type": "application/json" },
        method: "DELETE",
      });
      const result = await response.json() as ImageResponse;
      if (!response.ok) throw new Error(result.message ?? "이미지를 삭제하지 못했어요.");

      setCurrentImagePath(null);
      setCurrentImageUrl(null);
      setFile(null);
      setMessage(result.message ?? "이미지를 삭제했어요.");
      onImageChange(target.entity, target.seq, null, null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "이미지를 삭제하지 못했어요.");
    } finally {
      setPending(false);
    }
  }

  const displayedImageUrl = previewUrl ?? currentImageUrl;

  function closeFullscreen() {
    setFullscreenOpen(false);
    requestAnimationFrame(() => previewButtonRef.current?.focus());
  }

  return (
    <>
      <DialogFrame
        description={`${target.label}의 대표 이미지를 등록하거나 교체할 수 있어요.`}
        onOpenChange={(open) => { if (!open) onClose(); }}
        open
        title="이미지 관리"
      >
        <form className="mt-6 space-y-5" onSubmit={uploadImage}>
          {displayedImageUrl ? (
            <button
              aria-label={`${target.label} 이미지 전체 화면으로 보기`}
              className="group relative block aspect-video w-full overflow-hidden rounded-2xl border border-border bg-muted bg-cover bg-center outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
              onClick={() => setFullscreenOpen(true)}
              ref={previewButtonRef}
              style={{ backgroundImage: `url(${JSON.stringify(displayedImageUrl)})` }}
              type="button"
            >
              <span className="absolute bottom-3 right-3 inline-flex size-10 items-center justify-center rounded-full bg-foreground/75 text-background shadow-sm transition-colors group-hover:bg-foreground group-focus-visible:bg-foreground">
                <Maximize2 aria-hidden="true" className="size-4" />
              </span>
            </button>
          ) : (
            <div
              aria-label={`${target.label} 등록 이미지 없음`}
              className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted text-sm text-muted-foreground"
              role="img"
            >
              <ImageIcon aria-hidden="true" className="mr-2 size-5" />등록된 이미지가 없어요.
            </div>
          )}

          <div className="space-y-2">
          <label className="font-semibold" htmlFor="item-image-file">이미지 파일</label>
          <input
            accept={itemImageAccept}
            className="block w-full rounded-sm border border-input bg-background p-3 text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-secondary file:px-3 file:py-2 file:font-semibold"
            disabled={pending}
            id="item-image-file"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setError(null);
              setMessage(null);
            }}
            type="file"
          />
          <p className="text-sm text-muted-foreground">JPEG, PNG, WebP · 최대 5MB</p>
          </div>

          {error ? <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p> : null}
          {message ? <p className="rounded-xl bg-accent px-3 py-2 text-sm text-primary" role="status">{message}</p> : null}

          <div className="flex flex-wrap justify-between gap-3 pt-1">
          <Button
            disabled={pending || !currentImagePath}
            onClick={deleteImage}
            type="button"
            variant="destructive"
          >
            <Trash2 aria-hidden="true" />이미지 삭제
          </Button>
          <div className="flex gap-3">
            <Dialog.Close className="inline-flex h-12 items-center justify-center rounded-xl bg-secondary px-5 font-semibold" disabled={pending}>닫기</Dialog.Close>
            <Button disabled={pending || !file} type="submit">
              {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Upload aria-hidden="true" />}
              {currentImagePath ? "이미지 교체" : "이미지 등록"}
            </Button>
          </div>
          </div>
        </form>
      </DialogFrame>
      {displayedImageUrl ? (
        <FullscreenImageDialog
          imageUrl={displayedImageUrl}
          label={target.label}
          onClose={closeFullscreen}
          open={fullscreenOpen}
        />
      ) : null}
    </>
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
  const [itemDeleteTarget, setItemDeleteTarget] = useState<Item | null>(null);
  const [detailDeleteTarget, setDetailDeleteTarget] = useState<ItemDetail | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editingDetail, setEditingDetail] = useState<ItemDetail | null>(null);
  const [imageTarget, setImageTarget] = useState<ImageTarget | null>(null);
  const [detailViewTarget, setDetailViewTarget] = useState<DetailViewTarget | null>(null);
  const [imageOverrides, setImageOverrides] = useState<Record<string, { imagePath: string | null; imageUrl: string | null }>>({});

  const effectiveItemSeq = items.some((item) => item.seq === selectedItemSeq) ? selectedItemSeq : (items[0]?.seq ?? null);
  const selectedItem = items.find((item) => item.seq === effectiveItemSeq) ?? null;
  const visibleDetails = useMemo(() => details.filter((detail) => detail.item_seq === effectiveItemSeq), [details, effectiveItemSeq]);
  const selectedDetail = visibleDetails.find((detail) => detail.seq === selectedDetailSeq) ?? null;

  function getImageState(entity: ItemImageEntity, record: Item | ItemDetail) {
    return imageOverrides[`${entity}-${record.seq}`] ?? {
      imagePath: record.image_path,
      imageUrl: record.image_url,
    };
  }

  function openImageManager(entity: ItemImageEntity, record: Item | ItemDetail, label: string) {
    setImageTarget({ entity, label, seq: record.seq, ...getImageState(entity, record) });
  }

  function openItemDetails(item: Item) {
    setDetailViewTarget({
      description: "품목의 기본 정보와 대표 이미지예요.",
      fields: [
        { label: "품목코드", value: item.item_code },
        { label: "품목명", value: item.item_name },
        { label: "모델명", value: item.model_name },
        { label: "비고", value: item.note },
      ],
      imageUrl: getImageState("item", item).imageUrl,
      label: item.item_name,
      title: "품목 정보",
    });
  }

  function openItemDetailDetails(detail: ItemDetail) {
    const parentItem = items.find((item) => item.seq === detail.item_seq);
    setDetailViewTarget({
      description: "품목상세의 기본 정보와 대표 이미지예요.",
      fields: [
        { label: "연결 품목", value: parentItem ? `${parentItem.item_code} (${parentItem.item_name})` : null },
        { label: "상세코드", value: detail.item_detail_code },
        { label: "상세명", value: detail.item_detail_name },
        { label: "소재", value: detail.material },
        { label: "비고", value: detail.note },
      ],
      imageUrl: getImageState("itemDetail", detail).imageUrl,
      label: detail.item_detail_name,
      title: "품목상세 정보",
    });
  }

  function isEnterKey(event: CellKeyDownEvent<Item> | CellKeyDownEvent<ItemDetail>) {
    return (event.event as KeyboardEvent | null)?.key === "Enter";
  }

  function selectItem(event: RowClickedEvent<Item>) {
    if (!event.data) return;
    setSelectedItemSeq(event.data.seq);
    setSelectedDetailSeq(null);
  }

  return (
    <div className="mt-8 grid gap-6 @min-[1280px]/workspace:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]">
      <section aria-labelledby="items-heading" className="min-w-0 rounded-3xl border border-border bg-card p-4 @min-[640px]/workspace:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-xl font-semibold" id="items-heading">품목</h2><p className="mt-1 text-sm text-muted-foreground">품목을 선택하고, 행을 더블클릭하면 전체 정보를 볼 수 있어요.</p></div>
          <Button onClick={() => { setEditingItem(null); setItemEditorOpen(true); }} size="sm" type="button"><Plus aria-hidden="true" />추가</Button>
        </div>
        <div className="mt-4 flex min-h-9 flex-wrap gap-2">
          <Button disabled={!selectedItem} onClick={() => { setEditingItem(selectedItem); setItemEditorOpen(true); }} size="sm" type="button" variant="secondary"><Pencil aria-hidden="true" />수정</Button>
          <Button disabled={!selectedItem} onClick={() => selectedItem && openImageManager("item", selectedItem, selectedItem.item_name)} size="sm" type="button" variant="secondary"><ImageIcon aria-hidden="true" />이미지</Button>
          <Button disabled={!selectedItem} onClick={() => setItemDeleteTarget(selectedItem)} size="sm" type="button" variant="destructive"><Trash2 aria-hidden="true" />삭제</Button>
        </div>
        {items.length === 0 ? (
          <div className="mt-4 flex h-80 items-center justify-center rounded-2xl bg-muted px-6 text-center text-muted-foreground">{hasFilters ? "조회조건에 맞는 품목이 없어요." : "등록된 품목이 없어요. 품목을 먼저 추가해 주세요."}</div>
        ) : (
          <div aria-label="품목 목록" className="mt-4 overflow-x-auto"><div className="h-[420px] min-w-[560px]"><AgGridProvider modules={modules}><AgGridReact columnDefs={itemColumns} defaultColDef={defaultColDef} getRowId={({ data }) => String(data.seq)} onCellKeyDown={(event: CellKeyDownEvent<Item>) => { if (event.data && isEnterKey(event)) openItemDetails(event.data); }} onRowClicked={selectItem} onRowDataUpdated={({ api }) => syncSelectedGridRow(api, effectiveItemSeq)} onRowDoubleClicked={(event: RowDoubleClickedEvent<Item>) => { if (event.data) openItemDetails(event.data); }} rowData={items} rowSelection={appGridSingleRowSelection} theme={appGridTheme} /></AgGridProvider></div></div>
        )}
      </section>

      <section aria-labelledby="item-details-heading" className="min-w-0 rounded-3xl border border-border bg-card p-4 @min-[640px]/workspace:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-xl font-semibold" id="item-details-heading">품목상세</h2><p className="mt-1 text-sm text-muted-foreground">{selectedItem ? `${selectedItem.item_code}(${selectedItem.item_name}) 품목의 상세 정보예요. 행을 더블클릭하면 전체 정보를 볼 수 있어요.` : "품목을 선택해 주세요."}</p></div>
          <Button disabled={!selectedItem} onClick={() => { setEditingDetail(null); setDetailEditorOpen(true); }} size="sm" type="button"><Plus aria-hidden="true" />추가</Button>
        </div>
        <div className="mt-4 flex min-h-9 flex-wrap gap-2">
          <Button disabled={!selectedDetail} onClick={() => { setEditingDetail(selectedDetail); setDetailEditorOpen(true); }} size="sm" type="button" variant="secondary"><Pencil aria-hidden="true" />수정</Button>
          <Button disabled={!selectedDetail} onClick={() => selectedDetail && openImageManager("itemDetail", selectedDetail, selectedDetail.item_detail_name)} size="sm" type="button" variant="secondary"><ImageIcon aria-hidden="true" />이미지</Button>
          <Button disabled={!selectedDetail} onClick={() => setDetailDeleteTarget(selectedDetail)} size="sm" type="button" variant="destructive"><Trash2 aria-hidden="true" />삭제</Button>
        </div>
        {!selectedItem ? (
          <div className="mt-4 flex h-80 items-center justify-center rounded-2xl bg-muted px-6 text-center text-muted-foreground">왼쪽에서 품목을 선택해 주세요.</div>
        ) : visibleDetails.length === 0 ? (
          <div className="mt-4 flex h-80 items-center justify-center rounded-2xl bg-muted px-6 text-center text-muted-foreground">등록된 품목상세가 없어요.</div>
        ) : (
          <div aria-label="품목상세 목록" className="mt-4 overflow-x-auto"><div className="h-[420px] min-w-[720px]"><AgGridProvider modules={modules}><AgGridReact columnDefs={detailColumns} defaultColDef={defaultColDef} getRowId={({ data }) => String(data.seq)} onCellKeyDown={(event: CellKeyDownEvent<ItemDetail>) => { if (event.data && isEnterKey(event)) openItemDetailDetails(event.data); }} onRowClicked={(event: RowClickedEvent<ItemDetail>) => event.data && setSelectedDetailSeq(event.data.seq)} onRowDataUpdated={({ api }) => syncSelectedGridRow(api, selectedDetailSeq)} onRowDoubleClicked={(event: RowDoubleClickedEvent<ItemDetail>) => { if (event.data) openItemDetailDetails(event.data); }} rowData={visibleDetails} rowSelection={appGridSingleRowSelection} theme={appGridTheme} /></AgGridProvider></div></div>
        )}
      </section>

      <ItemEditor item={editingItem} key={`item-editor-${editingItem?.seq ?? "new"}-${itemEditorOpen}`} onOpenChange={setItemEditorOpen} open={itemEditorOpen} />
      {selectedItem ? <DetailEditor detail={editingDetail} item={selectedItem} key={`detail-editor-${editingDetail?.seq ?? "new"}-${detailEditorOpen}`} onOpenChange={setDetailEditorOpen} open={detailEditorOpen} /> : null}
      {itemDeleteTarget ? <DeleteDialog action={deleteItem} itemName={`품목 “${itemDeleteTarget.item_name}”`} key={`item-delete-${itemDeleteTarget.seq}`} onOpenChange={(open) => { if (!open) setItemDeleteTarget(null); }} open seq={itemDeleteTarget.seq} /> : null}
      {detailDeleteTarget ? <DeleteDialog action={deleteItemDetail} itemName={`품목상세 “${detailDeleteTarget.item_detail_name}”`} key={`detail-delete-${detailDeleteTarget.seq}`} onOpenChange={(open) => { if (!open) setDetailDeleteTarget(null); }} open seq={detailDeleteTarget.seq} /> : null}
      {detailViewTarget ? <RecordDetailDialog onClose={() => setDetailViewTarget(null)} target={detailViewTarget} /> : null}
      {imageTarget ? (
        <ImageManagerDialog
          key={`${imageTarget.entity}-${imageTarget.seq}`}
          onClose={() => setImageTarget(null)}
          onImageChange={(entity, seq, imagePath, imageUrl) => {
            setImageOverrides((current) => ({
              ...current,
              [`${entity}-${seq}`]: { imagePath, imageUrl },
            }));
          }}
          target={imageTarget}
        />
      ) : null}
    </div>
  );
}
