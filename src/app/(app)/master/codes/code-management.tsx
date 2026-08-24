"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog } from "@base-ui/react/dialog";
import type { ColDef, RowClickedEvent } from "ag-grid-community";
import { AllCommunityModule, themeQuartz } from "ag-grid-community";
import { AgGridProvider, AgGridReact } from "ag-grid-react";
import { LoaderCircle, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

import {
  deleteCodeDetail,
  deleteCodeGroup,
  saveCodeDetail,
  saveCodeGroup,
  toggleCodeDetail,
  toggleCodeGroup,
} from "./actions";
import type { CodeActionState, CodeDetail, CodeGroup } from "./types";

const modules = [AllCommunityModule];
const initialActionState: CodeActionState = { status: "idle" };
const inputClassName =
  "h-12 w-full rounded-sm border border-input bg-background px-4 outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 aria-invalid:border-destructive";

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

const groupColumns: ColDef<CodeGroup>[] = [
  { field: "group_code", headerName: "그룹 코드", minWidth: 160, flex: 1 },
  { field: "group_name", headerName: "그룹명", minWidth: 150, flex: 1 },
  { field: "sort_order", headerName: "순서", width: 90 },
  {
    field: "is_active",
    headerName: "상태",
    width: 90,
    valueFormatter: ({ value }) => (value ? "활성" : "비활성"),
  },
];

const detailColumns: ColDef<CodeDetail>[] = [
  { field: "code", headerName: "코드", minWidth: 130, flex: 1 },
  { field: "code_name", headerName: "코드명", minWidth: 150, flex: 1 },
  { field: "description", headerName: "설명", minWidth: 180, flex: 1.4 },
  { field: "sort_order", headerName: "순서", width: 90 },
  {
    field: "is_active",
    headerName: "상태",
    width: 90,
    valueFormatter: ({ value }) => (value ? "활성" : "비활성"),
  },
];

const defaultColDef = { resizable: true, sortable: true };

type ServerFormAction = (
  previousState: CodeActionState,
  formData: FormData,
) => Promise<CodeActionState>;

function ActionMessage({ state }: { state: CodeActionState }) {
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
  return message ? (
    <p className="text-sm text-destructive" id={id}>
      {message}
    </p>
  ) : null;
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
            <Dialog.Description className="mt-2 text-sm text-muted-foreground">
              {description}
            </Dialog.Description>
            {children}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function GroupEditor({
  group,
  onOpenChange,
  open,
}: {
  group: CodeGroup | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveCodeGroup, initialActionState);

  useEffect(() => {
    if (state.status === "success") onOpenChange(false);
  }, [onOpenChange, state.status]);

  return (
    <DialogFrame
      description="그룹 코드는 저장 후에도 참조할 수 있도록 영문과 숫자 중심으로 입력해 주세요."
      onOpenChange={onOpenChange}
      open={open}
      title={group ? "코드그룹 수정" : "코드그룹 추가"}
    >
      <form action={formAction} className="mt-6 space-y-4">
        {group ? <input name="seq" type="hidden" value={group.seq} /> : null}
        <div className="space-y-2">
          <label className="font-semibold" htmlFor="group-code">그룹 코드</label>
          <input
            aria-describedby={state.errors?.groupCode ? "group-code-error" : undefined}
            aria-invalid={Boolean(state.errors?.groupCode)}
            className={inputClassName}
            defaultValue={group?.group_code}
            id="group-code"
            maxLength={80}
            name="groupCode"
            placeholder="INSPECTION_RESULT"
            required
          />
          <FieldError id="group-code-error" message={state.errors?.groupCode} />
        </div>
        <div className="space-y-2">
          <label className="font-semibold" htmlFor="group-name">그룹명</label>
          <input
            aria-describedby={state.errors?.groupName ? "group-name-error" : undefined}
            aria-invalid={Boolean(state.errors?.groupName)}
            className={inputClassName}
            defaultValue={group?.group_name}
            id="group-name"
            maxLength={100}
            name="groupName"
            required
          />
          <FieldError id="group-name-error" message={state.errors?.groupName} />
        </div>
        <div className="space-y-2">
          <label className="font-semibold" htmlFor="group-description">설명</label>
          <textarea
            aria-describedby={state.errors?.description ? "group-description-error" : undefined}
            aria-invalid={Boolean(state.errors?.description)}
            className="min-h-24 w-full resize-y rounded-sm border border-input bg-background px-4 py-3 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
            defaultValue={group?.description ?? ""}
            id="group-description"
            maxLength={500}
            name="description"
          />
          <FieldError id="group-description-error" message={state.errors?.description} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
          <div className="space-y-2">
            <label className="font-semibold" htmlFor="group-sort-order">정렬 순서</label>
            <input
              aria-describedby={state.errors?.sortOrder ? "group-sort-order-error" : undefined}
              aria-invalid={Boolean(state.errors?.sortOrder)}
              className={inputClassName}
              defaultValue={group?.sort_order ?? 0}
              id="group-sort-order"
              min={0}
              name="sortOrder"
              required
              type="number"
            />
            <FieldError id="group-sort-order-error" message={state.errors?.sortOrder} />
          </div>
          <label className="flex min-h-12 items-center gap-3 rounded-sm border border-input px-4 font-semibold">
            <input defaultChecked={group?.is_active ?? true} name="isActive" type="checkbox" />
            활성 상태
          </label>
        </div>
        <ActionMessage state={state} />
        <div className="flex justify-end gap-3 pt-2">
          <Dialog.Close className="inline-flex h-12 items-center justify-center rounded-xl bg-secondary px-5 font-semibold" disabled={pending}>
            취소
          </Dialog.Close>
          <Button disabled={pending} type="submit">
            {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
            저장하기
          </Button>
        </div>
      </form>
    </DialogFrame>
  );
}

function DetailEditor({
  detail,
  group,
  onOpenChange,
  open,
}: {
  detail: CodeDetail | null;
  group: CodeGroup;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveCodeDetail, initialActionState);

  useEffect(() => {
    if (state.status === "success") onOpenChange(false);
  }, [onOpenChange, state.status]);

  return (
    <DialogFrame
      description={`${group.group_name} 그룹에 속할 상세 코드를 입력해 주세요.`}
      onOpenChange={onOpenChange}
      open={open}
      title={detail ? "상세 코드 수정" : "상세 코드 추가"}
    >
      <form action={formAction} className="mt-6 space-y-4">
        {detail ? <input name="seq" type="hidden" value={detail.seq} /> : null}
        <input name="codeGroupSeq" type="hidden" value={group.seq} />
        <div className="space-y-2">
          <label className="font-semibold" htmlFor="detail-code">코드</label>
          <input
            aria-describedby={state.errors?.code ? "detail-code-error" : undefined}
            aria-invalid={Boolean(state.errors?.code)}
            className={inputClassName}
            defaultValue={detail?.code}
            id="detail-code"
            maxLength={80}
            name="code"
            required
          />
          <FieldError id="detail-code-error" message={state.errors?.code} />
        </div>
        <div className="space-y-2">
          <label className="font-semibold" htmlFor="detail-name">코드명</label>
          <input
            aria-describedby={state.errors?.codeName ? "detail-name-error" : undefined}
            aria-invalid={Boolean(state.errors?.codeName)}
            className={inputClassName}
            defaultValue={detail?.code_name}
            id="detail-name"
            maxLength={100}
            name="codeName"
            required
          />
          <FieldError id="detail-name-error" message={state.errors?.codeName} />
        </div>
        <div className="space-y-2">
          <label className="font-semibold" htmlFor="detail-description">설명</label>
          <textarea
            aria-describedby={state.errors?.description ? "detail-description-error" : undefined}
            aria-invalid={Boolean(state.errors?.description)}
            className="min-h-24 w-full resize-y rounded-sm border border-input bg-background px-4 py-3 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
            defaultValue={detail?.description ?? ""}
            id="detail-description"
            maxLength={500}
            name="description"
          />
          <FieldError id="detail-description-error" message={state.errors?.description} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
          <div className="space-y-2">
            <label className="font-semibold" htmlFor="detail-sort-order">정렬 순서</label>
            <input
              aria-describedby={state.errors?.sortOrder ? "detail-sort-order-error" : undefined}
              aria-invalid={Boolean(state.errors?.sortOrder)}
              className={inputClassName}
              defaultValue={detail?.sort_order ?? 0}
              id="detail-sort-order"
              min={0}
              name="sortOrder"
              required
              type="number"
            />
            <FieldError id="detail-sort-order-error" message={state.errors?.sortOrder} />
          </div>
          <label className="flex min-h-12 items-center gap-3 rounded-sm border border-input px-4 font-semibold">
            <input defaultChecked={detail?.is_active ?? true} name="isActive" type="checkbox" />
            활성 상태
          </label>
        </div>
        <ActionMessage state={state} />
        <div className="flex justify-end gap-3 pt-2">
          <Dialog.Close className="inline-flex h-12 items-center justify-center rounded-xl bg-secondary px-5 font-semibold" disabled={pending}>
            취소
          </Dialog.Close>
          <Button disabled={pending} type="submit">
            {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
            저장하기
          </Button>
        </div>
      </form>
    </DialogFrame>
  );
}

function DeleteDialog({
  action,
  itemName,
  onOpenChange,
  open,
  seq,
}: {
  action: ServerFormAction;
  itemName: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  seq: number;
}) {
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
            <AlertDialog.Description className="mt-3 break-keep text-muted-foreground">
              {itemName}을(를) 삭제하면 되돌릴 수 없어요. 사용 중지라면 비활성화를 이용해 주세요.
            </AlertDialog.Description>
            <form action={formAction} className="mt-6">
              <input name="seq" type="hidden" value={seq} />
              <ActionMessage state={state} />
              <div className="mt-5 flex justify-end gap-3">
                <AlertDialog.Close className="inline-flex h-12 items-center justify-center rounded-xl bg-secondary px-5 font-semibold" disabled={pending}>
                  취소
                </AlertDialog.Close>
                <Button disabled={pending} type="submit" variant="destructive">
                  {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
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

function ToggleForm({
  action,
  isActive,
  seq,
}: {
  action: ServerFormAction;
  isActive: boolean;
  seq: number;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);

  return (
    <div>
      <form action={formAction}>
        <input name="seq" type="hidden" value={seq} />
        <input name="isActive" type="hidden" value={String(!isActive)} />
        <Button disabled={pending} size="sm" type="submit" variant="secondary">
          {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Power aria-hidden="true" />}
          {isActive ? "비활성화" : "활성화"}
        </Button>
      </form>
      <ActionMessage state={state} />
    </div>
  );
}

export function CodeManagement({ details, groups }: { details: CodeDetail[]; groups: CodeGroup[] }) {
  const [selectedGroupSeq, setSelectedGroupSeq] = useState<number | null>(groups[0]?.seq ?? null);
  const [selectedDetailSeq, setSelectedDetailSeq] = useState<number | null>(null);
  const [groupEditorOpen, setGroupEditorOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CodeGroup | null>(null);
  const [detailEditorOpen, setDetailEditorOpen] = useState(false);
  const [editingDetail, setEditingDetail] = useState<CodeDetail | null>(null);
  const [groupDeleteOpen, setGroupDeleteOpen] = useState(false);
  const [detailDeleteOpen, setDetailDeleteOpen] = useState(false);

  const effectiveGroupSeq = groups.some((group) => group.seq === selectedGroupSeq)
    ? selectedGroupSeq
    : (groups[0]?.seq ?? null);
  const selectedGroup = groups.find((group) => group.seq === effectiveGroupSeq) ?? null;
  const visibleDetails = useMemo(
    () => details.filter((detail) => detail.code_group_seq === effectiveGroupSeq),
    [details, effectiveGroupSeq],
  );
  const selectedDetail = visibleDetails.find((detail) => detail.seq === selectedDetailSeq) ?? null;

  function selectGroup(event: RowClickedEvent<CodeGroup>) {
    if (!event.data) return;
    setSelectedGroupSeq(event.data.seq);
    setSelectedDetailSeq(null);
  }

  function selectDetail(event: RowClickedEvent<CodeDetail>) {
    if (event.data) setSelectedDetailSeq(event.data.seq);
  }

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]">
      <section className="min-w-0 rounded-3xl border border-border bg-card p-4 sm:p-5" aria-labelledby="code-groups-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold" id="code-groups-heading">코드그룹</h2>
            <p className="mt-1 text-sm text-muted-foreground">그룹을 선택하면 상세 코드를 확인할 수 있어요.</p>
          </div>
          <Button
            onClick={() => {
              setEditingGroup(null);
              setGroupEditorOpen(true);
            }}
            size="sm"
            type="button"
          >
            <Plus aria-hidden="true" /> 추가
          </Button>
        </div>

        <div className="mt-4 flex min-h-9 flex-wrap gap-2">
          <Button
            disabled={!selectedGroup}
            onClick={() => {
              setEditingGroup(selectedGroup);
              setGroupEditorOpen(true);
            }}
            size="sm"
            type="button"
            variant="secondary"
          >
            <Pencil aria-hidden="true" /> 수정
          </Button>
          {selectedGroup ? (
            <ToggleForm
              action={toggleCodeGroup}
              isActive={selectedGroup.is_active}
              key={`group-toggle-${selectedGroup.seq}-${selectedGroup.is_active}`}
              seq={selectedGroup.seq}
            />
          ) : null}
          <Button disabled={!selectedGroup} onClick={() => setGroupDeleteOpen(true)} size="sm" type="button" variant="destructive">
            <Trash2 aria-hidden="true" /> 삭제
          </Button>
        </div>

        {groups.length === 0 ? (
          <div className="mt-4 flex h-80 items-center justify-center rounded-2xl bg-muted px-6 text-center text-muted-foreground">
            등록된 코드그룹이 없어요. 그룹을 먼저 추가해 주세요.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto" aria-label="코드그룹 목록">
            <div className="h-[420px] min-w-[560px]">
              <AgGridProvider modules={modules}>
                <AgGridReact
                  columnDefs={groupColumns}
                  defaultColDef={defaultColDef}
                  getRowClass={({ data }) => (data?.seq === effectiveGroupSeq ? "!bg-accent" : undefined)}
                  getRowId={({ data }) => String(data.seq)}
                  onRowClicked={selectGroup}
                  rowData={groups}
                  theme={gridTheme}
                />
              </AgGridProvider>
            </div>
          </div>
        )}
      </section>

      <section className="min-w-0 rounded-3xl border border-border bg-card p-4 sm:p-5" aria-labelledby="code-details-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold" id="code-details-heading">상세 코드</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedGroup ? `${selectedGroup.group_name} 그룹의 상세 코드예요.` : "코드그룹을 선택해 주세요."}
            </p>
          </div>
          <Button
            disabled={!selectedGroup}
            onClick={() => {
              setEditingDetail(null);
              setDetailEditorOpen(true);
            }}
            size="sm"
            type="button"
          >
            <Plus aria-hidden="true" /> 추가
          </Button>
        </div>

        <div className="mt-4 flex min-h-9 flex-wrap gap-2">
          <Button
            disabled={!selectedDetail}
            onClick={() => {
              setEditingDetail(selectedDetail);
              setDetailEditorOpen(true);
            }}
            size="sm"
            type="button"
            variant="secondary"
          >
            <Pencil aria-hidden="true" /> 수정
          </Button>
          {selectedDetail ? (
            <ToggleForm
              action={toggleCodeDetail}
              isActive={selectedDetail.is_active}
              key={`detail-toggle-${selectedDetail.seq}-${selectedDetail.is_active}`}
              seq={selectedDetail.seq}
            />
          ) : null}
          <Button disabled={!selectedDetail} onClick={() => setDetailDeleteOpen(true)} size="sm" type="button" variant="destructive">
            <Trash2 aria-hidden="true" /> 삭제
          </Button>
        </div>

        {!selectedGroup ? (
          <div className="mt-4 flex h-80 items-center justify-center rounded-2xl bg-muted px-6 text-center text-muted-foreground">
            왼쪽에서 코드그룹을 선택해 주세요.
          </div>
        ) : visibleDetails.length === 0 ? (
          <div className="mt-4 flex h-80 items-center justify-center rounded-2xl bg-muted px-6 text-center text-muted-foreground">
            등록된 상세 코드가 없어요.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto" aria-label="상세 코드 목록">
            <div className="h-[420px] min-w-[720px]">
              <AgGridProvider modules={modules}>
                <AgGridReact
                  columnDefs={detailColumns}
                  defaultColDef={defaultColDef}
                  getRowClass={({ data }) => (data?.seq === selectedDetailSeq ? "!bg-accent" : undefined)}
                  getRowId={({ data }) => String(data.seq)}
                  onRowClicked={selectDetail}
                  rowData={visibleDetails}
                  theme={gridTheme}
                />
              </AgGridProvider>
            </div>
          </div>
        )}
      </section>

      <GroupEditor
        group={editingGroup}
        key={`group-editor-${editingGroup?.seq ?? "new"}-${groupEditorOpen}`}
        onOpenChange={setGroupEditorOpen}
        open={groupEditorOpen}
      />
      {selectedGroup ? (
        <DetailEditor
          detail={editingDetail}
          group={selectedGroup}
          key={`detail-editor-${editingDetail?.seq ?? "new"}-${detailEditorOpen}`}
          onOpenChange={setDetailEditorOpen}
          open={detailEditorOpen}
        />
      ) : null}
      {selectedGroup ? (
        <DeleteDialog
          action={deleteCodeGroup}
          itemName={`코드그룹 “${selectedGroup.group_name}”`}
          key={`group-delete-${selectedGroup.seq}-${groupDeleteOpen}`}
          onOpenChange={setGroupDeleteOpen}
          open={groupDeleteOpen}
          seq={selectedGroup.seq}
        />
      ) : null}
      {selectedDetail ? (
        <DeleteDialog
          action={deleteCodeDetail}
          itemName={`상세 코드 “${selectedDetail.code_name}”`}
          key={`detail-delete-${selectedDetail.seq}-${detailDeleteOpen}`}
          onOpenChange={setDetailDeleteOpen}
          open={detailDeleteOpen}
          seq={selectedDetail.seq}
        />
      ) : null}
    </div>
  );
}
