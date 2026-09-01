# 품목상세명 THROUGH BOLT 접두어 제거

## 상태

- 단계: 진행
- 담당: Codex
- 작성일: 2026-09-01
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `ㅅㅡㅇ인` / 2026-09-01 (`승인`으로 해석)

## 배경과 목적

원격 DB를 직접 조회한 결과 실제 품목상세명은 `THROUGHT BOLT`가 아니라 `THROUGH BOLT`로 저장되어 있었다. 정확히 `THROUGH BOLT`인 4건은 유지하고, 뒤에 상세 구분이 붙은 10건에서 접두어만 제거한다.

## 범위

### 포함

- 원격 조회로 확인한 `public.item_details` 10개 행
- `THROUGH BOLT BOTTOM NUT` → `BOTTOM NUT`
- `THROUGH BOLT TOP NUT` → `TOP NUT`
- `THROUGH BOLT WASHER` → `WASHER`

### 제외

- 정확히 `THROUGH BOLT`인 4개 행
- 조회된 seq와 기존 이름이 일치하지 않는 행
- 과거 검사성적서와 측정 이력의 품목상세명 스냅샷
- schema, RLS, Storage와 애플리케이션 코드 변경

## 완료 조건

- [ ] 확인된 10개 행만 새 상세명으로 변경된다.
- [ ] 정확히 `THROUGH BOLT`인 4개 행은 유지된다.
- [ ] 원격 재조회에서 접두어가 붙은 상세명이 남지 않는다.
- [ ] 원격 migration 기록과 로컬 기록이 일치한다.

## 현재 구현 조사

- 관련 route/component: 품목관리 화면은 `public.item_details.item_detail_name`을 직접 조회한다.
- 관련 Supabase table/bucket: `public.item_details`; Storage 변경 없음
- 재사용할 기존 패턴: 데이터 migration, 감사 필드 update trigger
- 문서와 구현의 차이: 최초 migration은 `THROUGHT BOLT` 철자를 대상으로 해 실제 데이터 0건을 변경했다.

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
- migration과 rollback: `seq`, 기존 이름과 새 이름을 migration에 명시하고 정확히 10건이 변경되지 않으면 transaction을 실패시킨다. 롤백은 같은 10개 seq의 새 이름을 검증한 뒤 명시된 기존 이름으로 복원한다.

## 변경 계획

1. 조회된 10개 행의 명시적 매핑 migration을 작성한다.
2. 원격 dry run 후 적용한다.
3. 원격 SQL Editor에서 대상과 제외 행을 재조회한다.
4. 원격 migration 기록과 후속 dry run을 확인한다.

## 위험과 승인 사항

- migration 실행 전에 다른 사용자가 같은 10개 상세명을 변경하면 건수 검증으로 전체 적용이 중단된다.
- 과거 스냅샷은 이력 보존을 위해 변경하지 않는다.

## 검증 계획

- [ ] migration SQL과 명시적 매핑 검토
- [ ] 원격 dry run
- [ ] 원격 적용
- [ ] 대상·제외 행 재조회
- [ ] 후속 dry run 최신 상태 확인

## 결과

- 변경: 진행 중
- 검증: 진행 중
- 미실행: 진행 중
- 남은 위험/후속 작업: 진행 중
