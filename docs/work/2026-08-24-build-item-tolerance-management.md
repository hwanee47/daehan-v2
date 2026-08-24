# 오차범위관리 화면 개발

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-24
- 승인 상태: 승인
- 승인 응답/일시: 사용자가 2026-08-24에 "승인"으로 응답함.

## 배경과 목적

관리자가 품목을 선택하고 해당 품목에 적용되는 기준 치수 구간과 상한·하한 편차를 조회·등록·수정·삭제할 수 있는 관리 화면을 제공한다. 이미 생성된 `public.item_tolerance_ranges`의 구간·편차 제약을 애플리케이션 입력 검증과 이해하기 쉬운 오류 메시지로 연결한다.

## 범위

### 포함

- 관리자 전용 `/master/tolerance-ranges` route 생성
- 품목 목록과 품목별 오차범위 초기 조회
- 선택한 품목의 오차범위 목록 표시
- 오차범위 등록·수정 dialog와 삭제 확인 dialog
- Server Action의 인증·관리자 권한·입력값 재검증
- mutation 후 `/master/tolerance-ranges` revalidation
- 기준정보 메뉴의 `오차범위관리` 링크 활성화
- 품목 삭제가 FK로 거부될 때 품목상세 또는 오차범위를 안내하도록 기존 오류 문구 보완
- 모바일·태블릿·데스크톱 반응형과 키보드 접근성 검증

### 제외

- DB schema, migration, RLS 또는 기존 데이터 변경
- 초기 오차범위 데이터 자동 입력
- 품목 자체의 등록·수정·삭제 기능 중복 구현
- 검색, 페이지네이션, CSV/Excel 가져오기·내보내기
- 사용자별 별도 권한 체계

## 완료 조건

- [x] 관리자가 기준정보 메뉴에서 오차범위관리 화면으로 이동할 수 있다.
- [x] 품목을 선택하면 해당 품목의 오차범위만 표시된다.
- [x] 하한·상한 치수와 상한·하한 편차를 등록·수정·삭제할 수 있다.
- [x] 양수·0·음수 편차를 입력하고 표시할 수 있다.
- [x] 잘못된 치수 순서, 편차 순서, 중복 구간을 사용자 친화적인 메시지로 안내한다.
- [x] 비관리자는 화면과 모든 mutation에 접근할 수 없다.
- [x] 로딩 실패, 품목 없음, 선택 없음, 오차범위 없음 상태가 처리된다.
- [ ] 모바일·태블릿·데스크톱과 키보드 흐름을 확인한다. 관리자 브라우저 세션이 없어 미실행했다.

## 현재 구현 조사

- 관련 route/component: `/master/items`, `/master/codes`, `src/app/reference-information-menu.tsx`.
- 관련 Supabase table/bucket: `public.items`, `public.item_tolerance_ranges`, 관리자 판별용 `public.users`; Storage는 해당 없음.
- 재사용할 기존 패턴: 관리자 Server Component redirect, 서버 Supabase client, `useActionState` form, Base UI dialog/alert dialog, AG Grid, `revalidatePath`, Server Action별 인증·권한 확인.
- 문서와 구현의 차이: 없음. 오차범위 메뉴는 현재 비활성 상태다.

## 설계

### UI와 반응형

- 모바일: 품목 영역과 오차범위 영역을 세로 배치하고 각 AG Grid는 최소 폭과 가로 스크롤을 제공한다. Dialog 입력은 한 열로 표시한다.
- 태블릿: 세로 배치를 유지하되 Dialog에서 관련 입력을 두 열로 구성할 수 있다.
- 데스크톱: 왼쪽 품목 선택 목록과 오른쪽 오차범위 관리 목록을 2열로 표시한다.
- 목록 컬럼: 품목은 품목코드·품목명·모델명, 오차범위는 하한 초과·상한 이하·상한 편차·하한 편차·비고를 표시한다. 양수 편차는 `+` 부호를 붙여 표시한다.
- 입력: `nominal_min`, `nominal_max`, `upper_deviation`, `lower_deviation`은 `type="number"`, `step="0.0001"`로 제공한다. 입력 계열은 `rounded-sm`을 적용한다.
- 로딩/빈 상태/오류/권한: 페이지 query 오류 alert, 품목 없음, 품목 미선택, 오차범위 없음 상태를 구분한다. 비관리자는 `/`로 이동한다.
- 접근성: 각 입력에 label과 필드 오류를 연결하고 dialog focus·Escape·복귀 동작을 기존 primitive로 유지한다. 상태 메시지는 `aria-live`로 전달한다.

