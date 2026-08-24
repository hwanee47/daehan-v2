# 일반 화면 공통 header 적용

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-24
- 승인 상태: 승인
- 승인 응답/일시: 사용자가 "승인"으로 명시적으로 승인함 / 2026-08-24

## 배경과 목적

현재 상단 header가 홈 페이지에만 직접 구현되어 있어 프로필, 검사성적서와 코드관리 화면에서는 주요 메뉴를 사용할 수 없다. 로그인·회원가입을 제외한 일반 화면에 동일한 header를 유지하고 페이지별 중복 이동 요소를 정리한다.

## 범위

### 포함

- URL을 유지하는 App Router Route Group으로 일반 화면용 공통 layout 구성
- 홈에 있는 header와 인증 사용자 정보 조회를 공통 Server Component로 이동
- 홈, 프로필, 검사성적서, 코드관리에서 공통 header 유지
- 로그인·회원가입 화면에서는 공통 header 제외
- 프로필, 검사성적서, 코드관리 본문의 중복 `홈으로 돌아가기` 링크 제거
- 공통 layout 구조를 `docs/architecture.md`에 반영

### 제외

- header의 메뉴명, 권한 정책과 시각 디자인 변경
- 로그인·회원가입 본문의 `DAEHAN` 홈 링크 제거
- 인증 방식, Supabase schema, RLS와 데이터 query 계약 변경
- 새로운 메뉴나 모바일 drawer 도입

## 완료 조건

- [x] `/`, `/profile`, `/inspection-reports`, `/reference-information/codes`에서 동일한 header가 표시된다.
- [x] `/login`, `/signup`에는 공통 header가 표시되지 않는다.
- [x] 비로그인 상태에서는 header에 업무 메뉴가 없고 로고와 로그인 링크만 표시된다.
- [x] 로그인 상태에서는 검사성적서와 권한에 맞는 기준정보 메뉴, 프로필 링크가 표시된다.
- [x] 일반 화면 본문의 중복 `홈으로 돌아가기` 링크가 제거된다.
- [x] 기존 URL과 인증 redirect가 유지된다.
- [x] lint, typecheck와 프로덕션 build가 통과한다.

## 현재 구현 조사

- 관련 route/component: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/profile/page.tsx`, `src/app/inspection-reports/page.tsx`, `src/app/reference-information/codes/page.tsx`, `src/app/reference-information-menu.tsx`
- 관련 Supabase table/bucket: `auth.users` 세션과 `public.users`의 `name`, `role`을 기존과 동일하게 읽는다. schema 변경은 없다.
- 재사용할 기존 패턴: 홈 페이지의 header, `Container`, `ReferenceInformationMenu`
- 문서와 구현의 차이: `src/components/layout`이 공통 레이아웃 위치로 정의되어 있지만 header는 홈 페이지 안에만 존재한다.

## 설계

### UI와 반응형

- 모바일: 현재 header의 로고 축약, 숨김 텍스트와 44px 이상 메뉴 높이를 유지한다.
- 태블릿: 현재 중앙 주요 메뉴와 우측 사용자 메뉴 배치를 유지한다.
- 데스크톱: 현재 88px header 높이와 full-width Container를 유지한다.
- 로딩/빈 상태/오류/권한: 사용자 profile 조회 실패 시 관리자 메뉴는 숨기고 인증된 사용자의 이름 fallback은 기존 로직을 유지한다.
- 접근성: header, 주요 메뉴와 사용자 메뉴의 aria-label, 로고와 프로필 링크의 접근성 이름을 유지한다.

### Server/Client 경계

- Server Component/Action: 공통 app layout/header에서 Supabase 서버 클라이언트로 현재 사용자와 profile을 조회한다. 기존 page와 Server Action 경계는 유지한다.
- Client Component/Zustand: dropdown인 `ReferenceInformationMenu`만 기존 Client Component로 유지하며 Zustand는 사용하지 않는다.

### 데이터와 Supabase

- schema 변경: 해당 없음
- PK/FK/index: 해당 없음
- RLS 정책: 해당 없음. 기존 사용자의 자기 profile 조회 정책을 사용한다.
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: 해당 없음. Route Group 이동과 공통 layout/header 변경을 되돌리면 된다.

## 변경 계획

1. `src/components/layout/app-header.tsx`에 현재 header UI와 사용자 profile 조회를 이동한다.
2. URL에 영향을 주지 않는 `src/app/(app)/layout.tsx`를 만들고 공통 header와 children을 배치한다.
3. 홈, 프로필, 검사성적서와 기준정보 route를 `(app)` 그룹 아래로 이동한다.
4. 홈 페이지에서 header와 중복 사용자 조회를 제거한다.
5. 프로필, 검사성적서와 코드관리에서 중복 `홈으로 돌아가기` 링크와 그에 따른 상단 여백을 정리한다.
6. `docs/architecture.md`에 일반 화면과 인증 화면의 layout 분리를 기록한다.
7. lint, typecheck, build와 route 구조를 검증한다.

## 위험과 승인 사항

- 파일 경로는 바뀌지만 Route Group은 URL에 포함되지 않으므로 공개 URL은 그대로 유지된다.
- 공통 layout이 profile을 조회하므로 로그인 사용자의 일반 화면 요청에서 기존 홈과 같은 profile query가 수행된다.
- 로그인·회원가입 본문의 브랜드 홈 링크는 header가 없는 인증 화면의 이탈 경로로 판단해 유지한다.
- 본문의 `홈으로 돌아가기` 링크 세 개는 공통 header의 로고와 메뉴로 대체되므로 제거한다.
- 위 아키텍처와 UI 정리 범위는 사용자 승인 후 구현한다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트 — 별도 테스트 유무 확인
- [x] 모바일 360px — 기존 반응형 header 클래스를 공통 컴포넌트로 그대로 이동함
- [x] 태블릿 768px — 기존 반응형 header 클래스를 공통 컴포넌트로 그대로 이동함
- [x] 데스크톱 1280px — 기존 반응형 header 클래스를 공통 컴포넌트로 그대로 이동함
- [x] 키보드와 접근성 — header/nav aria-label과 링크 focus 스타일 보존 확인
- [x] Supabase 허용/거부 정책 — schema/RLS 변경 없음 확인
- [x] 프로덕션 빌드

## 결과

- 변경: 일반 화면을 `(app)` Route Group으로 묶고 공통 `AppHeader` Server Component를 적용했다. 로그인·회원가입은 공통 header에서 제외했으며 프로필·검사성적서·코드관리의 중복 홈 링크를 제거했다. 아키텍처 문서에 layout 구성을 기록했다.
- 검증: `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack`, `git diff --check` 통과. 로컬 HTTP 응답에서 `/`, `/inspection-reports`의 header 1개와 `/login`, `/signup`의 header 0개를 확인했다.
- 미실행: 별도 자동화 UI 테스트가 없어 실행하지 않았다. 인증 사용자·관리자별 메뉴는 기존 조건부 렌더링 로직을 그대로 이동하고 코드로 검토했다.
- 남은 위험/후속 작업: 실제 로그인 세션에서 일반 사용자와 관리자 메뉴를 각각 수동으로 최종 확인할 수 있다.
