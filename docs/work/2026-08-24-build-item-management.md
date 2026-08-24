# 품목관리 화면 개발

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-24
- 승인 상태: 승인
- 승인 응답/일시: 사용자 "승인" / 2026-08-24

## 배경과 목적

이미 생성된 `items`, `item_details` 테이블을 관리자가 애플리케이션에서 조회하고 등록·수정·삭제할 수 있도록 품목관리 화면을 제공한다. 품목과 그 품목에 속한 상세 정보를 한 화면에서 연결해 관리할 수 있게 한다.

## 범위

### 포함

- 관리자 전용 `/master/items` route 생성
- 기준정보 메뉴의 `품목관리` 항목을 실제 링크로 활성화
- 품목 목록과 선택한 품목의 품목상세 목록을 AG Grid로 표시
- 품목과 품목상세 등록·수정 dialog 및 삭제 확인 흐름
- Server Action에서 입력값, 로그인 상태와 관리자 권한 재검증
- 중복 코드, FK 삭제 제한, 로딩, 빈 상태와 오류 메시지 처리
- mutation 후 `/master/items` revalidation

### 제외

- DB schema, RLS, migration 또는 Storage 변경
- 품목·품목상세 활성/비활성 기능(현재 schema에 상태 컬럼이 없음)
- 일괄 업로드·다운로드와 검색·페이지네이션
- 소재 코드 표준화 또는 별도 소재 테이블 도입
- 품목 이미지와 첨부파일 관리
- 초기 품목 데이터 입력

## 완료 조건

- [x] 관리자만 품목관리 화면에 진입할 수 있다.
- [x] 품목을 조회·등록·수정·삭제할 수 있다.
- [x] 선택한 품목의 품목상세를 조회·등록·수정·삭제할 수 있다.
- [x] 품목코드와 품목별 상세코드의 중복, 필수값 누락 및 FK 삭제 제한을 이해 가능한 메시지로 표시한다.
- [x] 모바일·태블릿·데스크톱에서 목록과 form을 사용할 수 있다.
- [x] 기준정보 메뉴에서 품목관리 화면으로 이동할 수 있다.

## 현재 구현 조사

- 관련 route/component: `src/app/(app)/master/codes/*`, `src/app/reference-information-menu.tsx`, `src/components/ui/button.tsx`
- 관련 Supabase table/bucket: `public.items`, `public.item_details`, 관리자 판별용 `public.users`; Storage는 해당 없음.
- 재사용할 기존 패턴: 코드관리의 Server Component 관리자 gate, Server Action 검증, AG Grid master-detail UI, Base UI dialog·alert dialog, 지역 React 상태와 `revalidatePath`를 재사용한다.
- 문서와 구현의 차이: 품목 테이블과 관리자 RLS는 원격에 적용되었으나 품목관리 route가 없고 기준정보 메뉴의 품목관리 항목은 비활성 상태다.

## 설계

### UI와 반응형

- 모바일: 품목 목록과 상세 목록을 세로 배치하고 각 grid에 가로 스크롤을 제공한다. 등록·수정 form은 화면 폭에 맞는 dialog로 연다.
- 태블릿: 두 목록을 세로 배치하되 넓어진 grid와 form을 사용한다.
- 데스크톱: 품목 목록을 왼쪽, 선택한 품목의 상세 목록을 오른쪽에 둔 master-detail 2열 구조를 사용한다.
- 로딩/빈 상태/오류/권한: action pending 상태에서 버튼을 비활성화하고, 품목 없음·상세 없음·초기 query 실패 안내를 제공한다. 비로그인은 `/login`, 비관리자는 `/`로 redirect한다.
- 접근성: form label과 오류 연결, dialog focus 이동·Escape 닫기·focus 복귀, `aria-live` 결과 안내, AG Grid 키보드 탐색과 삭제 전 확인을 제공한다.

### Server/Client 경계