### Server/Client 경계

- Server Component/Action: page에서 인증·관리자 확인과 `items`, `item_tolerance_ranges`를 조회한다. Server Action에서 모든 FormData를 재검증하고 insert/update/delete 후 해당 route를 revalidate한다.
- Client Component/Zustand: 선택된 품목·오차범위, dialog 열림, action 결과만 지역 상태로 관리한다. Zustand는 사용하지 않는다.

### 데이터와 Supabase

- schema 변경: 해당 없음. 적용 완료된 `public.item_tolerance_ranges`를 사용한다.
- PK/FK/index: 기존 `seq` PK, `item_seq → items.seq on delete restrict`, `(item_seq, nominal_min)` index와 품목별 구간 중복 exclusion constraint를 사용한다.
- 입력 검증: seq와 item_seq는 양의 안전한 정수, 치수·편차는 유한한 숫자이면서 소수점 넷째 자리 범위로 검증한다. `nominal_min >= 0`, `nominal_max > nominal_min`, `upper_deviation >= lower_deviation`, 비고 500자 이하를 확인한다.
- 오류 매핑: FK `23503`, check `23514`, 숫자 범위 `22003`, exclusion `23P01`을 내부 세부정보 없이 한국어 메시지로 변환한다.
- RLS 정책: 기존 인증 사용자 select·관리자 insert/update/delete 정책을 사용하며 Server Action에서도 관리자 여부를 재검증한다.
- Storage bucket/path/policy: 해당 없음.
- migration과 rollback: 해당 없음. UI 롤백은 신규 route 제거와 메뉴 링크 복원이다.

## 변경 계획

1. 작업 문서에 승인 응답을 기록하고 진행 단계로 전환한다.
2. 오차범위 타입과 Server Action을 추가한다.
3. 관리자 전용 Server Component page와 초기 query·오류 상태를 구현한다.
4. 품목 선택 및 오차범위 CRUD용 Client Component와 dialog를 구현한다.
5. 기준정보 메뉴 링크와 품목 삭제 FK 오류 문구를 보완한다.
6. lint, typecheck, 프로덕션 빌드와 반응형·키보드 흐름을 검증한다.
7. 검증 결과와 남은 위험을 문서에 기록하고 완료 처리한다.

## 위험과 승인 사항

- 신규 공개 경로는 `/master/tolerance-ranges`로 제안하며 관리자만 접근한다.
- DB 구조와 데이터는 변경하지 않는다.
- 품목관리 화면의 기존 미추적 변경과 겹치는 파일이 있으므로 해당 변경을 보존하면서 필요한 오류 문구만 최소 수정한다.
- 이 제안은 2026-08-24 사용자 승인을 받았다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트 (테스트 인프라 없음)
- [ ] 모바일 360px
- [ ] 태블릿 768px
- [ ] 데스크톱 1280px
- [ ] 키보드와 접근성
- [x] Supabase 허용/거부 정책 (기존 RLS와 Server Action 권한 재검증을 정적 확인)
- [x] 프로덕션 빌드

## 결과

- 변경: 관리자 전용 `/master/tolerance-ranges` route, 품목·오차범위 query, CRUD Server Action, AG Grid 기반 관리 UI, 등록·수정·삭제 dialog와 기준정보 메뉴 링크를 추가했다. 품목 삭제 FK 오류 문구에 오차범위를 포함했다.
- 검증: `git diff --check`, `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack`을 통과했다. 빌드 결과에 `/master/tolerance-ranges` 동적 route가 포함됐다. 비로그인 브라우저 접근이 `/login`으로 이동하는 것을 확인했다.
- 미실행: 테스트 인프라가 없어 단위·통합 테스트를 실행하지 않았다. 앱 내 브라우저에 관리자 세션이 없어 실제 관리 화면의 360px·768px·1280px 시각 검증과 키보드 CRUD 흐름, 로그인 사용자별 RLS 통합 테스트는 실행하지 않았다.
- 남은 위험/후속 작업: 관리자 세션에서 실제 데이터로 구간 중복 오류, 등록·수정·삭제와 반응형·키보드 흐름을 확인해야 한다. 빌드는 통과했지만 현재 Node.js 20이 향후 Supabase JS에서 지원 중단될 예정이라는 경고가 있다.
