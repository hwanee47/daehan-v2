# 품목상세 재질 SCM440H 변경

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-09-02
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인`, 2026-09-02

## 배경과 목적

품목상세에 `SCM440`으로 저장된 재질을 현재 사용하는 명칭인 `SCM440H`로 일괄 정정한다.

## 범위

### 포함

- `public.item_details.material = 'SCM440'`인 행을 `SCM440H`로 변경
- 적용 전 dry run과 적용 후 원격 migration 상태 검증

### 제외

- 기존 검사성적서 `inspection_reports`의 재질 스냅샷 변경
- 기존 측정이력 `inspection_measurement_runs`의 재질 스냅샷 변경
- 테이블 구조, RLS, 애플리케이션 코드 변경

## 완료 조건

- [x] 원격 `item_details`에서 정확히 `SCM440`인 재질이 `SCM440H`로 변경된다.
- [x] 기존 성적서 및 측정이력의 재질 스냅샷은 유지된다.
- [x] 원격 migration 기록과 후속 dry run이 최신 상태다.

## 현재 구현 조사

- 관련 route/component: `src/app/(app)/master/items`
- 관련 Supabase table/bucket: `public.item_details`
- 재사용할 기존 패턴: 재현 가능한 SQL data migration과 원격 dry run/push
- 문서와 구현의 차이: 해당 없음

## 설계

### UI와 반응형

- 해당 없음. 데이터 값만 변경한다.

### Server/Client 경계

- 해당 없음. 애플리케이션 코드는 변경하지 않는다.

### 데이터와 Supabase

- schema 변경: 없음
- PK/FK/index: 변경 없음
- RLS 정책: 변경 없음
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: 정확히 `SCM440`인 행만 변경한다. 롤백이 필요하면 적용 당시 영향 행을 기준으로 `SCM440H`를 `SCM440`으로 복원하는 후속 migration을 작성한다.

## 변경 계획

1. 조건이 명확한 data migration을 작성한다.
2. 연결된 원격 프로젝트에서 dry run을 실행한다.
3. migration을 적용한다.
4. 후속 dry run과 migration 기록을 확인한다.

## 위험과 승인 사항

- 기존 성적서와 측정이력은 시점 스냅샷이므로 변경하지 않는다.
- 정확히 `SCM440`인 값만 대상으로 하며 공백, 접두·접미 문자가 있는 다른 값은 변경하지 않는다.
- 데이터 migration 범위는 2026-09-02 사용자 승인 완료.

## 검증 계획

- [x] migration SQL 검토
- [x] 원격 dry run
- [x] 원격 migration 적용
- [x] 후속 dry run 및 migration 기록 확인

## 결과

- 변경: `20260902000000_update_item_detail_material_scm440h.sql`을 원격 프로젝트에 적용했다.
- 검증: 최초 dry run에서 해당 migration 1건만 적용 대상으로 확인했고, 적용 후 원격 migration 기록 일치 및 후속 dry run `up to date`를 확인했다.
- 미실행: 애플리케이션 코드 변경이 없어 ESLint와 TypeScript 검사는 생략했다.
- 남은 위험/후속 작업: 기존 검사성적서와 측정이력의 `SCM440` 스냅샷은 의도대로 유지된다.
