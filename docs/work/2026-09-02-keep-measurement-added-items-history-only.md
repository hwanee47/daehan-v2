# 결과입력 신규 검사항목 이력 전용 저장

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-09-02
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인`, 2026-09-02

## 배경과 목적

결과입력에서 추가한 측정행이 검사성적서 원본 검사항목에도 추가되는 문제를 수정한다. 결과입력의 추가 행은 해당 측정 회차 이력에만 저장하고 성적서관리의 검사항목과 순번은 변경하지 않는다.

## 범위

### 포함

- `save_inspection_measurement_entry` 함수의 신규 행 저장 경로 수정
- 기존 성적서 검사항목의 최신 측정값 갱신 유지
- 입력한 전체 행을 측정 회차 상세 스냅샷으로 저장
- 신규 이력 전용 행의 nullable 원본 검사항목 식별자 처리

### 제외

- 기존에 결과입력에서 잘못 추가된 `inspection_report_items` 자동 삭제
- 검사성적서관리의 등록·수정 동작 변경
- 테이블 구조와 RLS 정책 변경

## 완료 조건

- [x] 결과입력에서 신규 행을 저장해도 `inspection_report_items` 행 수가 늘지 않는다.
- [x] 신규 행은 `inspection_measurement_run_items`에 저장되어 과거 이력에서 조회된다.
- [x] 기존 성적서 검사항목의 최신 측정값 저장은 유지된다.
- [x] 저장 직후 현재 화면의 신규 행과 입력값이 유지된다.

## 현재 구현 조사

- 관련 route/component: `inspection-measurements/inspection-measurement-sheet.tsx`, `inspection-reports/actions.ts`
- 관련 Supabase table/bucket: `inspection_report_items`, `inspection_report_measurements`, `inspection_measurement_runs`, `inspection_measurement_run_items`
- 재사용할 기존 패턴: 측정 회차별 스냅샷과 nullable `source_report_item_seq`
- 문서와 구현의 차이: 함수 설명은 마스터를 변경하지 않는다고 명시하지만 신규 행은 원본 검사항목에 추가되고 있었다.

## 설계

### UI와 반응형

- 기존 결과입력 UI를 유지한다.

### Server/Client 경계

- Server Action은 DB 함수가 반환한 원본 검사항목 식별자의 `null`을 허용한다.
- 신규 이력 전용 행은 저장 후에도 클라이언트에서 `seq`가 없는 상태로 유지한다.

### 데이터와 Supabase

- schema 변경: 없음
- PK/FK/index: 변경 없음
- RLS 정책: 변경 없음
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: DB 함수를 `create or replace`한다. 롤백은 직전 migration의 함수 정의를 복원하는 후속 migration으로 수행한다.

## 변경 계획

1. DB 함수에서 신규 원본 검사항목 insert를 제거한다.
2. 입력 행 전체를 회차 상세에 직접 insert한다.
3. 반환 타입과 클라이언트 저장 후 상태를 nullable 식별자에 맞춘다.
4. 원격 dry run, 적용, 후속 상태를 검증한다.

## 위험과 승인 사항

- 이미 원본에 추가된 행은 정상 항목과 자동 구분할 수 없어 보존한다.
- DB 함수 변경 및 원격 적용은 2026-09-02 사용자 승인 완료.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [x] 원격 migration dry run
- [x] 원격 migration 적용 및 후속 dry run

## 결과

- 변경: 신규 측정행을 원본 검사항목에 추가하지 않고 측정 회차 상세에만 저장하도록 DB 함수와 nullable 반환 타입을 변경했다.
- 검증: ESLint와 TypeScript 검사를 통과했다. 원격 dry run에서 migration 1건만 확인해 적용했으며 후속 dry run `up to date`와 원격 migration 기록 일치를 확인했다.
- 미실행: 인증 사용자의 실제 UI 저장 시나리오는 자동 실행하지 않았다.
- 남은 위험/후속 작업: 수정 전에 원본에 잘못 추가된 항목은 보존된다. 필요한 성적서를 식별한 뒤 별도 승인된 정리 작업으로 삭제해야 한다.
