# 측정이력 검사항목 구조 그대로 불러오기

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-09-02
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인`, 2026-09-02

## 배경과 목적

과거 측정이력을 불러올 때 현재 성적서 검사항목과 과거 항목을 합쳐 행이 계속 늘어나는 문제를 해결한다. 선택한 이력의 행 수와 순서를 그대로 결과입력 화면에 복원한다.

## 범위

### 포함

- 과거 이력의 검사항목 구조로 결과입력 행 전체 교체
- 현재 원본에 남아 있는 항목만 원본 식별자로 연결
- 현재 원본 일부만 포함하는 측정이력 저장 허용
- 입력된 전체 행의 회차 스냅샷 저장 유지

### 제외

- 검사성적서 원본 검사항목의 추가·수정·삭제
- 기존 측정이력 변경
- 과거에 원본에 잘못 추가된 항목 자동 삭제

## 완료 조건

- [x] 이력을 반복해서 불러와도 행 수가 늘어나지 않는다.
- [x] 선택한 이력의 행 수, 순서, 기준치수, 공차와 결과가 그대로 복원된다.
- [x] 복원한 구조를 다시 저장할 수 있다.
- [x] 성적서관리 원본 검사항목은 변경되지 않는다.

## 현재 구현 조사

- 관련 route/component: `inspection-measurements/inspection-measurement-sheet.tsx`, `inspection-reports/actions.ts`
- 관련 Supabase table/bucket: `inspection_report_items`, `inspection_report_measurements`, `inspection_measurement_runs`, `inspection_measurement_run_items`
- 재사용할 기존 패턴: nullable `source_report_item_seq`를 사용하는 이력 전용 행
- 문서와 구현의 차이: 현재 UI는 현재 구조와 과거 이력 구조를 합치고, DB 함수는 현재 원본 항목 전체 포함을 요구한다.

## 설계

### UI와 반응형

- 선택한 이력의 항목 배열로 결과입력 행을 완전히 교체한다.

### Server/Client 경계

- 현재 원본에 존재하는 `source_report_item_seq`만 저장 payload의 `item_seq`로 유지한다.
- 원본에서 사라진 과거 항목과 이력 전용 항목은 `seq` 없는 행으로 저장한다.

### 데이터와 Supabase

- schema 변경: 없음
- PK/FK/index: 변경 없음
- RLS 정책: 변경 없음
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: 저장 함수를 `create or replace`하며, 롤백은 직전 함수 정의를 복원하는 후속 migration으로 수행한다.

## 변경 계획

1. 이력 불러오기 로직을 정확한 구조 교체 방식으로 변경한다.
2. DB 함수가 현재 원본 항목의 유효한 일부 집합을 허용하도록 변경한다.
3. 정적 검사와 원격 migration 검증을 수행한다.

## 위험과 승인 사항

- 과거 구조에 없던 현재 항목은 불러온 화면에서 제외된다.
- DB 함수 변경 및 원격 적용은 2026-09-02 사용자 승인 완료.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [x] 원격 migration dry run
- [x] 원격 migration 적용 및 후속 dry run

## 결과

- 변경: 이력의 행 배열로 결과입력 구조를 완전히 교체하고, 현재 원본 항목의 유효한 일부 집합도 새 이력으로 저장할 수 있도록 DB 함수를 변경했다.
- 검증: ESLint와 TypeScript 검사를 통과했다. 원격 dry run에서 migration 1건만 확인해 적용했으며 후속 dry run `up to date`를 확인했다.
- 미실행: 인증 사용자의 실제 UI 반복 불러오기·저장 시나리오는 자동 실행하지 않았다.
- 남은 위험/후속 작업: 수정 전에 원본에 잘못 추가된 항목은 그대로 보존된다.
