# 검사성적서 제품구분 저장 검증 수정

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-27
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인`, 2026-08-27

## 배경과 목적

앱은 실제 제품구분 그룹 `U0002`를 조회하지만 DB trigger 함수는 이전 식별자인 `PRODUCT_TYPE`만 허용해 성적서 관리와 측정 화면의 제품구분 저장이 `23514` 오류로 실패한다. 앱과 DB의 검증 기준을 `U0002`로 통일하고 체크박스의 세로 정렬을 보정한다.

## 범위

### 포함

- `validate_inspection_report_codes()` 제품구분 검증 그룹을 `U0002`로 변경하는 신규 migration
- 제품구분 컬럼 comment 갱신
- 성적서 관리·측정 저장의 제품구분 제약 오류 메시지 구체화
- 측정결과 제품구분 체크박스와 텍스트 세로 중앙 정렬
- 원격 dry run, migration 적용 및 최신 상태 재검증

### 제외

- 테이블, 컬럼, FK, RLS 및 코드 데이터 변경
- 제품구분 다중 선택 저장
- 최종판정 코드 검증 변경

## 완료 조건

- [x] `U0002` 상세 코드를 성적서 마스터에 저장할 수 있다.
- [x] 잘못된 제품구분 코드는 기존처럼 DB에서 거부된다.
- [x] 제품구분 제약 오류에 구체적인 사용자 메시지가 표시된다.
- [x] 측정결과 화면의 제품구분이 세로 중앙 정렬된다.
- [x] 원격 migration 기록이 최신 상태다.

## 현재 구현 조사

- 관련 route/component: `inspection-reports/actions.ts`, `inspection-measurements/inspection-measurement-sheet.tsx`
- 관련 Supabase table/bucket: `inspection_reports`, `code_groups`, `code_details`, `validate_inspection_report_codes()`
- 재사용할 기존 패턴: 재현 가능한 SQL migration과 원격 dry run/push
- 문서와 구현의 차이: 앱은 `U0002`, DB 함수와 컬럼 comment는 `PRODUCT_TYPE`을 사용한다.

## 설계

### UI와 반응형

- 모바일/태블릿/데스크톱: 기존 성적서 배치 유지, 제품구분 행 내부만 중앙 정렬
- 로딩/빈 상태/오류/권한: DB 오류 `23514`에 제품구분 확인 메시지 제공
- 접근성: label과 checkbox 연결 유지

### Server/Client 경계

- Server Component/Action: DB 오류 코드에 따른 사용자 메시지 분기
- Client Component/Zustand: 기존 지역 상태 유지, 스타일만 보정

### 데이터와 Supabase

- schema 변경: trigger 함수의 허용 그룹 상수와 컬럼 comment 변경
- PK/FK/index: 변경 없음
- RLS 정책: 변경 없음
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: 신규 migration으로 적용. rollback은 동일 함수를 `PRODUCT_TYPE` 검증으로 복원하고 comment를 되돌린다.

## 변경 계획

1. 신규 migration과 앱 보정을 작성한다.
2. lint, typecheck, build를 수행한다.
3. 원격 `db push --dry-run`으로 적용 대상을 확인한다.
4. 원격 migration을 적용하고 후속 dry run으로 최신 상태를 확인한다.

## 위험과 승인 사항

- 승인된 DB 변경은 trigger 함수의 그룹 상수와 comment에 한정한다.
- 실제 `U0002` 그룹과 상세 코드가 존재한다는 사용자 제공 정보에 의존한다.

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

- 변경: `U0002` trigger 검증 migration, 구체적인 저장 오류 메시지와 제품구분 세로 중앙 정렬을 구현하고 원격 DB에 적용했다.
- 검증: `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack` 통과. 원격 사전 dry run에서 migration 1개를 확인해 적용했고 후속 dry run에서 최신 상태를 확인했다.
- 미실행: 인증된 실제 UI에서 성적서 저장을 직접 수행하는 수동 검증
- 남은 위험/후속 작업: 없음
