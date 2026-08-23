# 코드 관리 화면 개발

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-21
- 승인 상태: 승인
- 승인 응답/일시: 사용자 "승인" / 2026-08-21

## 배경과 목적

관리자가 `code_groups`와 `code_details`를 애플리케이션에서 조회하고 추가·수정·활성 전환·삭제할 수 있는 기준정보 화면을 제공한다.

## 범위

### 포함

- 관리자 전용 `/reference-information/codes` route 생성
- 홈 `기준정보 > 코드관리` 메뉴를 실제 링크로 활성화
- 코드그룹 목록과 선택한 그룹의 상세코드를 AG Grid로 표시
- 그룹 및 상세 코드 추가·수정 form
- 활성/비활성 전환과 삭제 확인 흐름
- Server Action에서 입력값·로그인·관리자 권한 재검증
- 작업 결과 메시지, 로딩, 빈 상태와 오류 상태 처리
- mutation 후 해당 route revalidation

### 제외

- DB schema, RLS 또는 migration 변경
- 코드 일괄 업로드·다운로드
- drag-and-drop 정렬과 자동 순서 재배치
- 변경 이력 화면과 감사 로그 상세 조회
- 일반 사용자의 코드 관리 또는 읽기 전용 관리 화면

## 완료 조건

- [x] 관리자만 코드 관리 화면에 진입할 수 있다.
- [x] 코드그룹을 조회·추가·수정·활성 전환·삭제할 수 있다.
- [x] 선택한 그룹의 상세코드를 조회·추가·수정·활성 전환·삭제할 수 있다.
- [x] 중복 코드, 공백, 음수 정렬 순서와 FK 삭제 제한 오류를 이해 가능한 메시지로 표시한다.
- [x] 모바일·태블릿·데스크톱에서 두 목록과 form을 사용할 수 있다.

## 현재 구현 조사

- 관련 route/component: `src/app/page.tsx`, `src/app/reference-information-menu.tsx`, `src/app/inspection-reports/inspection-reports-grid.tsx`
- 관련 Supabase table/bucket: `public.code_groups`, `public.code_details`, 관리자 판별용 `public.users`; Storage는 해당 없음.
- 재사용할 기존 패턴: Server Component의 `supabase.auth.getUser()`, `public.users.role` 확인, Server Action form 검증, AG Grid Community 테마와 반응형 가로 스크롤을 재사용한다.
- 문서와 구현의 차이: 기준정보 메뉴의 코드관리 항목이 현재 disabled 상태이며 route가 없다.

## 설계

### UI와 반응형

- 모바일: 그룹 목록과 상세 목록을 세로 배치하고 각 grid는 내부 가로 스크롤을 제공한다. 추가·수정 form은 화면 폭에 맞는 modal dialog로 연다.
- 태블릿: 그룹과 상세를 세로 배치하되 넓은 form과 grid를 사용한다.
- 데스크톱: 그룹 목록을 왼쪽, 선택 그룹의 상세 목록을 오른쪽에 두는 master-detail 2열 구조를 사용한다.
- 로딩/빈 상태/오류/권한: action pending 버튼 비활성화, 그룹 없음·상세 없음 안내, 초기 query 오류 안내, 비로그인 `/login` redirect, 비관리자 홈 redirect를 제공한다.
- 접근성: dialog focus 이동과 Escape 닫기, label 연결, 오류 `aria-live`, grid 키보드 탐색, 삭제 전 명시적 확인을 제공한다.

### Server/Client 경계

- Server Component/Action: page에서 사용자·관리자 권한과 초기 데이터를 조회한다. actions에서 모든 mutation 전 사용자·관리자 권한과 입력값을 다시 검증하고 `revalidatePath`를 호출한다.
- Client Component/Zustand: grid 선택, modal 열림, 선택 그룹과 임시 form 상태만 지역 React 상태로 관리한다. Zustand는 사용하지 않는다.

### 데이터와 Supabase

- schema 변경: 해당 없음.
- PK/FK/index: 기존 `code_groups`, `code_details` schema와 index를 그대로 사용한다.
- RLS 정책: 변경 없음. 기존 관리자 쓰기 정책에 더해 Server Action에서도 `public.users.role = 'admin'`을 확인한다.
- Storage bucket/path/policy: 해당 없음.
- migration과 rollback: 해당 없음. 롤백은 신규 route/component/actions와 메뉴 링크를 제거한다.

## 변경 계획

1. Next.js 16의 Server Action, form, redirect, revalidation 가이드를 확인한다.
2. 관리자 전용 page에서 그룹과 상세 코드 초기 데이터를 조회한다.
3. 그룹·상세 mutation Server Action과 공통 입력 검증/오류 매핑을 구현한다.
4. AG Grid master-detail 화면, 선택 상태, form dialog와 확인 dialog를 구현한다.
5. 기준정보 메뉴의 코드관리 항목을 신규 route 링크로 활성화한다.
6. lint, typecheck, production build와 관리자 브라우저 동작을 검증한다.

## 위험과 승인 사항

- 삭제는 실제 DB 행을 제거한다. 상세 코드가 있는 그룹 삭제는 FK `restrict`로 거부하고 안내한다.
- 사용 중인 코드는 삭제보다 비활성화를 권장하지만, 승인 범위에는 명시적 확인 후 물리 삭제 기능도 포함한다.
- 실제 데이터 mutation은 원격 Supabase에 즉시 반영된다. 브라우저 검증에서는 테스트 데이터 생성·삭제를 임의로 수행하지 않고, 별도 허용이 없으면 읽기와 UI 상태까지만 확인한다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트 — 프로젝트에 관련 테스트 환경이 없어 미실행
- [ ] 모바일 360px — 관리자 테스트 세션이 없어 실제 화면 미검증
- [ ] 태블릿 768px — 관리자 테스트 세션이 없어 실제 화면 미검증
- [ ] 데스크톱 1280px — 관리자 테스트 세션이 없어 실제 화면 미검증
- [x] 키보드와 접근성 — Base UI modal/alert dialog, label, aria-live와 AG Grid 키보드 semantics 적용을 정적 확인
- [x] Supabase 허용/거부 정책 — page와 모든 Server Action의 관리자 재검증, 기존 RLS 유지 확인
- [x] 프로덕션 빌드

## 결과

- 변경: 관리자 전용 코드관리 route, 그룹·상세 초기 query, CRUD Server Action, AG Grid master-detail UI, 편집 dialog, 삭제 확인 dialog, 활성 전환 및 기준정보 메뉴 링크를 추가했다.
- 검증: `git diff --check`, `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack`을 통과했다. 로그아웃 브라우저에서 코드관리 route가 `/login`으로 redirect되고 코드관리 UI가 노출되지 않으며 브라우저 오류가 없음을 확인했다.
- 미실행: 테스트 환경과 관리자 테스트 세션이 없어 CRUD 원격 mutation, 관리자 화면의 360px·768px·1280px 실제 브라우저 검증은 수행하지 않았다.
- 남은 위험/후속 작업: 최초 코드 데이터는 비어 있다. 관리자 계정으로 실제 저장·중복·FK 삭제 제한 흐름을 확인하는 통합 테스트가 후속으로 필요하다.
