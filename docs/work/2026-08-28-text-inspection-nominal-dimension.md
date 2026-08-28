# 검사성적서 기준치수 텍스트 저장

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-28
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인` / 2026-08-28

## 배경과 목적

검사항목 기준치수에 숫자뿐 아니라 `나사부`, `경도`, `Θ37` 같은 원문을 저장하고 과거 측정 이력에서도 동일하게 확인할 수 있게 한다.

## 범위

### 포함

- 성적서 검사항목과 측정 이력 검사항목의 기준치수 컬럼을 text로 변경
- 기존 숫자 데이터 보존
- 기준치수 비어 있음과 100자 초과만 차단
- 숫자가 포함된 기준치수의 오차범위 자동 조회 유지
- 저장·수정·조회 타입과 비교 로직 변경

### 제외

- 공차 min/max의 숫자 제약 변경
- U0003 자동 등록 정책 변경

## 완료 조건

- [x] 숫자가 없는 기준치수를 저장할 수 있다.
- [x] 숫자 기준치수의 오차범위 자동 조회가 유지된다.
- [x] 측정 이력에 기준치수 원문이 저장된다.
- [x] 기존 숫자 데이터가 읽기 쉬운 문자열로 변환된다.

## 현재 구현 조사

- 관련 route/component: `inspection-reports`, `inspection-measurements`, `inspection-measurement-history`
- 관련 Supabase table/bucket: `inspection_report_items`, `inspection_measurement_run_items`
- 재사용할 기존 패턴: 성적서 저장 Action, 측정 이력 snapshot 함수
- 문서와 구현의 차이: 기준치수의 업무 의미는 문자열을 포함하지만 기존 DB는 numeric이다.

## 설계

### UI와 반응형

- 모바일/태블릿/데스크톱: 기존 배치 유지
- 로딩/빈 상태/오류/권한: 빈 기준치수와 100자 초과를 행 번호와 함께 안내
- 접근성: 기존 입력 label과 자동완성 키보드 동작 유지

### Server/Client 경계

- Server Component/Action: 기준치수 원문 검증 및 저장
- Client Component/Zustand: 기존 지역 상태와 숫자 추출 기반 자동 공차 조회 유지

### 데이터와 Supabase

- schema 변경: 두 `nominal_dimension` 컬럼을 `text`로 변환하고 비어 있지 않은 100자 이하 제약 추가
- PK/FK/index: 변경 없음
- RLS 정책: 변경 없음
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: 기존 값은 `trim_scale(... )::text`로 변환. rollback은 비숫자 값을 정리한 뒤 numeric으로 역변환해야 한다.

## 변경 계획

1. 승인된 migration과 작업 문서를 작성한다.
2. 저장 검증·비교·insert 및 TypeScript 타입을 문자열 기준으로 변경한다.
3. lint, typecheck, build와 원격 dry run·적용을 검증한다.

## 위험과 승인 사항

- 비숫자 값 저장 후 numeric rollback에는 데이터 정리가 필요하며 사용자가 승인했다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트
- [ ] 모바일 360px
- [ ] 태블릿 768px
- [ ] 데스크톱 1280px
- [ ] 키보드와 접근성
- [x] Supabase 허용/거부 정책
- [x] 프로덕션 빌드

## 결과

- 변경: 성적서와 측정 이력 기준치수를 text로 전환하고 저장·조회 타입과 검증을 원문 기준으로 변경했다.
- 검증: lint, TypeScript, 프로덕션 build, 원격 migration 적용 및 후속 dry run 최신 상태를 확인했다.
- 미실행: 로그인된 브라우저에서 실제 비숫자 기준치수 저장과 인쇄 UI 확인.
- 남은 위험/후속 작업: numeric으로 rollback하려면 비숫자 데이터 정리가 필요하다.
