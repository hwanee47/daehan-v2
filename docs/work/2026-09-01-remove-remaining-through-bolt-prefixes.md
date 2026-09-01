# 남은 THROUGH BOLT 품목상세명 접두어 제거

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-09-01
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인` / 2026-09-01

## 배경과 목적

첫 번째 실제 데이터 migration은 원격 SQL 결과의 일부만 확인해 10건만 변경했다. 전체 집계 결과 남아 있는 `THROUGH BOLT ` 접두어 데이터 76건을 모두 정규화한다.

## 범위

### 포함

- `THROUGH BOLT BOTTOM NUT` 21건 → `BOTTOM NUT`
- `THROUGH BOLT TOP NUT` 27건 → `TOP NUT`
- `THROUGH BOLT WASHER` 28건 → `WASHER`

### 제외

- 정확히 `THROUGH BOLT`인 32건
- 다른 철자·대소문자의 상세명
- 검사성적서와 측정 이력 스냅샷
- schema, RLS, Storage와 애플리케이션 코드 변경

## 완료 조건

- [x] 남은 접두어 데이터 76건이 모두 변경된다.
- [x] 정확히 `THROUGH BOLT`인 32건은 유지된다.
- [x] 변경 후 `THROUGH BOLT `로 시작하는 상세명이 0건이다.
- [x] 상세명 정규화 대상은 `BOTTOM NUT`, `TOP NUT`, `WASHER` 세 종류뿐이다.

## 현재 구현 조사

- 관련 route/component: 품목관리 화면은 `public.item_details.item_detail_name`을 직접 조회한다.
- 관련 Supabase table/bucket: `public.item_details`; Storage 변경 없음
- 재사용할 기존 패턴: 데이터 migration과 `set_audit_fields()` trigger
- 문서와 구현의 차이: 기존 실제 데이터 migration은 10건만 명시적으로 변경해 76건이 남았다.

## 설계

### UI와 반응형

- 모바일/태블릿/데스크톱: 품목관리 재조회 후 변경된 상세명을 표시한다.
- 로딩/빈 상태/오류/권한: 기존 동작 유지
- 접근성: 해당 없음

### Server/Client 경계

- Server Component/Action: 변경 없음
- Client Component/Zustand: 변경 없음

### 데이터와 Supabase

- schema 변경: 없음
- PK/FK/index: 변경 없음
- RLS 정책: 변경 없음
- Storage bucket/path/policy: 변경 없음
- migration과 rollback: 실행 전 대상 76건과 허용된 접미사 세 종류를 검증하고, 실행 후 잔여 접두어 0건을 검증한다. 롤백은 migration 적용 시점의 `updated_at`과 세 상세명을 기준으로 대상 seq를 확인한 뒤 원래 접두어를 복원한다.

## 변경 계획

1. 76건과 접미사 종류를 검증하는 migration을 작성한다.
2. 원격 dry run 후 적용한다.
3. SQL Editor에서 잔여 접두어, 정확한 이름과 정규화 이름 건수를 재조회한다.
4. 원격 migration 기록과 후속 dry run을 확인한다.

## 위험과 승인 사항

- 실행 직전에 대상 데이터가 달라지면 건수 또는 접미사 검증으로 전체 migration이 중단된다.
- 정확히 `THROUGH BOLT`인 상세명은 where 조건에서 제외한다.

## 검증 계획

- [x] migration SQL 검토
- [x] 원격 dry run
- [x] 원격 적용
- [x] 원격 행 집계 재조회
- [x] 후속 dry run 최신 상태 확인

## 결과

- 변경: 남아 있던 접두어 데이터 76건을 `BOTTOM NUT`, `TOP NUT`, `WASHER`로 정규화했다.
- 검증: 정확한 `THROUGH BOLT` 32건 유지, `THROUGH BOLT ` 접두어 0건, 최종 상세명은 `BOTTOM NUT` 22건, `TOP NUT` 32건, `WASHER` 32건으로 확인했다. 원격 migration 기록은 `20260901020000`까지 일치하며 후속 dry run 결과도 최신 상태다.
- 미실행: 품목관리 화면의 브라우저 새로고침 후 표시 확인은 수행하지 않았다.
- 남은 위험/후속 작업: 이미 열려 있는 화면에는 기존 조회 결과가 남을 수 있으므로 새로고침 또는 재조회가 필요하다. 검사성적서와 측정 이력의 기존 스냅샷은 변경 범위에서 제외했다.
