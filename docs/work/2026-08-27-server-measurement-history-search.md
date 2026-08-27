# 측정 이력 서버 조회·페이지네이션 전환

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-27
- 승인 상태: 승인
- 승인 응답/일시: `승인`, 2026-08-27

## 배경과 목적

현재 `getInspectionReportData`가 모든 측정 이력과 모든 이력 항목을 앱 layout에서 한꺼번에 가져오고, 측정 이력 화면의 조회 버튼은 브라우저 배열만 필터링한다. 이력이 누적되면 모든 앱 화면의 초기 조회량과 브라우저 메모리가 계속 증가한다. 측정 이력 목록은 Supabase 조건 조회와 서버 페이지네이션으로 바꾸고, 성적서 상세 데이터는 보기를 누른 회차만 가져오도록 전환한다.

## 범위

### 포함

- 측정 이력 목록 서버 조회 함수/Server Action 추가
- 조회조건을 Supabase query에 적용
  - 시작일·종료일
  - 검색 유형: 기종, 품번/도번, 품명, 고객명
  - 검색어 부분일치
- 최신순 정렬과 서버 페이지네이션: 페이지당 50건
- 최초 진입과 초기화 시 최신 50건 DB 조회
- 조회 버튼 클릭 시 DB 재조회, 로딩·실패·결과 없음 상태 제공
- 이전·다음 페이지 및 전체 건수 표시
- `성적서보기` 클릭 시 선택한 측정 회차와 해당 측정항목만 서버에서 조회
- 공통 검사성적서 데이터 조회에서 전체 `inspection_measurement_runs`, `inspection_measurement_run_items` 선로딩 제거
- 별도 측정 이력 메뉴에서 과거 회차 목록과 상세를 필요할 때만 서버 조회
- 직접 URL과 작업 탭 패널이 같은 서버 조회 경계를 사용

### 제외

- DB table·column·RLS·함수·index 변경과 migration
- 무한 스크롤
- 검색어 자동완성
- 이력 수정·삭제

## 완료 조건

- [x] 측정 이력의 조회 버튼을 누를 때 Supabase가 조건을 적용해 다시 조회된다.
- [x] 브라우저에서 전체 이력을 내려받아 필터링하지 않는다.
- [x] 목록은 최신순 50건 단위이며 전체 건수와 이전·다음 이동을 제공한다.
- [x] 조회 중 중복 요청을 막고 로딩 및 오류 상태를 표시한다.
- [x] 성적서보기는 선택한 회차 데이터만 조회한 뒤 기존 읽기 전용 팝업을 표시한다.
- [x] 현재 결과 입력 화면의 입력·저장 기능이 유지된다.
- [x] 앱 layout 진입 시 모든 측정 이력과 이력 항목을 선조회하지 않는다.

## 현재 구현 조사

- 관련 route/component: `(app)/layout.tsx`, `inspection-reports/data.ts`, `inspection-measurement-history/page.tsx`, `inspection-measurement-history/inspection-measurement-history.tsx`, `inspection-measurements/inspection-measurement-sheet.tsx`, `workspace-panels.tsx`
- 관련 Supabase table/bucket: `inspection_measurement_runs`, `inspection_measurement_run_items`, 품목 이미지 Storage
- 재사용할 기존 패턴: 서버 전용 Supabase client, signed URL 생성, 지역 상태, AG Grid
- 문서와 구현의 차이: 서버 데이터 우선 원칙과 달리 현재 이력 검색은 전체 데이터를 layout에서 선조회한 뒤 클라이언트에서 처리한다.

## 설계

### UI와 반응형

- 모바일: 기존 조회조건 가로 스크롤을 유지하고 페이지 이동은 그리드 하단에 배치한다.
- 태블릿: 조회 중 기존 결과를 유지하면서 조회 버튼과 페이지 버튼을 비활성화한다.
- 데스크톱: 최신순 50건, 전체 건수와 현재 페이지를 한 줄에 표시한다.
- 로딩/빈 상태/오류/권한: 최초/재조회 로딩, 결과 없음, 서버 오류와 로그인 만료를 구분한다.
- 접근성: 조회 상태는 `aria-live`, 페이지 버튼은 명확한 접근성 이름과 disabled 상태를 제공한다.

### Server/Client 경계

- Server Component/Action: Supabase 목록 검색, count, 단일 회차/항목 조회와 signed image URL 생성을 담당한다.
- Client Component/Zustand: 조회조건 draft, 현재 페이지, 현재 결과와 팝업 open 상태만 지역 상태로 관리한다.

### 데이터와 Supabase

- schema 변경: 없음
- PK/FK/index: 변경 없음. 데이터 증가 후 실제 실행계획을 근거로 검색 index를 별도 제안한다.
- RLS 정책: 기존 authenticated select 정책 사용, 변경 없음
- Storage bucket/path/policy: 선택 회차의 기존 image path에 대해서만 signed URL 생성, 정책 변경 없음
- migration과 rollback: migration 없음. 새 조회 함수와 UI 호출부를 이전 전체 조회 방식으로 되돌릴 수 있다.

## 변경 계획

1. 이력 목록 필터·페이지 결과·단일 상세 타입과 서버 조회 함수를 추가한다.
2. 공통 검사성적서 데이터에서 전체 이력 선로딩을 분리한다.
3. 측정 이력 화면을 서버 조회 상태, 50건 페이지네이션과 지연 상세 조회 방식으로 변경한다.
4. 결과 입력 화면이 전체 이력 제거 이후에도 현재 결과 입력·저장을 유지하는지 확인한다.
5. 직접 URL과 workspace 패널 데이터 전달부를 새 경계에 맞춘다.
6. 허용 사용자·오류·빈 결과, lint, typecheck와 production build를 검증한다.

## 위험과 승인 사항

- 공통 layout 데이터 경계를 변경하므로 Architecture 작업으로 분류한다.
- 부분일치 `ilike`는 데이터가 매우 커지면 index 없이 느려질 수 있다. 이번에는 schema를 변경하지 않고, 운영 데이터 규모와 실행계획을 확인한 뒤 index를 별도 migration으로 제안한다.
- 페이지 이동 중 새 이력이 추가되면 offset 기반 페이지의 경계가 달라질 수 있다. 현재 관리 화면에는 단순성과 전체 건수 제공을 위해 offset 페이지네이션을 사용한다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트
- [ ] 모바일 360px
- [ ] 태블릿 768px
- [ ] 데스크톱 1280px
- [ ] 키보드와 접근성
- [ ] Supabase 허용/거부 정책 — 기존 정책으로 조회 허용/로그인 만료 확인
- [x] 프로덕션 빌드

## 결과

- 변경: Supabase 조건 검색, 최신순 50건 페이지네이션과 단일 회차 상세 지연 조회를 추가하고 공통 데이터 로더의 전체 이력 선조회를 제거했다.
- 검증: `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack`, `git diff --check` 통과
- 미실행: 로그인된 실제 브라우저에서 원격 Supabase 조회·페이지 이동·성적서보기 시각 검증
- 남은 위험/후속 작업: 실제 이력 규모에서 부분일치 검색 실행계획을 확인하고 필요 시 trigram index를 별도 승인 작업으로 추가한다.
