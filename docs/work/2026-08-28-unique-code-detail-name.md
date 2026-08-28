# 상세 코드명 중복 방지

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-28
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인` / 2026-08-28

## 배경과 목적

같은 코드그룹에 동일한 상세 코드명이 중복 저장될 수 있다. 애플리케이션 검사뿐 아니라 DB unique index로 동시 저장까지 차단하고 사용자가 이해할 수 있는 오류를 제공한다.

## 범위

### 포함

- 같은 코드그룹에서 앞뒤 공백과 영문 대소문자를 무시한 코드명 중복 방지
- 등록 및 수정 모두 DB 수준에서 차단
- 중복 코드 또는 코드명 오류 메시지 개선
- 재현 가능한 Supabase migration 작성 및 원격 dry run·적용 시도

### 제외

- 서로 다른 코드그룹 사이의 동일 코드명 제한
- 기존 중복 데이터 자동 수정·삭제
- RLS 정책 변경

## 완료 조건

- [x] 같은 그룹의 동일 코드명 저장이 거부된다.
- [x] 앞뒤 공백 또는 영문 대소문자만 다른 코드명도 거부된다.
- [x] 다른 그룹에서는 동일 코드명을 저장할 수 있다.
- [x] 중복 시 코드 또는 코드명이 이미 사용 중이라는 메시지가 표시된다.
- [x] 기존 중복이 있으면 migration이 데이터 변경 없이 실패한다.

## 현재 구현 조사

- 관련 route/component: `src/app/(app)/master/codes/actions.ts`
- 관련 Supabase table/bucket: `public.code_details`
- 재사용할 기존 패턴: 기존 `(code_group_seq, code)` unique 제약과 PostgreSQL `23505` 오류 매핑
- 문서와 구현의 차이: 현재 `code_name`에는 빈 문자열 check만 있고 중복 제약이 없다.

## 설계

### UI와 반응형

- 모바일: 기존 Dialog 오류 영역 사용
- 태블릿: 기존 UI 유지
- 데스크톱: 기존 UI 유지
- 로딩/빈 상태/오류/권한: PostgreSQL `23505`를 사용자용 중복 메시지로 변환
- 접근성: 기존 `ActionMessage`의 alert/status 동작 유지

### Server/Client 경계

- Server Component/Action: 저장 Action에서 중복 오류 메시지를 반환한다.
- Client Component/Zustand: 변경 없음

### 데이터와 Supabase

- schema 변경: `(code_group_seq, lower(btrim(code_name)))` unique index 추가
- PK/FK/index: `code_details_group_code_name_unique` functional unique index
- RLS 정책: 변경 없음
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: migration으로 index 생성. rollback은 `drop index if exists public.code_details_group_code_name_unique`.

## 변경 계획

1. 코드그룹·정규화 코드명 unique index migration을 작성한다.
2. 상세 코드 저장의 unique 위반 메시지를 코드와 코드명 모두 설명하도록 수정한다.
3. lint, typecheck, build와 migration dry run을 수행한다.
4. 기존 중복이 없으면 원격 프로젝트에 migration을 적용하고 최신 상태를 확인한다.

## 위험과 승인 사항

- 기존에 같은 그룹 안에 공백·대소문자만 다른 중복 코드명이 있으면 migration은 실패하며 자동 정리하지 않는다.
- unique index는 exact 원문이 아니라 `lower(btrim(code_name))` 값을 기준으로 한다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트
- [ ] 모바일 360px (UI 구조 변경 없음)
- [ ] 태블릿 768px (UI 구조 변경 없음)
- [ ] 데스크톱 1280px (UI 구조 변경 없음)
- [ ] 키보드와 접근성 (기존 UI 유지)
- [x] Supabase 허용/거부 정책
- [x] 프로덕션 빌드

## 결과

- 변경: `(code_group_seq, lower(btrim(code_name)))` unique index를 추가하고 상세 코드 저장의 `23505` 오류를 코드 또는 코드명 중복 안내로 변경했다. 원격 `daehan` 프로젝트에 migration을 적용했다.
- 검증: `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack`, `git diff --check` 통과. 적용 전 dry run에서 migration 1건을 확인했고 적용 후 dry run에서 원격 DB 최신 상태를 확인했다.
- 미실행: 실제 운영 데이터에 시험 행을 삽입하는 중복 허용·거부 테스트는 불필요한 데이터 변경을 피하기 위해 수행하지 않았다.
- 남은 위험/후속 작업: 없음. rollback이 필요하면 `drop index if exists public.code_details_group_code_name_unique`를 별도 승인 후 실행한다.