- Server Component/Action: page에서 인증·관리자 권한과 초기 품목 데이터를 조회한다. actions에서 mutation마다 입력값과 관리자 권한을 다시 검증하고 성공 후 route를 revalidate한다.
- Client Component/Zustand: grid 선택, dialog 열림과 임시 form 상태만 지역 React 상태로 관리한다. Zustand는 사용하지 않는다.

### 데이터와 Supabase

- schema 변경: 해당 없음. 기존 `items`, `item_details`를 그대로 사용한다.
- PK/FK/index: 기존 identity `seq` PK, `item_details.item_seq → items.seq on delete restrict`, `items.item_code` unique, `(item_seq, item_detail_code)` unique와 기존 인덱스를 사용한다.
- RLS 정책: 변경 없음. authenticated 조회와 admin 변경 정책을 유지하고 Server Action에서도 `public.users.role = 'admin'`을 확인한다.
- Storage bucket/path/policy: 해당 없음.
- migration과 rollback: 해당 없음. 롤백은 신규 route 파일을 제거하고 품목관리 메뉴를 다시 비활성화한다.

## 변경 계획

1. Next.js 16의 Server Actions, form, redirect와 revalidation 관련 로컬 가이드를 확인한다.
2. 관리자 전용 page에서 품목과 품목상세 초기 데이터를 조회하고 초기 오류를 처리한다.
3. 품목·품목상세 등록·수정·삭제 Server Action과 입력 검증 및 DB 오류 매핑을 구현한다.
4. 타입과 AG Grid 기반 master-detail UI, 편집 dialog 및 삭제 확인 dialog를 구현한다.
5. 기준정보 메뉴의 품목관리 항목을 `/master/items` 링크로 활성화한다.
6. 정적 검사, 타입 검사, 프로덕션 빌드와 가능한 viewport·접근성 동작을 검증한다.

## 위험과 승인 사항

- 삭제는 원격 DB의 실제 행을 물리적으로 삭제하며 되돌릴 수 없다. 상세가 있는 품목 삭제는 기존 FK `restrict`로 거부하고 상세를 먼저 정리하도록 안내한다.
- 현재 schema에는 `is_active`가 없으므로 코드관리와 달리 비활성화 기능을 제공하지 않는다. 소프트 삭제나 사용 상태가 필요하면 별도 DB 변경 승인 작업이 필요하다.
- `material`은 자유 입력 text로 유지하며 이번 범위에서 표준화하지 않는다.
- 실제 CRUD 검증은 원격 데이터에 영향을 주므로 사용자 데이터 생성·삭제 없이 정적 검증과 인증 gate 확인을 우선한다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트 — 프로젝트에 관련 테스트 환경이 없어 미실행
- [ ] 모바일 360px — 관리자 테스트 세션이 없어 실제 화면 미검증
- [ ] 태블릿 768px — 관리자 테스트 세션이 없어 실제 화면 미검증
- [ ] 데스크톱 1280px — 관리자 테스트 세션이 없어 실제 화면 미검증
- [x] 키보드와 접근성 — Base UI dialog, label·오류 연결, aria-live와 AG Grid 키보드 semantics 적용을 정적 확인
- [x] Supabase 허용/거부 정책 — 기존 RLS와 page 및 모든 Server Action의 관리자 재검증을 정적 확인
- [x] 프로덕션 빌드

## 결과

- 변경: 관리자 전용 `/master/items` route, 품목·품목상세 초기 query, CRUD Server Action, AG Grid master-detail UI, 편집·삭제 dialog와 기준정보 메뉴 링크를 추가했다.
- 검증: `git diff --check`, `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack`을 통과했다. 빌드 결과에 `/master/items` 동적 route가 포함됐다.
- 미실행: 테스트 환경과 관리자 테스트 세션이 없어 원격 CRUD mutation 및 360px·768px·1280px 실제 브라우저 검증은 수행하지 않았다.
- 남은 위험/후속 작업: 실제 관리자 계정으로 저장·중복·FK 삭제 제한 흐름을 확인하는 통합 검증이 필요하다. 빌드 중 현재 Node.js 20 이하 지원 중단 예정이라는 Supabase 경고가 표시되어 향후 Node.js 22 이상 전환을 검토해야 한다.
