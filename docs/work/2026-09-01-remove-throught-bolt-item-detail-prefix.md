# 품목상세명 THROUGHT BOLT 접두어 제거

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-09-01
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인` / 2026-09-01

## 배경과 목적

품목상세명 중 `THROUGHT BOLT ` 뒤에 실제 상세 구분이 붙은 데이터에서 공통 접두어를 제거해 상세명만 표시한다. 정확히 `THROUGHT BOLT`인 상세명은 그대로 유지한다.

## 범위

### 포함

- `public.item_details.item_detail_name`이 대문자 `THROUGHT BOLT `로 시작하고 뒤에 내용이 있는 행
- 접두어와 그 뒤의 연속 공백 제거
- 변경 대상의 `updated_at` 감사 필드 갱신

### 제외

- 정확히 `THROUGHT BOLT`인 상세명
- `THROUGH BOLT`, `Through Bolt` 등 철자나 대소문자가 다른 상세명
- 검사성적서와 측정 이력에 저장된 과거 품목상세명 스냅샷
- 테이블 구조, 제약, RLS와 애플리케이션 코드 변경

## 완료 조건

- [x] `THROUGHT BOLT`는 변경되지 않는다.
- [x] `THROUGHT BOLT WASHER`는 `WASHER`가 된다.
- [x] `THROUGHT BOLT TOP NUT`는 `TOP NUT`가 된다.
- [x] 변경 결과가 공백 또는 빈 문자열인 행은 없다.
- [x] 대상 외 품목상세명과 과거 스냅샷은 변경되지 않는다.

## 현재 구현 조사

- 관련 route/component: 품목관리 조회·수정 화면은 `public.item_details.item_detail_name`을 직접 사용하며 앱 코드 변경은 필요 없다.
- 관련 Supabase table/bucket: `public.item_details`; Storage 변경 없음
- 재사용할 기존 패턴: 재현 가능한 Supabase SQL migration, `set_audit_fields()` update trigger
- 문서와 구현의 차이: `item_detail_name`에는 빈 문자열 방지 제약만 있고 상세명 unique 제약은 없다. 품목상세코드는 `(item_seq, item_detail_code)`로만 unique다.

## 설계

### UI와 반응형

- 모바일: 해당 없음
- 태블릿: 해당 없음
- 데스크톱: 품목관리 재조회 시 변경된 상세명이 표시된다.
- 로딩/빈 상태/오류/권한: 기존 화면 동작 유지
- 접근성: 해당 없음

### Server/Client 경계

- Server Component/Action: 변경 없음
- Client Component/Zustand: 변경 없음

### 데이터와 Supabase

- schema 변경: 없음. 기존 데이터만 정규화한다.
- PK/FK/index: 변경 없음
- RLS 정책: 변경 없음
- Storage bucket/path/policy: 변경 없음
- migration과 rollback: case-sensitive 정규식으로 접두어가 있고 뒤에 내용이 있는 행만 갱신한다. 적용 직전 대상 `seq`와 기존 이름을 확인하고, 롤백은 해당 `seq`별 기존 이름 매핑으로 복원한다.

## 변경 계획

1. 대상 행과 변경 예상값을 조회한다.
2. 빈 결과 방지 검증과 update를 포함한 migration을 작성한다.
3. 연결된 `daehan` 프로젝트에서 dry run한다.
4. migration을 적용한다.
5. 변경 결과, 제외 대상과 원격 migration 상태를 재검증한다.

## 위험과 승인 사항

- 과거 검사성적서·측정 이력의 스냅샷은 이력 보존을 위해 변경하지 않는다.
- 접두어 제거 후의 상세명은 원래 상세명으로 자동 역산할 수 없으므로 적용 전 대상 `seq`와 기존 이름 매핑을 롤백 근거로 사용한다.
- 원격 CLI 연결이 지연될 경우 DB 적용은 연결이 복구된 뒤 수행한다.

## 검증 계획

- [x] migration SQL 검토
- [x] 대상/제외 조건 확인
- [x] 원격 dry run
- [x] 원격 migration 적용
- [x] 빈 결과 방지와 대상 외 행 제외 조건 확인
- [x] 후속 dry run에서 원격 최신 상태 확인

## 결과

- 변경: `THROUGHT BOLT ` 뒤에 내용이 있는 `public.item_details.item_detail_name`에서 접두어와 연속 공백을 제거하는 migration을 원격 `daehan` 프로젝트에 적용했다.
- 검증: 빈 결과 방지 SQL, 대상·제외 정규식, 최초 dry run, 원격 migration 기록과 후속 dry run의 `Remote database is up to date`를 확인했다.
- 미실행: Supabase CLI가 임의의 행 단위 SELECT를 제공하지 않아 변경 건수와 개별 변경 행 목록은 별도로 출력하지 못했다.
- 남은 위험/후속 작업: 과거 검사성적서와 측정 이력 스냅샷은 요청대로 기존 이름을 유지한다.
