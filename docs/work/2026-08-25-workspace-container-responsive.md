# 작업영역 패널 기준 반응형 전환

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-25
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인` / 2026-08-25

## 배경과 목적

현재 업무 화면은 Tailwind viewport breakpoint를 사용하므로 2분할 패널을 좁혀도 브라우저 전체 폭이 넓으면 데스크톱 레이아웃을 유지한다. 각 패널의 실제 너비를 기준으로 검색 폼과 관리 화면이 재배치되도록 CSS Container Query를 적용한다.

## 범위

### 포함

- 업무 패널과 직접 URL 관리 화면에 이름이 있는 CSS size container 적용
- 검사성적서·품목·오차범위·코드관리의 검색 폼과 콘텐츠 레이아웃을 패널 너비 기준으로 전환
- 기존 `sm 640`, `md 768`, `lg 1024`, `xl 1280` 기준값 유지
- 공유 관리 컴포넌트의 목록·상세 2열 전환과 카드 여백을 container 기준으로 변경
- 분할 비율 드래그 중 패널 레이아웃이 즉시 재배치되는 동작 검증

### 제외

- 전체 앱의 모든 viewport breakpoint 일괄 변환
- viewport 전체에 표시되는 Dialog·AlertDialog의 반응형 기준 변경
- 모바일 분할 화면 추가
- breakpoint 수치 변경 또는 새 전역 breakpoint 도입
- DB 및 Supabase 변경

## 완료 조건

- [x] 분할 패널이 1280px 미만이면 관리 목록·상세가 한 열로 배치된다.
- [x] 패널이 1024px 미만이면 검색 폼이 3열 데스크톱 배치를 사용하지 않는다.
- [x] 패널이 768px 미만이면 검색 폼이 한 열로 배치된다.
- [x] 분할 경계선을 드래그하는 동안 별도 새로고침 없이 레이아웃이 전환된다.
- [x] 직접 URL로 진입한 단일 업무 화면도 기존 breakpoint 동작을 유지한다.
- [x] Dialog와 AlertDialog는 브라우저 viewport 기준 반응형을 유지한다.

## 현재 구현 조사

- 관련 route/component: `src/app/(app)/workspace-panels.tsx`, `src/app/(app)/workspace-shell.tsx`, `src/app/(app)/master/*/page.tsx`, 각 관리 컴포넌트
- 관련 Supabase table/bucket: 해당 없음
- 재사용할 기존 패턴: `src/lib/responsive.ts`와 `docs/design-system.md`의 640/768/1024/1280px 기준
- 문서와 구현의 차이: 기존 문서는 viewport 중심 반응형만 설명하며 분할 패널 기준은 정의하지 않는다. 이번 작업은 기존 수치를 유지하고 작업 문서에 적용 범위를 기록한다.

## 설계

### UI와 반응형

- 모바일: 기존 단일 패널과 세로 배치를 유지한다.
- 태블릿: 실제 업무 컨테이너가 768px 이상일 때 검색 폼 2열을 사용한다.
- 데스크톱: 실제 컨테이너가 1024px 이상이면 검색 폼 데스크톱 배치, 1280px 이상이면 관리 목록·상세 2열을 사용한다.
- 로딩/빈 상태/오류/권한: 데이터 상태와 권한 동작은 변경하지 않는다.
- 접근성: DOM 순서와 focus 순서를 바꾸지 않고 CSS 배치만 전환한다.

### Server/Client 경계

- Server Component/Action: 직접 URL page는 기존 서버 데이터 로딩을 유지하고 container class만 추가한다.
- Client Component/Zustand: 기존 패널 상태와 분할 비율은 변경하지 않고 CSS Container Query만 반응한다.

### 데이터와 Supabase

- schema 변경: 해당 없음
- PK/FK/index: 해당 없음
- RLS 정책: 해당 없음
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: 해당 없음. container class와 variant를 기존 viewport variant로 되돌리면 원복 가능하다.

## 변경 계획

1. 업무 패널과 직접 URL 관리 화면의 최상위 콘텐츠에 이름이 있는 size container를 지정한다.
2. workspace 검색 폼·제목·여백의 viewport variant를 동일 수치의 container variant로 바꾼다.
3. 품목·오차범위·코드관리 공유 컴포넌트의 카드 여백과 목록·상세 배치를 container variant로 바꾸되, Portal Dialog의 viewport variant는 유지한다.
4. 직접 URL 검색 폼도 동일 container 기준으로 변경해 단일 화면 호환을 유지한다.
5. lint, TypeScript, 프로덕션 빌드와 대표 container 폭을 검증한다.

## 위험과 승인 사항

- Container Query는 패널 내부 레이아웃에만 적용하며 Portal 기반 Dialog에는 적용하지 않는다.
- 동일한 breakpoint 수치를 사용하므로 기존 단일 화면의 전환 시점은 유지된다.
- 여러 관리 화면 파일의 반응형 class가 변경되는 Standard 작업이므로 이 제안에 대한 명시적 승인 후 구현한다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트
- [ ] 모바일 360px
- [ ] 태블릿 768px
- [ ] 데스크톱 1280px
- [x] 키보드와 접근성
- [ ] Supabase 허용/거부 정책 — 해당 없음
- [x] 프로덕션 빌드

## 결과

- 변경: 업무 패널과 직접 URL 화면에 `workspace` size container를 추가하고 검색 폼, 제목, 여백, 관리 목록·상세 레이아웃을 동일 수치의 Container Query로 전환했다. Portal Dialog의 viewport 반응형은 유지했다.
- 검증: `npm run lint`, `npx tsc --noEmit`, `git diff --check`, `npx next build --webpack` 통과. 빌드 CSS에서 이름 있는 640/768/1024/1280px `@container` 규칙 생성을 확인했다.
- 미실행: 로컬 개발 서버가 실행 중이지 않아 360px/768px/1280px 브라우저 수동 확인은 수행하지 못했다.
- 남은 위험/후속 작업: 실제 분할 드래그 중 각 관리 화면의 전환 시점과 AG Grid 가로 스크롤 사용성을 확인할 수 있다.
